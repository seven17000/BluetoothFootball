package models

import (
	"encoding/json"
)

// Player 球员模型
type Player struct {
	ID        string          `json:"_id,omitempty"`
	Name      string          `json:"name"`
	Number    float64         `json:"number"`
	Position  json.RawMessage `json:"position"`
	IsActive  int            `json:"isActive"`
	Tags      json.RawMessage `json:"tags"`
	Ability   json.RawMessage `json:"ability"`
	JoinDate  string         `json:"joinDate"`
	Gender    string         `json:"gender"`
	Age       int            `json:"age"`
	Height    float64        `json:"height"`
	Weight    string         `json:"weight"`
	Avatar    string         `json:"avatar"`
	CreateTime string        `json:"createTime"`
	UpdateTime string        `json:"updateTime"`
}

// Match 比赛模型
type Match struct {
	ID                string         `json:"_id,omitempty"`
	MatchDate         string         `json:"matchDate"`
	Opponent          string         `json:"opponent"`
	Goals             int            `json:"goals"`
	Conceded          int            `json:"conceded"`
	Result            string         `json:"result"`
	IsHome            int            `json:"isHome"`
	Season            string         `json:"season"`
	Location          string         `json:"location"`
	MatchTime         string         `json:"matchTime"`
	ScheduleDate      string         `json:"scheduleDate"`
	ScheduleTime      string         `json:"scheduleTime"`
	JerseyColor       string         `json:"jerseyColor"`
	OpponentJersey    string         `json:"opponentJersey"`
	AttendancePlayers string         `json:"attendancePlayers"`
	GoalRecords       json.RawMessage `json:"goalRecords"`
	AssistRecords     json.RawMessage `json:"assistRecords"`
	Notes             string         `json:"notes"`
	CreateTime        string         `json:"createTime"`
	UpdateTime        string         `json:"updateTime"`
}

// MatchRecord 比赛记录模型
type MatchRecord struct {
	ID          string         `json:"_id,omitempty"`
	MatchID     string         `json:"matchId"`
	MatchDate   string         `json:"matchDate"`
	Opponent    string         `json:"opponent"`
	GoalStats   json.RawMessage `json:"goalStats"`
	AssistStats json.RawMessage `json:"assistStats"`
	CreateTime  string         `json:"createTime"`
}

// Schedule 赛程模型
type Schedule struct {
	ID              string         `json:"_id,omitempty"`
	OpenID          string         `json:"openid"`
	Date            string         `json:"date"`
	Opponent        string         `json:"opponent"`
	IsHome          int            `json:"isHome"`
	JerseyColor     string         `json:"jerseyColor"`
	OpponentJersey  string         `json:"opponentJersey"`
	Location        string         `json:"location"`
	Notes           string         `json:"notes"`
	CreateTime      string         `json:"createTime"`
	UpdateTime      string         `json:"updateTime"`
}

// Attendance 考勤模型
type Attendance struct {
	ID             string `json:"_id,omitempty"`
	PlayerID       string `json:"playerId,omitempty"`
	PlayerName     string `json:"playerName,omitempty"`
	Date           string `json:"date"`
	Type           string `json:"type"`
	Status         string `json:"status"`
	Remark         string `json:"remark"`
	MatchID        string `json:"matchId,omitempty"`
	ScheduleID     string `json:"scheduleId,omitempty"`
	PresentPlayers string `json:"presentPlayers,omitempty"`
	AbsentPlayers  string `json:"absentPlayers,omitempty"`
	OpenID         string `json:"openid,omitempty"`
	CreateTime     string `json:"createTime"`
}

// User 用户模型
type User struct {
	ID            string `json:"_id,omitempty"`
	OpenID        string `json:"openid"`
	Name          string `json:"name"`
	Avatar        string `json:"avatar"`
	Role          string `json:"role"`
	CreateTime    string `json:"createTime"`
	LastLoginTime string `json:"lastLoginTime"`
}

// TeamPhoto 球队照片模型
type TeamPhoto struct {
	ID         string `json:"_id,omitempty"`
	OpenID     string `json:"openid"`
	FileID     string `json:"fileId"`
	CreatedAt  string `json:"createdAt"`
}

// SeasonStats 赛季统计数据
type SeasonStats struct {
	Goals    int `json:"goals"`
	Conceded int `json:"conceded"`
	Wins     int `json:"wins"`
	Draws    int `json:"draws"`
	Losses   int `json:"losses"`
}
