package handlers

import (
	"bluetoothfootball/server/database"
	"bluetoothfootball/server/models"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// Response 标准响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
}

// Success 返回成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code: 0,
		Data: data,
	})
}

// Error 返回错误响应
func Error(c *gin.Context, code int, message string) {
	status := http.StatusInternalServerError
	if code >= 400 && code < 500 {
		status = http.StatusBadRequest
	} else if code >= 300 && code < 400 {
		status = http.StatusFound
	}
	c.JSON(status, Response{
		Code:    code,
		Message: message,
	})
}

// 生成UUID (简化版)
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// ========== 球员相关 ==========

// GetPlayers 获取球员列表
func GetPlayers(c *gin.Context) {
	isActive := c.Query("isActive")
	page := c.DefaultQuery("page", "1")
	pageSize := c.DefaultQuery("pageSize", "20")

	query := "SELECT id, name, number, position, is_active, tags, ability, join_date, gender, age, height, weight, avatar, create_time, update_time FROM players WHERE 1=1"
	args := []interface{}{}

	if isActive != "" {
		query += " AND is_active = ?"
		args = append(args, isActive == "true")
	}

	query += " ORDER BY CAST(number AS UNSIGNED) ASC"
	query += " LIMIT ? OFFSET ?"

	var pageInt, pageSizeInt int
	fmt.Sscanf(page, "%d", &pageInt)
	fmt.Sscanf(pageSize, "%d", &pageSizeInt)

	offset := (pageInt - 1) * pageSizeInt
	args = append(args, pageSizeInt, offset)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		Error(c, 500, "Failed to query players")
		return
	}
	defer rows.Close()

	var players []models.Player
	for rows.Next() {
		var player models.Player
		err := rows.Scan(&player.ID, &player.Name, &player.Number, &player.Position, &player.IsActive,
			&player.Tags, &player.Ability, &player.JoinDate, &player.Gender, &player.Age, &player.Height, &player.Weight, &player.Avatar,
			&player.CreateTime, &player.UpdateTime)
		if err != nil {
			fmt.Printf("Scan error: %v\n", err)
			continue
		}
		players = append(players, player)
	}

	Success(c, players)
}

// GetPlayer 获取单个球员
func GetPlayer(c *gin.Context) {
	id := c.Param("id")

	var player models.Player
	err := database.DB.QueryRow(
		"SELECT id, name, number, position, is_active, tags, ability, COALESCE(join_date, ''), COALESCE(gender, ''), age, height, COALESCE(weight, ''), avatar, COALESCE(create_time, ''), COALESCE(update_time, '') FROM players WHERE id = ?",
		id,
	).Scan(&player.ID, &player.Name, &player.Number, &player.Position, &player.IsActive,
		&player.Tags, &player.Ability, &player.JoinDate, &player.Gender, &player.Age,
		&player.Height, &player.Weight, &player.Avatar, &player.CreateTime, &player.UpdateTime)

	if err == sql.ErrNoRows {
		Error(c, 404, "Player not found")
		return
	}
	if err != nil {
		Error(c, 500, "Failed to get player: " + err.Error())
		return
	}

	Success(c, player)
}

