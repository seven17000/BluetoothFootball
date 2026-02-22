// pages/players/players.js
const app = getApp();
const db = wx.cloud.database();
const _ = db.command;

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
      let query = db.collection('players');

      // 关键词搜索
      if (this.data.keyword) {
        query = query.where({
          name: db.RegExp({
            regexp: this.data.keyword,
            options: 'i'
          })
        });
      }

      // 位置筛选 - Cloud DB 直接用值查询数组字段是否包含该值
      if (this.data.position) {
        query = query.where({
          position: this.data.position
        });
      }

      // 搜索或筛选时重置分页
      if (this.data.keyword || this.data.position) {
        this.setData({ page: 1, hasMore: true });
      }

      // 如果是重置，使用 page 1；否则使用当前页码
      const page = reset ? 1 : this.data.page;
      const skip = (page - 1) * PAGE_SIZE;

      // 获取总数 - 需要重新创建不含 orderBy 的查询
      let countQuery = db.collection('players');
      if (this.data.keyword) {
        countQuery = countQuery.where({
          name: db.RegExp({
            regexp: this.data.keyword,
            options: 'i'
          })
        });
      }
      if (this.data.position) {
        countQuery = countQuery.where({
          position: this.data.position
        });
      }
      const countRes = await countQuery.count();
      const total = countRes.total;

      // 获取当前页数据
      const res = await query.orderBy('number', 'asc')
        .skip(skip)
        .limit(PAGE_SIZE)
        .get();

      const newPlayers = res.data.map(player => {
        // 确保 position 是数组（兼容旧的 positions 字段）
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
        return player;
      });
      const allPlayers = reset ? newPlayers : this.data.players.concat(newPlayers);

      this.setData({
        players: allPlayers,
        total,
        hasMore: allPlayers.length < total,
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
