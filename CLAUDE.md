# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Type**: Native WeChat Mini Program with Cloud Development
**Name**: 球队管理小程序 (Team Management Mini Program)
**Purpose**: Football/sports team management for player info, matches, attendance, schedules, and statistics

## Development Workflow

**No CLI commands** - This is a WeChat Mini Program managed through **WeChat Developer Tools**:
1. Open `project.config.json` in WeChat DevTools to load the project
2. Build is automatic in DevTools
3. To deploy cloud functions: right-click the cloudfunction folder → "Upload and Deploy: 云端安装依赖"

## Architecture

### Pages (4-tab navigation + sub-pages)
| Tab | Page | Purpose |
|-----|------|---------|
| 首页 | `pages/index/` | Team dashboard |
| 球员 | `pages/players/` | Player list + search/filter |
| 数据 | `pages/stats/*/` | Data visualization (goals, assists, attendance) |
| 我的 | `pages/profile/` | User center/login |

**Sub-pages**: `player-detail/`, `player-form/`, `player-matches/`, `match-detail/`, `match-form/`, `record-form/`, `attendance/`, `schedule/`, `schedule-form/`, `profile-edit/`

### Database Collections (Cloud DB)
- `players` - Player profiles with 6 ability stats (power, stamina, shooting, dribbling, technique, IQ)
- `matches` - Match records
- `match_records` - Per-player match stats (linked via playerId + matchId)
- `attendance` - Training/match attendance
- `users` - User roles (admin/user)
- `schedules` - Calendar events

### Cloud Functions
- `login/` - First login becomes admin automatically
- `importPlayers/` - Batch import player data
- `importMatchRecords/` - Migrate legacy data (playerName → playerId, matchDate → matchId)

## Key Code Patterns

```javascript
// Database access
const db = wx.cloud.database();
const _ = db.command;

// Common queries
db.collection('players').where({ isActive: true }).orderBy('number', 'asc').get()
db.collection('match_records').where({ playerId: 'xxx', matchId: 'yyy' }).get()

// Aggregation for stats
db.collection('match_records').aggregate()
  .group({ _id: '$playerId', totalGoals: $.sum('$goals') })
  .sort({ totalGoals: -1 })
  .limit(10)
  .end()

// Permission check (admin vs regular user)
app.isAdmin() // Returns true if current user is admin
if (!app.isAdmin()) return wx.showToast({ title: '权限不足', icon: 'none' });

// Navigation
wx.navigateTo({ url: '/pages/player-detail/player-detail?id=' + playerId });
wx.switchTab({ url: '/pages/players/players' });
```

### Canvas Charts (custom, no external libs)
- `utils/chart.js` - Bar charts, donut charts, pie charts, progress bars
- Use `<canvas type="2d" canvas-id="chartId" class="chart-canvas"></canvas>` in WXML
- Initialize with `createChart('chartId', options)`

## Styling
- WXSS with Flexbox layout
- `rpx` for responsive units
- Theme color: `#1989fa` (blue)
- Common class: `.container`, `.card`, `.btn-primary`, `.empty-tip`

## Setup Requirements (if starting fresh)
- Configure cloud environment ID in `project.config.json` and `app.js`
- Create 6 database collections in cloud console
- Upload cloud functions (`login/`, `importPlayers/`, `importMatchRecords/`)
- Add 4 tab bar icon pairs to `images/` directory (home, team, chart, user - each with normal and active states)

## Important Notes
- First user to login becomes admin automatically
- Permission checks are client-side for UI - validate server-side in cloud functions for sensitive operations
- Use `wx.showToast()` for user feedback
- Use `wx.navigateTo()` for page navigation
- Canvas charts require `type="2d"` and `wx.createSelectorQuery()` for proper initialization
