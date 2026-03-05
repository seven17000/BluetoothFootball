package handlers

import (
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"bluetoothfootball/server/database"

	"github.com/gin-gonic/gin"
)

// UploadAvatar 上传头像
func UploadAvatar(c *gin.Context) {
	openid := c.PostForm("openid")
	if openid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"code": 400, "message": "缺少openid参数"})
		return
	}

	// 生成随机文件名
	ext := ".jpg"
	file, header, err := c.Request.FormFile("file")
	if err == nil {
		filename := header.Filename
		if idx := strings.LastIndex(filename, "."); idx != -1 {
			ext = filename[idx:]
		}
	}
	rand.Seed(time.Now().UnixNano())
	filename := fmt.Sprintf("avatar_%s_%d%s", openid, rand.Int63(), ext)
	filepath := filepath.Join("./uploads/avatars", filename)

	// 确保目录存在
	os.MkdirAll("./uploads/avatars", 0755)

	// 保存文件
	out, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "创建文件失败"})
		return
	}
	defer out.Close()

	if file != nil {
		_, err := io.Copy(out, file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "保存文件失败"})
			return
		}
	}

	// 返回文件URL（实际部署时需要配置域名）
	fileURL := fmt.Sprintf("/uploads/avatars/%s", filename)
	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"url": fileURL,
		},
	})
}

// UploadTeamPhoto 上传球队照片
func UploadTeamPhoto(c *gin.Context) {
	openid := c.PostForm("openid")

	rand.Seed(time.Now().UnixNano())
	ext := ".jpg"
	file, header, err := c.Request.FormFile("file")
	if err == nil {
		filename := header.Filename
		if idx := strings.LastIndex(filename, "."); idx != -1 {
			ext = filename[idx:]
		}
	}

	var filename string
	if openid != "" {
		filename = fmt.Sprintf("team_photo_%s_%d%s", openid, rand.Int63(), ext)
	} else {
		filename = fmt.Sprintf("team_photo_%d%s", rand.Int63(), ext)
	}

	filepath := filepath.Join("./uploads/team_photos", filename)

	// 确保目录存在
	os.MkdirAll("./uploads/team_photos", 0755)

	// 保存文件
	out, err := os.Create(filepath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "创建文件失败"})
		return
	}
	defer out.Close()

	if file != nil {
		_, err := io.Copy(out, file)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"code": 500, "message": "保存文件失败"})
			return
		}
	}

	// 保存到数据库
	fileID := fmt.Sprintf("photo_%d", rand.Int63())
	fileURL := fmt.Sprintf("/uploads/team_photos/%s", filename)

	_, err = database.DB.Exec(
		"INSERT INTO team_photos (id, openid, file_id, created_at) VALUES (?, ?, ?, NOW())",
		fileID, openid, fileURL,
	)

	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"code": 0,
			"data": gin.H{
				"url":  fileURL,
				"id":   fileID,
				"note": "文件已保存，但数据库记录失败",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 0,
		"data": gin.H{
			"url": fileURL,
			"id":  fileID,
		},
	})
}
