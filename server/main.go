package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	

	"bluetoothfootball/server/database"
	"bluetoothfootball/server/handlers"

	"github.com/gin-gonic/gin"
	"gopkg.in/natefinch/lumberjack.v2"
	"github.com/spf13/viper"
)

type Config struct {
	Server struct {
		Port string `mapstructure:"port"`
		Mode string `mapstructure:"mode"`
	} `mapstructure:"server"`
	Database struct {
		Host     string `mapstructure:"host"`
		Port     string `mapstructure:"port"`
		User     string `mapstructure:"user"`
		Password string `mapstructure:"password"`
		Name     string `mapstructure:"name"`
	} `mapstructure:"database"`
	Log struct {
		Level      string `mapstructure:"level"`
		Path       string `mapstructure:"path"`
		MaxSize    int    `mapstructure:"max_size"`
		MaxBackups int    `mapstructure:"max_backups"`
		MaxAge     int    `mapstructure:"max_age"`
		Compress   bool   `mapstructure:"compress"`
	} `mapstructure:"log"`
}

func loadConfig() *Config {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("/root/workspace/BluetoothFootball/server")

	if err := viper.ReadInConfig(); err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		log.Fatalf("Failed to unmarshal config: %v", err)
	}

	return &config
}

func setupLog(config *Config) {
	// 创建日志目录
	os.MkdirAll(config.Log.Path, 0755)

	// 设置日志轮转
	rotateLog := &lumberjack.Logger{
		Filename:   fmt.Sprintf("%s/server.log", config.Log.Path),
		MaxSize:    config.Log.MaxSize,
		MaxBackups: config.Log.MaxBackups,
		MaxAge:     config.Log.MaxAge,
		Compress:   config.Log.Compress,
	}

	// 设置 gin 日志轮转
	ginLog := &lumberjack.Logger{
		Filename:   fmt.Sprintf("%s/gin.log", config.Log.Path),
		MaxSize:    config.Log.MaxSize,
		MaxBackups: config.Log.MaxBackups,
		MaxAge:     config.Log.MaxAge,
		Compress:   config.Log.Compress,
	}

	// 设置日志输出
	log.SetOutput(rotateLog)
	log.SetFlags(log.Ldate | log.Ltime)

	// 设置 gin 模式
	if config.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 替换 gin 默认日志输出
	gin.DefaultWriter = ginLog
	gin.DefaultErrorWriter = ginLog

	log.Printf("Log level: %s", config.Log.Level)
	log.Printf("Log path: %s", config.Log.Path)
}

func main() {
	// 加载配置
	config := loadConfig()

	// 设置日志
	setupLog(config)

	// 设置数据库环境变量
	os.Setenv("DB_HOST", config.Database.Host)
	os.Setenv("DB_PORT", config.Database.Port)
	os.Setenv("DB_USER", config.Database.User)
	os.Setenv("DB_PASSWORD", config.Database.Password)
	os.Setenv("DB_NAME", config.Database.Name)

	// 初始化数据库
	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	// 创建路由器
	r := gin.Default()

	// 配置CORS
	r.Use(func(c *gin.Context) {
		log.Printf("[%s] %s - %s", c.Request.Method, c.Request.URL.Path, c.ClientIP())

		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 静态文件服务
	r.Static("/uploads", "./uploads")

	// API路由
	api := r.Group("/api")
	{
		api.GET("/players", handlers.GetPlayers)
		api.GET("/players/:id", handlers.GetPlayer)
		api.POST("/players", handlers.CreatePlayer)
		api.PUT("/players/:id", handlers.UpdatePlayer)
		api.DELETE("/players/:id", handlers.DeletePlayer)
		api.GET("/players/count", handlers.GetPlayerCount)

		api.GET("/matches", handlers.GetMatches)
		api.GET("/matches/:id", handlers.GetMatch)
		api.POST("/matches", handlers.CreateMatch)
		api.PUT("/matches/:id", handlers.UpdateMatch)
		api.DELETE("/matches/:id", handlers.DeleteMatch)

		api.GET("/match_records", handlers.GetMatchRecords)
		api.GET("/match_records/match/:matchId", handlers.GetMatchRecordsByMatch)
		api.GET("/match_records/player/:playerId", handlers.GetMatchRecordsByPlayer)
		api.POST("/match_records", handlers.CreateMatchRecord)
		api.PUT("/match_records/:id", handlers.UpdateMatchRecord)
		api.DELETE("/match_records/:id", handlers.DeleteMatchRecord)

		api.GET("/schedules", handlers.GetSchedules)
		api.GET("/schedules/:id", handlers.GetSchedule)
		api.POST("/schedules", handlers.CreateSchedule)
		api.PUT("/schedules/:id", handlers.UpdateSchedule)
		api.DELETE("/schedules/:id", handlers.DeleteSchedule)

		api.GET("/attendance", handlers.GetAttendance)
		api.POST("/attendance", handlers.CreateAttendance)
		api.PUT("/attendance/:id", handlers.UpdateAttendance)
		api.DELETE("/attendance/:id", handlers.DeleteAttendance)

		api.GET("/users/:openid", handlers.GetUser)
		api.POST("/users", handlers.CreateUser)
		api.PUT("/users/:openid", handlers.UpdateUser)

		api.GET("/team_photos", handlers.GetTeamPhotos)
		api.POST("/team_photos", handlers.CreateTeamPhoto)
		api.DELETE("/team_photos/:id", handlers.DeleteTeamPhoto)

		api.GET("/stats/season", handlers.GetSeasonStats)
		api.GET("/stats/top_scorers", handlers.GetTopScorers)
		api.GET("/stats/top_assists", handlers.GetTopAssists)

		api.POST("/upload/avatar", handlers.UploadAvatar)
		api.POST("/upload/team_photo", handlers.UploadTeamPhoto)
	}

	addr := fmt.Sprintf(":%s", config.Server.Port)
	log.Printf("Server starting on %s (mode: %s)", addr, config.Server.Mode)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
