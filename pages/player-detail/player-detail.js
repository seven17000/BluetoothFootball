// pages/player-detail/player-detail.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;
const { ABILITY_CONFIG, FORM_ABILITY_CONFIG } = require('../../utils/constants.js');

Page({
  data: {
    player: null,
    matchRecords: [],
    stats: {
      goals: 0,
      assists: 0,
      matches: 0
    },
    abilityList: ABILITY_CONFIG,  // 雷达图展示的能力
    allAbilityList: FORM_ABILITY_CONFIG, // 所有能力字段（用于计算总分）
    abilityTotal: 0,
    isAdmin: false,
    // 分页相关
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ playerId: options.id });
    }
  },

  onShow() {
    this.setData({
      isAdmin: app.isAdmin()
    });
    if (this.data.playerId) {
      this.loadPlayerDetail();
    }
  },

  // 加载球员详情
  async loadPlayerDetail() {
    wx.showLoading({ title: '加载中...' });

    try {
      const playerRes = await db.collection('players').doc(this.data.playerId).get();
      const player = playerRes.data;

      if (!player) {
        wx.hideLoading();
        wx.showToast({ title: '球员不存在', icon: 'none' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      // 计算能力值总分（使用所有能力字段）
      let total = 0;
      let count = 0;
      this.data.allAbilityList.forEach(item => {
        if (player.ability && player.ability[item.key]) {
          total += player.ability[item.key];
          count++;
        }
      });
      const abilityTotal = count > 0 ? Math.round(total / count) : 0;

      this.setData({
        player,
        abilityTotal,
        // 重置分页状态
        page: 1,
        hasMore: true,
        matchRecords: []
      });

      // 加载比赛记录
      await this.loadMatchRecords();

      // 绘制雷达图
      this.drawRadarChart();
    } catch (error) {
      console.error('加载球员详情失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载比赛记录（适配 goalStats/assistStats: {playerId: count} 格式，支持分页）
  async loadMatchRecords(isLoadMore = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const playerId = this.data.playerId;

      // 先获取 match_records 总数
      const countRes = await db.collection('match_records').count();
      const totalRecords = countRes.total;

      // 分批获取所有 match_records（get() 默认最多20条）
      const batchSize = 20;
      const allRecords = [];
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batchRes = await db.collection('match_records')
          .skip(i)
          .limit(batchSize)
          .get();
        allRecords.push(...(batchRes.data || []));
      }

      // 筛选包含该球员的记录
      const playerRecords = allRecords.filter(r => {
        if (r.goalStats && typeof r.goalStats === 'object' && r.goalStats.hasOwnProperty(playerId)) {
          return true;
        }
        if (r.assistStats && typeof r.assistStats === 'object' && r.assistStats.hasOwnProperty(playerId)) {
          return true;
        }
        return false;
      });

      // 按 matchId 去重（同一比赛可能有多条记录）
      const uniqueRecords = [];
      const seenMatchIds = new Set();
      for (const r of playerRecords) {
        if (!seenMatchIds.has(r.matchId)) {
          seenMatchIds.add(r.matchId);
          uniqueRecords.push(r);
        }
      }

      // 获取所有比赛信息用于排序
      const allMatchIds = uniqueRecords.map(r => r.matchId);
      const matchBatchSize = 20;
      const allMatches = [];
      for (let i = 0; i < allMatchIds.length; i += matchBatchSize) {
        const batchIds = allMatchIds.slice(i, i + matchBatchSize);
        const matches = await db.collection('matches')
          .where({ _id: _.in(batchIds) })
          .get();
        allMatches.push(...matches.data);
      }

      const matchMap = {};
      allMatches.forEach(m => {
        matchMap[m._id] = m;
      });

      // 按比赛日期降序排序
      const sortedRecords = uniqueRecords.sort((a, b) => {
        const matchA = matchMap[a.matchId] || {};
        const matchB = matchMap[b.matchId] || {};
        const dateA = new Date(matchA.matchDate || 0);
        const dateB = new Date(matchB.matchDate || 0);
        return dateB - dateA;
      });

      // 分页处理
      const { page, pageSize } = this.data;
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const pageRecords = sortedRecords.slice(start, end);

      // 计算总进球、助攻
      let totalGoals = 0;
      let totalAssists = 0;
      sortedRecords.forEach(r => {
        totalGoals += r.goalStats?.[playerId] || 0;
        totalAssists += r.assistStats?.[playerId] || 0;
      });

      // 构建显示数据
      const matchRecords = pageRecords.map(r => {
        const match = matchMap[r.matchId] || {};
        const date = new Date(match.matchDate);
        const goals = r.goalStats?.[playerId] || 0;
        const assists = r.assistStats?.[playerId] || 0;
        return {
          matchId: r.matchId,
          goals,
          assists,
          matchDate: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
          opponent: match.opponent || '未知',
          result: match.result || '-',
          resultClass: match.result === '胜' ? 'win' : (match.result === '平' ? 'draw' : 'loss')
        };
      });

      const totalPages = Math.ceil(sortedRecords.length / pageSize);

      this.setData({
        matchRecords: isLoadMore ? [...this.data.matchRecords, ...matchRecords] : matchRecords,
        'stats.goals': totalGoals,
        'stats.assists': totalAssists,
        'stats.matches': sortedRecords.length,
        hasMore: page < totalPages,
        loading: false
      });
    } catch (error) {
      console.error('加载比赛记录失败', error);
      this.setData({ loading: false });
    }
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadMatchRecords(true);
    }
  },

  // 加载出勤统计
  async loadAttendanceStats() {
    try {
      const records = await db.collection('attendance')
        .where({
          playerId: this.data.playerId
        })
        .get();

      const stats = {
        present: 0,
        leave: 0,
        absent: 0
      };

      records.data.forEach(r => {
        if (r.status === '出勤') stats.present++;
        else if (r.status === '请假') stats.leave++;
        else if (r.status === '缺勤') stats.absent++;
      });

      // 计算出勤率
      const total = stats.present + stats.leave + stats.absent;
      const attendanceRate = total > 0 ? Math.round((stats.present / total) * 100) : 0;

      this.setData({
        attendanceStats: stats,
        'stats.attendanceRate': attendanceRate
      });
    } catch (error) {
      console.error('加载出勤统计失败', error);
    }
  },

  // 绘制能力值雷达图
  drawRadarChart() {
    const ctx = wx.createCanvasContext('abilityRadar', this);
    // 获取 Canvas 实际宽度（rpx 转 px）
    const query = this.createSelectorQuery();
    query.select('#abilityRadar').boundingClientRect((rect) => {
      if (!rect) return;
      const width = rect.width;
      const height = 240; // 减小高度
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 25; // 自适应半径

      const ability = this.data.player.ability || {};
      const values = this.data.abilityList.map(item => ability[item.key] || 0);
      const maxValue = 100;
      const angleStep = (Math.PI * 2) / this.data.abilityList.length;

      // 绘制背景网格
      ctx.setStrokeStyle('#f0f0f0');
      ctx.setLineWidth(1);

      for (let i = 1; i <= 4; i++) {
        const r = (radius / 4) * i;
        ctx.beginPath();
        for (let j = 0; j < this.data.abilityList.length; j++) {
          const angle = j * angleStep - Math.PI / 2;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;
          if (j === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }

      // 绘制数据区域
      ctx.setFillStyle('rgba(102, 126, 234, 0.3)');
      ctx.setStrokeStyle('#667eea');
      ctx.setLineWidth(2);
      ctx.beginPath();

      for (let i = 0; i < this.data.abilityList.length; i++) {
        const value = values[i];
        const r = (value / maxValue) * radius;
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 绘制顶点
      values.forEach((value, i) => {
        const r = (value / maxValue) * radius;
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.setFillStyle('#667eea');
        ctx.fill();
      });

      // 绘制能力值标签
      ctx.setFontSize(10);
      ctx.setFillStyle('#666');
      this.data.abilityList.forEach((item, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const labelR = radius + 18; // 标签位置稍向外
        const x = centerX + Math.cos(angle) * labelR;
        const y = centerY + Math.sin(angle) * labelR;
        ctx.setTextAlign('center');
        ctx.setTextBaseline('middle');
        ctx.fillText(item.label, x, y);
      });

      ctx.draw();
    }).exec();
  },

  // 查看全部比赛记录
  viewAllMatches() {
    const { playerId, player } = this.data;
    wx.navigateTo({
      url: `/pages/player-matches/player-matches?playerId=${playerId}&playerName=${player.name || ''}`
    });
  },

  // 编辑球员
  editPlayer() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/player-form/player-form?id=${this.data.playerId}`
    });
  },

  // 删除球员
  deletePlayer() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该球员吗？此操作不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('players').doc(this.data.playerId).remove();
            wx.showToast({ title: '删除成功' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (error) {
            console.error('删除失败', error);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});
