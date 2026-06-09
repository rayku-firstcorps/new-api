package model

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"golang.org/x/net/html"
	"gorm.io/gorm"
)

const (
	PromotionActivityQuotaReward = "quota_reward"
	PromotionActivityTrialCoupon = "trial_coupon"
	PromotionActivityNone        = "none"
)

const (
	PromotionRewardStatusPendingEmail = "pending_email"
	PromotionRewardStatusGranted      = "granted"
	PromotionRewardStatusNone         = "none"
)

const (
	PromotionBannerContentFormatPlainText = "plain_text"
	PromotionBannerContentFormatMarkdown  = "markdown"
	PromotionBannerContentFormatHTML      = "html"
)

const (
	PromotionBannerImagePositionLeft       = "left"
	PromotionBannerImagePositionRight      = "right"
	PromotionBannerImagePositionTop        = "top"
	PromotionBannerImagePositionBackground = "background"
)

const (
	OptionKeyPromotionRewardAllowedEmailDomains = "PromotionRewardAllowedEmailDomains"
	OptionKeyPromotionRewardBannerConfig        = "PromotionRewardBannerConfig"
)

var DefaultPromotionRewardAllowedEmailDomains = []string{
	"gmail.com",
	"googlemail.com",
	"icloud.com",
	"me.com",
	"mac.com",
	"outlook.com",
	"hotmail.com",
	"live.com",
	"msn.com",
	"163.com",
	"126.com",
	"yeah.net",
	"qq.com",
	"foxmail.com",
	"yahoo.com",
	"yahoo.co.jp",
}

type PromotionLink struct {
	Id                    int            `json:"id"`
	Code                  string         `json:"code" gorm:"type:varchar(64);uniqueIndex;not null"`
	Name                  string         `json:"name" gorm:"type:varchar(100);not null"`
	ChannelTag            string         `json:"channel_tag" gorm:"type:varchar(64);not null;index"`
	LandingTitle          string         `json:"landing_title" gorm:"type:varchar(200);not null;default:''"`
	LandingContentFormat  string         `json:"landing_content_format" gorm:"type:varchar(32);not null;default:'plain_text'"`
	LandingContent        string         `json:"landing_content" gorm:"type:text;not null;default:''"`
	LandingImageUrl       string         `json:"landing_image_url" gorm:"type:varchar(1024);not null;default:''"`
	LandingImagePosition  string         `json:"landing_image_position" gorm:"type:varchar(32);not null;default:'right'"`
	LandingMinWidth       int            `json:"landing_min_width" gorm:"type:int;not null;default:960"`
	LandingMinHeight      int            `json:"landing_min_height" gorm:"type:int;not null;default:720"`
	LandingPrimaryButton  string         `json:"landing_primary_button" gorm:"type:varchar(100);not null;default:''"`
	LandingSecondaryButton string        `json:"landing_secondary_button" gorm:"type:varchar(100);not null;default:''"`
	ActivityType          string         `json:"activity_type" gorm:"type:varchar(32);not null;default:'quota_reward';index"`
	RewardQuota           int            `json:"reward_quota" gorm:"type:int;not null;default:0"`
	TrialCouponQuota      int            `json:"trial_coupon_quota" gorm:"type:int;not null;default:0"`
	FirstTopupRewardQuota int            `json:"first_topup_reward_quota" gorm:"type:int;not null;default:0"`
	FirstTopupMinAmount   int            `json:"first_topup_min_amount" gorm:"type:int;not null;default:0"`
	FirstTopupCount       int            `json:"first_topup_count" gorm:"type:int;not null;default:0"`
	Enabled               bool           `json:"enabled" gorm:"not null;default:true;index"`
	Clicks                int            `json:"clicks" gorm:"type:int;not null;default:0"`
	Registrations         int            `json:"registrations" gorm:"type:int;not null;default:0"`
	MaxRegistrations      int            `json:"max_registrations" gorm:"type:int;not null;default:0"`
	ExpiresAt             int64          `json:"expires_at" gorm:"type:bigint;not null;default:0;index"`
	CreatedBy             int            `json:"created_by" gorm:"type:int;not null;default:0;index"`
	CreatedAt             int64          `json:"created_at" gorm:"autoCreateTime;column:created_at"`
	UpdatedAt             int64          `json:"updated_at" gorm:"autoUpdateTime;column:updated_at"`
	DeletedAt             gorm.DeletedAt `json:"-" gorm:"index"`
}

