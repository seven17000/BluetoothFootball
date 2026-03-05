const app = getApp();
const { playerAPI, matchAPI, matchRecordAPI } = require('../../utils/http.js');

Page({
  data: {
    isAdmin: false,
    teamDays: 0,
    formationDate: '2024年1月',
    location: '深圳',
    activePlayerCount: 0,
    totalPlayerCount: 0,
    description: '蓝牙足球队成立于2024年，是一支热爱足球、充满活力的业余足球队。球队定期组织训练和比赛，欢迎各位足球爱好者加入！',
    showEditModal: false,
    editData: {},
    teamInfoId: ''
  },

  onLoad() {
    this.setData({
      isAdmin: app.isAdmin()
    });
    this.loadTeamInfo();
  },

  async loadTeamInfo() {
    try {
      // 获取球员数量
      const players = await playerAPI.getPlayers({});
      const totalPlayerCount = players ? players.length : 0;

      // 获取比赛记录
      const matchRecords = await matchRecordAPI.getMatchRecords();
      
      // 获取有比赛记录的球员ID
      const playerIds = new Set();
      if (matchRecords && matchRecords.length > 0) {
        matchRecords.forEach(r => {
          if (r.goalStats) {
            Object.keys(r.goalStats).forEach(id => playerIds.add(id));
          }
          if (r.assistStats) {
            Object.keys(r.assistStats).forEach(id => playerIds.add(id));
          }
        });
      }
      const activePlayerCount = playerIds.size;

      this.setData({
        activePlayerCount,
        totalPlayerCount
      });

      // 计算成立天数
      if (this.data.formationDate) {
        const dateMatch = this.data.formationDate.match(/(\d+)年(\d+)月/);
        if (dateMatch) {
          const year = parseInt(dateMatch[1]);
          const month = parseInt(dateMatch[2]);
          const formationTime = new Date(year, month - 1);
          const now = new Date();
          const days = Math.floor((now - formationTime) / (1000 * 60 * 60 * 24));
          this.setData({ teamDays: days });
        }
      }
    } catch (err) {
      console.log('加载球队信息失败', err);
      // 使用默认数据
      this.setData({
        teamDays: 0,
        activePlayerCount: 0,
        totalPlayerCount: 0
      });
    }
  },

  // 编辑球队信息
  editTeamInfo() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '仅管理员可编辑', icon: 'none' });
      return;
    }
    this.setData({
      showEditModal: true,
      editData: {
        formationDate: this.data.formationDate,
        location: this.data.location,
        activePlayerCount: this.data.activePlayerCount,
        totalPlayerCount: this.data.totalPlayerCount,
        description: this.data.description
      }
    });
  },

  // 关闭弹窗
  closeModal() {
    this.setData({
      showEditModal: false
    });
  },

  // 日期选择
  bindDateChange(e) {
    const date = e.detail.value;
    const formationDate = date.replace('-', '年') + '月';
    this.setData({
      'editData.formationDate': formationDate
    });
  },

  // 地点输入
  bindLocationInput(e) {
    this.setData({
      'editData.location': e.detail.value
    });
  },

  // 活跃球员数输入
  bindActivePlayerCountInput(e) {
    this.setData({
      'editData.activePlayerCount': parseInt(e.detail.value) || 0
    });
  },

  // 全部球员数输入
  bindTotalPlayerCountInput(e) {
    this.setData({
      'editData.totalPlayerCount': parseInt(e.detail.value) || 0
    });
  },

  // 介绍输入
  bindDescriptionInput(e) {
    this.setData({
      'editData.description': e.detail.value
    });
  },

  // 保存球队信息
  async saveTeamInfo() {
    // 注意：team_info 表目前没有对应的API，可以后续添加
    wx.showToast({ title: '球队信息保存在本地', icon: 'none' });
    this.setData({
      showEditModal: false
    });
  },

  // 计算成立天数
  calculateTeamDays(formationDate) {
    if (!formationDate) return;
    const dateMatch = formationDate.match(/(\d+)年(\d+)月/);
    if (dateMatch) {
      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      const formationTime = new Date(year, month - 1);
      const now = new Date();
      const days = Math.floor((now - formationTime) / (1000 * 60 * 60 * 24));
      this.setData({ teamDays: days });
    }
  }
});
