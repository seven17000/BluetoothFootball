const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    loading: false,
    result: null,
    stats: {
      players: 0,
      matches: 0,
      records: 0
    }
  },

  onShow() {
    this.loadStats();
  },

  // 加载统计数据
  async loadStats() {
    try {
      const [players, matches, records] = await Promise.all([
        db.collection('players').count(),
        db.collection('matches').count(),
        db.collection('match_records').count()
      ]);

      this.setData({
        stats: {
          players: players.total,
          matches: matches.total,
          records: records.total
        }
      });
    } catch (error) {
      console.error('加载统计数据失败', error);
    }
  },

  // 转换数据格式
  async transformData() {
    this.setData({ loading: true, result: null });

    try {
      const res = await wx.cloud.callFunction({
        name: 'importMatchRecords',
        data: {}
      });

      if (res.result && res.result.success) {
        this.setData({
          result: res.result
        });
        wx.showToast({
          title: res.result.message,
          icon: 'none'
        });
        // 刷新统计
        this.loadStats();
      } else {
        wx.showToast({
          title: res.result?.error || '转换失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('转换失败', error);
      wx.showToast({
        title: '转换失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
