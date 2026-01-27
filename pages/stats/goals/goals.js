// pages/stats/goals/goals.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    currentTab: 'goals',
    // 年份固定为2025-2026
    years: ['2025', '2026'],
    months: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    startYear: '2025',
    startMonth: '1',
    endYear: '2026',
    endMonth: '12',
    rankList: [],
    chartTitle: '进球榜',
    summary: {
      total: 0,
      avg: 0,
      topPlayer: '-'
    }
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

  // 开始年份选择
  onStartYearChange(e) {
    const index = e.detail.value;
    const year = this.data.years[index];
    this.setData({ startYear: year });
    this.loadStats();
  },

  // 开始月份选择
  onStartMonthChange(e) {
    const index = e.detail.value;
    const month = String(index + 1);
    this.setData({ startMonth: month });
    this.loadStats();
  },

  // 结束年份选择
  onEndYearChange(e) {
    const index = e.detail.value;
    const year = this.data.years[index];
    this.setData({ endYear: year });
    this.loadStats();
  },

  // 结束月份选择
  onEndMonthChange(e) {
    const index = e.detail.value;
    const month = String(index + 1);
    this.setData({ endMonth: month });
    this.loadStats();
  },

  // 加载统计数据
  async loadStats() {
    wx.showLoading({ title: '加载中...' });

    try {
      const { currentTab, startYear, startMonth, endYear, endMonth } = this.data;

      // 计算开始和结束日期
      const startDate = new Date(
        parseInt(startYear),
        parseInt(startMonth) - 1,
        1
      ).toISOString();

      const endYearInt = parseInt(endYear);
      const endMonthInt = parseInt(endMonth);
      const lastDay = new Date(endYearInt, endMonthInt, 0).getDate();
      const endDate = new Date(endYearInt, endMonthInt - 1, lastDay, 23, 59, 59).toISOString();

      // 获取该时间范围的比赛
      const countRes = await db.collection('matches')
        .where({
          matchDate: _.gte(startDate).lte(endDate)
        })
        .count();
      const totalMatches = countRes.total;

      // 分批获取所有比赛
      const batchSize = 20;
      const allMatches = [];
      for (let i = 0; i < totalMatches; i += batchSize) {
        const matchesBatch = await db.collection('matches')
          .where({
            matchDate: _.gte(startDate).lte(endDate)
          })
          .skip(i)
          .limit(batchSize)
          .get();
        allMatches.push(...matchesBatch.data);
      }
      const matchIds = allMatches.map(m => m._id);

      if (matchIds.length === 0) {
        this.setData({
          rankList: [],
          summary: { total: 0, avg: 0, topPlayer: '-' }
        });
        wx.hideLoading();
        return;
      }

      // 分批获取球员表现记录（_.in 最多支持20个）
      const recordBatchSize = 20;
      const allRecords = [];
      for (let i = 0; i < matchIds.length; i += recordBatchSize) {
        const batchIds = matchIds.slice(i, i + recordBatchSize);
        const recordsRes = await db.collection('match_records')
          .where({
            matchId: _.in(batchIds)
          })
          .get();
        allRecords.push(...(recordsRes.data || []));
      }
      const records = allRecords;

      if (records.length === 0) {
        this.setData({
          rankList: [],
          summary: { total: 0, avg: 0, topPlayer: '-' }
        });
        wx.hideLoading();
        return;
      }

      // 按球员ID分组计算（适配 goalStats/assistStats: {playerId: count} 格式）
      const playerStats = {};
      records.forEach(r => {
        // 处理进球统计
        if (r.goalStats && typeof r.goalStats === 'object') {
          Object.entries(r.goalStats).forEach(([playerId, count]) => {
            if (!playerStats[playerId]) {
              playerStats[playerId] = { goals: 0, assists: 0 };
            }
            playerStats[playerId].goals += count;
          });
        }
        // 处理助攻统计
        if (r.assistStats && typeof r.assistStats === 'object') {
          Object.entries(r.assistStats).forEach(([playerId, count]) => {
            if (!playerStats[playerId]) {
              playerStats[playerId] = { goals: 0, assists: 0 };
            }
            playerStats[playerId].assists += count;
          });
        }
      });

      // 获取球员信息
      const playerIds = Object.keys(playerStats);
      const playersRes = await db.collection('players')
        .where({ _id: _.in(playerIds) })
        .get();

      const playerMap = {};
      playersRes.data.forEach(p => {
        playerMap[p._id] = p;
      });

      // 转换为数组并排序
      let total = 0;
      const rankList = Object.entries(playerStats)
        .map(([playerId, stats]) => {
          const player = playerMap[playerId] || {};
          const value = currentTab === 'goals' ? stats.goals : stats.assists;
          total += value;
          return {
            playerId,
            name: player.name || '未知',
            position: player.position || '',
            value
          };
        })
        .sort((a, b) => b.value - a.value);

      const topPlayer = rankList.length > 0 ? rankList[0].name : '-';
      const avg = rankList.length > 0 ? (total / rankList.length).toFixed(1) : 0;

      this.setData({
        rankList,
        chartTitle: currentTab === 'goals' ? '进球榜' : '助攻榜',
        summary: { total, avg, topPlayer }
      });

      // 绘制图表
      this.drawChart();
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
    ctx.setFillStyle('#333');
    ctx.fillText(`${currentTab === 'goals' ? '进球' : '助攻'}TOP10`, padding, 20);

    top10.forEach((item, index) => {
      const y = startY + index * (barHeight + barGap);
      const color = item.value > 0 ? '#1989fa' : '#ddd';

      ctx.setFillStyle('#666');
      ctx.fillText(item.name.substring(0, 4), padding, y + barHeight / 2 + 4);

      ctx.setFillStyle('#f0f0f0');
      ctx.fillRect(padding + labelWidth, y, chartWidth - labelWidth - valueWidth, barHeight);

      const barWidth = (item.value / maxValue) * (chartWidth - labelWidth - valueWidth);
      ctx.setFillStyle(color);
      ctx.fillRect(padding + labelWidth, y, barWidth, barHeight);

      ctx.setFillStyle('#333');
      ctx.fillText(item.value, padding + labelWidth + chartWidth - labelWidth - valueWidth + 10, y + barHeight / 2 + 4);
    });

    ctx.draw();
  }
});
