// pages/profile/profile.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    isAdmin: false
  },

  onShow() {
    this.updateUserStatus();
  },

  // 更新用户状态
  updateUserStatus() {
    const { userInfo, isLoggedIn, userRole } = app.globalData;
    this.setData({
      isLoggedIn,
      userInfo: userInfo || null,
      isAdmin: userRole === 'admin'
    });
  },

  // 登录
  async login() {
    try {
      wx.showLoading({ title: '登录中...' });

      // 获取用户信息
      const userProfile = await wx.getUserProfile({
        desc: '用于完善用户资料',
        lang: 'zh_CN'
      });

      // 调用云函数登录
      const loginResult = await wx.cloud.callFunction({
        name: 'login',
        data: {
          userInfo: userProfile.userInfo
        }
      });

      if (loginResult.result && loginResult.result.success) {
        const userData = loginResult.result.data;
        app.globalData.userInfo = userData;
        app.globalData.userRole = userData.role;
        app.globalData.isLoggedIn = true;
        wx.setStorageSync('userInfo', userData);

        this.setData({
          isLoggedIn: true,
          userInfo: userData,
          isAdmin: userData.role === 'admin'
        });

        wx.showToast({ title: '登录成功' });
      }
    } catch (error) {
      console.error('登录失败', error);
      wx.showToast({ title: '登录失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          app.logout();
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            isAdmin: false
          });
          wx.showToast({ title: '已退出登录' });
        }
      }
    });
  },

  // 跳转至个人信息编辑
  goToProfileEdit() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 跳转至比赛管理
  goToMatches() {
    wx.switchTab({ url: '/pages/matches/matches' });
  },

  // 跳转至出勤记录
  goToAttendance() {
    wx.navigateTo({ url: '/pages/attendance/attendance' });
  },

  // 跳转至用户管理
  goToUserManage() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  // 跳转至数据管理
  goToAdmin() {
    if (!app.isAdmin()) {
      wx.showToast({ title: '权限不足', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/admin/admin' });
  },

  // 跳转至关于
  goToAbout() {
    wx.showModal({
      title: '关于球队管理',
      content: '球队管理小程序 v1.0.0\n\n用于管理球队球员信息、比赛数据、出勤记录等。',
      showCancel: false
    });
  }
});
