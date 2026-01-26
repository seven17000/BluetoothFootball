/**
 * 工具函数
 */

// 格式化日期
function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const map = {
    'YYYY': year,
    'MM': month.toString().padStart(2, '0'),
    'DD': day.toString().padStart(2, '0'),
    'HH': date.getHours().toString().padStart(2, '0'),
    'mm': date.getMinutes().toString().padStart(2, '0'),
    'ss': date.getSeconds().toString().padStart(2, '0')
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
}

// 格式化时间戳
function formatTimestamp(timestamp, format = 'YYYY-MM-DD') {
  const date = new Date(timestamp);
  return formatDate(date, format);
}

// 比较日期是否相等
function isSameDate(date1, date2) {
  if (!(date1 instanceof Date)) date1 = new Date(date1);
  if (!(date2 instanceof Date)) date2 = new Date(date2);
  return date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();
}

// 获取日期所在月的第一天
function getMonthFirstDay(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// 获取日期所在月的最后一天
function getMonthLastDay(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// 获取日期向前推若干天的日期
function subDays(date, days) {
  if (!(date instanceof Date)) date = new Date(date);
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// 获取日期向后推若干天的日期
function addDays(date, days) {
  if (!(date instanceof Date)) date = new Date(date);
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// 获取两个日期之间的天数
function getDaysBetween(startDate, endDate) {
  if (!(startDate instanceof Date)) startDate = new Date(startDate);
  if (!(endDate instanceof Date)) endDate = new Date(endDate);
  const diffTime = Math.abs(endDate - startDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// 获取某月的天数
function getMonthDays(year, month) {
  return new Date(year, month, 0).getDate();
}

// 生成唯一ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// 数字千分位格式化
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 金额格式化
function formatCurrency(amount) {
  return '¥' + formatNumber(amount);
}

// 手机号格式化
function formatPhone(phone) {
  if (!phone) return '';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// 节流函数
function throttle(fn, interval = 300) {
  let canRun = true;
  return function (...args) {
    if (!canRun) return;
    canRun = false;
    setTimeout(() => {
      fn.apply(this, args);
      canRun = true;
    }, interval);
  };
}

// 防抖函数
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 深拷贝
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloneObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloneObj[key] = deepClone(obj[key]);
      }
    }
    return cloneObj;
  }
}

// 延迟函数
function sleep(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 显示加载提示
function showLoading(title = '加载中') {
  wx.showLoading({
    title: title,
    mask: true
  });
}

// 隐藏加载提示
function hideLoading() {
  wx.hideLoading();
}

// 显示Toast提示
function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({
    title: title,
    icon: icon,
    duration: duration
  });
}

// 显示模态框
function showModal(title, content, showCancel = true) {
  return new Promise((resolve) => {
    wx.showModal({
      title: title,
      content: content,
      showCancel: showCancel,
      success: (res) => {
        resolve(res);
      }
    });
  });
}

// 权限检查
function checkPermission(permission, callback) {
  const app = getApp();
  if (!app.globalData.isLoggedIn) {
    showModal('提示', '请先登录').then((res) => {
      if (res.confirm) {
        wx.navigateTo({
          url: '/pages/profile/profile'
        });
      }
    });
    return false;
  }
  if (callback) {
    callback(app.globalData.userRole);
  }
  return true;
}

module.exports = {
  formatDate,
  formatTimestamp,
  isSameDate,
  getMonthFirstDay,
  getMonthLastDay,
  subDays,
  addDays,
  getDaysBetween,
  getMonthDays,
  generateId,
  formatNumber,
  formatCurrency,
  formatPhone,
  throttle,
  debounce,
  deepClone,
  sleep,
  showLoading,
  hideLoading,
  showToast,
  showModal,
  checkPermission
};
