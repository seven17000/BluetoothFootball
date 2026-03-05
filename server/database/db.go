package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

// Config 数据库配置
type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	Database string
}

// GetConfig 获取数据库配置
func GetConfig() Config {
	return Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "3306"),
		User:     getEnv("DB_USER", "root"),
		Password: getEnv("DB_PASSWORD", ""),
		Database: getEnv("DB_NAME", "football_team"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// InitDB 初始化数据库连接
func InitDB() error {
	config := GetConfig()

	// 设置时区
	_ , err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		log.Printf("Warning: Failed to load timezone: %v", err)
	}

	password := config.Password
	if password == "" {
		password = ""
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Asia%%2FShanghai",
		config.User, password, config.Host, config.Port, config.Database)

	log.Printf("Connecting to database: %s:%s/%s, user=%s, password=%s", config.Host, config.Port, config.Database, config.User, config.Password)

	log.Printf("DSN: %s", dsn)
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// 设置连接池参数
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// 测试连接
	if err := DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connected successfully")

	// 创建表
	if err := createTables(); err != nil {
		return fmt.Errorf("failed to create tables: %w", err)
	}

	return nil
}

// CloseDB 关闭数据库连接
func CloseDB() {
	if DB != nil {
		DB.Close()
	}
}

// createTables 创建数据库表
func createTables() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS players (
			id VARCHAR(64) PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			number VARCHAR(10),
			position JSON,
			join_date DATE,
			gender VARCHAR(10),
			age INT,
			height INT,
			weight INT,
			avatar VARCHAR(500),
			tags JSON,
			ability JSON,
			is_active BOOLEAN DEFAULT TRUE,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS matches (
			id VARCHAR(64) PRIMARY KEY,
			opponent VARCHAR(100) NOT NULL,
			goals INT DEFAULT 0,
			conceded INT DEFAULT 0,
			schedule_date DATE,
			schedule_time TIME,
			is_home BOOLEAN DEFAULT TRUE,
			location VARCHAR(200),
			season VARCHAR(100),
			jersey_color VARCHAR(50),
			opponent_jersey VARCHAR(50),
			notes TEXT,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS match_records (
			id VARCHAR(64) PRIMARY KEY,
			player_id VARCHAR(64) NOT NULL,
			match_id VARCHAR(64) NOT NULL,
			goals INT DEFAULT 0,
			assists INT DEFAULT 0,
			yellow_cards INT DEFAULT 0,
			red_cards INT DEFAULT 0,
			minutes_played INT DEFAULT 0,
			rating DECIMAL(3,1),
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
			FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
		)`,
		`CREATE TABLE IF NOT EXISTS schedules (
			id VARCHAR(64) PRIMARY KEY,
			opponent VARCHAR(100) NOT NULL,
			date DATETIME NOT NULL,
			is_home BOOLEAN DEFAULT TRUE,
			location VARCHAR(200),
			notes TEXT,
			jersey_color VARCHAR(50),
			opponent_jersey VARCHAR(50),
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS attendance (
			id VARCHAR(64) PRIMARY KEY,
			player_id VARCHAR(64) NOT NULL,
			schedule_id VARCHAR(64),
			status VARCHAR(20) NOT NULL,
			reason TEXT,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
			FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL
		)`,
		`CREATE TABLE IF NOT EXISTS users (
			openid VARCHAR(100) PRIMARY KEY,
			nickname VARCHAR(100),
			avatar VARCHAR(500),
			role VARCHAR(20) DEFAULT 'user',
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
			update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS team_photos (
			id VARCHAR(64) PRIMARY KEY,
			url VARCHAR(500) NOT NULL,
			create_time DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
	}

	for _, query := range queries {
		if _, err := DB.Exec(query); err != nil {
			return fmt.Errorf("failed to create table: %w", err)
		}
	}

	log.Println("Database tables created successfully")
	return nil
}
