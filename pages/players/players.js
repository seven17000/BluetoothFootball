// pages/players/players.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

Page({
  data: {
    players: [],
    keyword: '',
    position: '',
    isAdmin: false,
    isLoading: true
  },

  onLoad() {
    this.setData({
      isAdmin: app.isAdmin()
    });
  },

  onShow() {
    this.loadPlayers();
  },

  // 加载球员列表
  async loadPlayers() {
    this.setData({ isLoading: true });

    try {
      let query = db.collection('players').where({
        isActive: true
      });

      // 关键词搜索
      if (this.data.keyword) {
        query = query.where({
          name: db.RegExp({
            regexp: this.data.keyword,
            options: 'i'
          })
        });
      }

      // 位置筛选
      if (this.data.position) {
        query = query.where({
          position: this.data.position
        });
      }

      const res = await query.orderBy('number', 'asc').get();
      this.setData({
        players: res.data,
        isLoading: false
      });
    } catch (error) {
      console.error('加载球员失败', error);
      this.setData({ isLoading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 搜索
  onSearch(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    // 防抖处理
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.loadPlayers();
    }, 300);
  },

  // 按位置筛选
  filterByPosition(e) {
    const position = e.currentTarget.dataset.position;
    this.setData({ position });
    this.loadPlayers();
  },

  // 跳转至球员详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/player-detail/player-detail?id=${id}` });
  },

  // 添加球员
  addPlayer() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/player-form/player-form' });
  }
});
