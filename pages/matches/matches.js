// pages/matches/matches.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

const PAGE_SIZE = 10;

Page({
  data: {
    matches: [],
    page: 1,
    hasMore: true,
    isLoading: false,
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
    this.loadMatches(true);
  },

  // 加载比赛列表
  async loadMatches(reset = false) {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    try {
      const page = reset ? 1 : this.data.page;
      const skip = (page - 1) * PAGE_SIZE;

      // 获取总数
      const countRes = await db.collection('matches').count();
      const total = countRes.total;

      // 获取当前页数据
      const res = await db.collection('matches')
        .orderBy('matchDate', 'desc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .get();

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

      // 先确认云数据库中实际有多少条记录
      const verifyCount = await db.collection('matches').count();
      const totalMatches = verifyCount.total;
      console.log('云数据库中比赛总数:', totalMatches);

      // 客户端 get() 最多只返回 20 条，需要分批查询获取所有数据
      const batchSize = 20;
      let allMatches = [];
      for (let i = 0; i < totalMatches; i += batchSize) {
        const batchRes = await db.collection('matches')
          .skip(i)
          .limit(batchSize)
          .get();
        allMatches.push(...batchRes.data);
      }
      console.log('实际获取比赛数量:', allMatches.length);

      // 调试：打印所有 result 值及详情
      console.log('=== 比赛数据诊断 ===');
      console.log('总比赛数:', allMatches.length);

      // 详细打印每场比赛的 result
      allMatches.forEach((m, index) => {
        const result = m.result;
        const resultType = typeof result;
        const resultLen = result ? result.length : 0;
        const resultCode = result ? result.charCodeAt(0) : 0;
        console.log(`[${index + 1}] id:${m._id} result:"${result}" type:${resultType} len:${resultLen} charCode:${resultCode}`);
      });

      // 统计各种结果
      const wins = allMatches.filter(m => String(m.result).trim() === '胜').length;
      const draws = allMatches.filter(m => String(m.result).trim() === '平').length;
      const losses = allMatches.filter(m => String(m.result).trim() === '负').length;
      const unknown = allMatches.filter(m => !['胜', '平', '负'].includes(String(m.result).trim())).length;
      console.log('统计: 胜=' + wins + ', 平=' + draws + ', 负=' + losses + ', 未知=' + unknown);
      console.log('验证: 总计=' + (wins + draws + losses + unknown));

      const goals = allMatches.reduce((sum, m) => sum + (m.goals || 0), 0);
      const conceded = allMatches.reduce((sum, m) => sum + (m.conceded || 0), 0);
      const stats = {
        wins,
        draws,
        losses,
        goals,
        conceded,
        goalDiff: goals - conceded
      };

      const newMatches = reset ? matches : [...this.data.matches, ...matches];
      const hasMore = newMatches.length < total;

      this.setData({
        matches: newMatches,
        page: page + 1,
        hasMore,
        stats,
        isLoading: false
      });
    } catch (error) {
      console.error('加载比赛失败', error);
      this.setData({ isLoading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore) {
      this.loadMatches();
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMatches(true).then(() => {
      wx.stopPullDownRefresh();
    });
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
