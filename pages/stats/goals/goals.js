// pages/stats/goals/goals.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

const PAGE_SIZE = 20;

Page({
  data: {
    currentTab: 'goals',
    rankList: [],
    chartTitle: '进球榜',
    // 赛季相关
    seasons: [],
    selectedSeason: '',
    // 比赛列表相关
    matchList: [],
    matchPage: 1,
    matchTotal: 0,
    hasMoreMatch: true,
    isLoading: false,
    // 赛季统计
    seasonStats: {
      goals: 0,
      conceded: 0,
      wins: 0,
      draws: 0,
      losses: 0
    }
  },

  onLoad() {
    this.loadSeasons();
  },

  onShow() {
    if (this.data.currentTab === 'matches') {
      if (this.data.matchList.length === 0) {
        this.loadMatchList(true);
      }
    } else {
      this.loadStats();
    }
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
        selectedSeason: defaultSeason
      });

      // 加载对应赛季的统计数据
      await Promise.all([
        this.loadStats(),
        this.loadSeasonStats()
      ]);
    } catch (error) {
      console.error('加载赛季失败', error);
    }
  },

  // 加载赛季统计数据
  async loadSeasonStats() {
    try {
      const selectedSeason = this.data.selectedSeason;

      // 构建查询条件
      let queryCondition = {
        result: _.in(['胜', '平', '负'])
      };
      if (selectedSeason && selectedSeason !== '全部') {
        queryCondition.season = selectedSeason;
      }

      // 获取总数
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
        seasonStats: { goals, conceded, wins, draws, losses }
      });
    } catch (error) {
      console.error('加载赛季统计失败', error);
    }
  },

  // 赛季选择
  onSeasonChange(e) {
    const index = e.detail.value;
    const season = this.data.seasons[index];
    this.setData({ selectedSeason: season });
    // 重新加载数据
    Promise.all([
      this.loadStats(),
      this.loadSeasonStats()
    ]);
    if (this.data.currentTab === 'matches') {
      this.loadMatchList(true);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.currentTab === 'matches') {
      this.loadMatchList(true).then(() => {
        wx.stopPullDownRefresh();
      });
    } else {
      this.loadStats();
      wx.stopPullDownRefresh();
    }
  },

  // 加载更多（比赛列表）
  onReachBottom() {
    if (this.data.currentTab === 'matches' && this.data.hasMoreMatch) {
      this.loadMatchList();
    }
  },

  // 切换Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });

    if (tab === 'matches') {
      // 切换到比赛列表时，如果还没加载则加载
      if (this.data.matchList.length === 0) {
        this.loadMatchList(true);
      }
    } else {
      this.loadStats();
    }
  },

  // 加载统计数据（进球/助攻）
  async loadStats() {
    wx.showLoading({ title: '加载中...' });

    try {
      const currentTab = this.data.currentTab;
      const selectedSeason = this.data.selectedSeason;

      // 构建查询条件
      let queryCondition = {};
      if (selectedSeason && selectedSeason !== '全部') {
        queryCondition.season = selectedSeason;
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

      const matchIds = [];
      for (let i = 0; i < allMatches.length; i++) {
        matchIds.push(allMatches[i]._id);
      }

      if (matchIds.length === 0) {
        this.setData({ rankList: [] });
        wx.hideLoading();
        return;
      }

      // 分批获取球员表现记录（_.in 最多支持20个）
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
        this.setData({ rankList: [] });
        wx.hideLoading();
        return;
      }

      // 按球员ID分组计算进球和助攻
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

      // 根据当前tab计算对应的value并排序
      const rankList = Object.entries(playerStats)
        .map(([playerId, stats]) => {
          const player = playerMap[playerId] || {};
          return {
            playerId,
            name: player.name || '未知',
            position: player.position || '',
            value: currentTab === 'goals' ? stats.goals : stats.assists
          };
        })
        .sort((a, b) => b.value - a.value);

      const titleMap = {
        goals: '进球榜',
        assists: '助攻榜'
      };

      this.setData({
        rankList,
        chartTitle: titleMap[currentTab] || '排行榜'
      });
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 加载比赛列表
  async loadMatchList(reset = false) {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });

    try {
      const page = reset ? 1 : this.data.matchPage;
      const skip = (page - 1) * PAGE_SIZE;
      const selectedSeason = this.data.selectedSeason;

      // 构建查询条件
      let queryCondition = {};
      if (selectedSeason && selectedSeason !== '全部') {
        queryCondition.season = selectedSeason;
      }

      // 获取总数
      const countRes = await db.collection('matches')
        .where(queryCondition)
        .count();
      const total = countRes.total;

      // 获取当前页数据
      const res = await db.collection('matches')
        .where(queryCondition)
        .orderBy('matchDate', 'desc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .get();

      const matchList = res.data.map(function(m) {
        const dateStr = m.matchDate;
        const date = new Date(dateStr);
        return Object.assign({}, m, {
          month: isNaN(date.getMonth()) ? '' : date.getMonth() + 1,
          day: isNaN(date.getDate()) ? '' : date.getDate(),
          resultClass: m.result === '胜' ? 'win' : (m.result === '平' ? 'draw' : 'loss')
        });
      });

      const newList = reset ? matchList : this.data.matchList.concat(matchList);
      const hasMore = newList.length < total;

      this.setData({
        matchList: newList,
        matchPage: page + 1,
        hasMoreMatch: hasMore,
        isLoading: false
      });
    } catch (error) {
      console.error('加载比赛列表失败', error);
      this.setData({ isLoading: false });
    }
  },

  // 跳转至比赛详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/match-detail/match-detail?id=${id}` });
  }
});
