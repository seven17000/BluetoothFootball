// pages/match-detail/match-detail.js
const app = getApp();
const { matchAPI, matchRecordAPI, playerAPI } = require('../../utils/http.js');

Page({
  data: {
    matchId: '',
    match: null,
    playerRecords: [],
    goalDetails: [],
    isAdmin: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ matchId: options.id });
    }
  },

  onShow() {
    this.setData({ isAdmin: app.isAdmin() });
    if (this.data.matchId) {
      this.loadMatchDetail();
    }
  },

  // 加载比赛详情
  async loadMatchDetail() {
    wx.showLoading({ title: '加载中...' });

    try {
      const match = await matchAPI.getMatch(this.data.matchId);
      const date = new Date(match.scheduleDate || match.matchDate);

      this.setData({
        match: {
          ...match,
          dateStr: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`,
          resultClass: match.result === '胜' ? 'win' : (match.result === '平' ? 'draw' : 'loss')
        }
      });

      // 加载球员表现记录
      await this.loadPlayerRecords();

      // 加载进球详情
      this.loadGoalDetails();
    } catch (error) {
      console.error('加载比赛详情失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载球员表现记录
  async loadPlayerRecords() {
    try {
      const recordsRes = await matchRecordAPI.getMatchRecordsByMatch(this.data.matchId);
      const records = recordsRes.data || [];

      if (records.length > 0) {
        // 获取所有球员ID
        const playerIds = records.map(r => r.playerId);
        const playersRes = await playerAPI.getPlayers();
        const players = playersRes.data || [];

        const playerMap = {};
        players.forEach(p => {
          playerMap[p._id || p.id] = p;
        });

        // 构建球员记录
        const playerRecords = [];
        records.forEach(r => {
          const playerId = r.playerId;
          const player = playerMap[playerId] || {};
          playerRecords.push({
            playerId,
            goals: r.goals || 0,
            assists: r.assists || 0,
            playerName: player.name || '未知',
            position: player.position || ''
          });
        });

        this.setData({ playerRecords });
      }
    } catch (error) {
      console.error('加载球员记录失败', error);
    }
  },

  // 加载进球详情
  loadGoalDetails() {
    const goalDetails = [];
    this.data.playerRecords.forEach(record => {
      if (record.goals > 0) {
        for (let i = 0; i < record.goals; i++) {
          goalDetails.push({
            time: (i + 1) * 15 + Math.floor(Math.random() * 15),
            scorer: record.playerName,
            assist: record.assists > 0 ? '队友' : ''
          });
        }
      }
    });

    this.setData({
      goalDetails: goalDetails.sort((a, b) => a.time - b.time)
    });
  },

  // 编辑比赛
  editMatch() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/match-form/match-form?id=${this.data.matchId}`
    });
  },

  // 录入球员数据
  recordStats() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/record-form/record-form?matchId=${this.data.matchId}`
    });
  },

  // 删除比赛
  deleteMatch() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该比赛吗？相关的球员数据也将被删除。',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });

          try {
            // 删除比赛
            await matchAPI.deleteMatch(this.data.matchId);

            wx.showToast({ title: '删除成功' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (error) {
            console.error('删除失败', error);
            wx.showToast({ title: '删除失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  }
});
