// pages/index/index.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

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
        this.loadTopAssists(latestSeason)
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
      const res = await db.collection('matches')
        .orderBy('matchDate', 'desc')
        .limit(1)
        .get();

      if (res.data.length > 0) {
        const latestMatch = res.data[0];
        // 优先使用 season 字段
        if (latestMatch.season) {
          return latestMatch.season;
        }
      }
      // 如果没有 season 字段，返回空字符串表示全部
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
    const playersRes = await db.collection('players').count();

    this.setData({
      teamDays,
      playerCount: playersRes.total
    });
  },

  // 加载本赛季数据
  async loadSeasonStats(season) {
    try {
      // 构建查询条件
      let queryCondition = {
        result: _.in(['胜', '平', '负'])
      };
      if (season) {
        queryCondition.season = season;
      }

      // 先获取总数
      const countRes = await db.collection('matches')
        .where(queryCondition)
        .count();
      const totalMatches = countRes.total;

      // 分批获取所有比赛
      const batchSize = 20;
      let allMatches = [];
      for (let i = 0; i < totalMatches; i += batchSize) {
        const res = await db.collection('matches')
          .where(queryCondition)
          .skip(i)
          .limit(batchSize)
          .get();
        allMatches = allMatches.concat(res.data || []);
      }

      const wins = allMatches.filter(m => String(m.result).trim() === '胜').length;
      const draws = allMatches.filter(m => String(m.result).trim() === '平').length;
      const losses = allMatches.filter(m => String(m.result).trim() === '负').length;
      const goals = allMatches.reduce((sum, m) => sum + (m.goals || 0), 0);
      const conceded = allMatches.reduce((sum, m) => sum + (m.conceded || 0), 0);

      this.setData({
        seasonStats: { wins, draws, losses, goals, conceded }
      });
    } catch (error) {
      console.error('加载赛季数据失败', error);
    }
  },

  // 加载最近比赛
  async loadRecentMatches() {
    const now = new Date();
    const matches = await db.collection('matches')
      .orderBy('matchDate', 'desc')
      .limit(3)
      .get();

    const recentMatches = matches.data.map(m => {
      const dateStr = m.matchDate;
      const date = new Date(dateStr);
      return Object.assign({}, m, {
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
      const now = new Date();

      // 先查询所有赛程
      const allSchedulesRes = await db.collection('schedules')
        .orderBy('date', 'asc')
        .limit(20)
        .get();

      // 过滤出未来赛程（在客户端处理，因为可能有时区问题）
      const nowTime = now.getTime();
      const futureSchedules = allSchedulesRes.data.filter(s => {
        const date = new Date(s.date);
        return !isNaN(date.getTime()) && date.getTime() > nowTime;
      });

      const upcomingSchedules = futureSchedules.map(s => {
        const date = new Date(s.date);
        return Object.assign({}, s, {
          year: date.getFullYear(),
          day: date.getDate(),
          month: date.getMonth() + 1,
          time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        });
      });

      this.setData({ upcomingSchedules });
    } catch (error) {
      console.error('加载赛程失败', error);
      this.setData({ upcomingSchedules: [] });
    }
  },

  // 加载射手榜TOP3（按赛季）
  async loadTopScorers(season) {
    try {
      // 根据赛季字段查询
      let queryCondition = {};
      if (season) {
        queryCondition.season = season;
      }

      // 获取符合条件的比赛
      const countRes = await db.collection('matches')
        .where(queryCondition)
        .count();
      const totalMatches = countRes.total;

      // 分批获取所有比赛
      const batchSize = 20;
      let allMatches = [];
      for (let i = 0; i < totalMatches; i += batchSize) {
        const matchesBatch = await db.collection('matches')
          .where(queryCondition)
          .skip(i)
          .limit(batchSize)
          .get();
        allMatches = allMatches.concat(matchesBatch.data);
      }
      const matches = allMatches;

      if (matches.length === 0) {
        this.setData({ topScorers: [] });
        return;
      }

      const matchIds = matches.map(m => m._id);

      // 分批获取球员记录（_.in 最多支持20个）
      const recordBatchSize = 20;
      let allRecords = [];
      for (let i = 0; i < matchIds.length; i += recordBatchSize) {
        const batchIds = matchIds.slice(i, i + recordBatchSize);
        const recordsRes = await db.collection('match_records')
          .where({
            matchId: _.in(batchIds)
          })
          .get();
        allRecords = allRecords.concat(recordsRes.data || []);
      }
      const records = allRecords;

      if (records.length === 0) {
        this.setData({ topScorers: [] });
        return;
      }

      // 按球员ID分组计算进球数（适配 goalStats: {playerId: count} 格式）
      const playerGoals = {};
      records.forEach(function(r) {
        if (r.goalStats && typeof r.goalStats === 'object') {
          // goalStats 是 {playerId: count} 格式的对象
          Object.entries(r.goalStats).forEach(function(entry) {
            const playerId = entry[0];
            const count = entry[1];
            playerGoals[playerId] = (playerGoals[playerId] || 0) + count;
          });
        }
      });

      // 获取球员信息
      const playerIds = Object.keys(playerGoals);
      if (playerIds.length === 0) {
        this.setData({ topScorers: [] });
        return;
      }

      const playersRes = await db.collection('players')
        .where({
          _id: _.in(playerIds)
        })
        .get();
      const players = playersRes.data || [];

      const playerMap = {};
      players.forEach(p => {
        playerMap[p._id] = p;
      });

      // 转换为数组并排序
      const sortedPlayers = Object.entries(playerGoals)
        .map(function(entry) {
          const playerId = entry[0];
          const goals = entry[1];
          const player = playerMap[playerId] || {};
          return {
            playerId: playerId,
            name: player.name || '未知',
            position: player.position || '',
            goals: goals
          };
        })
        .sort(function(a, b) {
          return b.goals - a.goals;
        })
        .slice(0, 3);

      this.setData({ topScorers: sortedPlayers });
    } catch (error) {
      console.error('加载射手榜失败:', error);
      this.setData({ topScorers: [] });
    }
  },

  // 加载助攻榜TOP3（按赛季）
  async loadTopAssists(season) {
    try {
      // 根据赛季字段查询
      let queryCondition = {};
      if (season) {
        queryCondition.season = season;
      }

      const countRes = await db.collection('matches')
        .where(queryCondition)
        .count();
      const totalMatches = countRes.total;

      const batchSize = 20;
      let allMatches = [];
      for (let i = 0; i < totalMatches; i += batchSize) {
        const matchesBatch = await db.collection('matches')
          .where(queryCondition)
          .skip(i)
          .limit(batchSize)
          .get();
        allMatches = allMatches.concat(matchesBatch.data);
      }

      if (allMatches.length === 0) {
        this.setData({ topAssists: [] });
        return;
      }

      const matchIds = allMatches.map(m => m._id);

      const recordBatchSize = 20;
      let allRecords = [];
      for (let i = 0; i < matchIds.length; i += recordBatchSize) {
        const batchIds = matchIds.slice(i, i + recordBatchSize);
        const recordsRes = await db.collection('match_records')
          .where({
            matchId: _.in(batchIds)
          })
          .get();
        allRecords = allRecords.concat(recordsRes.data || []);
      }

      if (allRecords.length === 0) {
        this.setData({ topAssists: [] });
        return;
      }

      // 按球员ID分组计算助攻数
      const playerAssists = {};
      allRecords.forEach(function(r) {
        if (r.assistStats && typeof r.assistStats === 'object') {
          Object.entries(r.assistStats).forEach(function(entry) {
            const playerId = entry[0];
            const count = entry[1];
            playerAssists[playerId] = (playerAssists[playerId] || 0) + count;
          });
        }
      });

      const playerIds = Object.keys(playerAssists);
      if (playerIds.length === 0) {
        this.setData({ topAssists: [] });
        return;
      }

      const playersRes = await db.collection('players')
        .where({
          _id: _.in(playerIds)
        })
        .get();
      const players = playersRes.data || [];

      const playerMap = {};
      players.forEach(function(p) {
        playerMap[p._id] = p;
      });

      const sortedPlayers = Object.entries(playerAssists)
        .map(function(entry) {
          const playerId = entry[0];
          const assists = entry[1];
          const player = playerMap[playerId] || {};
          return {
            playerId: playerId,
            name: player.name || '未知',
            position: player.position || '',
            assists: assists
          };
        })
        .sort(function(a, b) {
          return b.assists - a.assists;
        })
        .slice(0, 3);

      this.setData({ topAssists: sortedPlayers });
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
    wx.navigateTo({ url: `/pages/schedule-form/schedule-form?id=${id}` });
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

  // 跳转至数据统计（使用switchTab因为在tabBar中）
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