type PromotionRegistration struct {
	Id              int    `json:"id"`
	PromotionLinkId int    `json:"promotion_link_id" gorm:"type:int;not null;index"`
	Code            string `json:"code" gorm:"type:varchar(64);not null;index"`
	ChannelTag      string `json:"channel_tag" gorm:"type:varchar(64);not null;index"`
	UserId          int    `json:"user_id" gorm:"type:int;not null;uniqueIndex"`
	Username        string `json:"username" gorm:"type:varchar(64);not null"`
	ActivityType    string `json:"activity_type" gorm:"type:varchar(32);not null;default:'quota_reward';index"`
	RewardStatus    string `json:"reward_status" gorm:"type:varchar(32);not null;default:'granted';index"`
	RewardQuota     int    `json:"reward_quota" gorm:"type:int;not null;default:0"`
	GrantedQuota    int    `json:"granted_quota" gorm:"type:int;not null;default:0"`
	GrantedAt       int64  `json:"granted_at" gorm:"type:bigint;not null;default:0;index"`
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
	ActivityType    string
	RewardStatus    string
	RewardQuota     int
	GrantedQuota    int
	GrantedAt       int64
	Ip              string
	UserAgent       string
}

type PromotionRewardBannerConfig struct {
	Title           string `json:"title"`
	ContentFormat   string `json:"content_format"`
	Content         string `json:"content"`
	ImageUrl        string `json:"image_url"`
	ImagePosition   string `json:"image_position"`
	PrimaryButton   string `json:"primary_button"`
	SecondaryButton string `json:"secondary_button"`
}

type PromotionRewardStatusResponse struct {
	HasPendingReward     bool                        `json:"has_pending_reward"`
	ActivityType         string                      `json:"activity_type,omitempty"`
	RewardStatus         string                      `json:"reward_status,omitempty"`
	RewardQuota          int                         `json:"reward_quota"`
	RewardAmount         float64                     `json:"reward_amount"`
	RequiresEmailBinding bool                        `json:"requires_email_binding"`
	EmailBound           bool                        `json:"email_bound"`
	EmailDomainAllowed   bool                        `json:"email_domain_allowed"`
	AllowedEmailDomains  []string                    `json:"allowed_email_domains"`
	Banner               PromotionRewardBannerConfig `json:"banner"`
	PromotionCode        string                      `json:"promotion_code,omitempty"`
	ChannelTag           string                      `json:"channel_tag,omitempty"`
}

func DefaultPromotionRewardQuota() int {
	return int(10 * common.QuotaPerUnit)
}

func DefaultPromotionTrialCouponQuota() int {
	return int(5 * common.QuotaPerUnit)
}

func DefaultPromotionRewardBannerConfig() PromotionRewardBannerConfig {
	return PromotionRewardBannerConfig{
		Title:         "绑定常见邮箱即可领取 5 元体验券",
		ContentFormat: PromotionBannerContentFormatPlainText,
		Content:       "绑定常见邮箱即可领取 5 元体验券",
		ImagePosition: PromotionBannerImagePositionRight,
	}
}

func normalizePromotionCode(code string) string {
	return strings.TrimSpace(code)
}

func normalizePromotionActivityType(activityType string) string {
	activityType = strings.TrimSpace(activityType)
	if activityType == "" {
		return PromotionActivityQuotaReward
	}
	return activityType
}

func normalizePromotionRewardStatus(status string) string {
	status = strings.TrimSpace(status)
	if status == "" {
		return PromotionRewardStatusGranted
	}
	return status
}

func normalizePromotionLinkDefaults(link *PromotionLink) {
	link.ActivityType = normalizePromotionActivityType(link.ActivityType)
	fillPromotionLandingDefaults(link)
	if link.ActivityType == PromotionActivityQuotaReward && link.RewardQuota == 0 && link.FirstTopupRewardQuota == 0 {
		link.RewardQuota = DefaultPromotionRewardQuota()
	}
	if link.ActivityType == PromotionActivityTrialCoupon && link.TrialCouponQuota == 0 {
		link.TrialCouponQuota = DefaultPromotionTrialCouponQuota()
	}
}

func normalizePromotionRegistrationDefaults(registration *PromotionRegistration) {
	registration.ActivityType = normalizePromotionActivityType(registration.ActivityType)
	registration.RewardStatus = normalizePromotionRewardStatus(registration.RewardStatus)
	if registration.ActivityType == PromotionActivityTrialCoupon && registration.RewardQuota == 0 {
		registration.RewardQuota = DefaultPromotionTrialCouponQuota()
	}
	if registration.GrantedQuota == 0 && registration.RewardStatus == PromotionRewardStatusGranted {
		registration.GrantedQuota = registration.RewardQuota
	}
}

