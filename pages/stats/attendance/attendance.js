// pages/stats/attendance/attendance.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    currentTab: 'attendance',
    seasons: ['2024-2025', '2023-2024', '2022-2023', '2021-2022'],
    currentSeason: '',
    rankList: []
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

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
    wx.navigateTo({ url: `/pages/stats/${tab}/${tab}` });
  },

  onSeasonChange(e) {
    const index = e.detail.value;
    this.setData({ currentSeason: this.data.seasons[index] });
    this.loadStats();
  },

  async loadStats() {
    wx.showLoading({ title: '加载中...' });

    try {
      const { currentSeason } = this.data;
      const [startYear, endYear] = currentSeason.split('-');
      const startDate = new Date(parseInt(startYear), 8, 1);
      const endDate = new Date(parseInt(endYear) + 1, 7, 31);

      // 获取所有球员
      const players = await db.collection('players')
        .where({ isActive: true })
        .get();

      if (players.data.length === 0) {
        this.setData({ rankList: [] });
        wx.hideLoading();
        return;
      }

      // 获取该赛季的出勤记录
      const attendance = await db.collection('attendance')
        .where({
          eventDate: _.gte(startDate).lte(endDate)
        })
        .get();

      // 计算每个球员的出勤率
      const playerAttendance = {};
      attendance.data.forEach(record => {
        if (!playerAttendance[record.playerId]) {
          playerAttendance[record.playerId] = { total: 0, present: 0 };
        }
        playerAttendance[record.playerId].total++;
        if (record.status === '出勤') {
          playerAttendance[record.playerId].present++;
        }
      });

      const rankList = players.data.map(player => {
        const stats = playerAttendance[player._id] || { total: 0, present: 0 };
        const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
        return {
          playerId: player._id,
          name: player.name,
          position: player.position,
          present: stats.present,
          total: stats.total,
          rate
        };
      }).sort((a, b) => b.rate - a.rate);

      this.setData({ rankList });
      this.drawChart();
    } catch (error) {
      console.error('加载出勤统计失败', error);
    } finally {
      wx.hideLoading();
    }
  },

  drawChart() {
    const ctx = wx.createCanvasContext('barChart', this);
    const { rankList } = this.data;
    const top10 = rankList.slice(0, 10);

    if (top10.length === 0) return;

    const padding = 20;
    const barHeight = 28;
    const barGap = 12;
    const labelWidth = 100;
    const valueWidth = 70;
    const maxValue = 100;
    const chartWidth = 280;
    const startY = 40;

    ctx.setFontSize(12);
    ctx.setFillStyle('#333');
    ctx.fillText('出勤率TOP10', padding, 20);

    top10.forEach((item, index) => {
      const y = startY + index * (barHeight + barGap);
      const color = item.rate >= 80 ? '#52c41a' : (item.rate >= 60 ? '#faad14' : '#fa5151');

      ctx.setFillStyle('#666');
      ctx.fillText(item.name.substring(0, 4), padding, y + barHeight / 2 + 4);

      ctx.setFillStyle('#f0f0f0');
      ctx.fillRect(padding + labelWidth, y, chartWidth - labelWidth - valueWidth, barHeight);

      const barWidth = (item.rate / maxValue) * (chartWidth - labelWidth - valueWidth);
      ctx.setFillStyle(color);
      ctx.fillRect(padding + labelWidth, y, barWidth, barHeight);

      ctx.setFillStyle('#333');
      ctx.fillText(item.rate + '%', padding + labelWidth + chartWidth - labelWidth - valueWidth + 10, y + barHeight / 2 + 4);
    });

    ctx.draw();
  }
});
