// pages/schedule/schedule.js
const app = getApp();
const { scheduleAPI } = require('../../utils/http.js');

Page({
  data: {
    schedules: [],
    isAdmin: false
  },

  onLoad() {
    this.setData({ isAdmin: app.isAdmin() });
  },

  onShow() {
    this.loadSchedules();
  },

  onPullDownRefresh() {
    this.loadSchedules();
    wx.stopPullDownRefresh();
  },

  // 加载赛程列表
  async loadSchedules() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await scheduleAPI.getSchedules();
      const schedulesData = res || [];

      // 客户端过滤未来赛程（避免时区问题）
      const nowTime = Date.now();
      const futureSchedules = schedulesData.filter(s => {
        const date = new Date(s.date);
        return !isNaN(date.getTime()) && date.getTime() > nowTime;
      });

      const schedules = futureSchedules.map(s => {
        const date = new Date(s.date);
        return Object.assign({}, s, {
          day: date.getDate(),
          month: date.getMonth() + 1,
          time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
          typeClass: 'match'
        });
      });

      this.setData({ schedules });
    } catch (error) {
      console.error('加载赛程失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 跳转至赛程详情
  goToScheduleDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/schedule-form/schedule-form?id=${id}` });
  },

  // 添加赛程
  addSchedule() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/schedule-form/schedule-form' });
  }
});
