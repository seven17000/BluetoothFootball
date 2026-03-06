// pages/stats/goals/goals.js
const app = getApp();
const { statsAPI, matchAPI, playerAPI } = require('../../../utils/http.js');

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
    // 如果赛季还没加载完成，跳过这次调用，等待 loadSeasons 完成后自动加载
    if (this.data.seasons.length === 0) {
      return;
    }

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
      const res = await matchAPI.getMatches({ limit: 100 });
      const allMatches = res || [];

      // 提取所有唯一赛季
      const seasonsMap = {};
      allMatches.forEach(function(m) {
        if (m.season) {
          seasonsMap[m.season] = true;
        }
      });
      const uniqueSeasons = Object.keys(seasonsMap).sort().reverse();

      // 添加"全部"选项
      const allSeasons = ['全部'].concat(uniqueSeasons);

      // 默认选择最新赛季
      const defaultSeason = uniqueSeasons.length > 0 ? uniqueSeasons[0] : '全部';

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

      // 获取符合条件的比赛
      const res = await matchAPI.getMatches({ season: selectedSeason === '全部' ? '' : selectedSeason, limit: 100 });
      const allMatches = res || [];

      // 过滤有结果的比赛
      const finishedMatches = allMatches.filter(m => m.result && ['胜', '平', '负'].includes(String(m.result).trim()));

      const wins = finishedMatches.filter(m => String(m.result).trim() === '胜').length;
      const draws = finishedMatches.filter(m => String(m.result).trim() === '平').length;
      const losses = finishedMatches.filter(m => String(m.result).trim() === '负').length;
      const goals = finishedMatches.reduce((sum, m) => sum + (m.goals || 0), 0);
      const conceded = finishedMatches.reduce((sum, m) => sum + (m.conceded || 0), 0);

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

      // 获取射手榜或助攻榜
      let rankList = [];
      if (currentTab === 'goals') {
        const res = await statsAPI.getTopScorers(20);
        rankList = res || [];
      } else {
        const res = await statsAPI.getTopAssists(20);
        rankList = res || [];
      }

      // 处理球员信息
      if (rankList.length > 0) {
        const playerIds = rankList.map(r => r.playerId);
        const playersRes = await playerAPI.getPlayers();
        const players = playersRes || [];

        const playerMap = {};
        players.forEach(p => {
          playerMap[p._id || p.id] = p;
        });

        rankList = rankList.map(item => {
          const player = playerMap[item.playerId] || {};
          return {
            playerId: item.playerId,
            name: player.name || item.name || '未知',
            position: player.position ? (Array.isArray(player.position) ? player.position.join(' / ') : player.position) : '',
            avatar: player.avatar || '',
            number: player.number || '',
            value: item.totalGoals || item.totalAssists || item.goals || item.assists || 0
          };
        });
      }

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
      const selectedSeason = this.data.selectedSeason;

      // 获取比赛列表
      const res = await matchAPI.getMatches({ season: selectedSeason === '全部' ? '' : selectedSeason, limit: 100 });
      const allMatches = res || [];

      // 按日期降序排序
      allMatches.sort((a, b) => {
        return new Date(b.scheduleDate || b.matchDate) - new Date(a.scheduleDate || a.matchDate);
      });

      const total = allMatches.length;
      const skip = (page - 1) * PAGE_SIZE;
      const pageMatches = allMatches.slice(skip, skip + PAGE_SIZE);

      const matchList = pageMatches.map(function(m) {
        const dateStr = m.scheduleDate || m.matchDate;
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
