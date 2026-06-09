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
	links, total, err := model.GetPromotionLinks(pageInfo, c.Query("keyword"), c.Query("channel_tag"), c.Query("activity_type"))
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

func GetPublicPromotionLinkByCode(c *gin.Context) {
	code := c.Param("code")
	link, err := model.GetPromotionLinkByCode(code)
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

type promotionRewardAllowedDomainsRequest struct {
	Domains []string `json:"domains"`
}

func GetPromotionRewardAllowedEmailDomains(c *gin.Context) {
	common.ApiSuccess(c, gin.H{
		"domains": model.GetPromotionRewardAllowedEmailDomains(),
	})
}

func UpdatePromotionRewardAllowedEmailDomains(c *gin.Context) {
	var req promotionRewardAllowedDomainsRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiErrorMsg(c, "invalid request body")
		return
	}
	if err := model.SetPromotionRewardAllowedEmailDomains(req.Domains); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"domains": model.GetPromotionRewardAllowedEmailDomains(),
	})
}

func ResetPromotionRewardAllowedEmailDomains(c *gin.Context) {
	if err := model.ResetPromotionRewardAllowedEmailDomains(); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"domains": model.GetPromotionRewardAllowedEmailDomains(),
	})
}

func GetPromotionRewardBannerConfig(c *gin.Context) {
	common.ApiSuccess(c, model.GetPromotionRewardBannerConfig())
}

func UpdatePromotionRewardBannerConfig(c *gin.Context) {
	var config model.PromotionRewardBannerConfig
	if err := common.DecodeJson(c.Request.Body, &config); err != nil {
		common.ApiErrorMsg(c, "invalid request body")
		return
	}
	if err := model.SetPromotionRewardBannerConfig(config); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, model.GetPromotionRewardBannerConfig())
}

func ResetPromotionRewardBannerConfig(c *gin.Context) {
	if err := model.ResetPromotionRewardBannerConfig(); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, model.GetPromotionRewardBannerConfig())
}

func GetSelfPromotionReward(c *gin.Context) {
	user, err := model.GetUserById(c.GetInt("id"), false)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	data, err := model.GetPromotionRewardStatus(user)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, data)
}

func ClaimSelfPromotionReward(c *gin.Context) {
	registration, err := model.ClaimPromotionReward(c.GetInt("id"))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"reward_status":  registration.RewardStatus,
		"granted_quota":  registration.GrantedQuota,
		"granted_amount": float64(registration.GrantedQuota) / common.QuotaPerUnit,
		"granted_at":     registration.GrantedAt,
	})
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
