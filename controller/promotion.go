package controller

import (
	"errors"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type promotionClickRequest struct {
	Code string `json:"code"`
}

func GetPromotionLinks(c *gin.Context) {
	pageInfo := common.GetPageQuery(c)
	links, total, err := model.GetPromotionLinks(pageInfo, c.Query("keyword"), c.Query("channel_tag"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(links)
	common.ApiSuccess(c, pageInfo)
}

func GetPromotionLink(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	link, err := model.GetPromotionLinkByID(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, link)
}

func AddPromotionLink(c *gin.Context) {
	var link model.PromotionLink
	if err := c.ShouldBindJSON(&link); err != nil {
		common.ApiError(c, err)
		return
	}
	link.CreatedBy = c.GetInt("id")
	if err := model.CreatePromotionLink(&link); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, link)
}

func UpdatePromotionLink(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var link model.PromotionLink
	if err := c.ShouldBindJSON(&link); err != nil {
		common.ApiError(c, err)
		return
	}
	link.Id = id
	if err := model.UpdatePromotionLink(&link); err != nil {
		common.ApiError(c, err)
		return
	}
	updated, err := model.GetPromotionLinkByID(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, updated)
}

func DeletePromotionLink(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	link, err := model.GetPromotionLinkByID(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DB.Delete(link).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func EnablePromotionLink(c *gin.Context) {
	setPromotionLinkEnabled(c, true)
}

func DisablePromotionLink(c *gin.Context) {
	setPromotionLinkEnabled(c, false)
}

func setPromotionLinkEnabled(c *gin.Context, enabled bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.DB.Model(&model.PromotionLink{}).Where("id = ?", id).Update("enabled", enabled).Error; err != nil {
		common.ApiError(c, err)
		return
	}
	link, err := model.GetPromotionLinkByID(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, link)
}

func GetPromotionRegistrations(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo := common.GetPageQuery(c)
	registrations, total, err := model.GetPromotionRegistrations(id, pageInfo)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	pageInfo.SetTotal(int(total))
	pageInfo.SetItems(registrations)
	common.ApiSuccess(c, pageInfo)
}

func RecordPromotionClick(c *gin.Context) {
	var req promotionClickRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	link, err := model.GetPromotionLinkByCode(req.Code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.ApiErrorMsg(c, "promotion link not found")
			return
		}
		common.ApiError(c, err)
		return
	}
	if err := link.IsAvailable(common.GetTimestamp()); err != nil {
		common.ApiError(c, err)
		return
	}
	if err := model.IncreasePromotionClicks(req.Code); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}
