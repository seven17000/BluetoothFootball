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
    isAdmin: false,
    selectedSeason: '', // 当前选中赛季
    seasons: [], // 赛季列表
    hasSeasonSelector: false // 是否显示赛季选择器
  },

  onLoad() {
    this.loadSeasons();
  },

  onShow() {
    this.setData({ isAdmin: app.isAdmin() });
  },

  // 加载赛季列表
  async loadSeasons() {
    try {
      // 获取所有有赛季数据的比赛
      const res = await db.collection('matches')
        .orderBy('matchDate', 'desc')
        .limit(1)
        .get();

      // 获取最新赛季
      let latestSeason = '';
      if (res.data.length > 0 && res.data[0].season) {
        latestSeason = res.data[0].season;
      }

      // 获取所有唯一赛季用于下拉选择
      const allRes = await db.collection('matches')
        .where({
          season: _.exists(true)
        })
        .get();

      const seasonsMap = {};
      allRes.data.forEach(function(m) {
        if (m.season) {
          seasonsMap[m.season] = true;
        }
      });
      const uniqueSeasons = Object.keys(seasonsMap).sort().reverse();

      // 添加"全部"选项
      const allSeasons = ['全部'].concat(uniqueSeasons);

      // 默认选择最新赛季
      const defaultSeason = latestSeason || '全部';

      this.setData({
        seasons: allSeasons,
        selectedSeason: defaultSeason,
        hasSeasonSelector: allSeasons.length > 1
      });

      // 加载对应赛季的比赛
      this.loadMatches(true);
    } catch (error) {
      console.error('加载赛季失败', error);
    }
  },

  // 赛季选择
  onSeasonChange(e) {
    const index = e.detail.value;
    const selectedSeason = this.data.seasons[index];
    this.setData({ selectedSeason: selectedSeason });
    this.loadMatches(true);
  },

  // 加载比赛列表（仅显示已完成的比赛，按赛季筛选）
  async loadMatches(reset = false) {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    try {
      const page = reset ? 1 : this.data.page;
      const skip = (page - 1) * PAGE_SIZE;
      const selectedSeason = this.data.selectedSeason;

      // 获取已完成的比赛（result 为胜/平/负）
      const nowISO = new Date().toISOString();

      // 构建查询条件
      let queryCondition = {
        matchDate: _.lt(nowISO),
        result: _.in(['胜', '平', '负'])
      };
      if (selectedSeason) {
        queryCondition.season = selectedSeason;
      }

      // 先确认云数据库中实际有多少条已完成的记录
      const verifyCount = await db.collection('matches')
        .where(queryCondition)
        .count();
      const totalMatches = verifyCount.total;

      // 客户端 get() 最多只返回 20 条，需要分批查询获取所有数据
      const batchSize = 20;
      let allMatches = [];
      for (let i = 0; i < totalMatches; i += batchSize) {
        const batchRes = await db.collection('matches')
          .where(queryCondition)
          .orderBy('matchDate', 'desc')
          .skip(i)
          .limit(batchSize)
          .get();
        allMatches = allMatches.concat(batchRes.data);
      }

      // 统计各种结果
      const wins = allMatches.filter(m => String(m.result).trim() === '胜').length;
      const draws = allMatches.filter(m => String(m.result).trim() === '平').length;
      const losses = allMatches.filter(m => String(m.result).trim() === '负').length;

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

      // 分页获取当前页数据
      const skipPage = (page - 1) * PAGE_SIZE;
      const res = await db.collection('matches')
        .where(queryCondition)
        .orderBy('matchDate', 'desc')
        .skip(skipPage)
        .limit(PAGE_SIZE)
        .get();

      const matches = res.data.map(m => {
        const dateStr = m.matchDate;
        const date = new Date(dateStr);
        return Object.assign({}, m, {
          month: isNaN(date.getMonth()) ? '' : date.getMonth() + 1,
          day: isNaN(date.getDate()) ? '' : date.getDate(),
          resultClass: m.result === '胜' ? 'win' : (m.result === '平' ? 'draw' : 'loss')
        });
      });

      const newMatches = reset ? matches : this.data.matches.concat(matches);
      const hasMore = newMatches.length < totalMatches;

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