func validatePromotionLink(link *PromotionLink) error {
	link.Code = normalizePromotionCode(link.Code)
	link.ChannelTag = strings.TrimSpace(link.ChannelTag)
	link.Name = strings.TrimSpace(link.Name)
	link.ActivityType = normalizePromotionActivityType(link.ActivityType)
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
	if link.TrialCouponQuota < 0 {
		return errors.New("promotion trial coupon quota cannot be negative")
	}
	if link.FirstTopupRewardQuota < 0 {
		return errors.New("first topup reward quota cannot be negative")
	}
	if link.FirstTopupMinAmount < 0 {
		return errors.New("first topup min amount cannot be negative")
	}
	if link.MaxRegistrations < 0 {
		return errors.New("promotion max registrations cannot be negative")
	}
	fillPromotionLandingDefaults(link)
	switch link.LandingContentFormat {
	case PromotionBannerContentFormatPlainText, PromotionBannerContentFormatMarkdown, PromotionBannerContentFormatHTML:
	default:
		return errors.New("invalid promotion landing content format")
	}
	switch link.LandingImagePosition {
	case PromotionBannerImagePositionLeft, PromotionBannerImagePositionRight, PromotionBannerImagePositionTop, PromotionBannerImagePositionBackground:
	default:
		return errors.New("invalid promotion landing image position")
	}
	if len(link.LandingTitle) > 200 {
		return errors.New("promotion landing title is too long")
	}
	if len(link.LandingContent) > 5000 {
		return errors.New("promotion landing content is too long")
	}
	if link.LandingMinWidth < 0 || link.LandingMinHeight < 0 {
		return errors.New("promotion landing minimum size cannot be negative")
	}
	if link.LandingMinWidth > 4096 || link.LandingMinHeight > 4096 {
		return errors.New("promotion landing minimum size is too large")
	}
	if len(link.LandingPrimaryButton) > 100 || len(link.LandingSecondaryButton) > 100 {
		return errors.New("promotion landing button text is too long")
	}
	if link.LandingImageUrl != "" && !isAllowedPromotionBannerImageURL(link.LandingImageUrl) {
		return errors.New("unsupported promotion landing image URL")
	}
	if link.LandingContentFormat == PromotionBannerContentFormatHTML {
		sanitized, err := sanitizePromotionBannerHTML(link.LandingContent)
		if err != nil {
			return err
		}
		link.LandingContent = sanitized
	}
	switch link.ActivityType {
	case PromotionActivityQuotaReward, PromotionActivityTrialCoupon, PromotionActivityNone:
	default:
		return errors.New("invalid promotion activity type")
	}
	normalizePromotionLinkDefaults(link)
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
		"landing_title",
		"landing_content_format",
		"landing_content",
		"landing_image_url",
		"landing_image_position",
		"landing_min_width",
		"landing_min_height",
		"landing_primary_button",
		"landing_secondary_button",
		"activity_type",
		"reward_quota",
		"trial_coupon_quota",
		"first_topup_reward_quota",
		"first_topup_min_amount",
		"enabled",
		"max_registrations",
		"expires_at",
	).Updates(link).Error
}

func fillPromotionLandingDefaults(link *PromotionLink) {
	if link == nil {
		return
	}
	defaultConfig := DefaultPromotionRewardBannerConfig()
	link.LandingTitle = strings.TrimSpace(link.LandingTitle)
	link.LandingContentFormat = strings.TrimSpace(link.LandingContentFormat)
	link.LandingContent = strings.TrimSpace(link.LandingContent)
	link.LandingImageUrl = strings.TrimSpace(link.LandingImageUrl)
	link.LandingImagePosition = strings.TrimSpace(link.LandingImagePosition)
	if link.LandingMinWidth == 0 {
		link.LandingMinWidth = 960
	}
	if link.LandingMinHeight == 0 {
		link.LandingMinHeight = 720
	}
	link.LandingPrimaryButton = strings.TrimSpace(link.LandingPrimaryButton)
	link.LandingSecondaryButton = strings.TrimSpace(link.LandingSecondaryButton)
	if link.LandingTitle == "" {
		link.LandingTitle = link.Name
	}
	if link.LandingContentFormat == "" {
		link.LandingContentFormat = defaultConfig.ContentFormat
	}
	if link.LandingContent == "" {
		link.LandingContent = defaultConfig.Content
	}
	if link.LandingImagePosition == "" {
		link.LandingImagePosition = defaultConfig.ImagePosition
	}
}

func GetPromotionLinkByCode(code string) (*PromotionLink, error) {
	code = normalizePromotionCode(code)
	if code == "" {
		return nil, errors.New("promotion code is empty")
	}
	var link PromotionLink
	err := DB.Where("code = ?", code).First(&link).Error
	if err == nil {
		normalizePromotionLinkDefaults(&link)
	}
	return &link, err
}