// CreatePlayer 创建球员
func CreatePlayer(c *gin.Context) {
	var player models.Player
	if err := c.ShouldBindJSON(&player); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	if player.ID == "" {
		player.ID = generateID()
	}

	// 处理JSON字段
	positionJSON, _ := json.Marshal(player.Position)
	tagsJSON, _ := json.Marshal(player.Tags)
	abilityJSON, _ := json.Marshal(player.Ability)

	_, err := database.DB.Exec(
		`INSERT INTO players (id, name, number, position, join_date, gender, age, height, weight, avatar, tags, ability, is_active)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		player.ID, player.Name, player.Number, positionJSON, player.JoinDate,
		player.Gender, player.Age, player.Height, player.Weight, player.Avatar,
		tagsJSON, abilityJSON, player.IsActive,
	)

	if err != nil {
		Error(c, 500, "Failed to create player")
		return
	}

	Success(c, player)
}

// UpdatePlayer 更新球员
func UpdatePlayer(c *gin.Context) {
	id := c.Param("id")

	var player models.Player
	if err := c.ShouldBindJSON(&player); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	positionJSON, _ := json.Marshal(player.Position)
	tagsJSON, _ := json.Marshal(player.Tags)
	abilityJSON, _ := json.Marshal(player.Ability)

	_, err := database.DB.Exec(
		`UPDATE players SET name=?, number=?, position=?, join_date=?, gender=?, age=?, height=?, weight=?, avatar=?, tags=?, ability=?, is_active=? WHERE id=?`,
		player.Name, player.Number, positionJSON, player.JoinDate,
		player.Gender, player.Age, player.Height, player.Weight, player.Avatar,
		tagsJSON, abilityJSON, player.IsActive, id,
	)

	if err != nil {
		Error(c, 500, "Failed to update player")
		return
	}

	player.ID = id
	Success(c, player)
}

// DeletePlayer 删除球员
func DeletePlayer(c *gin.Context) {
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM players WHERE id = ?", id)
	if err != nil {
		Error(c, 500, "Failed to delete player")
		return
	}

	Success(c, gin.H{"message": "Player deleted"})
}

// GetPlayerCount 获取球员数量
func GetPlayerCount(c *gin.Context) {
	var count int
	err := database.DB.QueryRow("SELECT COUNT(*) FROM players WHERE is_active = TRUE").Scan(&count)
	if err != nil {
		Error(c, 500, "Failed to count players")
		return
	}

	Success(c, gin.H{"count": count})
}

// ========== 比赛相关 ==========

// GetMatches 获取比赛列表
func GetMatches(c *gin.Context) {
	season := c.Query("season")
	limit := c.DefaultQuery("limit", "20")

	query := "SELECT id, COALESCE(match_date, ''), opponent, goals, conceded, result, is_home, COALESCE(season, ''), COALESCE(location, ''), COALESCE(match_time, ''), COALESCE(jersey_color, ''), COALESCE(opponent_jersey, ''), COALESCE(attendance_players, ''), COALESCE(goal_records, '{}'), COALESCE(assist_records, '{}'), COALESCE(notes, ''), COALESCE(create_time, ''), COALESCE(update_time, '') FROM matches"
	args := []interface{}{}

	if season != "" {
		query += " WHERE season = ?"
		args = append(args, season)
	}

	query += " ORDER BY match_date DESC LIMIT ?"
	var limitInt int
	fmt.Sscanf(limit, "%d", &limitInt)
	args = append(args, limitInt)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		Error(c, 500, "Failed to query matches")
		return
	}
	defer rows.Close()

	var matches []models.Match
	for rows.Next() {
		var match models.Match
		err := rows.Scan(&match.ID, &match.MatchDate, &match.Opponent, &match.Goals, &match.Conceded,
			&match.Result, &match.IsHome, &match.Season, &match.Location, &match.MatchTime,
			&match.JerseyColor, &match.OpponentJersey, &match.AttendancePlayers, &match.GoalRecords, &match.AssistRecords, &match.Notes, &match.CreateTime, &match.UpdateTime)
		if err != nil {
			fmt.Printf("Scan error: %v\n", err)
			continue
		}
		// Fix date format
		if match.MatchDate != "" {
			match.MatchDate = match.MatchDate + "T00:00:00+08:00"
		}
		matches = append(matches, match)
	}

	Success(c, matches)
}

// GetMatch 获取单个比赛
func GetMatch(c *gin.Context) {
	id := c.Param("id")

	var match models.Match
	err := database.DB.QueryRow(
		"SELECT id, COALESCE(match_date, ''), opponent, goals, conceded, result, is_home, COALESCE(season, ''), COALESCE(location, ''), COALESCE(match_time, ''), COALESCE(jersey_color, ''), COALESCE(opponent_jersey, ''), COALESCE(attendance_players, ''), COALESCE(goal_records, '{}'), COALESCE(assist_records, '{}'), COALESCE(notes, ''), COALESCE(create_time, ''), COALESCE(update_time, '') FROM matches WHERE id = ?",
		id,
	).Scan(&match.ID, &match.MatchDate, &match.Opponent, &match.Goals, &match.Conceded, &match.Result,
		&match.IsHome, &match.Season, &match.Location, &match.MatchTime,
		&match.JerseyColor, &match.OpponentJersey, &match.AttendancePlayers, &match.GoalRecords, &match.AssistRecords, &match.Notes, &match.CreateTime, &match.UpdateTime)

	if err == sql.ErrNoRows {
		Error(c, 404, "Match not found")
		return
	}
	if err != nil {
		Error(c, 500, "Failed to get match: " + err.Error())
		return
	}
	
	// Fix date format
	if match.MatchDate != "" {
		match.MatchDate = match.MatchDate + "T00:00:00+08:00"
	}

	Success(c, match)
}

// CreateMatch 创建比赛
func CreateMatch(c *gin.Context) {
	var match models.Match
	if err := c.ShouldBindJSON(&match); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	if match.ID == "" {
		match.ID = generateID()
	}

	_, err := database.DB.Exec(
		`INSERT INTO matches (id, opponent, goals, conceded, schedule_date, schedule_time, is_home, location, season, jersey_color, opponent_jersey, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		match.ID, match.Opponent, match.Goals, match.Conceded, match.ScheduleDate,
		match.ScheduleTime, match.IsHome, match.Location, match.Season,
		match.JerseyColor, match.OpponentJersey, match.Notes,
	)

	if err != nil {
		Error(c, 500, "Failed to create match")
		return
	}

	Success(c, match)
}

// UpdateMatch 更新比赛
func UpdateMatch(c *gin.Context) {
	id := c.Param("id")

	var match models.Match
	if err := c.ShouldBindJSON(&match); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	_, err := database.DB.Exec(
		`UPDATE matches SET opponent=?, goals=?, conceded=?, schedule_date=?, schedule_time=?, is_home=?, location=?, season=?, jersey_color=?, opponent_jersey=?, notes=? WHERE id=?`,
		match.Opponent, match.Goals, match.Conceded, match.ScheduleDate,
		match.ScheduleTime, match.IsHome, match.Location, match.Season,
		match.JerseyColor, match.OpponentJersey, match.Notes, id,
	)

	if err != nil {
		Error(c, 500, "Failed to update match")
		return
	}

	match.ID = id
	Success(c, match)
}

// DeleteMatch 删除比赛
func DeleteMatch(c *gin.Context) {
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM matches WHERE id = ?", id)
	if err != nil {
		Error(c, 500, "Failed to delete match")
		return
	}

	Success(c, gin.H{"message": "Match deleted"})
}

// ========== 比赛记录相关 ==========

// GetMatchRecords 获取比赛记录列表
func GetMatchRecords(c *gin.Context) {
	rows, err := database.DB.Query(
		"SELECT id, match_id, match_date, opponent, goal_stats, assist_stats, create_time FROM match_records",
	)
	if err != nil {
		Error(c, 500, "Failed to query match records")
		return
	}
	defer rows.Close()

	var records []models.MatchRecord
	for rows.Next() {
		var record models.MatchRecord
		err := rows.Scan(&record.ID, &record.MatchID, &record.MatchDate, &record.Opponent,
			&record.GoalStats, &record.AssistStats, &record.CreateTime)
		if err != nil {
			continue
		}
		records = append(records, record)
	}

	Success(c, records)
}

// GetMatchRecordsByMatch 获取某比赛的记录
func GetMatchRecordsByMatch(c *gin.Context) {
	matchID := c.Param("matchId")

	rows, err := database.DB.Query(
		"SELECT id, match_id, match_date, opponent, goal_stats, assist_stats, create_time FROM match_records WHERE match_id = ?",
		matchID,
	)
	if err != nil {
		Error(c, 500, "Failed to query match records: " + err.Error())
		return
	}
	defer rows.Close()

	// 获取所有球员信息
	playerRows, _ := database.DB.Query("SELECT id, name FROM players")
	playerNames := make(map[string]string)
	if playerRows != nil {
		defer playerRows.Close()
		for playerRows.Next() {
			var id, name string
			playerRows.Scan(&id, &name)
			playerNames[id] = name
		}
	}

	re := regexp.MustCompile(`"([^"]+)":\s*([0-9.]+)`)

	// 球员得分映射
	playerGoals := make(map[string]int)
	playerAssists := make(map[string]int)

	for rows.Next() {
		var id, matchID, matchDate, opponent, goalStats, assistStats, createTime sql.NullString
		err := rows.Scan(&id, &matchID, &matchDate, &opponent, &goalStats, &assistStats, &createTime)
		if err != nil {
			continue
		}

		// 解析进球记录
		if goalStats.String != "" {
			matches := re.FindAllStringSubmatch(goalStats.String, -1)
			for _, match := range matches {
				if len(match) >= 3 {
					playerID := match[1]
					var count int
					fmt.Sscanf(match[2], "%d", &count)
					playerGoals[playerID] += count
				}
			}
		}

		// 解析助攻记录
		if assistStats.String != "" {
			matches := re.FindAllStringSubmatch(assistStats.String, -1)
			for _, match := range matches {
				if len(match) >= 3 {
					playerID := match[1]
					var count int
					fmt.Sscanf(match[2], "%d", &count)
					playerAssists[playerID] += count
				}
			}
		}
	}

	// 构建返回数据
	type PlayerRecord struct {
		PlayerID   string `json:"playerId"`
		PlayerName string `json:"playerName"`
		Goals      int    `json:"goals"`
		Assists    int    `json:"assists"`
	}

	var records []PlayerRecord
	allPlayerIDs := make(map[string]bool)
	for id := range playerGoals {
		allPlayerIDs[id] = true
	}
	for id := range playerAssists {
		allPlayerIDs[id] = true
	}

	for playerID := range allPlayerIDs {
		playerName := playerNames[playerID]
		if playerName == "" {
			playerName = "未知"
		}
		records = append(records, PlayerRecord{
			PlayerID:   playerID,
			PlayerName: playerName,
			Goals:      playerGoals[playerID],
			Assists:    playerAssists[playerID],
		})
	}

	Success(c, records)
}

// GetMatchRecordsByPlayer 获取某球员的记录
func GetMatchRecordsByPlayer(c *gin.Context) {
	playerID := c.Param("playerId")

	rows, err := database.DB.Query(
		"SELECT id, match_id, match_date, opponent, goal_stats, assist_stats, create_time FROM match_records WHERE player_id = ?",
		playerID,
	)
	if err != nil {
		Error(c, 500, "Failed to query match records")
		return
	}
	defer rows.Close()

	var records []models.MatchRecord
	for rows.Next() {
		var record models.MatchRecord
		err := rows.Scan(&record.ID, &record.MatchID, &record.MatchDate, &record.Opponent,
			&record.GoalStats, &record.AssistStats, &record.CreateTime)
		if err != nil {
			continue
		}
		records = append(records, record)
	}

	Success(c, records)
}

// CreateMatchRecord 创建比赛记录
func CreateMatchRecord(c *gin.Context) {
	var record models.MatchRecord
	if err := c.ShouldBindJSON(&record); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	if record.ID == "" {
		record.ID = generateID()
	}

	_, err := database.DB.Exec(
		`INSERT INTO match_records (id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played, rating)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		record.ID, record.MatchID, record.MatchDate, record.Opponent, record.GoalStats,
		record.AssistStats, record.CreateTime,
	)

	if err != nil {
		Error(c, 500, "Failed to create match record")
		return
	}

	Success(c, record)
}

// UpdateMatchRecord 更新比赛记录
func UpdateMatchRecord(c *gin.Context) {
	id := c.Param("id")

	var record models.MatchRecord
	if err := c.ShouldBindJSON(&record); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	_, err := database.DB.Exec(
		`UPDATE match_records SET player_id=?, match_id=?, goals=?, assists=?, yellow_cards=?, red_cards=?, minutes_played=?, rating=? WHERE id=?`,
		record.ID, record.MatchID, record.MatchDate, record.Opponent, record.GoalStats,
		record.AssistStats, record.CreateTime, id,
	)

	if err != nil {
		Error(c, 500, "Failed to update match record")
		return
	}

	record.ID = id
	Success(c, record)
}

// DeleteMatchRecord 删除比赛记录
func DeleteMatchRecord(c *gin.Context) {
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM match_records WHERE id = ?", id)
	if err != nil {
		Error(c, 500, "Failed to delete match record")
		return
	}

	Success(c, gin.H{"message": "Match record deleted"})
}

// ========== 赛程相关 ==========

// GetSchedules 获取赛程列表
func GetSchedules(c *gin.Context) {
	rows, err := database.DB.Query(
		"SELECT id, IFNULL(openid, '') as openid, IFNULL(date, '') as date, IFNULL(opponent, '') as opponent, is_home, IFNULL(jersey_color, '') as jersey_color, IFNULL(opponent_jersey, '') as opponent_jersey, IFNULL(location, '') as location, IFNULL(notes, '') as notes, IFNULL(create_time, '') as create_time, IFNULL(update_time, '') as update_time FROM schedules ORDER BY date ASC",
	)
	if err != nil {
		Error(c, 500, "Failed to query schedules")
		return
	}
	defer rows.Close()

	schedules := []models.Schedule{}
	for rows.Next() {
		var schedule models.Schedule
		err := rows.Scan(&schedule.ID, &schedule.OpenID, &schedule.Date, &schedule.Opponent, &schedule.IsHome,
			&schedule.JerseyColor, &schedule.OpponentJersey, &schedule.Location, &schedule.Notes, 
			&schedule.CreateTime, &schedule.UpdateTime)
		if err != nil {
			continue
		}
		schedules = append(schedules, schedule)
	}

	Success(c, schedules)
}

// GetSchedule 获取单个赛程
func GetSchedule(c *gin.Context) {
	id := c.Param("id")

	var schedule models.Schedule
	err := database.DB.QueryRow(
		"SELECT id, openid, date, opponent, is_home, jersey_color, opponent_jersey, location, notes, create_time, update_time FROM schedules WHERE id = ?",
		id,
	).Scan(&schedule.ID, &schedule.OpenID, &schedule.Date, &schedule.Opponent, &schedule.IsHome,
		&schedule.Location, &schedule.Notes, &schedule.JerseyColor, &schedule.OpponentJersey)

	if err == sql.ErrNoRows {
		Error(c, 404, "Schedule not found")
		return
	}
	if err != nil {
		Error(c, 500, "Failed to get schedule")
		return
	}

	Success(c, schedule)
}

// CreateSchedule 创建赛程
func CreateSchedule(c *gin.Context) {
	var schedule models.Schedule
	if err := c.ShouldBindJSON(&schedule); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	if schedule.ID == "" {
		schedule.ID = generateID()
	}

	_, err := database.DB.Exec(
		`INSERT INTO schedules (id, opponent, date, is_home, location, notes, jersey_color, opponent_jersey)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		schedule.ID, schedule.Opponent, schedule.Date, schedule.IsHome,
		schedule.Location, schedule.Notes, schedule.JerseyColor, schedule.OpponentJersey,
	)

	if err != nil {
		Error(c, 500, "Failed to create schedule")
		return
	}

	Success(c, schedule)
}

// UpdateSchedule 更新赛程
func UpdateSchedule(c *gin.Context) {
	id := c.Param("id")

	var schedule models.Schedule
	if err := c.ShouldBindJSON(&schedule); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	_, err := database.DB.Exec(
		`UPDATE schedules SET opponent=?, date=?, is_home=?, location=?, notes=?, jersey_color=?, opponent_jersey=? WHERE id=?`,
		schedule.Opponent, schedule.Date, schedule.IsHome,
		schedule.Location, schedule.Notes, schedule.JerseyColor, schedule.OpponentJersey, id,
	)

	if err != nil {
		Error(c, 500, "Failed to update schedule")
		return
	}

	schedule.ID = id
	Success(c, schedule)
}

// DeleteSchedule 删除赛程
func DeleteSchedule(c *gin.Context) {
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM schedules WHERE id = ?", id)
	if err != nil {
		Error(c, 500, "Failed to delete schedule")
		return
	}

	Success(c, gin.H{"message": "Schedule deleted"})
}

// ========== 考勤相关 ==========

// GetAttendance 获取考勤列表
func GetAttendance(c *gin.Context) {
	scheduleID := c.Query("scheduleId")
	playerID := c.Query("playerId")

	query := "SELECT id, player_id, player_name, date, attendance_type AS type, status, remark, match_id, schedule_id, present_players, absent_players, openid, create_time FROM attendance WHERE 1=1"
	args := []interface{}{}

	if scheduleID != "" {
		query += " AND schedule_id = ?"
		args = append(args, scheduleID)
	}
	if playerID != "" {
		query += " AND player_id = ?"
		args = append(args, playerID)
	}

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		Error(c, 500, "Failed to query attendance")
		return
	}
	defer rows.Close()

	records := []models.Attendance{}
	for rows.Next() {
		var record models.Attendance
		err := rows.Scan(&record.ID, &record.PlayerID, &record.PlayerName, &record.Date, &record.Type,
		&record.Status, &record.Remark, &record.MatchID, &record.ScheduleID, &record.PresentPlayers,
		&record.AbsentPlayers, &record.OpenID, &record.CreateTime)
		if err != nil {
			continue
		}
		records = append(records, record)
	}

	Success(c, records)
}

