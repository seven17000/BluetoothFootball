package handlers

import (
	"bluetoothfootball/server/database"
	"bluetoothfootball/server/models"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
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
	c.JSON(http.StatusBadRequest, Response{
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
		"SELECT id, name, number, position, is_active, tags, ability, join_date, gender, age, height, weight, avatar, create_time, update_time FROM players WHERE id = ?",
		id,
	).Scan(&player.ID, &player.Name, &player.Number, &player.Position, &player.IsActive,
		&player.Tags, &player.Ability, &player.IsActive, &player.Gender, &player.Age,
		&player.Height, &player.Weight, &player.Avatar, &player.CreateTime, &player.UpdateTime)

	if err == sql.ErrNoRows {
		Error(c, 404, "Player not found")
		return
	}
	if err != nil {
		Error(c, 500, "Failed to get player")
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

	query := "SELECT id, match_date, opponent, goals, conceded, result, is_home, season, location, match_time, jersey_color, opponent_jersey, attendance_players, goal_records, assist_records, notes, create_time, update_time FROM matches"
	args := []interface{}{}

	if season != "" {
		query += " WHERE season = ?"
		args = append(args, season)
	}

	query += " ORDER BY schedule_date DESC, schedule_time DESC LIMIT ?"
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
		matches = append(matches, match)
	}

	Success(c, matches)
}

// GetMatch 获取单个比赛
func GetMatch(c *gin.Context) {
	id := c.Param("id")

	var match models.Match
	err := database.DB.QueryRow(
		"SELECT id, match_date, opponent, goals, conceded, result, is_home, season, location, match_time, jersey_color, opponent_jersey, attendance_players, goal_records, assist_records, notes, create_time, update_time FROM matches WHERE id = ?",
		id,
	).Scan(&match.ID, &match.Opponent, &match.Goals, &match.Conceded, &match.ScheduleDate,
		&match.Result, &match.IsHome, &match.Season, &match.Location, &match.MatchTime,
		&match.JerseyColor, &match.OpponentJersey, &match.AttendancePlayers, &match.GoalRecords, &match.AssistRecords, &match.Notes, &match.CreateTime, &match.UpdateTime)

	if err == sql.ErrNoRows {
		Error(c, 404, "Match not found")
		return
	}
	if err != nil {
		Error(c, 500, "Failed to get match")
		return
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
		"SELECT id, openid, date, opponent, is_home, jersey_color, opponent_jersey, location, notes, create_time, update_time FROM schedules ORDER BY date ASC",
	)
	if err != nil {
		Error(c, 500, "Failed to query schedules")
		return
	}
	defer rows.Close()

	var schedules []models.Schedule
	for rows.Next() {
		var schedule models.Schedule
		err := rows.Scan(&schedule.ID, &schedule.OpenID, &schedule.Date, &schedule.Opponent, &schedule.IsHome,
			&schedule.Location, &schedule.Notes, &schedule.JerseyColor, &schedule.OpponentJersey)
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

	query := "SELECT id, player_id, player_name, date, type, status, remark, match_id, schedule_id, present_players, absent_players, openid, create_time FROM attendance WHERE 1=1"
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

	var records []models.Attendance
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

	query := `
		SELECT p.id, p.name, COALESCE(SUM(mr.goals), 0) as total_goals
		FROM players p
		LEFT JOIN match_records mr ON p.id = mr.player_id
		LEFT JOIN matches m ON mr.match_id = m.id
		WHERE p.is_active = TRUE
		GROUP BY p.id, p.name
		HAVING total_goals > 0
		ORDER BY total_goals DESC
		LIMIT ?
	`

	var limitInt int
	fmt.Sscanf(limit, "%d", &limitInt)

	rows, err := database.DB.Query(query, limitInt)
	if err != nil {
		Error(c, 500, "Failed to get top scorers")
		return
	}
	defer rows.Close()

	type Scorer struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Goals int    `json:"goals"`
	}

	var scorers []Scorer
	for rows.Next() {
		var scorer Scorer
		err := rows.Scan(&scorer.ID, &scorer.Name, &scorer.Goals)
		if err != nil {
			continue
		}
		scorers = append(scorers, scorer)
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