func GetPromotionLinkByID(id int) (*PromotionLink, error) {
	if id == 0 {
		return nil, errors.New("promotion id is empty")
	}
	var link PromotionLink
	err := DB.First(&link, "id = ?", id).Error
	if err == nil {
		normalizePromotionLinkDefaults(&link)
	}
	return &link, err
}

func GetPromotionLinks(pageInfo *common.PageInfo, keyword string, channelTag string, activityType string) (links []*PromotionLink, total int64, err error) {
	query := DB.Model(&PromotionLink{})
	keyword = strings.TrimSpace(keyword)
	channelTag = strings.TrimSpace(channelTag)
	activityType = strings.TrimSpace(activityType)
	if activityType == "all" {
		activityType = ""
	}
	if keyword != "" {
		query = query.Where("code LIKE ? OR name LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if channelTag != "" {
		query = query.Where("channel_tag = ?", channelTag)
	}
	if activityType != "" {
		query = query.Where("activity_type = ?", activityType)
	}
	err = query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&links).Error
	if err != nil {
		return nil, 0, err
	}
	for _, link := range links {
		normalizePromotionLinkDefaults(link)
	}
	return links, total, err
}

func GetPromotionRegistrations(linkId int, pageInfo *common.PageInfo) (registrations []*PromotionRegistration, total int64, err error) {
	query := DB.Model(&PromotionRegistration{}).Where("promotion_link_id = ?", linkId)
	err = query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	err = query.Order("id desc").Limit(pageInfo.GetPageSize()).Offset(pageInfo.GetStartIdx()).Find(&registrations).Error
	if err != nil {
		return nil, 0, err
	}
	for _, registration := range registrations {
		normalizePromotionRegistrationDefaults(registration)
	}
	return registrations, total, err
}

func GetPromotionRegistrationByUserID(userId int) (*PromotionRegistration, error) {
	var registration PromotionRegistration
	err := DB.Where("user_id = ?", userId).First(&registration).Error
	if err == nil {
		normalizePromotionRegistrationDefaults(&registration)
	}
	return &registration, err
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
		ActivityType:    normalizePromotionActivityType(params.ActivityType),
		RewardStatus:    normalizePromotionRewardStatus(params.RewardStatus),
		RewardQuota:     params.RewardQuota,
		GrantedQuota:    params.GrantedQuota,
		GrantedAt:       params.GrantedAt,
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
	if link.TrialCouponQuota < 0 {
		return errors.New("promotion trial coupon quota cannot be negative")
	}
	return nil
}

func (link *PromotionLink) EffectiveActivityType() string {
	return normalizePromotionActivityType(link.ActivityType)
}

func (link *PromotionLink) EffectiveTrialCouponQuota() int {
	if link == nil {
		return DefaultPromotionTrialCouponQuota()
	}
	if link.TrialCouponQuota > 0 {
		return link.TrialCouponQuota
	}
	return DefaultPromotionTrialCouponQuota()
}

func ApplyPromotionRegistrationWithTx(tx *gorm.DB, user *User, link *PromotionLink, ip string, userAgent string) error {
	if err := link.IsAvailable(common.GetTimestamp()); err != nil {
		return err
	}
	if user.Id == 0 {
		return errors.New("user id is empty")
	}
	activityType := link.EffectiveActivityType()
	rewardStatus := PromotionRewardStatusGranted
	rewardQuota := 0
	grantedQuota := 0
	grantedAt := int64(0)
	logMessage := ""
	switch activityType {
	case PromotionActivityQuotaReward:
		rewardQuota = link.RewardQuota
		grantedQuota = link.RewardQuota
		grantedAt = common.GetTimestamp()
		logMessage = fmt.Sprintf("通过推广链接注册赠送额度 %s", logger.LogQuota(link.RewardQuota))
	case PromotionActivityTrialCoupon:
		rewardQuota = link.EffectiveTrialCouponQuota()
		rewardStatus = PromotionRewardStatusPendingEmail
		logMessage = "通过推广链接注册获得体验券资格，待绑定邮箱领取"
	case PromotionActivityNone:
		rewardStatus = PromotionRewardStatusNone
		logMessage = "通过推广链接完成注册归因，未发放奖励"
	default:
		return errors.New("invalid promotion activity type")
	}
	if err := tx.Model(&User{}).Where("id = ?", user.Id).Updates(map[string]interface{}{
		"quota":                 gorm.Expr("quota + ?", grantedQuota),
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
		ActivityType:    activityType,
		RewardStatus:    rewardStatus,
		RewardQuota:     rewardQuota,
		GrantedQuota:    grantedQuota,
		GrantedAt:       grantedAt,
		Ip:              ip,
		UserAgent:       userAgent,
	}); err != nil {
		return err
	}
	if err := IncreasePromotionRegistrations(tx, link.Id); err != nil {
		return err
	}
	user.Quota += grantedQuota
	user.PromotionCode = link.Code
	user.PromotionChannelTag = link.ChannelTag
	recordPromotionSystemLog(tx, user, logMessage)
	return nil
}

