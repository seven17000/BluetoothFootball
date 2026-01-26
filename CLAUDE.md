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
3. To deploy cloud functions: right-click `cloudfunctions/login` → "Upload and Deploy: 云端安装依赖"

## Architecture

### Pages (17 total, 5-tab navigation)
| Tab | Page | Purpose |
|-----|------|---------|
| 首页 | `pages/index/` | Team dashboard |
| 球员 | `pages/players/` | Player list + search/filter |
| 日程 | `pages/schedule/` | Calendar view |
| 统计 | `pages/stats/*/` | Data visualization (goals, assists, attendance) |
| 我的 | `pages/profile/` | User center/login |

### Database Collections (Cloud DB)
- `players` - Player profiles with 6 ability stats (power, stamina, shooting, dribbling, technique, IQ)
- `matches` - Match records
- `match_records` - Per-player match stats
- `attendance` - Training/match attendance
- `users` - User roles (admin/user)
- `schedules` - Calendar events

### Cloud Functions
- `cloudfunctions/login/` - First login becomes admin automatically

## Key Code Patterns

```javascript
// Database access
const db = wx.cloud.database();
const _ = db.command;

// Permission check (admin vs regular user)
app.isAdmin() // Returns true if current user is admin
```

### Canvas Charts (custom, no external libs)
- `utils/chart.js` - Bar charts and radar charts for stats visualization

## Styling
- WXSS with Flexbox layout
- `rpx` for responsive units
- Theme color: `#1989fa` (blue)

## Setup Requirements (if starting fresh)
- Configure cloud environment ID in `project.config.json` and `app.js`
- Create 6 database collections in cloud console
- Upload `login` cloud function
- Add 5 tab bar icon pairs to `images/` directory (home, team, calendar, chart, user - each with normal and active states)

## Important Notes
- First user to login becomes admin automatically
- Permission checks are client-side for UI - validate server-side in cloud functions for sensitive operations
- Use `wx.showToast()` for user feedback
- Use `wx.navigateTo()` for page navigation
