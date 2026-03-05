// pages/player-matches/player-matches.js
const { playerAPI, matchAPI, matchRecordAPI } = require('../../utils/http.js');

Page({
  data: {
    playerId: '',
    playerName: '',
    matchRecords: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    if (options.playerId) {
      this.setData({
        playerId: options.playerId,
        playerName: options.playerName || ''
      });
      wx.setNavigationBarTitle({
        title: options.playerName ? `${options.playerName}的比赛记录` : '比赛记录'
      });
      this.loadPlayerName();
      this.loadMatchRecords();
    }
  },

  // 加载球员名称
  async loadPlayerName() {
    if (!this.data.playerName) {
      try {
        const res = await playerAPI.getPlayer(this.data.playerId);
        if (res) {
          this.setData({ playerName: res.name });
          wx.setNavigationBarTitle({ title: `${res.name}的比赛记录` });
        }
      } catch (error) {
        console.error('加载球员名称失败', error);
      }
    }
  },

  // 加载比赛记录
  async loadMatchRecords(isLoadMore = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const playerId = this.data.playerId;

      // 获取所有比赛记录
      const allRecords = await matchRecordAPI.getMatchRecords();
      
      // 筛选包含该球员的记录
      const playerRecords = allRecords.filter(r => {
        if (r.goalStats && typeof r.goalStats === 'object' && r.goalStats.hasOwnProperty(playerId)) {
          return true;
        }
        if (r.assistStats && typeof r.assistStats === 'object' && r.assistStats.hasOwnProperty(playerId)) {
          return true;
        }
        return false;
      });

      // 获取所有比赛信息
      const allMatches = await matchAPI.getMatches({});
      const matchMap = {};
      allMatches.forEach(m => {
        matchMap[m._id] = m;
      });

      // 按比赛日期降序排序
      const sortedRecords = playerRecords.sort((a, b) => {
        const matchA = matchMap[a.matchId] || {};
        const matchB = matchMap[b.matchId] || {};
        const dateA = new Date(matchA.matchDate || 0);
        const dateB = new Date(matchB.matchDate || 0);
        return dateB - dateA;
      });

      // 分页处理
      const { page, pageSize } = this.data;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageRecords = sortedRecords.slice(start, end);

      // 构建显示数据
      const matchRecords = pageRecords.map(r => {
        const match = matchMap[r.matchId] || {};
        const date = new Date(match.matchDate);
        const goals = r.goalStats?.[playerId] || 0;
        const assists = r.assistStats?.[playerId] || 0;
        return {
          matchId: r.matchId,
          goals,
          assists,
          matchDate: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
          opponent: match.opponent || '未知',
          result: match.result || '-',
          resultClass: match.result === '胜' ? 'win' : (match.result === '平' ? 'draw' : 'loss')
        };
      });

      const totalPages = Math.ceil(sortedRecords.length / pageSize);

      this.setData({
        matchRecords: isLoadMore ? [...this.data.matchRecords, ...matchRecords] : matchRecords,
        hasMore: page < totalPages,
        loading: false
      });
    } catch (error) {
      console.error('加载比赛记录失败', error);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadMatchRecords(true);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.setData({
      page: 1,
      hasMore: true,
      matchRecords: []
    });
    this.loadMatchRecords().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 查看比赛详情
  viewMatchDetail(e) {
    const matchId = e.currentTarget.dataset.matchId;
    wx.navigateTo({
      url: `/pages/match-detail/match-detail?id=${matchId}`
    });
  }
});
