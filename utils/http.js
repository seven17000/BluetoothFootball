// utils/http.js
const app = getApp();

// API基础URL - 需要根据实际情况修改
// 开发环境使用localhost，真机调试需要改成实际服务器IP
const API_BASE_URL = 'https://www.bluetoothfc.asia/api';
const STATIC_BASE_URL = 'https://www.bluetoothfc.asia';

/**
 * 处理静态资源URL，返回完整URL
 */
function getStaticUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return STATIC_BASE_URL + path;
}

/**
 * 辅助函数：构建查询字符串
 */
function buildQuery(params) {
  if (!params || Object.keys(params).length === 0) return '';
  const queryParts = [];
  for (const key in params) {
    if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
      queryParts.push(key + '=' + encodeURIComponent(params[key]));
    }
  }
  return queryParts.length > 0 ? '?' + queryParts.join('&') : '';
}

/**
 * 发起网络请求
 * @param {string} url - 请求路径
 * @param {object} options - 请求选项
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : API_BASE_URL + url;

    wx.request({
      url: fullUrl,
      method: options.method || 'GET',
      data: options.data || {},
      header: options.header || {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const data = res.data;
          if (data.code === 0) {
            resolve(data.data);
          } else {
            wx.showToast({
              title: data.message || '请求失败',
              icon: 'none'
            });
            reject(data);
          }
        } else {
          wx.showToast({
            title: '服务器错误',
            icon: 'none'
          });
          reject(res);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
}

// ========== 球员相关 ==========

const playerAPI = {
  // 获取球员列表
  getPlayers(options = {}) {
    const query = buildQuery({
      isActive: options.isActive,
      page: options.page,
      pageSize: options.pageSize
    });
    return request('/players' + query);
  },

  // 获取单个球员
  getPlayer(id) {
    return request('/players/' + id);
  },

  // 创建球员
  createPlayer(data) {
    return request('/players', {
      method: 'POST',
      data
    });
  },

  // 更新球员
  updatePlayer(id, data) {
    return request('/players/' + id, {
      method: 'PUT',
      data
    });
  },

  // 删除球员
  deletePlayer(id) {
    return request('/players/' + id, {
      method: 'DELETE'
    });
  },

  // 获取球员数量
  getPlayerCount() {
    return request('/players/count');
  }
};

// ========== 比赛相关 ==========

const matchAPI = {
  // 获取比赛列表
  getMatches(options = {}) {
    const query = buildQuery({
      season: options.season,
      limit: options.limit
    });
    return request('/matches' + query);
  },

  // 获取单个比赛
  getMatch(id) {
    return request('/matches/' + id);
  },

  // 创建比赛
  createMatch(data) {
    return request('/matches', {
      method: 'POST',
      data
    });
  },

  // 更新比赛
  updateMatch(id, data) {
    return request('/matches/' + id, {
      method: 'PUT',
      data
    });
  },

  // 删除比赛
  deleteMatch(id) {
    return request('/matches/' + id, {
      method: 'DELETE'
    });
  }
};

// ========== 比赛记录相关 ==========

const matchRecordAPI = {
  // 获取比赛记录列表
  getMatchRecords() {
    return request('/match_records');
  },

  // 获取某比赛的记录
  getMatchRecordsByMatch(matchId) {
    return request('/match_records/match/' + matchId);
  },

  // 获取某球员的记录
  getMatchRecordsByPlayer(playerId) {
    return request('/match_records/player/' + playerId);
  },

  // 创建比赛记录
  createMatchRecord(data) {
    return request('/match_records', {
      method: 'POST',
      data
    });
  },

  // 更新比赛记录
  updateMatchRecord(id, data) {
    return request('/match_records/' + id, {
      method: 'PUT',
      data
    });
  },

  // 删除比赛记录
  deleteMatchRecord(id) {
    return request('/match_records/' + id, {
      method: 'DELETE'
    });
  }
};

// ========== 赛程相关 ==========

const scheduleAPI = {
  // 获取赛程列表
  getSchedules() {
    return request('/schedules');
  },

  // 获取单个赛程
  getSchedule(id) {
    return request('/schedules/' + id);
  },

  // 创建赛程
  createSchedule(data) {
    return request('/schedules', {
      method: 'POST',
      data
    });
  },

  // 更新赛程
  updateSchedule(id, data) {
    return request('/schedules/' + id, {
      method: 'PUT',
      data
    });
  },

  // 删除赛程
  deleteSchedule(id) {
    return request('/schedules/' + id, {
      method: 'DELETE'
    });
  }
};

// ========== 考勤相关 ==========

const attendanceAPI = {
  // 获取考勤列表
  getAttendance(options = {}) {
    const query = buildQuery({
      scheduleId: options.scheduleId,
      playerId: options.playerId
    });
    return request('/attendance' + query);
  },

  // 创建考勤记录
  createAttendance(data) {
    return request('/attendance', {
      method: 'POST',
      data
    });
  },

  // 更新考勤记录
  updateAttendance(id, data) {
    return request('/attendance/' + id, {
      method: 'PUT',
      data
    });
  },

  // 删除考勤记录
  deleteAttendance(id) {
    return request('/attendance/' + id, {
      method: 'DELETE'
    });
  }
};

// ========== 用户相关 ==========

const userAPI = {
  // 微信登录
  login(code) {
    return request('/login?code=' + code);
  },

  // 获取用户
  getUser(openid) {
    return request('/users/' + openid);
  },

  // 创建用户
  createUser(data) {
    return request('/users', {
      method: 'POST',
      data
    });
  },

  // 更新用户
  updateUser(openid, data) {
    return request('/users/' + openid, {
      method: 'PUT',
      data
    });
  }
};

// ========== 球队照片相关 ==========

const teamPhotoAPI = {
  // 获取球队照片
  getTeamPhotos() {
    return request('/team_photos');
  },

  // 上传球队照片
  createTeamPhoto(data) {
    return request('/team_photos', {
      method: 'POST',
      data
    });
  },

  // 删除球队照片
  deleteTeamPhoto(id) {
    return request('/team_photos/' + id, {
      method: 'DELETE'
    });
  }
};

// ========== 统计相关 ==========

const statsAPI = {
  // 获取赛季统计
  getSeasonStats(season) {
    const query = season ? '?season=' + encodeURIComponent(season) : '';
    return request('/stats/season' + query);
  },

  // 获取射手榜
  getTopScorers(limit = 10) {
    return request('/stats/top_scorers?limit=' + limit);
  },

  // 获取助攻榜
  getTopAssists(limit = 10) {
    return request('/stats/top_assists?limit=' + limit);
  }
};

module.exports = {
  request,
  getStaticUrl,
  playerAPI,
  matchAPI,
  matchRecordAPI,
  scheduleAPI,
  attendanceAPI,
  userAPI,
  teamPhotoAPI,
  statsAPI
};
