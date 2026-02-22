const app = getApp();
const db = wx.cloud.database();

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
      // 尝试从数据库获取球队信息
      const teamRes = await db.collection('team_info').limit(1).get();

      // 如果数据库中有球员数配置，使用配置的数值
      if (teamRes.data.length > 0) {
        const teamInfo = teamRes.data[0];
        this.setData({
          teamInfoId: teamInfo._id,
          formationDate: teamInfo.formationDate || this.data.formationDate,
          location: teamInfo.location || this.data.location,
          activePlayerCount: teamInfo.activePlayerCount || 0,
          totalPlayerCount: teamInfo.totalPlayerCount || 0,
          description: teamInfo.description || this.data.description
        });
      } else {
        // 获取球员数量
        const playerRes = await db.collection('players').count();
        const totalPlayerCount = playerRes.total;

        // 获取活跃球员数量（今年有出场记录的）
        const matchRes = await db.collection('match_records')
          .where({
            matchId: db.command.exists(true)
          })
          .get();

        // 获取有比赛记录的球员ID
        const playerIds = [...new Set(matchRes.data.map(r => r.playerId))];
        const activePlayerCount = playerIds.length;

        this.setData({
          activePlayerCount,
          totalPlayerCount
        });
      }

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
    const { editData } = this.data;
    if (!editData.formationDate) {
      wx.showToast({ title: '请选择成立时间', icon: 'none' });
      return;
    }
    if (!editData.location) {
      wx.showToast({ title: '请输入成立地点', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      if (this.data.teamInfoId) {
        // 更新已有数据
        await db.collection('team_info').doc(this.data.teamInfoId).update({
          data: {
            formationDate: editData.formationDate,
            location: editData.location,
            activePlayerCount: editData.activePlayerCount,
            totalPlayerCount: editData.totalPlayerCount,
            description: editData.description,
            updatedAt: new Date()
          }
        });
      } else {
        // 创建新数据
        const res = await db.collection('team_info').add({
          data: {
            formationDate: editData.formationDate,
            location: editData.location,
            activePlayerCount: editData.activePlayerCount,
            totalPlayerCount: editData.totalPlayerCount,
            description: editData.description,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        this.setData({ teamInfoId: res._id });
      }

      // 更新页面数据
      this.setData({
        formationDate: editData.formationDate,
        location: editData.location,
        activePlayerCount: editData.activePlayerCount,
        totalPlayerCount: editData.totalPlayerCount,
        description: editData.description,
        showEditModal: false
      });

      // 重新计算成立天数
      this.calculateTeamDays(editData.formationDate);

      wx.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
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
