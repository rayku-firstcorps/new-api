package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"

	"gorm.io/gorm"
)

type PromotionLink struct {
	Id               int            `json:"id"`
	Code             string         `json:"code" gorm:"type:varchar(64);uniqueIndex;not null"`
	Name             string         `json:"name" gorm:"type:varchar(100);not null"`
	ChannelTag       string         `json:"channel_tag" gorm:"type:varchar(64);not null;index"`
	RewardQuota      int            `json:"reward_quota" gorm:"type:int;not null;default:0"`
	Enabled          bool           `json:"enabled" gorm:"not null;default:true;index"`
	Clicks           int            `json:"clicks" gorm:"type:int;not null;default:0"`
	Registrations    int            `json:"registrations" gorm:"type:int;not null;default:0"`
	MaxRegistrations int            `json:"max_registrations" gorm:"type:int;not null;default:0"`
	ExpiresAt        int64          `json:"expires_at" gorm:"type:bigint;not null;default:0;index"`
	CreatedBy        int            `json:"created_by" gorm:"type:int;not null;default:0;index"`
	CreatedAt        int64          `json:"created_at" gorm:"autoCreateTime;column:created_at"`
	UpdatedAt        int64          `json:"updated_at" gorm:"autoUpdateTime;column:updated_at"`
	DeletedAt        gorm.DeletedAt `json:"-" gorm:"index"`
}

type PromotionRegistration struct {
	Id              int    `json:"id"`
	PromotionLinkId int    `json:"promotion_link_id" gorm:"type:int;not null;index"`
	Code            string `json:"code" gorm:"type:varchar(64);not null;index"`
	ChannelTag      string `json:"channel_tag" gorm:"type:varchar(64);not null;index"`
	UserId          int    `json:"user_id" gorm:"type:int;not null;uniqueIndex"`
	Username        string `json:"username" gorm:"type:varchar(64);not null"`
	RewardQuota     int    `json:"reward_quota" gorm:"type:int;not null;default:0"`
	Ip              string `json:"ip" gorm:"type:varchar(64)"`
	UserAgent       string `json:"user_agent" gorm:"type:varchar(255)"`
	CreatedAt       int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
}

type PromotionRegistrationParams struct {
	PromotionLinkId int
	Code            string
	ChannelTag      string
	UserId          int
	Username        string
	RewardQuota     int
	Ip              string
	UserAgent       string
}

func DefaultPromotionRewardQuota() int {
	return int(10 * common.QuotaPerUnit)
}

func normalizePromotionCode(code string) string {
	return strings.TrimSpace(code)
}

func validatePromotionLink(link *PromotionLink) error {
	link.Code = normalizePromotionCode(link.Code)
	link.ChannelTag = strings.TrimSpace(link.ChannelTag)
	link.Name = strings.TrimSpace(link.Name)
	if link.Code == "" {
		return errors.New("promotion code is required")
	}
	if len(link.Code) > 64 {
		return errors.New("promotion code is too long")
	}
	if link.Name == "" {
		return errors.New("promotion name is required")
	}
	if len(link.Name) > 100 {
		return errors.New("promotion name is too long")
	}
	if link.ChannelTag == "" {
		return errors.New("promotion channel tag is required")
	}
	if len(link.ChannelTag) > 64 {
		return errors.New("promotion channel tag is too long")
	}
	if link.RewardQuota < 0 {
		return errors.New("promotion reward quota cannot be negative")
	}
	if link.MaxRegistrations < 0 {
		return errors.New("promotion max registrations cannot be negative")
	}
	if link.RewardQuota == 0 {
		link.RewardQuota = DefaultPromotionRewardQuota()
	}
	return nil
}

func CreatePromotionLink(link *PromotionLink) error {
	if err := validatePromotionLink(link); err != nil {
		return err
	}
	if _, err := GetUserIdByAffCode(link.Code); err == nil {
		return errors.New("promotion code conflicts with an existing affiliate code")
	}
	return DB.Create(link).Error
}

func UpdatePromotionLink(link *PromotionLink) error {
	if err := validatePromotionLink(link); err != nil {
		return err
	}
	if _, err := GetUserIdByAffCode(link.Code); err == nil {
		return errors.New("promotion code conflicts with an existing affiliate code")
	}
	return DB.Model(&PromotionLink{}).Where("id = ?", link.Id).Select(
		"code",
		"name",
		"channel_tag",
		"reward_quota",
		"enabled",
		"max_registrations",
		"expires_at",
	).Updates(link).Error
}