// CreateAttendance 创建考勤记录
func CreateAttendance(c *gin.Context) {
	var record models.Attendance
	if err := c.ShouldBindJSON(&record); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	if record.ID == "" {
		record.ID = generateID()
	}

	_, err := database.DB.Exec(
		`INSERT INTO attendance (id, player_id, schedule_id, status, reason)
		VALUES (?, ?, ?, ?, ?)`,
		record.ID, record.PlayerID, record.ScheduleID, record.Status, record.Remark,
	)

	if err != nil {
		Error(c, 500, "Failed to create attendance")
		return
	}

	Success(c, record)
}

// UpdateAttendance 更新考勤记录
func UpdateAttendance(c *gin.Context) {
	id := c.Param("id")

	var record models.Attendance
	if err := c.ShouldBindJSON(&record); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	_, err := database.DB.Exec(
		`UPDATE attendance SET player_id=?, schedule_id=?, status=?, reason=? WHERE id=?`,
		record.PlayerID, record.ScheduleID, record.Status, record.Remark, id,
	)

	if err != nil {
		Error(c, 500, "Failed to update attendance")
		return
	}

	record.ID = id
	Success(c, record)
}

// DeleteAttendance 删除考勤记录
func DeleteAttendance(c *gin.Context) {
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM attendance WHERE id = ?", id)
	if err != nil {
		Error(c, 500, "Failed to delete attendance")
		return
	}

	Success(c, gin.H{"message": "Attendance deleted"})
}

