// pages/record-form/record-form.js
const app = getApp();
const { matchAPI, matchRecordAPI, playerAPI } = require('../../utils/http.js');

Page({
  data: {
    matchId: '',
    match: null,
    players: [],
    selectedPlayers: [],
    selectedPlayerRecords: [],
    existingRecords: {} // 已有的记录
  },

  onLoad(options) {
    if (options.matchId) {
      this.setData({ matchId: options.matchId });
      this.loadMatchInfo();
      this.loadPlayers();
    }
  },

  // 加载比赛信息
  async loadMatchInfo() {
    try {
      const match = await matchAPI.getMatch(this.data.matchId);
      const date = new Date(match.scheduleDate || match.matchDate);

      this.setData({
        match: {
          ...match,
          dateStr: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
        }
      });
    } catch (error) {
      console.error('加载比赛信息失败', error);
    }
  },

  // 加载球员列表
  async loadPlayers() {
    try {
      const res = await playerAPI.getPlayers({ isActive: true });
      const players = res || [];

      this.setData({ players });

      // 加载已有的球员记录
      await this.loadExistingRecords();
    } catch (error) {
      console.error('加载球员列表失败', error);
    }
  },

  // 加载已有的球员记录
  async loadExistingRecords() {
    try {
      const res = await matchRecordAPI.getMatchRecordsByMatch(this.data.matchId);
      const records = res || [];

      const existingRecords = {};
      records.forEach(record => {
        existingRecords[record.playerId] = record;
      });

      this.setData({ existingRecords });
    } catch (error) {
      console.error('加载已有记录失败', error);
    }
  },

  // 球员选择变化
  onPlayerSelect(e) {
    const selectedPlayers = e.detail.value;
    this.setData({ selectedPlayers });
    this.updateSelectedPlayerRecords();
  },

  // 更新选中球员的记录表单
  updateSelectedPlayerRecords() {
    const { players, selectedPlayers, existingRecords } = this.data;

    const selectedPlayerRecords = selectedPlayers.map(playerId => {
      const player = players.find(p => (p._id || p.id) === playerId);
      const existing = existingRecords[playerId] || {};

      return {
        playerId,
        playerName: player?.name || '未知',
        position: player?.position || '',
        goals: existing.goals || 0,
        assists: existing.assists || 0,
        yellowCards: existing.yellowCards || 0,
        redCards: existing.redCards || 0,
        rating: existing.rating || 5,
        _id: existing._id || existing.id || ''
      };
    });

    this.setData({ selectedPlayerRecords });
  },

  // 进球数变化
  onGoalChange(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    let value = this.data.selectedPlayerRecords[index].goals;

    if (type === 'plus') value++;
    else if (value > 0) value--;

    this.setData({
      [`selectedPlayerRecords[${index}].goals`]: value
    });
  },

  onGoalInput(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`selectedPlayerRecords[${index}].goals`]: parseInt(e.detail.value) || 0
    });
  },

  // 助攻数变化
  onAssistChange(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    let value = this.data.selectedPlayerRecords[index].assists;

    if (type === 'plus') value++;
    else if (value > 0) value--;

    this.setData({
      [`selectedPlayerRecords[${index}].assists`]: value
    });
  },

  onAssistInput(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`selectedPlayerRecords[${index}].assists`]: parseInt(e.detail.value) || 0
    });
  },

  // 黄牌数变化
  onYellowChange(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    let value = this.data.selectedPlayerRecords[index].yellowCards;

    if (type === 'plus') value++;
    else if (value > 0) value--;

    this.setData({
      [`selectedPlayerRecords[${index}].yellowCards`]: value
    });
  },

  onYellowInput(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`selectedPlayerRecords[${index}].yellowCards`]: parseInt(e.detail.value) || 0
    });
  },

  // 红牌数变化
  onRedChange(e) {
    const index = e.currentTarget.dataset.index;
    const type = e.currentTarget.dataset.type;
    let value = this.data.selectedPlayerRecords[index].redCards;

    if (type === 'plus') value++;
    else if (value > 0) value--;

    this.setData({
      [`selectedPlayerRecords[${index}].redCards`]: value
    });
  },

  onRedInput(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`selectedPlayerRecords[${index}].redCards`]: parseInt(e.detail.value) || 0
    });
  },

  // 评分变化
  onRatingChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      [`selectedPlayerRecords[${index}].rating`]: e.detail.value
    });
  },

  // 提交数据
  async submitData() {
    if (this.data.selectedPlayerRecords.length === 0) {
      wx.showToast({ title: '请选择球员', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 先删除该场比赛的所有已有记录
      const oldRecords = await matchRecordAPI.getMatchRecordsByMatch(this.data.matchId);
      if (oldRecords.data && oldRecords.data.length > 0) {
        for (const record of oldRecords.data) {
          await matchRecordAPI.deleteMatchRecord(record._id || record.id);
        }
      }

      // 添加新记录
      for (const record of this.data.selectedPlayerRecords) {
        await matchRecordAPI.createMatchRecord({
          matchId: this.data.matchId,
          playerId: record.playerId,
          goals: record.goals,
          assists: record.assists,
          yellowCards: record.yellowCards,
          redCards: record.redCards,
          rating: parseFloat(record.rating) || 5,
          minutesPlayed: 90
        });
      }

      wx.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存失败', error);
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
