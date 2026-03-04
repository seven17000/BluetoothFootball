// pages/index/index.js
const app = getApp();
const { playerAPI, matchAPI, scheduleAPI, teamPhotoAPI, statsAPI } = require('../../utils/http.js');

// 球队成立日期
const TEAM_FOUNDED_DATE = new Date('2001-01-01');

Page({
  data: {
    teamDays: 0,      // 球队成立天数
    playerCount: 0,
    recentMatches: [],
    upcomingSchedules: [],
    topScorers: [],
    topAssists: [],
    isAdmin: false,
    teamPhotos: [],
    // 本赛季数据
    seasonStats: {
      wins: 0,
      draws: 0,
      losses: 0,
      goals: 0,
      conceded: 0
    }
  },

  onLoad() {
    this.setData({
      isAdmin: app.isAdmin()
    });
  },

  onShow() {
    // 每次显示时更新管理员状态
    this.setData({
      isAdmin: app.isAdmin()
    });
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
      // 获取最新赛季
      const latestSeason = await this.getLatestSeason();

      await Promise.all([
        this.loadStats(),
        this.loadSeasonStats(latestSeason),
        this.loadRecentMatches(),
        this.loadUpcomingSchedules(),
        this.loadTopScorers(latestSeason),
        this.loadTopAssists(latestSeason),
        this.loadTeamPhotos()
      ]);
    } catch (error) {
      console.error('加载数据失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 获取最新赛季（从最新一场比赛的 season 字段获取）
  async getLatestSeason() {
    try {
      const matches = await matchAPI.getMatches({ limit: 1 });
      if (matches && matches.length > 0) {
        const latestMatch = matches[0];
        if (latestMatch.season) {
          return latestMatch.season;
        }
      }
      return '';
    } catch (error) {
      console.error('获取最新赛季失败', error);
      return '';
    }
  },

  // 加载统计数据
  async loadStats() {
    // 计算球队成立天数
    const now = new Date();
    const teamDays = Math.floor((now - TEAM_FOUNDED_DATE) / (1000 * 60 * 60 * 24));

    // 球员数量
    const countRes = await playerAPI.getPlayerCount();

    this.setData({
      teamDays,
      playerCount: countRes ? countRes.count : 0
    });
  },

  // 加载本赛季数据
  async loadSeasonStats(season) {
    try {
      const stats = await statsAPI.getSeasonStats(season);

      this.setData({
        seasonStats: {
          wins: stats ? stats.wins : 0,
          draws: stats ? stats.draws : 0,
          losses: stats ? stats.losses : 0,
          goals: stats ? stats.goals : 0,
          conceded: stats ? stats.conceded : 0
        }
      });
    } catch (error) {
      console.error('加载赛季数据失败', error);
    }
  },

  // 加载最近比赛
  async loadRecentMatches() {
    const matches = await matchAPI.getMatches({ limit: 3 });

    const recentMatches = (matches || []).map(m => {
      const dateStr = m.scheduleDate || m.matchDate;
      const date = dateStr ? new Date(dateStr) : new Date();
      return Object.assign({}, m, {
        _id: m._id || m.id,
        day: isNaN(date.getDate()) ? '' : date.getDate(),
        month: isNaN(date.getMonth()) ? '' : date.getMonth() + 1,
        resultClass: m.result === '胜' ? 'win' : (m.result === '平' ? 'draw' : 'loss')
      });
    });

    this.setData({ recentMatches });
  },

  // 加载即将到来的赛程
  async loadUpcomingSchedules() {
    try {
      const schedules = await scheduleAPI.getSchedules();

      const now = new Date();
      const nowTime = now.getTime();

      // 过滤出未来赛程
      const futureSchedules = (schedules || []).filter(s => {
        const date = new Date(s.date);
        return !isNaN(date.getTime()) && date.getTime() > nowTime;
      });

      const upcomingSchedules = futureSchedules.map(s => {
        const date = new Date(s.date);
        return Object.assign({}, s, {
          _id: s._id || s.id,
          year: date.getFullYear(),
          day: date.getDate(),
          month: date.getMonth() + 1,
          time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        });
      });

      this.setData({ upcomingSchedules: upcomingSchedules.slice(0, 5) });
    } catch (error) {
      console.error('加载赛程失败', error);
      this.setData({ upcomingSchedules: [] });
    }
  },

  // 加载射手榜TOP3
  async loadTopScorers(season) {
    try {
      const scorers = await statsAPI.getTopScorers(3);

      this.setData({ topScorers: scorers || [] });
    } catch (error) {
      console.error('加载射手榜失败:', error);
      this.setData({ topScorers: [] });
    }
  },

  // 加载助攻榜TOP3
  async loadTopAssists(season) {
    try {
      const assists = await statsAPI.getTopAssists(3);

      this.setData({ topAssists: assists || [] });
    } catch (error) {
      console.error('加载助攻榜失败:', error);
      this.setData({ topAssists: [] });
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
    const isAdmin = app.isAdmin();
    wx.navigateTo({ url: `/pages/schedule-form/schedule-form?id=${id}&readonly=${!isAdmin}` });
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
    wx.navigateTo({ url: '/pages/schedule-form/schedule-form' });
  },

  // 跳转至比赛列表
  goToMatches() {
    wx.navigateTo({ url: '/pages/matches/matches' });
  },

  // 跳转至赛程日历
  goToSchedule() {
    wx.navigateTo({ url: '/pages/schedule/schedule' });
  },

  // 预览球队照片
  previewPhoto(e) {
    const current = e.currentTarget.dataset.url;
    wx.previewImage({
      current: current,
      urls: this.data.teamPhotos
    });
  },

  // 预览Logo大图
  previewLogo() {
    wx.previewImage({
      current: '/images/team-logo.png',
      urls: ['/images/team-logo.png']
    });
  },

  // 上传球队照片（需要先上传到服务器，这里简化处理）
  uploadTeamPhoto() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '仅管理员可上传', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });

        try {
          // TODO: 需要实现文件上传到服务器的功能
          // 这里先保存临时文件路径作为演示
          wx.hideLoading();
          wx.showToast({ title: '上传功能开发中', icon: 'none' });
        } catch (err) {
          wx.hideLoading();
          console.error('上传失败', err);
          wx.showToast({ title: '上传失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.log('取消选择', err);
      }
    });
  },

  // 加载球队照片
  async loadTeamPhotos() {
    try {
      const photos = await teamPhotoAPI.getTeamPhotos();
      const photoUrls = (photos || []).map(item => item.url);
      this.setData({ teamPhotos: photoUrls.length > 0 ? photoUrls : ['/images/team-logo.png'] });
    } catch (err) {
      console.log('加载照片失败', err);
      this.setData({ teamPhotos: ['/images/team-logo.png'] });
    }
  },

  // 跳转至球队简介
  goToTeamInfo() {
    wx.navigateTo({ url: '/pages/team-info/team-info' });
  },

  // 跳转至数据统计
  goToStats() {
    wx.switchTab({ url: '/pages/stats/goals/goals' });
  },

  // 跳转至助攻榜
  goToAssists() {
    wx.navigateTo({ url: '/pages/stats/assists/assists' });
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
