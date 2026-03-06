// pages/players/players.js
const app = getApp();
const { playerAPI } = require('../../utils/http.js');

const PAGE_SIZE = 10;

Page({
  data: {
    players: [],
    keyword: '',
    position: '',
    isAdmin: false,
    isLoading: true,
    // 分页相关
    page: 1,
    total: 0,
    hasMore: true,
    isLoadingMore: false
  },

  onLoad() {
    this.setData({
      isAdmin: app.isAdmin()
    });
  },

  onShow() {
    this.loadPlayers(true);
  },

  // 加载球员列表
  async loadPlayers(reset = false) {
    if (reset) {
      this.setData({ page: 1, hasMore: true, isLoading: true, players: [] });
    }

    if (!this.data.hasMore && !reset) return;

    const isFirstLoad = reset && this.data.page === 1;
    if (isFirstLoad) {
      this.setData({ isLoading: true });
    } else {
      this.setData({ isLoadingMore: true });
    }

    try {
      // 获取球员列表（由于后端暂时不支持复杂筛选，先获取全部）
      const players = await playerAPI.getPlayers({ isActive: true, pageSize: 100 });

      const newPlayers = (players || []).map(player => {
        // 确保 position 是数组（兼容旧的 positions 字段）
        let positionData = player.position || player.positions || [];
        if (typeof positionData === 'string') {
          positionData = positionData.split(',').map(p => p.trim()).filter(p => p);
        } else if (!Array.isArray(positionData)) {
          positionData = [];
        }
        player.position = positionData;
        player._id = player._id || player.id;

        // 兼容头像字段
        if (!player.avatar && (player.photo || player.image)) {
          player.avatar = player.photo || player.image;
        }
        return player;
      });

      // 关键词搜索（前端筛选）
      let filteredPlayers = newPlayers;
      if (this.data.keyword) {
        const keyword = this.data.keyword.toLowerCase();
        filteredPlayers = newPlayers.filter(p => p.name && p.name.toLowerCase().includes(keyword));
      }

      // 位置筛选（前端筛选）
      if (this.data.position) {
        filteredPlayers = filteredPlayers.filter(p => {
          const positions = p.position || [];
          return positions.includes(this.data.position);
        });
      }

      // 按号码排序
      filteredPlayers.sort((a, b) => {
        const numA = parseInt(a.number) || 0;
        const numB = parseInt(b.number) || 0;
        return numA - numB;
      });

      // 分页
      const page = reset ? 1 : this.data.page;
      const skip = (page - 1) * PAGE_SIZE;
      const pagedPlayers = filteredPlayers.slice(skip, skip + PAGE_SIZE);

      const allPlayers = reset ? pagedPlayers : this.data.players.concat(pagedPlayers);

      this.setData({
        players: allPlayers,
        total: filteredPlayers.length,
        hasMore: allPlayers.length < filteredPlayers.length,
        page: page + 1,
        isLoading: false,
        isLoadingMore: false
      });
    } catch (error) {
      console.error('加载球员失败', error);
      this.setData({ isLoading: false, isLoadingMore: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // 加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.loadPlayers(false);
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadPlayers(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 搜索
  onSearch(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    // 防抖处理
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.loadPlayers(true);
    }, 300);
  },

  // 按位置筛选
  filterByPosition(e) {
    const position = e.currentTarget.dataset.position;
    this.setData({ position });
    this.loadPlayers(true);
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
