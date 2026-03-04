// pages/match-form/match-form.js
const app = getApp();
const { playerAPI, matchAPI, matchRecordAPI, attendanceAPI } = require('../../utils/http.js');

// 生成年份列表（2001至今）
function generateYearRange() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear; i >= 2001; i--) {
    years.push(String(i));
  }
  return years;
}

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
      season: '',
      notes: ''
    },
    // 年份选择器
    seasons: generateYearRange(),
    selectedSeasonIndex: 0,
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
    // 默认当前年份
    const currentYear = String(new Date().getFullYear());
    const seasons = this.data.seasons;
    const defaultIndex = seasons.indexOf(currentYear);

    if (options.id) {
      this.setData({
        matchId: options.id,
        isEdit: true,
        selectedSeasonIndex: defaultIndex >= 0 ? defaultIndex : 0
      });
      wx.setNavigationBarTitle({ title: '编辑比赛' });
      this.loadMatchData();
    } else {
      // 默认今天日期和当前赛季
      const today = new Date();
      const matchDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      this.setData({
        'formData.matchDate': matchDate,
        'formData.season': currentYear,
        selectedSeasonIndex: defaultIndex >= 0 ? defaultIndex : 0
      });
      this.calculateResult();
    }
    this.loadPlayers();
  },

  // 赛季选择
  onSeasonChange(e) {
    const index = parseInt(e.detail.value);
    const season = this.data.seasons[index];
    this.setData({
      'formData.season': season,
      selectedSeasonIndex: index
    });
  },

  // 加载球员列表
  async loadPlayers() {
    try {
      const res = await playerAPI.getPlayers();
      const players = res.data || [];
      this.setData({ players });
    } catch (error) {
      console.error('加载球员失败', error);
    }
  },

  // 加载比赛数据
  async loadMatchData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const match = await matchAPI.getMatch(this.data.matchId);

      // 分离日期和时间
      const date = new Date(match.scheduleDate || match.matchDate);
      const matchDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const matchTime = match.scheduleTime ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}` : '15:00';

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
    const index = parseInt(e.detail.value);
    this.setData({
      'formData.isHome': index === 0 // 0=主场, 1=客场
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
    const allIds = this.data.players.map(p => p._id || p.id);
    this.setData({ attendancePlayers: allIds });
  },

  // 清空出勤
  clearAllAttendance() {
    this.setData({ attendancePlayers: [] });
  },

  // 选择进球球员
  onGoalPlayerChange(e) {
    var index = parseInt(e.detail.value);
    var player = this.data.players[index];
    if (player) {
      this.setData({
        selectedGoalPlayer: player._id || player.id,
        selectedGoalPlayerName: player.name
      });
    }
  },

  // 添加进球记录
  addGoalRecord() {
    var playerId = this.data.selectedGoalPlayer;
    if (!playerId) {
      wx.showToast({ title: '请选择球员', icon: 'none' });
      return;
    }

    var player = null;
    for (var i = 0; i < this.data.players.length; i++) {
      const pid = this.data.players[i]._id || this.data.players[i].id;
      if (pid === playerId) {
        player = this.data.players[i];
        break;
      }
    }

    var goalRecords = [...this.data.goalRecords];
    var existingIndex = -1;
    for (var j = 0; j < goalRecords.length; j++) {
      if (goalRecords[j].playerId === playerId) {
        existingIndex = j;
        break;
      }
    }

    if (existingIndex > -1) {
      goalRecords[existingIndex].count += 1;
    } else {
      goalRecords.push({
        playerId: playerId,
        playerName: player.name,
        playerNumber: player.number,
        count: 1
      });
    }

    this.setData({
      goalRecords: goalRecords,
      selectedGoalPlayer: '',
      selectedGoalPlayerName: ''
    });
    this.updateTotals();
  },

  // 选择助攻球员
  onAssistPlayerChange(e) {
    var index = parseInt(e.detail.value);
    var player = this.data.players[index];
    if (player) {
      this.setData({
        selectedAssistPlayer: player._id || player.id,
        selectedAssistPlayerName: player.name
      });
    }
  },

  // 添加助攻记录
  addAssistRecord() {
    var playerId = this.data.selectedAssistPlayer;
    if (!playerId) {
      wx.showToast({ title: '请选择球员', icon: 'none' });
      return;
    }

    var player = null;
    for (var i = 0; i < this.data.players.length; i++) {
      const pid = this.data.players[i]._id || this.data.players[i].id;
      if (pid === playerId) {
        player = this.data.players[i];
        break;
      }
    }

    var assistRecords = [...this.data.assistRecords];
    var existingIndex = -1;
    for (var j = 0; j < assistRecords.length; j++) {
      if (assistRecords[j].playerId === playerId) {
        existingIndex = j;
        break;
      }
    }

    if (existingIndex > -1) {
      assistRecords[existingIndex].count += 1;
    } else {
      assistRecords.push({
        playerId: playerId,
        playerName: player.name,
        playerNumber: player.number,
        count: 1
      });
    }

    this.setData({
      assistRecords: assistRecords,
      selectedAssistPlayer: '',
      selectedAssistPlayerName: ''
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

  // 保存球员表现记录
  async saveMatchRecords(matchId) {
    try {
      // 先删除旧的记录
      const oldRecords = await matchRecordAPI.getMatchRecordsByMatch(matchId);
      if (oldRecords.data && oldRecords.data.length > 0) {
        for (const record of oldRecords.data) {
          await matchRecordAPI.deleteMatchRecord(record._id || record.id);
        }
      }

      // 构建进球统计对象 {playerId: count}
      const goalStats = {};
      this.data.goalRecords.forEach(r => {
        goalStats[r.playerId] = r.count;
      });

      // 构建助攻统计对象 {playerId: count}
      const assistStats = {};
      this.data.assistRecords.forEach(r => {
        assistStats[r.playerId] = r.count;
      });

      // 创建记录
      await matchRecordAPI.createMatchRecord({
        matchId: matchId,
        goalStats: goalStats,
        assistStats: assistStats
      });

      // 保存出勤记录
      const presentPlayers = this.data.attendancePlayers || [];
      const allPlayers = this.data.players || [];
      const absentPlayers = allPlayers
        .filter(p => !presentPlayers.includes(p._id || p.id))
        .map(p => p._id || p.id);

      await attendanceAPI.createAttendance({
        matchId: matchId,
        presentPlayers: presentPlayers,
        absentPlayers: absentPlayers,
        date: this.data.formData.matchDate
      });
    } catch (error) {
      console.error('保存球员记录失败', error);
      throw error;
    }
  },

  // 提交表单
  async submitForm() {
    const { opponent, matchDate, goals, conceded, season } = this.data.formData;

    // 验证必填项
    if (!opponent.trim()) {
      wx.showToast({ title: '请输入对手名称', icon: 'none' });
      return;
    }
    if (!season) {
      wx.showToast({ title: '请选择赛季', icon: 'none' });
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
      const formData = {
        opponent: this.data.formData.opponent,
        scheduleDate: this.data.formData.matchDate,
        scheduleTime: this.data.formData.matchTime || '15:00',
        isHome: this.data.formData.isHome,
        location: this.data.formData.location,
        goals: parseInt(this.data.formData.goals) || 0,
        conceded: parseInt(this.data.formData.conceded) || 0,
        season: this.data.formData.season,
        notes: this.data.formData.notes,
        attendancePlayers: this.data.attendancePlayers,
        goalRecords: this.data.goalRecords,
        assistRecords: this.data.assistRecords,
        updateTime: new Date().toISOString()
      };

      if (this.data.isEdit) {
        await matchAPI.updateMatch(this.data.matchId, formData);
        await this.saveMatchRecords(this.data.matchId);
      } else {
        formData.createTime = new Date().toISOString();
        const matchRes = await matchAPI.createMatch(formData);
        await this.saveMatchRecords(matchRes.id || matchRes._id);
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
