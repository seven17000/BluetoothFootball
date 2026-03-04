package models

import (
	"encoding/json"
	"time"
)

// Player 球员模型
type Player struct {
	ID        string          `json:"_id,omitempty"`
	Name      string          `json:"name"`
	Number    string          `json:"number"`
	Position  json.RawMessage `json:"position"` // 存储为JSON数组
	JoinDate  string          `json:"joinDate"`
	Gender    string          `json:"gender"`
	Age       int            `json:"age"`
	Height    int            `json:"height"`
	Weight    int            `json:"weight"`
	Avatar    string          `json:"avatar"`
	Tags      json.RawMessage `json:"tags"` // 存储为JSON数组
	Ability   json.RawMessage `json:"ability"`
	IsActive  bool           `json:"isActive"`
	CreateTime time.Time     `json:"createTime"`
	UpdateTime time.Time     `json:"updateTime"`
}

// Match 比赛模型
type Match struct {
	ID              string    `json:"_id,omitempty"`
	Opponent        string    `json:"opponent"`
	Goals           int       `json:"goals"`
	Conceded        int       `json:"conceded"`
	ScheduleDate    string    `json:"scheduleDate"`
	ScheduleTime    string    `json:"scheduleTime"`
	IsHome         bool      `json:"isHome"`
	Location       string    `json:"location"`
	Season         string    `json:"season"`
	JerseyColor    string    `json:"jerseyColor"`
	OpponentJersey string    `json:"opponentJersey"`
	Notes          string    `json:"notes"`
	CreateTime     time.Time `json:"createTime"`
	UpdateTime     time.Time `json:"updateTime"`
}

// MatchRecord 比赛记录模型
type MatchRecord struct {
	ID            string    `json:"_id,omitempty"`
	PlayerID      string    `json:"playerId"`
	MatchID       string    `json:"matchId"`
	Goals         int       `json:"goals"`
	Assists       int       `json:"assists"`
	YellowCards   int       `json:"yellowCards"`
	RedCards      int       `json:"redCards"`
	MinutesPlayed int       `json:"minutesPlayed"`
	Rating        float64   `json:"rating"`
	CreateTime   time.Time `json:"createTime"`
	UpdateTime   time.Time `json:"updateTime"`
}

// Schedule 赛程模型
type Schedule struct {
	ID              string    `json:"_id,omitempty"`
	Opponent        string    `json:"opponent"`
	Date            string    `json:"date"`
	IsHome         bool      `json:"isHome"`
	Location       string    `json:"location"`
	Notes          string    `json:"notes"`
	JerseyColor    string    `json:"jerseyColor"`
	OpponentJersey string    `json:"opponentJersey"`
	CreateTime     time.Time `json:"createTime"`
	UpdateTime     time.Time `json:"updateTime"`
}

// Attendance 考勤模型
type Attendance struct {
	ID         string    `json:"_id,omitempty"`
	PlayerID   string    `json:"playerId"`
	ScheduleID string    `json:"scheduleId,omitempty"`
	Status     string    `json:"status"` // 参加/请假/缺席
	Reason     string    `json:"reason"`
	CreateTime time.Time `json:"createTime"`
	UpdateTime time.Time `json:"updateTime"`
}

// User 用户模型
type User struct {
	OpenID    string    `json:"_id,omitempty"`
	Nickname  string    `json:"nickname"`
	Avatar    string    `json:"avatar"`
	Role      string    `json:"role"` // admin/user
	CreateTime time.Time `json:"createTime"`
	UpdateTime time.Time `json:"updateTime"`
}

// TeamPhoto 球队照片模型
type TeamPhoto struct {
	ID         string    `json:"_id,omitempty"`
	URL        string    `json:"url"`
	CreateTime time.Time `json:"createTime"`
}

// SeasonStats 赛季统计数据
type SeasonStats struct {
	Goals    int `json:"goals"`
	Conceded int `json:"conceded"`
	Wins     int `json:"wins"`
	Draws    int `json:"draws"`
	Losses   int `json:"losses"`
}