func recordPromotionSystemLog(tx *gorm.DB, user *User, content string) {
	if user == nil {
		return
	}
	logRecord := &Log{
		UserId:    user.Id,
		Username:  user.Username,
		CreatedAt: common.GetTimestamp(),
		Type:      LogTypeSystem,
		Content:   content,
	}
	db := LOG_DB
	if db == nil {
		db = DB
	}
	if tx != nil && db == DB {
		db = tx
	}
	if err := db.Create(logRecord).Error; err != nil {
		common.SysLog("failed to record promotion log: " + err.Error())
	}
}

func normalizeDomain(domain string) string {
	return strings.ToLower(strings.TrimSpace(domain))
}

func ExtractEmailDomain(email string) string {
	email = strings.TrimSpace(email)
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return ""
	}
	return normalizeDomain(parts[1])
}

func isValidPromotionEmailDomain(domain string) bool {
	domain = normalizeDomain(domain)
	if domain == "" || strings.Contains(domain, " ") || !strings.Contains(domain, ".") {
		return false
	}
	parsed, err := url.Parse("https://" + domain)
	if err != nil {
		return false
	}
	return parsed.Hostname() == domain
}

func normalizeEmailDomains(domains []string) []string {
	seen := make(map[string]struct{}, len(domains))
	result := make([]string, 0, len(domains))
	for _, domain := range domains {
		domain = normalizeDomain(domain)
		if domain == "" {
			continue
		}
		if _, ok := seen[domain]; ok {
			continue
		}
		seen[domain] = struct{}{}
		result = append(result, domain)
	}
	return result
}

func ParsePromotionRewardAllowedEmailDomains(raw string) ([]string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return append([]string(nil), DefaultPromotionRewardAllowedEmailDomains...), nil
	}
	var domains []string
	if strings.HasPrefix(raw, "[") {
		if err := common.UnmarshalJsonStr(raw, &domains); err != nil {
			return nil, errors.New("invalid promotion reward allowed email domains")
		}
	} else {
		domains = strings.Split(raw, ",")
	}
	domains = normalizeEmailDomains(domains)
	for _, domain := range domains {
		if !isValidPromotionEmailDomain(domain) {
			return nil, fmt.Errorf("invalid email domain: %s", domain)
		}
	}
	return domains, nil
}

func GetPromotionRewardAllowedEmailDomains() []string {
	common.OptionMapRWMutex.RLock()
	raw := common.OptionMap[OptionKeyPromotionRewardAllowedEmailDomains]
	common.OptionMapRWMutex.RUnlock()
	domains, err := ParsePromotionRewardAllowedEmailDomains(raw)
	if err != nil {
		return append([]string(nil), DefaultPromotionRewardAllowedEmailDomains...)
	}
	return domains
}

func SetPromotionRewardAllowedEmailDomains(domains []string) error {
	normalized := normalizeEmailDomains(domains)
	for _, domain := range normalized {
		if !isValidPromotionEmailDomain(domain) {
			return fmt.Errorf("invalid email domain: %s", domain)
		}
	}
	jsonBytes, err := common.Marshal(normalized)
	if err != nil {
		return err
	}
	return UpdateOption(OptionKeyPromotionRewardAllowedEmailDomains, string(jsonBytes))
}

func ResetPromotionRewardAllowedEmailDomains() error {
	return SetPromotionRewardAllowedEmailDomains(DefaultPromotionRewardAllowedEmailDomains)
}

func fillPromotionRewardBannerDefaults(config *PromotionRewardBannerConfig) {
	if config == nil {
		return
	}
	defaultConfig := DefaultPromotionRewardBannerConfig()
	config.Title = strings.TrimSpace(config.Title)
	config.ContentFormat = strings.TrimSpace(config.ContentFormat)
	config.Content = strings.TrimSpace(config.Content)
	config.ImageUrl = strings.TrimSpace(config.ImageUrl)
	config.ImagePosition = strings.TrimSpace(config.ImagePosition)
	config.PrimaryButton = strings.TrimSpace(config.PrimaryButton)
	config.SecondaryButton = strings.TrimSpace(config.SecondaryButton)
	if config.ContentFormat == "" {
		config.ContentFormat = defaultConfig.ContentFormat
	}
	if config.ImagePosition == "" {
		config.ImagePosition = defaultConfig.ImagePosition
	}
	if config.Title == "" {
		config.Title = defaultConfig.Title
	}
	if config.Content == "" {
		config.Content = defaultConfig.Content
	}
}

