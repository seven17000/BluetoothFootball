# 球队管理小程序

一个基于微信原生小程序和云开发的球队管理应用，用于管理球队球员信息、比赛数据、出勤记录等。

## 功能特性

### 1. 球员管理
- 球员列表展示，支持搜索和位置筛选
- 球员详情页，包含个人信息、能力值雷达图、标签展示
- 球员录入/编辑，支持设置能力值（力量、体能、射门、盘带、技巧、球商）
- 球员标签系统（队长、核心球员、新星等）

### 2. 比赛管理
- 比赛列表，按赛季筛选
- 比赛详情，包含比赛结果、比赛地点等信息
- 球员表现数据录入（进球、助攻、黄红牌、评分）
- 进球榜、助攻榜数据展示

### 3. 出勤管理
- 训练/比赛出勤记录
- 按球员统计出勤率
- 请假/缺勤原因记录

### 4. 日历日程
- 月历视图展示训练和比赛
- 不同颜色区分活动类型
- 点击日期查看当日详情

### 5. 数据可视化
- 进球榜TOP10（Canvas柱状图）
- 助攻榜TOP10（Canvas柱状图）
- 出勤率排名（Canvas柱状图）
- 球员能力值雷达图

### 6. 权限管理
- 管理员：可进行所有数据的增删改查
- 普通用户：仅可查看数据

## 项目结构

```
miniprogram/
├── app.js              # 应用入口
├── app.json            # 应用配置
├── app.wxss            # 全局样式
├── pages/
│   ├── index/          # 首页
│   ├── players/        # 球员列表
│   ├── player-detail/  # 球员详情
│   ├── player-form/    # 球员录入/编辑
│   ├── matches/        # 比赛列表
│   ├── match-detail/   # 比赛详情
│   ├── match-form/     # 比赛录入/编辑
│   ├── record-form/    # 球员比赛数据录入
│   ├── attendance/     # 出勤记录
│   ├── schedule/       # 日历日程
│   ├── schedule-form/  # 日程录入/编辑
│   ├── stats/          # 数据统计
│   │   ├── goals/      # 进球榜
│   │   ├── assists/    # 助攻榜
│   │   └── attendance/ # 出勤榜
│   └── profile/        # 个人中心
├── utils/
│   ├── util.js         # 工具函数
│   ├── chart.js        # Canvas图表绘制
│   ├── date.js         # 日期处理
│   └── constants.js    # 常量定义
└── images/             # 图片资源
    ├── home.png
    ├── home-active.png
    ├── team.png
    ├── team-active.png
    ├── calendar.png
    ├── calendar-active.png
    ├── chart.png
    ├── chart-active.png
    ├── user.png
    └── user-active.png

cloudfunctions/
└── login/              # 登录云函数
```

## 数据库设计

### 集合列表

1. **players** - 球员表
2. **matches** - 比赛表
3. **match_records** - 比赛记录明细
4. **attendance** - 出勤记录
5. **users** - 用户表
6. **schedules** - 日程表

## 快速开始

### 1. 创建项目
在微信开发者工具中创建新项目，选择「小程序·云开发」模板。

### 2. 配置云开发环境
- 在微信公众平台开通云开发
- 创建云开发环境
- 修改 `project.config.json` 中的环境ID

### 3. 创建数据库集合
在云开发控制台创建以下集合：
- players
- matches
- match_records
- attendance
- users
- schedules

### 4. 上传云函数
右键点击 `cloudfunctions/login` 目录，选择「上传并部署：云端安装依赖」。

### 5. 添加图片资源
将图标图片添加到 `images/` 目录：
- home.png / home-active.png
- team.png / team-active.png
- calendar.png / calendar-active.png
- chart.png / chart-active.png
- user.png / user-active.png

## 使用说明

### 首次使用
1. 打开小程序后，点击「我的」页面
2. 点击「微信一键登录」
3. 第一个登录的用户会自动成为管理员

### 管理员功能
- 添加/编辑/删除球员信息
- 添加/编辑/删除比赛记录
- 录入球员比赛数据
- 记录出勤情况
- 添加/编辑/删除日程

### 普通用户功能
- 查看所有球员信息
- 查看比赛记录和统计
- 查看出勤记录
- 查看日历日程
- 查看数据统计图表

## 技术栈

- **前端**：原生微信小程序
- **后端**：微信云开发（云数据库、云函数）
- **图表**：Canvas自定义绘制

## 版本记录

### v1.0.0 (2024-01)
- 初始版本发布
- 完成核心功能开发
