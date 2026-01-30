// pages/profile-edit/profile-edit.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    userInfo: null,
    formData: {
      name: '',
      avatar: '',
      bio: ''
    },
    saving: false
  },

  onLoad() {
    this.initUserData();
  },

  onShow() {
    this.initUserData();
  },

  initUserData() {
    const { userInfo } = app.globalData;
    if (userInfo) {
      this.setData({
        userInfo,
        formData: {
          name: userInfo.name || userInfo.nickName || '',
          avatar: userInfo.avatar || '',
          bio: userInfo.bio || ''
        }
      });
    }
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadAvatar(tempFilePath);
      }
    });
  },

  // 上传头像到云存储
  uploadAvatar(filePath) {
    wx.showLoading({ title: '上传中...' });

    const cloudPath = `avatars/${this.data.userInfo.openid}/${Date.now()}.png`;

    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: (res) => {
        this.setData({
          'formData.avatar': res.fileID
        });
        wx.showToast({ title: '头像已更新', icon: 'success' });
      },
      fail: (err) => {
        console.error('上传失败', err);
        wx.showToast({ title: '上传失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 昵称输入
  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value });
  },

  // 简介输入
  onBioInput(e) {
    this.setData({ 'formData.bio': e.detail.value });
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 保存修改
  async saveProfile() {
    if (!this.data.formData.name.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ saving: true });

    try {
      const openid = this.data.userInfo.openid;

      await db.collection('users').doc(openid).update({
        data: {
          name: this.data.formData.name.trim(),
          avatar: this.data.formData.avatar || '',
          bio: this.data.formData.bio || ''
        }
      });

      // 更新全局数据
      const updatedUserInfo = {
        ...this.data.userInfo,
        name: this.data.formData.name.trim(),
        avatar: this.data.formData.avatar || '',
        bio: this.data.formData.bio || ''
      };

      app.globalData.userInfo = updatedUserInfo;
      wx.setStorageSync('userInfo', updatedUserInfo);

      this.setData({ userInfo: updatedUserInfo });

      wx.showToast({ title: '保存成功' });
    } catch (error) {
      console.error('保存失败', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});
