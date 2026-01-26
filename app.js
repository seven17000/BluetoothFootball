// app.js
App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env 参数说明：
        // 请替换为你的云开发环境 ID
        env: 'your-env-id',
        traceUser: true,
      });
    }

    // 检查登录状态
    this.checkLoginStatus();
  },

  globalData: {
    userInfo: null,
    userRole: null, // 'admin' or 'user'
    isLoggedIn: false
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        this.globalData.userRole = userInfo.role;
        this.globalData.isLoggedIn = true;
      }
    } catch (e) {
      console.error('检查登录状态失败', e);
    }
  },

  // 登录
  async login() {
    try {
      const loginResult = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });

      if (loginResult.result && loginResult.result.success) {
        const userInfo = loginResult.result.data;
        this.globalData.userInfo = userInfo;
        this.globalData.userRole = userInfo.role;
        this.globalData.isLoggedIn = true;
        wx.setStorageSync('userInfo', userInfo);
        return userInfo;
      }
    } catch (e) {
      console.error('登录失败', e);
      throw e;
    }
  },

  // 登出
  logout() {
    this.globalData.userInfo = null;
    this.globalData.userRole = null;
    this.globalData.isLoggedIn = false;
    wx.removeStorageSync('userInfo');
  },

  // 判断是否是管理员
  isAdmin() {
    return this.globalData.userRole === 'admin';
  },

  // 权限检查
  checkPermission(callback) {
    if (!this.globalData.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/profile/profile'
            });
          }
        }
      });
      return false;
    }
    if (callback) {
      callback(this.globalData.userRole);
    }
    return true;
  }
});
