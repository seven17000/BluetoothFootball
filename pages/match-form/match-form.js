// pages/match-form/match-form.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    matchId: '',
    isEdit: false,
    formData: {
      opponent: '',
      matchDate: '',
      matchTime: '15:00',
      isHome: true,
      location: '',
      goals: '',
      conceded: '',
      notes: ''
    },
    resultText: '待定',
    resultClass: '',
    // 球员列表
    players: [],
    // 出勤球员
    attendancePlayers: [],
    // 进球记录 [{playerId, playerName, count}]
    goalRecords: [],
    // 助攻记录 [{playerId, playerName, count}]
    assistRecords: [],
    // 临时选择
    selectedGoalPlayer: '',
    selectedAssistPlayer: '',
    selectedGoalPlayerName: '',
    selectedAssistPlayerName: '',
    // 统计
    totalGoals: 0,
    totalAssists: 0
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        matchId: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑比赛' });
      this.loadMatchData();
    } else {
      // 默认今天日期
      const today = new Date();
      const matchDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      this.setData({ 'formData.matchDate': matchDate });
      this.calculateResult();
    }
    this.loadPlayers();
  },

  // 加载球员列表
  async loadPlayers() {
    try {
      const res = await db.collection('players')
        .where({ isActive: true })
        .orderBy('number', 'asc')
        .get();
      this.setData({ players: res.data });
    } catch (error) {
      console.error('加载球员失败', error);
    }
  },

  // 加载比赛数据
  async loadMatchData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await db.collection('matches').doc(this.data.matchId).get();
      const match = res.data;
      const date = new Date(match.matchDate);

      // 分离日期和时间
      const matchDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const matchTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      this.setData({
        formData: {
          ...this.data.formData,
          ...match,
          matchDate,
          matchTime
        },
        attendancePlayers: match.attendancePlayers || [],
        goalRecords: match.goalRecords || [],
        assistRecords: match.assistRecords || []
      });

      this.updateTotals();
      this.calculateResult();
    } catch (error) {
      console.error('加载比赛数据失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 输入事件
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
    this.calculateResult();
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.matchDate': e.detail.value
    });
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      'formData.matchTime': e.detail.value
    });
  },

  // 主客场选择
  onHomeChange(e) {
    this.setData({
      'formData.isHome': e.detail.value === 'true'
    });
  },

  // 计算比赛结果
  calculateResult() {
    const { goals, conceded } = this.data.formData;
    let resultText = '待定';
    let resultClass = '';

    if (goals !== '' && conceded !== '') {
      const g = parseInt(goals);
      const c = parseInt(conceded);
      if (g > c) {
        resultText = '胜';
        resultClass = 'win';
      } else if (g === c) {
        resultText = '平';
        resultClass = 'draw';
      } else {
        resultText = '负';
        resultClass = 'loss';
      }
    }

    this.setData({ resultText, resultClass });
  },

  // 出勤球员选择
  onAttendanceChange(e) {
    this.setData({
      attendancePlayers: e.detail.value
    });
  },

  // 全选出勤
  selectAllAttendance() {
    const allIds = this.data.players.map(p => p._id);
    this.setData({ attendancePlayers: allIds });
  },

  // 清空出勤
  clearAllAttendance() {
    this.setData({ attendancePlayers: [] });
  },

  // 选择进球球员
  onGoalPlayerChange(e) {
    const index = e.detail.value;
    const player = this.data.players[index];
    if (player) {
      this.setData({
        selectedGoalPlayer: player._id,
        selectedGoalPlayerName: player.name
      });
    }
  },

  // 添加进球记录
  addGoalRecord() {
    const playerId = this.data.selectedGoalPlayer;
    if (!playerId) {
      wx.showToast({ title: '请选择球员', icon: 'none' });
      return;
    }

    const player = this.data.players.find(p => p._id === playerId);
    const goalRecords = [...this.data.goalRecords];
    const existingIndex = goalRecords.findIndex(r => r.playerId === playerId);

    if (existingIndex > -1) {
      goalRecords[existingIndex].count += 1;
    } else {
      goalRecords.push({
        playerId,
        playerName: player.name,
        playerNumber: player.number,
        count: 1
      });
    }

    this.setData({
      goalRecords,
      selectedGoalPlayer: '',
      selectedGoalPlayerName: ''
    });
    this.updateTotals();
  },

  // 减少进球
  decreaseGoal(e) {
    const playerId = e.currentTarget.dataset.playerid;
    const goalRecords = [...this.data.goalRecords];
    const index = goalRecords.findIndex(r => r.playerId === playerId);

    if (index > -1) {
      if (goalRecords[index].count > 1) {
        goalRecords[index].count -= 1;
      } else {
        goalRecords.splice(index, 1);
      }
      this.setData({ goalRecords });
      this.updateTotals();
    }
  },

  // 增加进球
  increaseGoal(e) {
    const playerId = e.currentTarget.dataset.playerid;
    const goalRecords = [...this.data.goalRecords];
    const index = goalRecords.findIndex(r => r.playerId === playerId);

    if (index > -1) {
      goalRecords[index].count += 1;
      this.setData({ goalRecords });
      this.updateTotals();
    }
  },

  // 删除进球记录
  removeGoalRecord(e) {
    const playerId = e.currentTarget.dataset.playerid;
    const goalRecords = this.data.goalRecords.filter(r => r.playerId !== playerId);
    this.setData({ goalRecords });
    this.updateTotals();
  },

  // 选择助攻球员
  onAssistPlayerChange(e) {
    const index = e.detail.value;
    const player = this.data.players[index];
    if (player) {
      this.setData({
        selectedAssistPlayer: player._id,
        selectedAssistPlayerName: player.name
      });
    }
  },

  // 添加助攻记录
  addAssistRecord() {
    const playerId = this.data.selectedAssistPlayer;
    if (!playerId) {
      wx.showToast({ title: '请选择球员', icon: 'none' });
      return;
    }

    const player = this.data.players.find(p => p._id === playerId);
    const assistRecords = [...this.data.assistRecords];
    const existingIndex = assistRecords.findIndex(r => r.playerId === playerId);

    if (existingIndex > -1) {
      assistRecords[existingIndex].count += 1;
    } else {
      assistRecords.push({
        playerId,
        playerName: player.name,
        playerNumber: player.number,
        count: 1
      });
    }

    this.setData({
      assistRecords,
      selectedAssistPlayer: '',
      selectedAssistPlayerName: ''
    });
    this.updateTotals();
  },

  // 减少助攻
  decreaseAssist(e) {
    const playerId = e.currentTarget.dataset.playerid;
    const assistRecords = [...this.data.assistRecords];
    const index = assistRecords.findIndex(r => r.playerId === playerId);

    if (index > -1) {
      if (assistRecords[index].count > 1) {
        assistRecords[index].count -= 1;
      } else {
        assistRecords.splice(index, 1);
      }
      this.setData({ assistRecords });
      this.updateTotals();
    }
  },

  // 增加助攻
  increaseAssist(e) {
    const playerId = e.currentTarget.dataset.playerid;
    const assistRecords = [...this.data.assistRecords];
    const index = assistRecords.findIndex(r => r.playerId === playerId);

    if (index > -1) {
      assistRecords[index].count += 1;
      this.setData({ assistRecords });
      this.updateTotals();
    }
  },

  // 删除助攻记录
  removeAssistRecord(e) {
    const playerId = e.currentTarget.dataset.playerid;
    const assistRecords = this.data.assistRecords.filter(r => r.playerId !== playerId);
    this.setData({ assistRecords });
    this.updateTotals();
  },

  // 更新总数统计
  updateTotals() {
    const totalGoals = this.data.goalRecords.reduce((sum, r) => sum + r.count, 0);
    const totalAssists = this.data.assistRecords.reduce((sum, r) => sum + r.count, 0);
    this.setData({ totalGoals, totalAssists });
  },

  // 提交表单
  async submitForm() {
    const { opponent, matchDate, goals, conceded } = this.data.formData;

    // 验证必填项
    if (!opponent.trim()) {
      wx.showToast({ title: '请输入对手名称', icon: 'none' });
      return;
    }
    if (!matchDate) {
      wx.showToast({ title: '请选择比赛日期', icon: 'none' });
      return;
    }
    if (goals === '') {
      wx.showToast({ title: '请输入进球数', icon: 'none' });
      return;
    }
    if (conceded === '') {
      wx.showToast({ title: '请输入失球数', icon: 'none' });
      return;
    }

    // 验证出勤人数
    if (this.data.attendancePlayers.length === 0) {
      wx.showToast({ title: '请选择出勤球员', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 组合日期时间
      const matchDateTime = new Date(`${this.data.formData.matchDate}T${this.data.formData.matchTime || '15:00'}:00`);

      const formData = {
        ...this.data.formData,
        goals: parseInt(this.data.formData.goals) || 0,
        conceded: parseInt(this.data.formData.conceded) || 0,
        result: this.data.resultText,
        matchDate: matchDateTime,
        attendancePlayers: this.data.attendancePlayers,
        goalRecords: this.data.goalRecords,
        assistRecords: this.data.assistRecords,
        updateTime: new Date()
      };

      if (this.data.isEdit) {
        await db.collection('matches').doc(this.data.matchId).update({
          data: formData
        });
      } else {
        formData.createTime = new Date();
        await db.collection('matches').add({
          data: formData
        });
      }

      wx.showToast({ title: '保存成功' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存失败', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