func GetPromotionLinkByCode(code string) (*PromotionLink, error) {
	code = normalizePromotionCode(code)
	if code == "" {
		return nil, errors.New("promotion code is empty")
	}
	var link PromotionLink
	err := DB.Where("code = ?", code).First(&link).Error
	return &link, err
}

func GetPromotionLinkByID(id int) (*PromotionLink, error) {
	if id == 0 {
		return nil, errors.New("promotion id is empty")
	}
	var link PromotionLink
	err := DB.First(&link, "id = ?", id).Error
	return &link, err
}

func GetPromotionLinks(pageInfo *common.PageInfo, keyword string, channelTag string) (links []*PromotionLink, total int64, err error) {
	query := DB.Model(&PromotionLink{})
	keyword = strings.TrimSpace(keyword)
	channelTag = strings.TrimSpace(channelTag)
	if keyword != "" {
		query = query.Where("code LIKE ? OR name LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if channelTag != "" {
		query = query.Where("channel_tag = ?", channelTag)
	}
	err = query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&links).Error
	return links, total, err
}

func GetPromotionRegistrations(linkId int, pageInfo *common.PageInfo) (registrations []*PromotionRegistration, total int64, err error) {
	query := DB.Model(&PromotionRegistration{}).Where("promotion_link_id = ?", linkId)
	err = query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&registrations).Error
	return registrations, total, err
}

func RecordPromotionRegistration(tx *gorm.DB, params PromotionRegistrationParams) error {
	db := tx
	if db == nil {
		db = DB
	}
	registration := &PromotionRegistration{
		PromotionLinkId: params.PromotionLinkId,
		Code:            params.Code,
		ChannelTag:      params.ChannelTag,
		UserId:          params.UserId,
		Username:        params.Username,
		RewardQuota:     params.RewardQuota,
		Ip:              params.Ip,
		UserAgent:       params.UserAgent,
	}
	return db.Create(registration).Error
}

func IncreasePromotionClicks(code string) error {
	code = normalizePromotionCode(code)
	if code == "" {
		return errors.New("promotion code is empty")
	}
	return DB.Model(&PromotionLink{}).Where("code = ?", code).Update("clicks", gorm.Expr("clicks + ?", 1)).Error
}

func IncreasePromotionRegistrations(tx *gorm.DB, id int) error {
	db := tx
	if db == nil {
		db = DB
	}
	return db.Model(&PromotionLink{}).Where("id = ?", id).Update("registrations", gorm.Expr("registrations + ?", 1)).Error
}

func (link *PromotionLink) IsAvailable(now int64) error {
	if link == nil || link.Id == 0 {
		return errors.New("promotion link not found")
	}
	if !link.Enabled {
		return errors.New("promotion link is disabled")
	}
	if link.ExpiresAt != 0 && link.ExpiresAt <= now {
		return errors.New("promotion link has expired")
	}
	if link.MaxRegistrations != 0 && link.Registrations >= link.MaxRegistrations {
		return errors.New("promotion link registration limit reached")
	}
	if link.RewardQuota < 0 {
		return errors.New("promotion reward quota cannot be negative")
	}
	return nil
}

func ApplyPromotionRegistrationWithTx(tx *gorm.DB, user *User, link *PromotionLink, ip string, userAgent string) error {
	if err := link.IsAvailable(common.GetTimestamp()); err != nil {
		return err
	}
	if user.Id == 0 {
		return errors.New("user id is empty")
	}
	if err := tx.Model(&User{}).Where("id = ?", user.Id).Updates(map[string]interface{}{
		"quota":                 gorm.Expr("quota + ?", link.RewardQuota),
		"promotion_code":        link.Code,
		"promotion_channel_tag": link.ChannelTag,
	}).Error; err != nil {
		return err
	}
	if err := RecordPromotionRegistration(tx, PromotionRegistrationParams{
		PromotionLinkId: link.Id,
		Code:            link.Code,
		ChannelTag:      link.ChannelTag,
		UserId:          user.Id,
		Username:        user.Username,
		RewardQuota:     link.RewardQuota,
		Ip:              ip,
		UserAgent:       userAgent,
	}); err != nil {
		return err
	}
	if err := IncreasePromotionRegistrations(tx, link.Id); err != nil {
		return err
	}
	user.Quota += link.RewardQuota
	user.PromotionCode = link.Code
	user.PromotionChannelTag = link.ChannelTag
	RecordLog(user.Id, LogTypeSystem, fmt.Sprintf("通过推广链接注册赠送 %s", logger.LogQuota(link.RewardQuota)))
	return nil
}
