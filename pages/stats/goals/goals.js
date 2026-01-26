// pages/stats/goals/goals.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    currentTab: 'goals',
    seasons: ['2024-2025', '2023-2024', '2022-2023', '2021-2022'],
    currentSeason: '',
    rankList: [],
    chartTitle: '进球榜',
    summary: {
      total: 0,
      avg: 0,
      topPlayer: '-'
    }
  },

  onLoad() {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const season = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    this.setData({ currentSeason: season });
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    this.loadStats();
  },

  // 赛季选择
  onSeasonChange(e) {
    const index = e.detail.value;
    this.setData({ currentSeason: this.data.seasons[index] });
    this.loadStats();
  },

  // 加载统计数据
  async loadStats() {
    wx.showLoading({ title: '加载中...' });

    try {
      const { currentTab, currentSeason } = this.data;

      // 计算赛季日期范围
      const [startYear, endYear] = currentSeason.split('-');
      const startDate = new Date(parseInt(startYear), 8, 1);
      const endDate = new Date(parseInt(endYear) + 1, 7, 31);

      // 获取该赛季的比赛
      const matches = await db.collection('matches')
        .where({
          matchDate: _.gte(startDate).lte(endDate)
        })
        .get();

      const matchIds = matches.data.map(m => m._id);

      if (matchIds.length === 0) {
        this.setData({
          rankList: [],
          summary: { total: 0, avg: 0, topPlayer: '-' }
        });
        wx.hideLoading();
        return;
      }

      // 获取球员表现记录
      let query = db.collection('match_records').where({
        matchId: _.in(matchIds)
      });

      if (currentTab === 'goals') {
        query = query.groupBy('playerId').sum('goals');
      } else if (currentTab === 'assists') {
        query = query.groupBy('playerId').sum('assists');
      }

      const records = await query.end();

      if (records && records.length > 0) {
        const playerIds = records.map(r => r.playerId);
        const players = await db.collection('players')
          .where({ _id: _.in(playerIds) })
          .get();

        const playerMap = {};
        players.data.forEach(p => {
          playerMap[p._id] = p;
        });

        let total = 0;
        const rankList = records.map(r => {
          const player = playerMap[r.playerId] || {};
          let value = 0;
          if (currentTab === 'goals') {
            value = r.sum?.goals || 0;
          } else if (currentTab === 'assists') {
            value = r.sum?.assists || 0;
          }
          total += value;
          return {
            playerId: r.playerId,
            name: player.name || '未知',
            position: player.position || '',
            value
          };
        }).sort((a, b) => b.value - a.value);

        const topPlayer = rankList.length > 0 ? rankList[0].name : '-';
        const avg = rankList.length > 0 ? (total / rankList.length).toFixed(1) : 0;

        this.setData({
          rankList,
          chartTitle: currentTab === 'goals' ? '进球榜' : (currentTab === 'assists' ? '助攻榜' : '出勤榜'),
          summary: { total, avg, topPlayer }
        });

        // 绘制图表
        this.drawChart();
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 绘制柱状图
  drawChart() {
    const ctx = wx.createCanvasContext('barChart', this);
    const { rankList, currentTab } = this.data;
    const top10 = rankList.slice(0, 10);

    if (top10.length === 0) return;

    const padding = 20;
    const barHeight = 28;
    const barGap = 12;
    const labelWidth = 100;
    const valueWidth = 60;
    const maxValue = Math.max(...top10.map(item => item.value), 1);
    const chartWidth = 280;
    const chartHeight = top10.length * (barHeight + barGap);
    const startY = 40;

    ctx.setFontSize(12);

    // 绘制标题
    ctx.setFillStyle('#333');
    ctx.fillText(`${currentTab === 'goals' ? '进球' : (currentTab === 'assists' ? '助攻' : '出勤')}TOP10`, padding, 20);

    top10.forEach((item, index) => {
      const y = startY + index * (barHeight + barGap);
      const color = item.value > 0 ? '#1989fa' : '#ddd';

      // 名字
      ctx.setFillStyle('#666');
      ctx.fillText(item.name.substring(0, 4), padding, y + barHeight / 2 + 4);

      // 背景条
      ctx.setFillStyle('#f0f0f0');
      ctx.fillRect(padding + labelWidth, y, chartWidth - labelWidth - valueWidth, barHeight);

      // 数据条
      const barWidth = (item.value / maxValue) * (chartWidth - labelWidth - valueWidth);
      ctx.setFillStyle(color);
      ctx.fillRect(padding + labelWidth, y, barWidth, barHeight);

      // 数值
      ctx.setFillStyle('#333');
      ctx.fillText(item.value, padding + labelWidth + chartWidth - labelWidth - valueWidth + 10, y + barHeight / 2 + 4);
    });

    ctx.draw();
  }
});
