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
    const playersRes = await db.collection('players').count();
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
      .limit(3)
      .get();

    const recentMatches = matches.data.map(m => {
      const dateStr = m.matchDate;
      const date = new Date(dateStr);
      return {
        ...m,
        day: isNaN(date.getDate()) ? '' : date.getDate(),
        month: isNaN(date.getMonth()) ? '' : date.getMonth() + 1,
        resultClass: m.result === '胜' ? 'win' : (m.result === '平' ? 'draw' : 'loss')
      };
    });

    this.setData({ recentMatches });
  },

  // 加载即将到来的赛程
  async loadUpcomingSchedules() {
    const now = new Date().toISOString();
    const schedules = await db.collection('schedules')
      .where({
        date: _.gte(now)
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

  // 加载射手榜TOP3（2025-2026年）
  async loadTopScorers() {
    try {
      // 使用2025-2026年的数据范围
      const startDate = new Date(2025, 0, 1).toISOString();
      const endDate = new Date(2026, 11, 31, 23, 59, 59).toISOString();

      // 获取该时间范围的比赛
      const countRes = await db.collection('matches')
        .where({
          matchDate: _.gte(startDate).lte(endDate)
        })
        .count();
      const totalMatches = countRes.total;
      console.log('比赛总数:', totalMatches);

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
      const matches = allMatches;
      console.log('实际获取比赛数量:', matches.length);

      if (matches.length === 0) {
        console.log('没有比赛数据');
        this.setData({ topScorers: [] });
        return;
      }

      const matchIds = matches.map(m => m._id);
      console.log('比赛数量:', matchIds.length);

      // 分批获取球员记录（_.in 最多支持20个）
      const recordBatchSize = 20;
      const allRecords = [];
      let batchNum = 0;
      for (let i = 0; i < matchIds.length; i += recordBatchSize) {
        batchNum++;
        const batchIds = matchIds.slice(i, i + recordBatchSize);
        console.log(`批次${batchNum}: 查询 ${batchIds.length} 个比赛ID`);
        const recordsRes = await db.collection('match_records')
          .where({
            matchId: _.in(batchIds)
          })
          .get();
        console.log(`批次${batchNum}: 返回 ${recordsRes.data?.length || 0} 条记录`);
        allRecords.push(...(recordsRes.data || []));
      }
      const records = allRecords;
      console.log('总球员记录数量:', records.length);

      if (records.length === 0) {
        console.log('没有球员记录数据');
        this.setData({ topScorers: [] });
        return;
      }

      // 按球员ID分组计算进球数（适配 goalStats: {playerId: count} 格式）
      const playerGoals = {};
      records.forEach(r => {
        if (r.goalStats && typeof r.goalStats === 'object') {
          // goalStats 是 {playerId: count} 格式的对象
          Object.entries(r.goalStats).forEach(([playerId, count]) => {
            playerGoals[playerId] = (playerGoals[playerId] || 0) + count;
          });
        }
      });

      console.log('有进球的球员数量:', Object.keys(playerGoals).length);

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
        .map(([playerId, goals]) => {
          const player = playerMap[playerId] || {};
          return {
            playerId,
            name: player.name || '未知',
            position: player.position || '',
            goals
          };
        })
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 3);

      console.log('射手榜数据:', sortedPlayers);
      this.setData({ topScorers: sortedPlayers });
    } catch (error) {
      console.error('加载射手榜失败:', error);
      this.setData({ topScorers: [] });
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
    wx.navigateTo({ url: '/pages/matches/matches' });
  },

  // 跳转至日历
  goToSchedule() {
    wx.navigateTo({ url: '/pages/schedule/schedule' });
  },

  // 跳转至数据统计（使用switchTab因为在tabBar中）
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
