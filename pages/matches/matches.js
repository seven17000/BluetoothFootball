// pages/matches/matches.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    matches: [],
    seasons: ['2024-2025', '2023-2024', '2022-2023', '2021-2022'],
    currentSeason: '',
    stats: {
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      conceded: 0
    },
    isAdmin: false
  },

  onLoad() {
    // 默认当前赛季
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const season = month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    this.setData({ currentSeason: season });
  },

  onShow() {
    this.setData({ isAdmin: app.isAdmin() });
    this.loadMatches();
  },

  // 加载比赛列表
  async loadMatches() {
    wx.showLoading({ title: '加载中...' });

    try {
      let query = db.collection('matches').orderBy('matchDate', 'desc');

      // 按赛季筛选
      if (this.data.currentSeason) {
        const [startYear, endYear] = this.data.currentSeason.split('-');
        const startDate = new Date(parseInt(startYear), 8, 1); // 9月1日
        const endDate = new Date(parseInt(endYear) + 1, 7, 31); // 次年8月31日

        query = query.where({
          matchDate: _.gte(startDate).lte(endDate)
        });
      }

      const res = await query.get();

      const matches = res.data.map(m => {
        const date = new Date(m.matchDate);
        return {
          ...m,
          month: date.getMonth() + 1,
          day: date.getDate(),
          resultClass: m.result === '胜' ? 'win' : (m.result === '平' ? 'draw' : 'loss')
        };
      });

      // 计算统计
      const stats = {
        wins: matches.filter(m => m.result === '胜').length,
        draws: matches.filter(m => m.result === '平').length,
        losses: matches.filter(m => m.result === '负').length,
        goals: matches.reduce((sum, m) => sum + (m.goals || 0), 0),
        conceded: matches.reduce((sum, m) => sum + (m.conceded || 0), 0)
      };

      this.setData({ matches, stats });
    } catch (error) {
      console.error('加载比赛失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 赛季选择
  onSeasonChange(e) {
    const index = e.detail.value;
    const season = this.data.seasons[index];
    this.setData({ currentSeason: season });
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
