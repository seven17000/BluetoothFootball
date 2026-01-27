// pages/player-matches/player-matches.js
const db = wx.cloud.database();
const _ = db.command;

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
        const res = await db.collection('players').doc(this.data.playerId).get();
        if (res.data) {
          this.setData({ playerName: res.data.name });
          wx.setNavigationBarTitle({ title: `${res.data.name}的比赛记录` });
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

      // 先获取 match_records 总数
      const countRes = await db.collection('match_records').count();
      const totalRecords = countRes.total;

      // 分批获取所有 match_records（get() 默认最多20条）
      const batchSize = 20;
      const allRecords = [];
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batchRes = await db.collection('match_records')
          .skip(i)
          .limit(batchSize)
          .get();
        allRecords.push(...(batchRes.data || []));
      }

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

      // 按 matchId 去重（同一比赛可能有多条记录）
      const uniqueRecords = [];
      const seenMatchIds = new Set();
      for (const r of playerRecords) {
        if (!seenMatchIds.has(r.matchId)) {
          seenMatchIds.add(r.matchId);
          uniqueRecords.push(r);
        }
      }

      // 先获取所有比赛信息用于排序
      const allMatchIds = uniqueRecords.map(r => r.matchId);
      const matchBatchSize = 20;
      const allMatches = [];
      for (let i = 0; i < allMatchIds.length; i += matchBatchSize) {
        const batchIds = allMatchIds.slice(i, i + matchBatchSize);
        const matches = await db.collection('matches')
          .where({ _id: _.in(batchIds) })
          .get();
        allMatches.push(...matches.data);
      }

      const matchMap = {};
      allMatches.forEach(m => {
        matchMap[m._id] = m;
      });

      // 按比赛日期降序排序
      const sortedRecords = uniqueRecords.sort((a, b) => {
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
