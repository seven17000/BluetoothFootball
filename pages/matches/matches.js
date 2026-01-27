// pages/matches/matches.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    matches: [],
    // 年份固定为2025-2026
    years: ['2025', '2026'],
    months: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    startYear: '2025',
    startMonth: '1',
    endYear: '2026',
    endMonth: '12',
    stats: {
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      conceded: 0
    },
    isAdmin: false
  },

  onShow() {
    this.setData({ isAdmin: app.isAdmin() });
    this.loadMatches();
  },

  // 加载比赛列表
  async loadMatches() {
    wx.showLoading({ title: '加载中...' });

    try {
      // 计算开始日期（月初）
      const startDate = new Date(
        parseInt(this.data.startYear),
        parseInt(this.data.startMonth) - 1,
        1
      ).toISOString();

      // 计算结束日期（月末）
      const endYear = parseInt(this.data.endYear);
      const endMonth = parseInt(this.data.endMonth);
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      const endDate = new Date(endYear, endMonth - 1, lastDay, 23, 59, 59).toISOString();

      let query = db.collection('matches').where({
        matchDate: _.gte(startDate).lte(endDate)
      });

      query = query.orderBy('matchDate', 'desc');
      const res = await query.get();

      const matches = res.data.map(m => {
        const dateStr = m.matchDate;
        const date = new Date(dateStr);
        return {
          ...m,
          month: isNaN(date.getMonth()) ? '' : date.getMonth() + 1,
          day: isNaN(date.getDate()) ? '' : date.getDate(),
          resultClass: m.result === '胜' ? 'win' : (m.result === '平' ? 'draw' : 'loss')
        };
      });

      // 计算统计
      const goals = matches.reduce((sum, m) => sum + (m.goals || 0), 0);
      const conceded = matches.reduce((sum, m) => sum + (m.conceded || 0), 0);
      const stats = {
        wins: matches.filter(m => m.result === '胜').length,
        draws: matches.filter(m => m.result === '平').length,
        losses: matches.filter(m => m.result === '负').length,
        goals,
        conceded,
        goalDiff: goals - conceded
      };

      this.setData({ matches, stats });
    } catch (error) {
      console.error('加载比赛失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 开始年份选择
  onStartYearChange(e) {
    const index = e.detail.value;
    const year = this.data.years[index];
    this.setData({ startYear: year });
    this.loadMatches();
  },

  // 开始月份选择
  onStartMonthChange(e) {
    const index = e.detail.value;
    const month = String(index + 1);
    this.setData({ startMonth: month });
    this.loadMatches();
  },

  // 结束年份选择
  onEndYearChange(e) {
    const index = e.detail.value;
    const year = this.data.years[index];
    this.setData({ endYear: year });
    this.loadMatches();
  },

  // 结束月份选择
  onEndMonthChange(e) {
    const index = e.detail.value;
    const month = String(index + 1);
    this.setData({ endMonth: month });
    this.loadMatches();
  },

  // 跳转至比赛详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/match-detail/match-detail?id=${id}` });
  },

  // 添加比赛
  addMatch() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/match-form/match-form' });
  }
});