func isAllowedPromotionBannerImageURL(raw string) bool {
	if strings.HasPrefix(raw, "/") {
		return true
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return false
	}
	return parsed.Scheme == "https" && parsed.Hostname() != ""
}

var allowedPromotionBannerTags = map[string]struct{}{
	"p": {}, "br": {}, "strong": {}, "em": {}, "ul": {}, "ol": {}, "li": {}, "a": {}, "span": {}, "div": {}, "img": {},
}

var allowedPromotionBannerAttrs = map[string]map[string]struct{}{
	"a": {
		"href": {}, "title": {}, "target": {}, "rel": {},
	},
	"img": {
		"src": {}, "alt": {}, "title": {},
	},
	"span": {
		"class": {},
	},
	"div": {
		"class": {},
	},
}

func isAllowedPromotionBannerLink(raw string, allowRelative bool) bool {
	if allowRelative && strings.HasPrefix(raw, "/") {
		return true
	}
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	if strings.EqualFold(parsed.Scheme, "javascript") {
		return false
	}
	if parsed.Scheme == "" {
		return allowRelative && strings.HasPrefix(raw, "/")
	}
	return parsed.Scheme == "https" && parsed.Hostname() != ""
}

func sanitizePromotionBannerHTMLNode(node *html.Node) (string, error) {
	switch node.Type {
	case html.TextNode:
		return node.Data, nil
	case html.ElementNode:
		tag := strings.ToLower(strings.TrimSpace(node.Data))
		if _, ok := allowedPromotionBannerTags[tag]; !ok {
			return "", errors.New("HTML content contains unsupported tags or attributes")
		}
		var builder strings.Builder
		builder.WriteString("<")
		builder.WriteString(tag)
		for _, attr := range node.Attr {
			key := strings.ToLower(strings.TrimSpace(attr.Key))
			val := strings.TrimSpace(attr.Val)
			if strings.HasPrefix(key, "on") {
				return "", errors.New("HTML content contains unsupported tags or attributes")
			}
			allowedAttrs, ok := allowedPromotionBannerAttrs[tag]
			if !ok {
				if key != "" {
					return "", errors.New("HTML content contains unsupported tags or attributes")
				}
				continue
			}
			if _, ok = allowedAttrs[key]; !ok {
				return "", errors.New("HTML content contains unsupported tags or attributes")
			}
			if (key == "href" || key == "src") && !isAllowedPromotionBannerLink(val, key == "src") {
				return "", errors.New("HTML content contains unsupported tags or attributes")
			}
			if key == "target" && val != "_blank" && val != "_self" {
				return "", errors.New("HTML content contains unsupported tags or attributes")
			}
			builder.WriteString(" ")
			builder.WriteString(key)
			builder.WriteString(`="`)
			builder.WriteString(html.EscapeString(val))
			builder.WriteString(`"`)
		}
		if tag == "a" && !strings.Contains(builder.String(), ` rel="`) {
			builder.WriteString(` rel="noopener noreferrer"`)
		}
		builder.WriteString(">")
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			childHTML, err := sanitizePromotionBannerHTMLNode(child)
			if err != nil {
				return "", err
			}
			builder.WriteString(childHTML)
		}
		builder.WriteString("</")
		builder.WriteString(tag)
		builder.WriteString(">")
		return builder.String(), nil
	default:
		return "", nil
	}
}

func sanitizePromotionBannerHTML(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", nil
	}
	nodes, err := html.ParseFragment(strings.NewReader(raw), &html.Node{Type: html.ElementNode, Data: "div"})
	if err != nil {
		return "", errors.New("invalid HTML content")
	}
	var builder strings.Builder
	for _, node := range nodes {
		sanitized, err := sanitizePromotionBannerHTMLNode(node)
		if err != nil {
			return "", err
		}
		builder.WriteString(sanitized)
	}
	return builder.String(), nil
}

func ValidatePromotionRewardBannerConfig(config *PromotionRewardBannerConfig) error {
	if config == nil {
		return errors.New("promotion reward banner config is required")
	}
	fillPromotionRewardBannerDefaults(config)
	switch config.ContentFormat {
	case PromotionBannerContentFormatPlainText, PromotionBannerContentFormatMarkdown, PromotionBannerContentFormatHTML:
	default:
		return errors.New("invalid promotion reward banner content format")
	}
	switch config.ImagePosition {
	case PromotionBannerImagePositionLeft, PromotionBannerImagePositionRight, PromotionBannerImagePositionTop, PromotionBannerImagePositionBackground:
	default:
		return errors.New("invalid promotion reward banner image position")
	}
	if len(config.Title) > 200 {
		return errors.New("promotion reward banner title is too long")
	}
	if len(config.Content) > 5000 {
		return errors.New("promotion reward banner content is too long")
	}
	if len(config.PrimaryButton) > 100 || len(config.SecondaryButton) > 100 {
		return errors.New("promotion reward banner button text is too long")
	}
	if config.ImageUrl != "" && !isAllowedPromotionBannerImageURL(config.ImageUrl) {
		return errors.New("unsupported banner image URL")
	}
	if config.ContentFormat == PromotionBannerContentFormatHTML {
		sanitized, err := sanitizePromotionBannerHTML(config.Content)
		if err != nil {
			return err
		}
		config.Content = sanitized
	}
	return nil
}

