// pages/schedule-form/schedule-form.js
const app = getApp();
const { scheduleAPI } = require('../../utils/http.js');

Page({
  data: {
    scheduleId: '',
    isEdit: false,
    isReadonly: false,
    formData: {
      opponent: '',
      scheduleDate: '',
      scheduleTime: '15:00',
      isHome: true,
      location: '',
      notes: '',
      jerseyColor: '',
      opponentJersey: ''
    }
  },

  onLoad(options) {
    // 判断是否为只读模式
    const isReadonly = options.readonly === 'true';

    if (options.id) {
      this.setData({
        scheduleId: options.id,
        isEdit: true,
        isReadonly: isReadonly
      });
      wx.setNavigationBarTitle({ title: isReadonly ? '赛程详情' : '编辑赛程' });
      this.loadScheduleData();
    } else {
      // 默认今天日期
      const today = new Date();
      const scheduleDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      this.setData({ 'formData.scheduleDate': scheduleDate });
    }
  },

  // 加载赛程数据
  async loadScheduleData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const schedule = await scheduleAPI.getSchedule(this.data.scheduleId);

      const date = new Date(schedule.date);
      const isValidDate = !isNaN(date.getTime());

      // 分离日期和时间
      const scheduleDate = isValidDate
        ? `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
        : '';
      const scheduleTime = isValidDate
        ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        : '15:00';

      this.setData({
        formData: {
          ...this.data.formData,
          ...schedule,
          scheduleDate,
          scheduleTime
        }
      });
    } catch (error) {
      console.error('加载赛程数据失败', error);
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

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.scheduleDate': e.detail.value
    });
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      'formData.scheduleTime': e.detail.value
    });
  },

  // 主客场选择
  onHomeChange(e) {
    this.setData({
      'formData.isHome': e.detail.value === 'true'
    });
  },

  // 提交表单
  async submitForm() {
    const { opponent, scheduleDate } = this.data.formData;

    // 验证必填项
    if (!opponent.trim()) {
      wx.showToast({ title: '请输入对手名称', icon: 'none' });
      return;
    }
    if (!scheduleDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 组合日期时间，格式化为 ISO 字符串保存
      const dateParts = this.data.formData.scheduleDate.split('-').map(Number);
      const year = dateParts[0];
      const month = dateParts[1];
      const day = dateParts[2];
      const timeParts = (this.data.formData.scheduleTime || '15:00').split(':').map(Number);
      const hours = timeParts[0];
      const minutes = timeParts[1];
      // 创建本地时间Date对象，然后转ISO字符串
      const localDate = new Date(year, month - 1, day, hours, minutes);
      const dateISO = localDate.toISOString();

      const formData = {
        opponent: this.data.formData.opponent,
        date: dateISO,
        isHome: this.data.formData.isHome,
        location: this.data.formData.location || '',
        notes: this.data.formData.notes || '',
        jerseyColor: this.data.formData.jerseyColor || '',
        opponentJersey: this.data.formData.opponentJersey || '',
        updateTime: new Date().toISOString()
      };

      if (this.data.isEdit) {
        await scheduleAPI.updateSchedule(this.data.scheduleId, formData);
      } else {
        formData.createTime = new Date().toISOString();
        await scheduleAPI.createSchedule(formData);
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
