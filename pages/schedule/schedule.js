// pages/schedule/schedule.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;
const { MONTHS, WEEKS } = require('../../utils/constants.js');

Page({
  data: {
    weekDays: WEEKS,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth() + 1,
    calendarDays: [],
    schedules: [],
    selectedDate: '',
    dayEvents: [],
    isAdmin: false
  },

  onLoad(options) {
    this.setData({ isAdmin: app.isAdmin() });
    this.initCalendar();
  },

  onShow() {
    this.loadSchedules();
  },

  // 初始化日历
  initCalendar() {
    const year = this.data.currentYear;
    const month = this.data.currentMonth;

    // 获取当月第一天是星期几
    const firstDay = new Date(year, month - 1, 1).getDay();
    // 获取当月天数
    const daysInMonth = new Date(year, month, 0).getDate();
    // 获取上月天数
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const calendarDays = [];
    const today = new Date();

    // 填充上月日期
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      calendarDays.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 2, day)
      });
    }

    // 填充当月日期
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      calendarDays.push({
        day: i,
        isCurrentMonth: true,
        isToday: date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate(),
        date
      });
    }

    // 填充下月日期
    const remaining = 42 - calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
      calendarDays.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month, i)
      });
    }

    // 计算选中日期
    const selectedDate = `${year}年${month}月${today.getDate()}日`;
    const selectedDateStr = `${year}-${month.toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    this.setData({
      calendarDays: calendarDays.map(d => ({
        ...d,
        dateStr: `${d.date.getFullYear()}-${(d.date.getMonth() + 1).toString().padStart(2, '0')}-${d.date.getDate().toString().padStart(2, '0')}`,
        events: []
      })),
      selectedDate,
      selectedDateStr
    });
  },

  // 加载日程
  async loadSchedules() {
    try {
      const res = await db.collection('schedules').get();
      const schedules = res.data;

      // 更新日历中的事件
      const calendarDays = this.data.calendarDays.map(day => {
        const events = schedules.filter(s => {
          const scheduleDate = new Date(s.date);
          return scheduleDate.getFullYear() === day.date.getFullYear() &&
            scheduleDate.getMonth() === day.date.getMonth() &&
            scheduleDate.getDate() === day.date.getDate();
        });

        return {
          ...day,
          events: events.map(e => ({
            typeClass: e.type === '比赛' ? 'match' : (e.type === '训练' ? 'training' : 'meeting')
          }))
        };
      });

      this.setData({
        schedules,
        calendarDays
      });

      // 更新当日事件
      this.updateDayEvents(this.data.selectedDateStr);
    } catch (error) {
      console.error('加载日程失败', error);
    }
  },

  // 上个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 1) {
      currentYear--;
      currentMonth = 12;
    } else {
      currentMonth--;
    }
    this.setData({ currentYear, currentMonth });
    this.initCalendar();
    this.loadSchedules();
  },

  // 下个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data;
    if (currentMonth === 12) {
      currentYear++;
      currentMonth = 1;
    } else {
      currentMonth++;
    }
    this.setData({ currentYear, currentMonth });
    this.initCalendar();
    this.loadSchedules();
  },

  // 点击日期
  onDayClick(e) {
    const dateStr = e.currentTarget.dataset.date;
    const date = new Date(dateStr);
    const selectedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;

    // 更新选中状态
    const calendarDays = this.data.calendarDays.map(day => ({
      ...day,
      selected: day.dateStr === dateStr
    }));

    this.setData({
      calendarDays,
      selectedDate,
      selectedDateStr: dateStr
    });

    // 更新当日事件
    this.updateDayEvents(dateStr);
  },

  // 更新当日事件
  updateDayEvents(dateStr) {
    const dayEvents = this.data.schedules.filter(s => {
      const scheduleDate = new Date(s.date);
      const scheduleDateStr = `${scheduleDate.getFullYear()}-${(scheduleDate.getMonth() + 1).toString().padStart(2, '0')}-${scheduleDate.getDate().toString().padStart(2, '0')}`;
      return scheduleDateStr === dateStr;
    }).map(s => {
      const date = new Date(s.date);
      return {
        ...s,
        time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
        typeClass: s.type === '比赛' ? 'match' : (s.type === '训练' ? 'training' : 'meeting')
      };
    });

    this.setData({ dayEvents });
  },

  // 添加日程
  addEvent() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/schedule-form/schedule-form' });
  },

  // 编辑日程
  editEvent(e) {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/schedule-form/schedule-form?id=${id}` });
  },

  // 删除日程
  deleteEvent(e) {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }

    const id = e.currentTarget.dataset.id;

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该日程吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('schedules').doc(id).remove();
            wx.showToast({ title: '删除成功' });
            this.loadSchedules();
          } catch (error) {
            console.error('删除失败', error);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