func ParsePromotionRewardBannerConfig(raw string) (PromotionRewardBannerConfig, error) {
	defaultConfig := DefaultPromotionRewardBannerConfig()
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return defaultConfig, nil
	}
	var config PromotionRewardBannerConfig
	if err := common.UnmarshalJsonStr(raw, &config); err != nil {
		return defaultConfig, errors.New("invalid promotion reward banner config")
	}
	if err := ValidatePromotionRewardBannerConfig(&config); err != nil {
		return defaultConfig, err
	}
	fillPromotionRewardBannerDefaults(&config)
	return config, nil
}

func GetPromotionRewardBannerConfig() PromotionRewardBannerConfig {
	common.OptionMapRWMutex.RLock()
	raw := common.OptionMap[OptionKeyPromotionRewardBannerConfig]
	common.OptionMapRWMutex.RUnlock()
	config, err := ParsePromotionRewardBannerConfig(raw)
	if err != nil {
		return DefaultPromotionRewardBannerConfig()
	}
	return config
}

func SetPromotionRewardBannerConfig(config PromotionRewardBannerConfig) error {
	if err := ValidatePromotionRewardBannerConfig(&config); err != nil {
		return err
	}
	jsonBytes, err := common.Marshal(config)
	if err != nil {
		return err
	}
	return UpdateOption(OptionKeyPromotionRewardBannerConfig, string(jsonBytes))
}

func ResetPromotionRewardBannerConfig() error {
	return SetPromotionRewardBannerConfig(DefaultPromotionRewardBannerConfig())
}

func IsPromotionRewardEmailDomainAllowed(email string, allowedDomains []string) bool {
	domain := ExtractEmailDomain(email)
	if domain == "" {
		return false
	}
	for _, allowedDomain := range allowedDomains {
		if domain == normalizeDomain(allowedDomain) {
			return true
		}
	}
	return false
}

func GetPromotionRewardStatus(user *User) (*PromotionRewardStatusResponse, error) {
	registration, err := GetPromotionRegistrationByUserID(user.Id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &PromotionRewardStatusResponse{HasPendingReward: false}, nil
		}
		return nil, err
	}
	if registration.ActivityType != PromotionActivityTrialCoupon || registration.RewardStatus != PromotionRewardStatusPendingEmail {
		return &PromotionRewardStatusResponse{HasPendingReward: false}, nil
	}
	allowedDomains := GetPromotionRewardAllowedEmailDomains()
	return &PromotionRewardStatusResponse{
		HasPendingReward:     true,
		ActivityType:         registration.ActivityType,
		RewardStatus:         registration.RewardStatus,
		RewardQuota:          registration.RewardQuota,
		RewardAmount:         float64(registration.RewardQuota) / common.QuotaPerUnit,
		RequiresEmailBinding: strings.TrimSpace(user.Email) == "",
		EmailBound:           strings.TrimSpace(user.Email) != "",
		EmailDomainAllowed:   IsPromotionRewardEmailDomainAllowed(user.Email, allowedDomains),
		AllowedEmailDomains:  allowedDomains,
		Banner:               GetPromotionRewardBannerConfig(),
		PromotionCode:        registration.Code,
		ChannelTag:           registration.ChannelTag,
	}, nil
}

