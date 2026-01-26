// pages/schedule-form/schedule-form.js
const app = getApp();
const db = wx.cloud.database();
const { EVENT_TYPES } = require('../../utils/constants.js');

Page({
  data: {
    scheduleId: '',
    isEdit: false,
    formData: {
      title: '',
      type: '',
      typeLabel: '',
      date: '',
      time: '15:00',
      location: '',
      description: '',
      reminder: false
    },
    eventTypes: EVENT_TYPES
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        scheduleId: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑日程' });
      this.loadScheduleData();
    } else {
      // 默认今天
      const today = new Date();
      const date = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      this.setData({ 'formData.date': date });
    }
  },

  // 加载日程数据
  async loadScheduleData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await db.collection('schedules').doc(this.data.scheduleId).get();
      const schedule = res.data;
      const date = new Date(schedule.date);

      const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // 查找类型标签
      const typeInfo = this.data.eventTypes.find(t => t.value === schedule.type);

      this.setData({
        formData: {
          ...schedule,
          date: dateStr,
          time: timeStr,
          typeLabel: typeInfo?.label || schedule.type
        }
      });
    } catch (error) {
      console.error('加载日程失败', error);
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
  },

  // 类型选择
  onTypeChange(e) {
    const index = e.detail.value;
    const type = this.data.eventTypes[index];
    this.setData({
      'formData.type': type.value,
      'formData.typeLabel': type.label
    });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.date': e.detail.value
    });
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      'formData.time': e.detail.value
    });
  },

  // 提醒开关
  onReminderChange(e) {
    this.setData({
      'formData.reminder': e.detail.value
    });
  },

  // 提交表单
  async submitForm() {
    const { title, type, date, time } = this.data.formData;

    // 验证必填项
    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' });
      return;
    }
    if (!type) {
      wx.showToast({ title: '请选择类型', icon: 'none' });
      return;
    }
    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const dateTime = new Date(`${date}T${time}:00`);

      const formData = {
        ...this.data.formData,
        date: dateTime,
        updateTime: new Date()
      };

      if (this.data.isEdit) {
        await db.collection('schedules').doc(this.data.scheduleId).update({
          data: formData
        });
      } else {
        formData.createTime = new Date();
        await db.collection('schedules').add({
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
