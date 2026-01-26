// pages/match-form/match-form.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    matchId: '',
    isEdit: false,
    formData: {
      opponent: '',
      matchDate: '',
      matchTime: '15:00',
      isHome: true,
      location: '',
      goals: '',
      conceded: '',
      notes: ''
    },
    resultText: '待定',
    resultClass: ''
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        matchId: options.id,
        isEdit: true
      });
      wx.setNavigationBarTitle({ title: '编辑比赛' });
      this.loadMatchData();
    } else {
      // 默认今天日期
      const today = new Date();
      const matchDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      this.setData({ 'formData.matchDate': matchDate });
      this.calculateResult();
    }
  },

  // 加载比赛数据
  async loadMatchData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await db.collection('matches').doc(this.data.matchId).get();
      const match = res.data;
      const date = new Date(match.matchDate);

      // 分离日期和时间
      const matchDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const matchTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      this.setData({
        formData: {
          ...this.data.formData,
          ...match,
          matchDate,
          matchTime
        }
      });

      this.calculateResult();
    } catch (error) {
      console.error('加载比赛数据失败', error);
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
    this.calculateResult();
  },

  // 日期选择
  onDateChange(e) {
    this.setData({
      'formData.matchDate': e.detail.value
    });
  },

  // 时间选择
  onTimeChange(e) {
    this.setData({
      'formData.matchTime': e.detail.value
    });
  },

  // 主客场选择
  onHomeChange(e) {
    this.setData({
      'formData.isHome': e.detail.value === 'true'
    });
  },

  // 计算比赛结果
  calculateResult() {
    const { goals, conceded } = this.data.formData;
    let resultText = '待定';
    let resultClass = '';

    if (goals !== '' && conceded !== '') {
      const g = parseInt(goals);
      const c = parseInt(conceded);
      if (g > c) {
        resultText = '胜';
        resultClass = 'win';
      } else if (g === c) {
        resultText = '平';
        resultClass = 'draw';
      } else {
        resultText = '负';
        resultClass = 'loss';
      }
    }

    this.setData({ resultText, resultClass });
  },

  // 提交表单
  async submitForm() {
    const { opponent, matchDate, goals, conceded } = this.data.formData;

    // 验证必填项
    if (!opponent.trim()) {
      wx.showToast({ title: '请输入对手名称', icon: 'none' });
      return;
    }
    if (!matchDate) {
      wx.showToast({ title: '请选择比赛日期', icon: 'none' });
      return;
    }
    if (goals === '') {
      wx.showToast({ title: '请输入进球数', icon: 'none' });
      return;
    }
    if (conceded === '') {
      wx.showToast({ title: '请输入失球数', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    try {
      // 组合日期时间
      const matchDateTime = new Date(`${this.data.formData.matchDate}T${this.data.formData.matchTime || '15:00'}:00`);

      const formData = {
        ...this.data.formData,
        goals: parseInt(this.data.formData.goals) || 0,
        conceded: parseInt(this.data.formData.conceded) || 0,
        result: this.data.resultText,
        matchDate: matchDateTime,
        updateTime: new Date()
      };

      if (this.data.isEdit) {
        await db.collection('matches').doc(this.data.matchId).update({
          data: formData
        });
      } else {
        formData.createTime = new Date();
        await db.collection('matches').add({
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