func ClaimPromotionReward(userId int) (*PromotionRegistration, error) {
	var claimed *PromotionRegistration
	err := DB.Transaction(func(tx *gorm.DB) error {
		var user User
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("id = ?", userId).First(&user).Error; err != nil {
			return err
		}

		var registration PromotionRegistration
		if err := tx.Set("gorm:query_option", "FOR UPDATE").Where("user_id = ?", userId).First(&registration).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("promotion reward not found")
			}
			return err
		}
		normalizePromotionRegistrationDefaults(&registration)
		if registration.ActivityType != PromotionActivityTrialCoupon {
			return errors.New("promotion reward not found")
		}
		if registration.RewardStatus == PromotionRewardStatusGranted {
			return errors.New("promotion reward already granted")
		}
		if registration.RewardStatus != PromotionRewardStatusPendingEmail {
			return errors.New("promotion reward not found")
		}
		if strings.TrimSpace(user.Email) == "" {
			return errors.New("email binding required")
		}
		allowedDomains := GetPromotionRewardAllowedEmailDomains()
		if !IsPromotionRewardEmailDomainAllowed(user.Email, allowedDomains) {
			return errors.New("email domain is not eligible for promotion reward")
		}
		link, err := GetPromotionLinkByID(registration.PromotionLinkId)
		if err != nil {
			return err
		}
		grantQuota := link.EffectiveTrialCouponQuota()
		grantedAt := common.GetTimestamp()
		if err := tx.Model(&User{}).Where("id = ?", userId).Update("quota", gorm.Expr("quota + ?", grantQuota)).Error; err != nil {
			return err
		}
		if err := tx.Model(&PromotionRegistration{}).
			Where("id = ? AND reward_status = ?", registration.Id, PromotionRewardStatusPendingEmail).
			Updates(map[string]interface{}{
				"reward_status": PromotionRewardStatusGranted,
				"granted_quota": grantQuota,
				"granted_at":    grantedAt,
			}).Error; err != nil {
			return err
		}
		registration.RewardStatus = PromotionRewardStatusGranted
		registration.GrantedQuota = grantQuota
		registration.GrantedAt = grantedAt
		claimed = &registration
		return nil
	})
	if err != nil {
		return nil, err
	}
	RecordLog(userId, LogTypeSystem, fmt.Sprintf("绑定邮箱后领取推广体验券 %s", logger.LogQuota(claimed.GrantedQuota)))
	return claimed, nil
}

func TryAutoClaimPromotionReward(userId int) {
	_, _ = ClaimPromotionReward(userId)
}

func HasClaimedTrialPromotionReward(userId int) (bool, error) {
	registration, err := GetPromotionRegistrationByUserID(userId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil
		}
		return false, err
	}
	return registration.ActivityType == PromotionActivityTrialCoupon &&
		registration.RewardStatus == PromotionRewardStatusGranted &&
		registration.GrantedQuota > 0, nil
}

func ValidateEmailBindingRemoval(userId int) error {
	claimed, err := HasClaimedTrialPromotionReward(userId)
	if err != nil {
		return err
	}
	if claimed {
		return errors.New("trial coupon users cannot unbind email after claiming the reward")
	}
	return nil
}

func TryGrantFirstTopUpReward(userId int, topUpAmount int64) {
	var user User
	if err := DB.Select("id", "promotion_code", "first_topup_rewarded").Where("id = ?", userId).First(&user).Error; err != nil {
		return
	}
	if user.FirstTopupRewarded || user.PromotionCode == "" {
		return
	}

	var rewardQuota int
	var linkCode string

	err := DB.Transaction(func(tx *gorm.DB) error {
		var lockedUser User
		if err := tx.Set("gorm:query_option", "FOR UPDATE").
			Select("id", "promotion_code", "first_topup_rewarded").
			Where("id = ?", userId).First(&lockedUser).Error; err != nil {
			return err
		}
		if lockedUser.FirstTopupRewarded || lockedUser.PromotionCode == "" {
			return nil
		}

		var link PromotionLink
		if err := tx.Where("code = ?", lockedUser.PromotionCode).First(&link).Error; err != nil {
			return nil
		}
		if link.FirstTopupRewardQuota <= 0 || !link.Enabled {
			return nil
		}
		if link.ExpiresAt != 0 && link.ExpiresAt <= common.GetTimestamp() {
			return nil
		}
		if link.FirstTopupMinAmount > 0 && topUpAmount < int64(link.FirstTopupMinAmount) {
			return nil
		}

		if err := tx.Model(&User{}).Where("id = ?", userId).Updates(map[string]interface{}{
			"quota":                gorm.Expr("quota + ?", link.FirstTopupRewardQuota),
			"first_topup_rewarded": true,
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&PromotionLink{}).Where("id = ?", link.Id).
			Update("first_topup_count", gorm.Expr("first_topup_count + ?", 1)).Error; err != nil {
			return err
		}

		rewardQuota = link.FirstTopupRewardQuota
		linkCode = link.Code
		return nil
	})
	if err != nil {
		common.SysError(fmt.Sprintf("failed to grant first topup reward: user_id=%d error=%s", userId, err.Error()))
		return
	}

	if rewardQuota > 0 {
		RecordLog(userId, LogTypeSystem, fmt.Sprintf("通过推广链接首充赠送 %s（推广码: %s，充值金额: %d）", logger.LogQuota(rewardQuota), linkCode, topUpAmount))
	}
}