// ========== 用户相关 ==========

// GetUser 获取用户
func GetUser(c *gin.Context) {
	openid := c.Param("openid")

	var user models.User
	err := database.DB.QueryRow(
		"SELECT id, openid, name, avatar, role, create_time, last_login_time FROM users WHERE openid = ?",
		openid,
	).Scan(&user.ID, &user.OpenID, &user.Name, &user.Avatar, &user.Role, &user.CreateTime, &user.LastLoginTime)

	if err == sql.ErrNoRows {
		Error(c, 404, "User not found")
		return
	}
	if err != nil {
		Error(c, 500, "Failed to get user")
		return
	}

	Success(c, user)
}

// CreateUser 创建用户
func CreateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	_, err := database.DB.Exec(
		`INSERT INTO users (openid, nickname, avatar, role) VALUES (?, ?, ?, ?)`,
		user.OpenID, user.Name, user.Avatar, user.Role,
	)

	if err != nil {
		Error(c, 500, "Failed to create user")
		return
	}

	Success(c, user)
}

// UpdateUser 更新用户
func UpdateUser(c *gin.Context) {
	openid := c.Param("openid")

	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	_, err := database.DB.Exec(
		`UPDATE users SET nickname=?, avatar=?, role=? WHERE openid=?`,
		user.Name, user.Avatar, user.Role, openid,
	)

	if err != nil {
		Error(c, 500, "Failed to update user")
		return
	}

	user.OpenID = openid
	Success(c, user)
}

