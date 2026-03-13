// pages/player-detail/player-detail.js
const app = getApp();
const { playerAPI, matchAPI, matchRecordAPI, attendanceAPI } = require('../../utils/http.js');
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
    selectedSeason: '', // 当前选中赛季
    // 分页相关
    page: 1,
    pageSize: 5,
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
      const playerRes = await playerAPI.getPlayer(this.data.playerId);
      const player = playerRes;
      console.log('球员数据:', player);

      if (!player) {
        wx.hideLoading();
        wx.showToast({ title: '球员不存在', icon: 'none' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }

      // 确保 position 是数组
      let positionData = player.position || player.positions || [];
      if (typeof positionData === 'string') {
        positionData = positionData.split(',').map(p => p.trim()).filter(p => p);
      } else if (!Array.isArray(positionData)) {
        positionData = [];
      }
      player.position = positionData;

      // 兼容头像字段
      if (!player.avatar && (player.photo || player.image)) {
        player.avatar = player.photo || player.image;
      }

      // 计算能力值总分
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
        page: 1,
        hasMore: true,
        matchRecords: []
      });

      // 获取当前赛季并加载比赛记录
      await this.loadCurrentSeason();
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

  // 获取当前赛季
  async loadCurrentSeason() {
    try {
      const res = await matchAPI.getMatches({ limit: 1 });
      const matches = res || [];

      let latestSeason = '';
      if (matches.length > 0 && matches[0].season) {
        latestSeason = matches[0].season;
      }

      this.setData({ selectedSeason: latestSeason });
    } catch (error) {
      console.error('获取赛季失败', error);
    }
  },

  // 加载比赛记录
  async loadMatchRecords(isLoadMore = false) {
    if (this.data.loading) return;

    this.setData({ loading: true });

    try {
      const playerId = this.data.playerId;
      const selectedSeason = this.data.selectedSeason;

      // 获取该球员的所有比赛记录
      const recordsRes = await matchRecordAPI.getMatchRecordsByPlayer(playerId);
      const allRecords = recordsRes || [];

      // 获取所有比赛信息
      const matchesRes = await matchAPI.getMatches({ season: selectedSeason, limit: 100 });
      const allMatches = matchesRes || [];

      const matchMap = {};
      allMatches.forEach(m => {
        matchMap[m._id || m.id] = m;
      });

      // 筛选包含该球员的记录
      const playerRecords = allRecords.filter(r => {
        const match = matchMap[r.matchId];
        if (!match) return false;
        if (selectedSeason && match.season !== selectedSeason) return false;
        return true;
      });

      // 按比赛日期降序排序
      const sortedRecords = playerRecords.sort((a, b) => {
        const matchA = matchMap[a.matchId] || {};
        const matchB = matchMap[b.matchId] || {};
        const dateA = new Date(matchA.scheduleDate || matchA.matchDate || 0);
        const dateB = new Date(matchB.scheduleDate || matchB.matchDate || 0);
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
        totalGoals += r.goals || 0;
        totalAssists += r.assists || 0;
      });

      // 构建显示数据
      const matchRecords = pageRecords.map(r => {
        const match = matchMap[r.matchId] || {};
        const date = new Date(match.scheduleDate || match.matchDate);
        return {
          matchId: r.matchId,
          goals: r.goals || 0,
          assists: r.assists || 0,
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

  // 点击加载更多
  loadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadMatchRecords(true);
    }
  },

  // 加载出勤统计
  async loadAttendanceStats() {
    try {
      const recordsRes = await attendanceAPI.getAttendance({ playerId: this.data.playerId });
      const records = recordsRes || [];

      const stats = {
        present: 0,
        leave: 0,
        absent: 0
      };

      records.forEach(r => {
        if (r.status === '参加' || r.status === '出勤') stats.present++;
        else if (r.status === '请假') stats.leave++;
        else if (r.status === '缺席') stats.absent++;
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
    const query = this.createSelectorQuery();
    query.select('#abilityRadar').boundingClientRect((rect) => {
      if (!rect) return;
      const width = rect.width;
      const height = 240;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 25;

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
        const labelR = radius + 18;
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

  // 跳转至比赛详情
  goToMatch(e) {
    const matchId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/match-detail/match-detail?id=${matchId}`
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
            await playerAPI.deletePlayer(this.data.playerId);
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
