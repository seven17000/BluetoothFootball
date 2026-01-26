/**
 * Canvas图表绘制工具
 * 支持柱状图、饼图等常见图表
 */

class Chart {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.options = {
      padding: options.padding || 20,
      colors: options.colors || ['#1989fa', '#52c41a', '#faad14', '#fa5151', '#722ed1', '#13c2c2', '#eb2f96'],
      fontSize: options.fontSize || 12,
      ...options
    };
  }

  /**
   * 清除画布
   */
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * 绘制横向柱状图
   * @param {Array} data - 数据数组 [{label, value, color}]
   * @param {Object} options - 配置项
   */
  drawHorizontalBar(data, options = {}) {
    const { padding, colors, fontSize } = this.options;
    const {
      showValue = true,
      barHeight = 30,
      barGap = 15,
      labelWidth = 80,
      valueWidth = 50,
      maxValue = null
    } = options;

    this.clear();

    const maxVal = maxValue || Math.max(...data.map(d => d.value));
    const chartWidth = this.width - padding * 2 - labelWidth - valueWidth;
    const chartHeight = data.length * (barHeight + barGap);
    const startY = padding;

    // 绘制标签
    this.ctx.setFontSize(fontSize);
    this.ctx.setFillStyle('#333');

    data.forEach((item, index) => {
      const y = startY + index * (barHeight + barGap);
      const color = item.color || colors[index % colors.length];

      // 标签
      this.ctx.fillText(item.label, padding, y + barHeight / 2 + 4);

      // 背景条
      const bgWidth = chartWidth;
      this.ctx.setFillStyle('#f0f0f0');
      this.ctx.fillRect(padding + labelWidth, y, bgWidth, barHeight);

      // 数据条
      const barWidth = (item.value / maxVal) * bgWidth;
      this.ctx.setFillStyle(color);
      this.ctx.fillRect(padding + labelWidth, y, barWidth, barHeight);

      // 数值
      if (showValue) {
        this.ctx.setFillStyle('#666');
        this.ctx.fillText(item.value, padding + labelWidth + chartWidth + 10, y + barHeight / 2 + 4);
      }
    });

    return { width: this.width, height: Math.max(this.height, chartHeight + padding * 2) };
  }

  /**
   * 绘制环形图
   * @param {Array} data - 数据数组 [{label, value, color}]
   * @param {Object} options - 配置项
   */
  drawDonutChart(data, options = {}) {
    const { padding, colors } = this.options;
    const { centerX = null, centerY = null, outerRadius = null, innerRadiusRatio = 0.6 } = options;

    this.clear();

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const center = {
      x: centerX !== null ? centerX : this.width / 2,
      y: centerY !== null ? centerY : this.height / 2
    };
    const outerR = outerRadius || Math.min(this.width, this.height) / 2 - padding * 2;
    const innerR = outerR * innerRadiusRatio;

    let startAngle = -Math.PI / 2;

    data.forEach((item, index) => {
      const color = item.color || colors[index % colors.length];
      const sliceAngle = (item.value / total) * Math.PI * 2;

      // 绘制扇形
      this.ctx.beginPath();
      this.ctx.moveTo(center.x, center.y);
      this.ctx.arc(center.x, center.y, outerR, startAngle, startAngle + sliceAngle);
      this.ctx.closePath();
      this.ctx.setFillStyle(color);
      this.ctx.fill();

      startAngle += sliceAngle;
    });

    // 绘制内圆（形成环形）
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, innerR, 0, Math.PI * 2);
    this.ctx.setFillStyle('#fff');
    this.ctx.fill();

    return { width: this.width, height: this.height };
  }

  /**
   * 绘制饼图
   * @param {Array} data - 数据数组 [{label, value, color}]
   * @param {Object} options - 配置项
   */
  drawPieChart(data, options = {}) {
    const { padding, colors } = this.options;
    const { centerX = null, centerY = null, radius = null } = options;

    this.clear();

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const center = {
      x: centerX !== null ? centerX : this.width / 2,
      y: centerY !== null ? centerY : this.height / 2
    };
    const r = radius || Math.min(this.width, this.height) / 2 - padding * 2;

    let startAngle = -Math.PI / 2;

    data.forEach((item, index) => {
      const color = item.color || colors[index % colors.length];
      const sliceAngle = (item.value / total) * Math.PI * 2;

      this.ctx.beginPath();
      this.ctx.moveTo(center.x, center.y);
      this.ctx.arc(center.x, center.y, r, startAngle, startAngle + sliceAngle);
      this.ctx.closePath();
      this.ctx.setFillStyle(color);
      this.ctx.fill();

      startAngle += sliceAngle;
    });

    return { width: this.width, height: this.height };
  }

  /**
   * 绘制进度条
   * @param {number} progress - 进度值（0-100）
   * @param {Object} options - 配置项
   */
  drawProgressBar(progress, options = {}) {
    const { padding, colors } = this.options;
    const {
      x = padding,
      y = 50,
      width = this.width - padding * 2,
      height = 20,
      bgColor = '#f0f0f0',
      fillColor = colors[0],
      showText = true
    } = options;

    this.clear();

    // 背景
    this.ctx.setFillStyle(bgColor);
    this.ctx.fillRect(x, y, width, height);

    // 进度
    const fillWidth = (progress / 100) * width;
    this.ctx.setFillStyle(fillColor);
    this.ctx.fillRect(x, y, fillWidth, height);

    // 文字
    if (showText) {
      this.ctx.setFontSize(14);
      this.ctx.setFillStyle('#333');
      this.ctx.textAlign = 'center';
      this.ctx.fillText(progress + '%', this.width / 2, y - 10);
      this.ctx.textAlign = 'left';
    }

    return { width: this.width, height: y + height + 20 };
  }

  /**
   * 绘制排行榜（带排名）
   * @param {Array} data - 数据数组 [{rank, name, value, label}]
   * @param {Object} options - 配置项
   */
  drawRankList(data, options = {}) {
    const { padding, colors } = this.options;
    const { barHeight = 40, showTrend = false } = options;

    this.clear();

    const itemHeight = barHeight + 10;
    const rankWidth = 40;
    const nameWidth = 100;
    const chartWidth = this.width - padding * 2 - rankWidth - nameWidth - 50;
    const maxValue = Math.max(...data.map(d => d.value));

    data.forEach((item, index) => {
      const y = padding + index * itemHeight;
      const color = item.color || colors[index % colors.length];

      // 排名
      this.ctx.setFontSize(14);
      this.ctx.setFillStyle('#666');
      this.ctx.fillText(item.rank, padding, y + barHeight / 2 + 4);

      // 名字
      this.ctx.setFillStyle('#333');
      this.ctx.fillText(item.name, padding + rankWidth, y + barHeight / 2 + 4);

      // 进度条
      const barWidth = (item.value / maxValue) * chartWidth;
      this.ctx.setFillStyle('#f0f0f0');
      this.ctx.fillRect(padding + rankWidth + nameWidth, y, chartWidth, barHeight);
      this.ctx.setFillStyle(color);
      this.ctx.fillRect(padding + rankWidth + nameWidth, y, barWidth, barHeight);

      // 数值
      this.ctx.setFillStyle('#666');
      this.ctx.fillText(
        item.label ? `${item.value} ${item.label}` : item.value,
        padding + rankWidth + nameWidth + chartWidth + 10,
        y + barHeight / 2 + 4
      );
    });

    return { width: this.width, height: padding * 2 + data.length * itemHeight };
  }
}

/**
 * 创建图表实例
 * @param {string} canvasId - canvas组件的canvas-id
 * @param {Object} options - 配置项
 * @returns {Chart}
 */
function createChart(canvasId, options = {}) {
  const query = wx.createSelectorQuery();
  return new Promise((resolve) => {
    query.select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          // 设置canvas实际像素
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          const chart = new Chart(canvas, { ...options, dpr });
          resolve(chart);
        } else {
          resolve(null);
        }
      });
  });
}

module.exports = {
  Chart,
  createChart
};
