/**
 * 常量定义
 */

// 球员位置
const POSITIONS = [
  { value: '前锋', label: '前锋' },
  { value: '中场', label: '中场' },
  { value: '后卫', label: '后卫' },
  { value: '门将', label: '门将' }
];

// 比赛结果
const MATCH_RESULTS = [
  { value: '胜', label: '胜', color: '#52c41a' },
  { value: '平', label: '平', color: '#faad14' },
  { value: '负', label: '负', color: '#fa5151' }
];

// 出勤状态
const ATTENDANCE_STATUS = [
  { value: '出勤', label: '出勤', color: '#52c41a' },
  { value: '请假', label: '请假', color: '#faad14' },
  { value: '缺勤', label: '缺勤', color: '#fa5151' }
];

// 球员标签
const PLAYER_TAGS = [
  { value: '队长', label: '队长' },
  { value: '副队长', label: '副队长' },
  { value: '核心球员', label: '核心球员' },
  { value: '替补', label: '替补' },
  { value: '新星', label: '新星' },
  { value: '老将', label: '老将' },
  { value: '门将', label: '门将' },
  { value: '射手', label: '射手' },
  { value: '助攻王', label: '助攻王' },
  { value: '精神领袖', label: '精神领袖' }
];

// 能力值配置
const ABILITY_CONFIG = [
  { key: 'power', label: '力量', icon: '💪' },
  { key: 'stamina', label: '体能', icon: '⚡' },
  { key: 'shooting', label: '射门', icon: '⚽' },
  { key: 'dribbling', label: '盘带', icon: '🏃' },
  { key: 'technique', label: '技巧', icon: '🎯' },
  { key: 'iq', label: '球商', icon: '🧠' }
];

// 活动类型
const EVENT_TYPES = [
  { value: '训练', label: '训练', color: '#1890ff' },
  { value: '比赛', label: '比赛', color: '#52c41a' },
  { value: '会议', label: '会议', color: '#722ed1' }
];

// 角色定义
const ROLES = [
  { value: 'admin', label: '管理员' },
  { value: 'user', label: '普通用户' }
];

// 赛季列表
const SEASONS = [
  { value: '2024-2025', label: '2024-2025赛季' },
  { value: '2023-2024', label: '2023-2024赛季' },
  { value: '2022-2023', label: '2022-2023赛季' },
  { value: '2021-2022', label: '2021-2022赛季' }
];

// 月份中文
const MONTHS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// 星期中文
const WEEKS = ['日', '一', '二', '三', '四', '五', '六'];

// 数据库集合名称
const COLLECTIONS = {
  PLAYERS: 'players',
  MATCHES: 'matches',
  MATCH_RECORDS: 'match_records',
  ATTENDANCE: 'attendance',
  USERS: 'users',
  SCHEDULES: 'schedules'
};

// 缓存Key
const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  LAST_SYNC_TIME: 'lastSyncTime'
};

// 错误码
const ERROR_CODES = {
  SUCCESS: 0,
  NOT_LOGIN: 1001,
  NO_PERMISSION: 1002,
  DATA_NOT_FOUND: 1003,
  PARAM_ERROR: 1004,
  SERVER_ERROR: 1005
};

module.exports = {
  POSITIONS,
  MATCH_RESULTS,
  ATTENDANCE_STATUS,
  EVENT_TYPES,
  ROLES,
  SEASONS,
  MONTHS,
  WEEKS,
  COLLECTIONS,
  STORAGE_KEYS,
  ERROR_CODES
};
