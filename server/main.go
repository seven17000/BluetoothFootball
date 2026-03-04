package main

import (
	"flag"
	"fmt"
	"log"

	"bluetoothfootball/server/database"
	"bluetoothfootball/server/handlers"

	"github.com/gin-gonic/gin"
)

var (
	port = flag.String("port", "8080", "Server port")
)

func main() {
	flag.Parse()

	// 初始化数据库
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	// 创建路由器
	r := gin.Default()

	// 配置CORS
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// API路由组
	api := r.Group("/api")
	{
		// 球员相关
		api.GET("/players", handlers.GetPlayers)
		api.GET("/players/:id", handlers.GetPlayer)
		api.POST("/players", handlers.CreatePlayer)
		api.PUT("/players/:id", handlers.UpdatePlayer)
		api.DELETE("/players/:id", handlers.DeletePlayer)
		api.GET("/players/count", handlers.GetPlayerCount)

		// 比赛相关
		api.GET("/matches", handlers.GetMatches)
		api.GET("/matches/:id", handlers.GetMatch)
		api.POST("/matches", handlers.CreateMatch)
		api.PUT("/matches/:id", handlers.UpdateMatch)
		api.DELETE("/matches/:id", handlers.DeleteMatch)

		// 比赛记录相关
		api.GET("/match_records", handlers.GetMatchRecords)
		api.GET("/match_records/match/:matchId", handlers.GetMatchRecordsByMatch)
		api.GET("/match_records/player/:playerId", handlers.GetMatchRecordsByPlayer)
		api.POST("/match_records", handlers.CreateMatchRecord)
		api.PUT("/match_records/:id", handlers.UpdateMatchRecord)
		api.DELETE("/match_records/:id", handlers.DeleteMatchRecord)

		// 赛程相关
		api.GET("/schedules", handlers.GetSchedules)
		api.GET("/schedules/:id", handlers.GetSchedule)
		api.POST("/schedules", handlers.CreateSchedule)
		api.PUT("/schedules/:id", handlers.UpdateSchedule)
		api.DELETE("/schedules/:id", handlers.DeleteSchedule)

		// 考勤相关
		api.GET("/attendance", handlers.GetAttendance)
		api.POST("/attendance", handlers.CreateAttendance)
		api.PUT("/attendance/:id", handlers.UpdateAttendance)
		api.DELETE("/attendance/:id", handlers.DeleteAttendance)

		// 用户相关
		api.GET("/users/:openid", handlers.GetUser)
		api.POST("/users", handlers.CreateUser)
		api.PUT("/users/:openid", handlers.UpdateUser)

		// 球队照片相关
		api.GET("/team_photos", handlers.GetTeamPhotos)
		api.POST("/team_photos", handlers.CreateTeamPhoto)
		api.DELETE("/team_photos/:id", handlers.DeleteTeamPhoto)

		// 统计相关
		api.GET("/stats/season", handlers.GetSeasonStats)
		api.GET("/stats/top_scorers", handlers.GetTopScorers)
		api.GET("/stats/top_assists", handlers.GetTopAssists)
	}

	// 启动服务器
	addr := fmt.Sprintf(":%s", *port)
	log.Printf("Server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
