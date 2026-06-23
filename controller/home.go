package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetHomeLanding(c *gin.Context) {
	summary, err := service.BuildHomeLandingSummary()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    summary,
	})
}

func GetHomeSelfSummary(c *gin.Context) {
	summary, err := service.BuildHomeSelfSummary(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    summary,
	})
}
