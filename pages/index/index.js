// pages/index/index.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    playerCount: 0,
    matchCount: 0,
    totalGoals: 0,
    winRate: '0%',
    recentMatches: [],
    upcomingSchedules: [],
    topScorers: [],
    isAdmin: false
  },

  onLoad() {
    this.setData({
      isAdmin: app.isAdmin()
    });
  },

  onShow() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
    wx.stopPullDownRefresh();
  },

  // 加载数据
  async loadData() {
    wx.showLoading({ title: '加载中...' });

    try {
      await Promise.all([
        this.loadStats(),
        this.loadRecentMatches(),
        this.loadUpcomingSchedules(),
        this.loadTopScorers()
      ]);
    } catch (error) {
      console.error('加载数据失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载统计数据
  async loadStats() {
    // 球员数量
    const playersRes = await db.collection('players').where({ isActive: true }).count();
    this.setData({ playerCount: playersRes.total });

    // 比赛数量和进球数
    const matchesRes = await db.collection('matches').count();
    const matches = await db.collection('matches').get();
    const totalGoals = matches.data.reduce((sum, m) => sum + (m.goals || 0), 0);
    const wins = matches.data.filter(m => m.result === '胜').length;
    const winRate = matchesRes.total > 0 ? Math.round((wins / matchesRes.total) * 100) + '%' : '0%';

    this.setData({
      matchCount: matchesRes.total,
      totalGoals,
      winRate
    });
  },

  // 加载最近比赛
  async loadRecentMatches() {
    const now = new Date();
    const matches = await db.collection('matches')
      .orderBy('matchDate', 'desc')
      .limit(5)
      .get();

    const recentMatches = matches.data.map(m => {
      const date = new Date(m.matchDate);
      return {
        ...m,
        day: date.getDate(),
        month: date.getMonth() + 1,
        resultClass: m.result === '胜' ? 'win' : (m.result === '平' ? 'draw' : 'loss')
      };
    });

    this.setData({ recentMatches });
  },

  // 加载即将到来的赛程
  async loadUpcomingSchedules() {
    const now = new Date();
    const schedules = await db.collection('schedules')
      .where({
        date: db.command.gte(now)
      })
      .orderBy('date', 'asc')
      .limit(5)
      .get();

    const upcomingSchedules = schedules.data.map(s => {
      const date = new Date(s.date);
      return {
        ...s,
        day: date.getDate(),
        month: date.getMonth() + 1,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        typeClass: s.type === '训练' ? 'training' : 'match'
      };
    });

    this.setData({ upcomingSchedules });
  },

  // 加载射手榜TOP5
  async loadTopScorers() {
    // 聚合计算每个球员的进球数
    const records = await db.collection('match_records')
      .groupBy('playerId')
      .sum('goals')
      .end();

    if (records && records.length > 0) {
      const playerIds = records.map(r => r.playerId);
      const players = await db.collection('players')
        .where({
          _id: db.command.in(playerIds)
        })
        .get();

      const playerMap = {};
      players.data.forEach(p => {
        playerMap[p._id] = p;
      });

      const topScorers = records
        .map(r => ({
          ...r,
          name: playerMap[r.playerId]?.name || '未知',
          position: playerMap[r.playerId]?.position || ''
        }))
        .sort((a, b) => b.sum.goals - a.sum.goals)
        .slice(0, 5)
        .map((r, i) => ({
          ...r,
          goals: r.sum?.goals || 0
        }));

      this.setData({ topScorers });
    }
  },

  // 跳转至比赛详情
  goToMatchDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/match-detail/match-detail?id=${id}` });
  },

  // 跳转至赛程详情
  goToScheduleDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/schedule/schedule?id=${id}` });
  },

  // 添加比赛
  addMatch() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/match-form/match-form' });
  },

  // 添加赛程
  addSchedule() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/schedule/schedule?action=add' });
  },

  // 跳转至比赛列表
  goToMatches() {
    wx.switchTab({ url: '/pages/matches/matches' });
  },

  // 跳转至日历
  goToSchedule() {
    wx.switchTab({ url: '/pages/schedule/schedule' });
  },

  // 跳转至统计
  goToStats() {
    wx.switchTab({ url: '/pages/stats/goals/goals' });
  },

  // 跳转至球员管理
  goToPlayers() {
    wx.switchTab({ url: '/pages/players/players' });
  },

  // 跳转至出勤记录
  goToAttendance() {
    wx.navigateTo({ url: '/pages/attendance/attendance' });
  },

  // 跳转至训练记录
  goToTraining() {
    wx.navigateTo({ url: '/pages/training/training' });
  },

  // 跳转至个人中心
  goToProfile() {
    wx.switchTab({ url: '/pages/profile/profile' });
  }
});