// ========== 球队照片相关 ==========

// GetTeamPhotos 获取球队照片
func GetTeamPhotos(c *gin.Context) {
	rows, err := database.DB.Query("SELECT id, openid, file_id, created_at FROM team_photos ORDER BY created_at DESC")
	if err != nil {
		Error(c, 500, "Failed to query team photos")
		return
	}
	defer rows.Close()

	var photos []models.TeamPhoto
	for rows.Next() {
		var photo models.TeamPhoto
		err := rows.Scan(&photo.ID, &photo.OpenID, &photo.FileID, &photo.CreatedAt)
		if err != nil {
			continue
		}
		photos = append(photos, photo)
	}

	Success(c, photos)
}

// CreateTeamPhoto 创建球队照片
func CreateTeamPhoto(c *gin.Context) {
	var photo models.TeamPhoto
	if err := c.ShouldBindJSON(&photo); err != nil {
		Error(c, 400, "Invalid request body")
		return
	}

	if photo.ID == "" {
		photo.ID = generateID()
	}

	_, err := database.DB.Exec(
		`INSERT INTO team_photos (id, url) VALUES (?, ?)`,
		photo.ID, photo.FileID,
	)

	if err != nil {
		Error(c, 500, "Failed to create team photo")
		return
	}

	Success(c, photo)
}

