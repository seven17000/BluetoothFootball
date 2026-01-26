// pages/player-detail/player-detail.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;
const { ABILITY_CONFIG } = require('../../utils/constants.js');

Page({
  data: {
    player: null,
    matchRecords: [],
    attendanceStats: {
      present: 0,
      leave: 0,
      absent: 0
    },
    abilityList: ABILITY_CONFIG,
    abilityTotal: 0,
    isAdmin: false
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

      // 计算能力值总分
      let total = 0;
      let count = 0;
      this.data.abilityList.forEach(item => {
        if (player.ability && player.ability[item.key]) {
          total += player.ability[item.key];
          count++;
        }
      });
      const abilityTotal = count > 0 ? Math.round(total / count) : 0;

      this.setData({
        player,
        abilityTotal
      });

      // 加载比赛记录
      await this.loadMatchRecords();

      // 加载出勤统计
      await this.loadAttendanceStats();

      // 绘制雷达图
      this.drawRadarChart();
    } catch (error) {
      console.error('加载球员详情失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载比赛记录
  async loadMatchRecords() {
    try {
      // 获取该球员的所有比赛记录
      const records = await db.collection('match_records')
        .where({
          playerId: this.data.playerId
        })
        .orderBy('matchDate', 'desc')
        .get();

      if (records.data.length > 0) {
        const matchIds = [...new Set(records.data.map(r => r.matchId))];
        const matches = await db.collection('matches')
          .where({
            _id: _.in(matchIds)
          })
          .get();

        const matchMap = {};
        matches.data.forEach(m => {
          matchMap[m._id] = m;
        });

        const matchRecords = records.data.map(r => {
          const match = matchMap[r.matchId] || {};
          const date = new Date(match.matchDate);
          return {
            ...r,
            matchDate: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`,
            opponent: match.opponent || '未知',
            result: match.result || '-',
            resultClass: match.result === '胜' ? 'win' : (match.result === '平' ? 'draw' : 'loss')
          };
        });

        this.setData({ matchRecords });
      }
    } catch (error) {
      console.error('加载比赛记录失败', error);
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

      this.setData({ attendanceStats: stats });
    } catch (error) {
      console.error('加载出勤统计失败', error);
    }
  },

  // 绘制能力值雷达图
  drawRadarChart() {
    const ctx = wx.createCanvasContext('abilityRadar', this);
    const width = 280;
    const height = 280;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 100;

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

    ctx.draw();
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
