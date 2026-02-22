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
      position: [],
      joinDate: '',
      gender: '',
      age: null,
      height: null,
      weight: null,
      avatar: '',
      tags: [],
      ability: {}
    },
    positionOptions: ['前锋', '中场', '后卫', '门将'],
    genders: ['男', '女'],
    genderIndex: 0,
    ageRange: Array.from({ length: 50 }, (_, i) => i + 16), // 16-65岁
    heightRange: Array.from({ length: 60 }, (_, i) => i + 150), // 150-209cm
    weightRange: Array.from({ length: 70 }, (_, i) => i + 40), // 40-109kg
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
    allTagsWithCustom: [],
    customTags: [],
    abilityConfig: FORM_ABILITY_CONFIG,
    // 弹窗相关
    showDialog: false,
    newTagName: ''
  },

  onLoad(options) {
    // 从本地存储加载自定义标签
    const customTags = wx.getStorageSync('customTags') || [];
    // 合并所有标签用于显示
    const allTagsWithCustom = [
      ...this.data.allTags,
      ...customTags.map(t => ({ value: t, label: t, isCustom: true }))
    ];
    this.setData({ customTags, allTagsWithCustom });

    if (options.id) {
      console.log('编辑球员, id:', options.id);
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
      console.log('loadPlayerData - playerId:', this.data.playerId);
      const res = await db.collection('players').doc(this.data.playerId).get();
      const player = res.data;
      console.log('加载的球员数据:', player);

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

  // 位置切换（多选）
  togglePosition(e) {
    const position = e.currentTarget.dataset.position;
    const positionArr = [...this.data.formData.position];
    const index = positionArr.indexOf(position);

    if (index > -1) {
      positionArr.splice(index, 1);
    } else {
      positionArr.push(position);
    }

    this.setData({
      'formData.position': positionArr
    });
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.joinDate': e.detail.value
    });
  },

  // 性别选择
  onGenderChange(e) {
    const gender = this.data.genders[e.detail.value];
    this.setData({
      'formData.gender': gender,
      genderIndex: e.detail.value
    });
  },

  // 年龄选择
  onAgeChange(e) {
    const age = this.data.ageRange[e.detail.value];
    this.setData({ 'formData.age': age });
  },

  // 身高选择
  onHeightChange(e) {
    const height = this.data.heightRange[e.detail.value];
    this.setData({ 'formData.height': height });
  },

  // 体重选择
  onWeightChange(e) {
    const weight = this.data.weightRange[e.detail.value];
    this.setData({ 'formData.weight': weight });
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      success: async (res) => {
        const tempFilePath = res.tempFilePaths[0];

        // 裁剪图片
        wx.cropImage({
          src: tempFilePath,
          success: async (cropRes) => {
            const croppedPath = cropRes.tempFilePath;
            wx.showLoading({ title: '上传中...' });

            try {
              // 上传到云存储
              const uploadResult = await wx.cloud.uploadFile({
                cloudPath: `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`,
                filePath: croppedPath
              });

              // 保存云存储文件ID
              this.setData({
                'formData.avatar': uploadResult.fileID
              });
              console.log('头像上传成功:', uploadResult.fileID);
              wx.showToast({ title: '上传成功', icon: 'success' });
            } catch (error) {
              console.error('上传头像失败', error);
              wx.showToast({ title: '上传失败', icon: 'none' });
            } finally {
              wx.hideLoading();
            }
          },
          fail: (err) => {
            console.log('裁剪取消', err);
          }
        });
      }
    });
  },

  // 切换预设标签
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

  // 切换自定义标签
  toggleCustomTag(e) {
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

  // 显示添加标签弹窗
  showAddTagDialog() {
    this.setData({
      showDialog: true,
      newTagName: ''
    });
  },

  // 隐藏弹窗
  hideDialog() {
    this.setData({
      showDialog: false,
      newTagName: ''
    });
  },

  // 标签输入
  onTagInput(e) {
    this.setData({
      newTagName: e.detail.value
    });
  },

  // 确认添加自定义标签
  confirmAddTag() {
    const newTag = this.data.newTagName.trim();
    if (!newTag) {
      wx.showToast({ title: '请输入标签名称', icon: 'none' });
      return;
    }

    // 检查是否已存在
    const allTags = [...this.data.allTags.map(t => t.value), ...this.data.customTags];
    if (allTags.includes(newTag)) {
      wx.showToast({ title: '标签已存在', icon: 'none' });
      return;
    }

    // 添加到自定义标签
    const customTags = [...this.data.customTags, newTag];
    // 合并所有标签
    const allTagsWithCustom = [
      ...this.data.allTags,
      ...customTags.map(t => ({ value: t, label: t, isCustom: true }))
    ];
    this.setData({ customTags, allTagsWithCustom });

    // 保存到本地存储
    wx.setStorageSync('customTags', customTags);

    // 关闭弹窗
    this.hideDialog();

    // 自动选中新标签
    const tags = [...this.data.formData.tags, newTag];
    this.setData({
      'formData.tags': tags
    });

    wx.showToast({ title: '添加成功', icon: 'success' });
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
    if (!position || position.length === 0) {
      wx.showToast({ title: '请选择位置', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 移除 _id 字段（编辑时可能存在）
      const { _id, ...cleanFormData } = this.data.formData;
      const formData = {
        ...cleanFormData,
        number: parseInt(number),
        updateTime: new Date()
      };
      console.log('提交数据:', formData);

      if (this.data.isEdit) {
        // 更新
        console.log('更新球员ID:', this.data.playerId);
        console.log('更新数据:', formData);

        const updateRes = await db.collection('players').doc(this.data.playerId).update({
          data: formData
        });
        console.log('更新结果:', updateRes);
      } else {
        // 新增
        formData.createTime = new Date();
        formData.isActive = true;
        await db.collection('players').add({
          data: formData
        });
      }

      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存失败', error);
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
