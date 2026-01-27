// pages/match-detail/match-detail.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

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
      const matchRes = await db.collection('matches').doc(this.data.matchId).get();
      const match = matchRes.data;
      const date = new Date(match.matchDate);

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

  // 加载球员表现记录（适配 goalStats/assistStats: {playerId: count} 格式）
  async loadPlayerRecords() {
    try {
      const recordsRes = await db.collection('match_records')
        .where({
          matchId: this.data.matchId
        })
        .get();

      const records = recordsRes.data || [];

      if (records.length > 0) {
        // 从 goalStats 和 assistStats 中提取所有球员ID
        const playerIdSet = new Set();
        records.forEach(r => {
          if (r.goalStats && typeof r.goalStats === 'object') {
            Object.keys(r.goalStats).forEach(id => playerIdSet.add(id));
          }
          if (r.assistStats && typeof r.assistStats === 'object') {
            Object.keys(r.assistStats).forEach(id => playerIdSet.add(id));
          }
        });

        const playerIds = Array.from(playerIdSet);
        const players = await db.collection('players')
          .where({
            _id: _.in(playerIds)
          })
          .get();

        const playerMap = {};
        players.data.forEach(p => {
          playerMap[p._id] = p;
        });

        // 构建球员记录（每条记录代表一个球员在一场比赛中的表现）
        const playerRecords = [];
        records.forEach(r => {
          // 从 goalStats 获取进球数据
          if (r.goalStats && typeof r.goalStats === 'object') {
            Object.entries(r.goalStats).forEach(([playerId, goals]) => {
              playerRecords.push({
                playerId,
                goals,
                assists: r.assistStats?.[playerId] || 0,
                playerName: playerMap[playerId]?.name || '未知',
                position: playerMap[playerId]?.position || ''
              });
            });
          }
          // 从 assistStats 获取助攻数据（只出现在 assistStats 中的球员）
          if (r.assistStats && typeof r.assistStats === 'object') {
            Object.entries(r.assistStats).forEach(([playerId, assists]) => {
              // 如果这个球员已经在 goalStats 中处理过了，跳过
              const existing = playerRecords.find(pr => pr.playerId === playerId && pr.goals > 0);
              if (!existing) {
                playerRecords.push({
                  playerId,
                  goals: 0,
                  assists,
                  playerName: playerMap[playerId]?.name || '未知',
                  position: playerMap[playerId]?.position || ''
                });
              }
            });
          }
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
            time: (i + 1) * 15 + Math.floor(Math.random() * 15), // 模拟进球时间
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
            await db.collection('matches').doc(this.data.matchId).remove();

            // 删除相关球员记录
            await db.collection('match_records')
              .where({ matchId: this.data.matchId })
              .remove();

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