// DeleteTeamPhoto 删除球队照片
func DeleteTeamPhoto(c *gin.Context) {
	id := c.Param("id")

	_, err := database.DB.Exec("DELETE FROM team_photos WHERE id = ?", id)
	if err != nil {
		Error(c, 500, "Failed to delete team photo")
		return
	}

	Success(c, gin.H{"message": "Team photo deleted"})
}

// ========== 统计相关 ==========

// GetSeasonStats 获取赛季统计
func GetSeasonStats(c *gin.Context) {
	season := c.Query("season")

	query := "SELECT COALESCE(SUM(goals), 0), COALESCE(SUM(conceded), 0), COUNT(CASE WHEN goals > conceded THEN 1 END), COUNT(CASE WHEN goals = conceded THEN 1 END), COUNT(CASE WHEN goals < conceded THEN 1 END) FROM matches"
	args := []interface{}{}

	if season != "" {
		query += " WHERE season = ?"
		args = append(args, season)
	}

	var stats models.SeasonStats
	err := database.DB.QueryRow(query, args...).Scan(&stats.Goals, &stats.Conceded, &stats.Wins, &stats.Draws, &stats.Losses)
	if err != nil {
		Error(c, 500, "Failed to get season stats")
		return
	}

	Success(c, stats)
}

