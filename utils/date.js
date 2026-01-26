/**
 * 日期处理工具
 */

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const WEEKS = ['日', '一', '二', '三', '四', '五', '六'];

/**
 * 格式化日期
 * @param {Date|number|string} date - 日期对象或时间戳或日期字符串
 * @param {string} format - 格式化模板
 * @returns {string} 格式化后的日期字符串
 */
function format(date, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = d.getSeconds();
  const week = d.getDay();

  const map = {
    'YYYY': year,
    'MM': month.toString().padStart(2, '0'),
    'DD': day.toString().padStart(2, '0'),
    'HH': hour.toString().padStart(2, '0'),
    'mm': minute.toString().padStart(2, '0'),
    'ss': second.toString().padStart(2, '0'),
    'W': WEEKS[week],
    'M': MONTHS[month - 1]
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss|W|M/g, (matched) => map[matched]);
}

/**
 * 获取今天日期
 * @returns {Date}
 */
function today() {
  return new Date();
}

/**
 * 获取某月的第一天
 * @param {Date} date
 * @returns {Date}
 */
function getMonthFirstDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * 获取某月的最后一天
 * @param {Date} date
 * @returns {Date}
 */
function getMonthLastDay(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * 获取某月的天数
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
function getMonthDays(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * 获取某月的日历数据
 * @param {Date} date
 * @returns {Array}
 */
function getMonthCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = getMonthDays(year, month + 1);
  const calendar = [];

  // 填充空白天数
  for (let i = 0; i < firstDay; i++) {
    calendar.push({
      day: null,
      isCurrentMonth: false
    });
  }

  // 填充日期
  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(year, month, i);
    const isToday = isSameDate(currentDate, today());
    calendar.push({
      year,
      month,
      day: i,
      date: currentDate,
      isCurrentMonth: true,
      isToday
    });
  }

  return calendar;
}

/**
 * 比较两个日期是否相等
 * @param {Date} date1
 * @param {Date} date2
 * @returns {boolean}
 */
function isSameDate(date1, date2) {
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

/**
 * 日期加减
 * @param {Date} date
 * @param {number} days - 天数，正数为加，负数为减
 * @returns {Date}
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 获取相对时间描述
 * @param {Date} date
 * @returns {string}
 */
function fromNow(date) {
  const now = new Date();
  const target = date instanceof Date ? date : new Date(date);
  const diff = now - target;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return days + '天前';
  }
  if (hours > 0) {
    return hours + '小时前';
  }
  if (minutes > 0) {
    return minutes + '分钟前';
  }
  return '刚刚';
}

module.exports = {
  MONTHS,
  WEEKS,
  format,
  today,
  getMonthFirstDay,
  getMonthLastDay,
  getMonthDays,
  getMonthCalendar,
  isSameDate,
  addDays,
  fromNow
};
