// pages/player-form/player-form.js
const app = getApp();
const db = wx.cloud.database();
const { FORM_ABILITY_CONFIG } = require('../../utils/constants.js');

Page({
  data: {
    playerId: '',
    isEdit: false,
    formData: {
      name: '',
      number: '',
      position: '',
      phone: '',
      joinDate: '',
      avatar: '',
      tags: [],
      ability: {}
    },
    positions: ['前锋', '中场', '后卫', '边后卫', '门将'],
    allTags: [
      { value: '队长', label: '队长' },
      { value: '副队长', label: '副队长' },
      { value: '核心球员', label: '核心球员' },
      { value: '替补', label: '替补' },
      { value: '新星', label: '新星' },
      { value: '老将', label: '老将' },
      { value: '射手', label: '射手' },
      { value: '助攻王', label: '助攻王' },
      { value: '精神领袖', label: '精神领袖' }
    ],
    abilityConfig: FORM_ABILITY_CONFIG
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        playerId: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑球员' });
      this.loadPlayerData();
    } else {
      // 默认今天日期
      const today = new Date();
      const joinDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      this.setData({ 'formData.joinDate': joinDate });
    }
  },

  // 加载球员数据
  async loadPlayerData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await db.collection('players').doc(this.data.playerId).get();
      const player = res.data;

      // 初始化能力值对象（如果没有则创建默认值为60）
      const ability = {};
      this.data.abilityConfig.forEach(item => {
        ability[item.key] = player.ability?.[item.key] || 60;
      });

      this.setData({
        formData: {
          ...this.data.formData,
          ...player,
          ability
        }
      });
    } catch (error) {
      console.error('加载球员数据失败', error);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 输入事件
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    });
  },

  // 位置选择
  onPositionChange(e) {
    const index = e.detail.value;
    this.setData({
      'formData.position': this.data.positions[index]
    });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.joinDate': e.detail.value
    });
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'formData.avatar': tempFilePath
        });
      }
    });
  },

  // 切换标签
  toggleTag(e) {
    const value = e.currentTarget.dataset.value;
    const tags = [...this.data.formData.tags];
    const index = tags.indexOf(value);

    if (index > -1) {
      tags.splice(index, 1);
    } else {
      tags.push(value);
    }

    this.setData({
      'formData.tags': tags
    });
  },

  // 能力值滑块
  onAbilityChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.ability.${field}`]: e.detail.value
    });
  },

  // 提交表单
  async submitForm() {
    const { name, number, position } = this.data.formData;

    // 验证必填项
    if (!name.trim()) {
      wx.showToast({ title: '请输入球员姓名', icon: 'none' });
      return;
    }
    if (!number) {
      wx.showToast({ title: '请输入球衣号码', icon: 'none' });
      return;
    }
    if (!position) {
      wx.showToast({ title: '请选择位置', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      const formData = {
        ...this.data.formData,
        number: parseInt(number),
        updateTime: new Date()
      };

      if (this.data.isEdit) {
        // 更新
        await db.collection('players').doc(this.data.playerId).update({
          data: formData
        });
      } else {
        // 新增
        formData.createTime = new Date();
        formData.isActive = true;
        await db.collection('players').add({
          data: formData
        });
      }

      wx.showToast({ title: '保存成功' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存失败', error);
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