// GetTopScorers 获取射手榜
func GetTopScorers(c *gin.Context) {
	limit := c.DefaultQuery("limit", "10")
	limitInt := 10
	fmt.Sscanf(limit, "%d", &limitInt)

	// 查询所有比赛记录的进球统计
	rows, err := database.DB.Query(`
		SELECT goal_stats FROM match_records WHERE goal_stats IS NOT NULL
	`)
	if err != nil {
		Error(c, 500, "Failed to get top scorers: " + err.Error())
		return
	}
	defer rows.Close()

	// 解析JSON汇总进球数
	goalsMap := make(map[string]int)
	re := regexp.MustCompile(`"([^"]+)":\s*([0-9.]+)`)
	for rows.Next() {
		var goalStats string
		if err := rows.Scan(&goalStats); err != nil {
			continue
		}
		matches := re.FindAllStringSubmatch(goalStats, -1)
		for _, match := range matches {
			if len(match) >= 3 {
				playerID := match[1]
				var count int
				fmt.Sscanf(match[2], "%d", &count)
				goalsMap[playerID] += count
			}
		}
	}

	// 获取球员名称
	playerIDs := make([]string, 0, len(goalsMap))
	for id := range goalsMap {
		playerIDs = append(playerIDs, id)
	}
	playerNames := make(map[string]string)
	if len(playerIDs) > 0 {
		placeholders := make([]string, len(playerIDs))
		args := make([]interface{}, len(playerIDs))
		for i, id := range playerIDs {
			placeholders[i] = "?"
			args[i] = id
		}
		query := "SELECT id, name FROM players WHERE id IN (" + strings.Join(placeholders, ",") + ")"
		nameRows, _ := database.DB.Query(query, args...)
		if nameRows != nil {
			defer nameRows.Close()
			for nameRows.Next() {
				var id, name string
				nameRows.Scan(&id, &name)
				playerNames[id] = name
			}
		}
	}

	// 转换为切片并排序
	type Scorer struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Goals int    `json:"goals"`
	}
	var scorers []Scorer
	for id, goals := range goalsMap {
		if goals > 0 {
			name := playerNames[id]
			if name == "" {
				name = id
			}
			scorers = append(scorers, Scorer{ID: id, Name: name, Goals: goals})
		}
	}
	// 排序
	for i := 0; i < len(scorers)-1; i++ {
		for j := i + 1; j < len(scorers); j++ {
			if scorers[j].Goals > scorers[i].Goals {
				scorers[i], scorers[j] = scorers[j], scorers[i]
			}
		}
	}
	if limitInt < len(scorers) {
		scorers = scorers[:limitInt]
	}

	Success(c, scorers)
}

