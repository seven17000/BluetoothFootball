// pages/attendance/attendance.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;
const { EVENT_TYPES, ATTENDANCE_STATUS } = require('../../utils/constants.js');

Page({
  data: {
    isAdmin: false,
    players: [],
    attendanceRecords: [],
    selectedPlayers: [],
    formData: {
      date: '',
      eventType: '',
      eventTypeLabel: '',
      status: '出勤',
      reason: ''
    },
    eventTypes: EVENT_TYPES,
    filterType: '',
    filterTypeLabel: '',
    filterMonth: ''
  },

  onLoad() {
    this.setData({ isAdmin: app.isAdmin() });
    if (!this.data.isAdmin) {
      this.setData({ formData: { status: '出勤' } });
    }
  },

  onShow() {
    this.loadPlayers();
    this.loadAttendanceRecords();
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

  // 加载出勤记录
  async loadAttendanceRecords() {
    wx.showLoading({ title: '加载中...' });

    try {
      let query = db.collection('attendance').orderBy('eventDate', 'desc');

      // 筛选类型
      if (this.data.filterType) {
        query = query.where({ eventType: this.data.filterType });
      }

      const res = await query.get();

      if (res.data.length > 0) {
        const playerIds = [...new Set(res.data.map(r => r.playerId))];
        const players = await db.collection('players')
          .where({ _id: _.in(playerIds) })
          .get();

        const playerMap = {};
        players.data.forEach(p => {
          playerMap[p._id] = { name: p.name, number: p.number };
        });

        // 按日期分组
        const grouped = {};
        res.data.forEach(record => {
          const date = new Date(record.eventDate);
          const dateKey = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }

          grouped[dateKey].push({
            ...record,
            playerName: playerMap[record.playerId]?.name || '未知',
            playerNumber: playerMap[record.playerId]?.number || 0,
            statusClass: record.status === '出勤' ? 'present' : (record.status === '请假' ? 'leave' : 'absent')
          });
        });

        const attendanceRecords = Object.keys(grouped).map(date => ({
          date,
          records: grouped[date]
        }));

        this.setData({ attendanceRecords });
      } else {
        this.setData({ attendanceRecords: [] });
      }
    } catch (error) {
      console.error('加载出勤记录失败', error);
    } finally {
      wx.hideLoading();
    }
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    });
  },

  // 事件类型选择
  onEventTypeChange(e) {
    const index = e.detail.value;
    const type = this.data.eventTypes[index];
    this.setData({
      'formData.eventType': type.value,
      'formData.eventTypeLabel': type.label
    });
  },

  // 球员选择
  onPlayerSelect(e) {
    this.setData({
      selectedPlayers: e.detail.value
    });
  },

  // 状态选择
  onStatusChange(e) {
    this.setData({
      'formData.status': e.detail.value
    });
  },

  // 请假原因输入
  onReasonInput(e) {
    this.setData({
      'formData.reason': e.detail.value
    });
  },

  // 筛选-类型
  onFilterTypeChange(e) {
    const index = e.detail.value;
    if (index == 0) {
      this.setData({ filterType: '', filterTypeLabel: '' });
    } else {
      const type = this.data.eventTypes[index - 1];
      this.setData({ filterType: type.value, filterTypeLabel: type.label });
    }
    this.loadAttendanceRecords();
  },

  // 筛选-月份
  onFilterMonthChange(e) {
    this.setData({ filterMonth: e.detail.value });
  },

  // 添加记录
  async addRecord() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }

    const { date, eventType, selectedPlayers, status, reason } = this.data;

    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }
    if (!eventType) {
      wx.showToast({ title: '请选择类型', icon: 'none' });
      return;
    }
    if (selectedPlayers.length === 0) {
      wx.showToast({ title: '请选择球员', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const eventDate = new Date(date);
      const batch = db.batch();

      selectedPlayers.forEach(playerId => {
        batch.add('attendance', {
          playerId,
          eventType,
          eventDate,
          status,
          reason: status === '请假' ? reason : '',
          createTime: new Date()
        });
      });

      await batch.commit();

      wx.showToast({ title: '添加成功' });
      this.resetForm();
      this.loadAttendanceRecords();
    } catch (error) {
      console.error('添加失败', error);
      wx.showToast({ title: '添加失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 重置表单
  resetForm() {
    this.setData({
      selectedPlayers: [],
      formData: {
        date: '',
        eventType: '',
        eventTypeLabel: '',
        status: '出勤',
        reason: ''
      }
    });
  }
});