// GetTopAssists 获取助攻榜
func GetTopAssists(c *gin.Context) {
	limit := c.DefaultQuery("limit", "10")

	query := `
		SELECT p.id, p.name, COALESCE(SUM(mr.assists), 0) as total_assists
		FROM players p
		LEFT JOIN match_records mr ON p.id = mr.player_id
		LEFT JOIN matches m ON mr.match_id = m.id
		WHERE p.is_active = TRUE
		GROUP BY p.id, p.name
		HAVING total_assists > 0
		ORDER BY total_assists DESC
		LIMIT ?
	`

	var limitInt int
	fmt.Sscanf(limit, "%d", &limitInt)

	rows, err := database.DB.Query(query, limitInt)
	if err != nil {
		Error(c, 500, "Failed to get top assists")
		return
	}
	defer rows.Close()

	type Assist struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		Assists int  `json:"assists"`
	}

	var assists []Assist
	for rows.Next() {
		var assist Assist
		err := rows.Scan(&assist.ID, &assist.Name, &assist.Assists)
		if err != nil {
			continue
		}
		assists = append(assists, assist)
	}

	Success(c, assists)
}

// 辅助函数：日期和时间处理
func parseDate(dateStr string) string {
	if dateStr == "" {
		return ""
	}
	// 处理ISO日期格式
	dateStr = strings.ReplaceAll(dateStr, "T", " ")
	dateStr = strings.Split(dateStr, ".")[0]
	return dateStr
}
