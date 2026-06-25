package service

import (
	"math"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

// roundDisplayAmount 将展示金额四舍五入到指定小数位，避免序列化 float64 尾数。
// Tokens 类型保持整数，其他货币保留 4 位小数。
func roundDisplayAmount(amount float64, displayType string) float64 {
	if displayType == operation_setting.QuotaDisplayTypeTokens {
		return math.Round(amount)
	}
	return math.Round(amount*10000) / 10000
}

const (
	HomeLandingCacheTTLSeconds = 60
	homeAppIntegrationCount    = 4
	homeRecentUsageDays        = 7
)

type HomeLandingCurrency struct {
	QuotaPerUnit               float64 `json:"quota_per_unit"`
	QuotaDisplayType           string  `json:"quota_display_type"`
	DisplayInCurrency          bool    `json:"display_in_currency"`
	CustomCurrencySymbol       string  `json:"custom_currency_symbol"`
	CustomCurrencyExchangeRate float64 `json:"custom_currency_exchange_rate"`
}

type HomeLandingMetrics struct {
	ModelServiceCount   int  `json:"model_service_count"`
	BillableModelCount  int  `json:"billable_model_count"`
	AppIntegrationCount int  `json:"app_integration_count"`
	UsageRecordsEnabled bool `json:"usage_records_enabled"`
}

type HomeLandingSummary struct {
	SystemName              string              `json:"system_name"`
	Logo                    string              `json:"logo"`
	DocsLink                string              `json:"docs_link"`
	RegisterEnabled         bool                `json:"register_enabled"`
	PasswordRegisterEnabled bool                `json:"password_register_enabled"`
	PricingVisible          bool                `json:"pricing_visible"`
	Currency                HomeLandingCurrency `json:"currency"`
	Metrics                 HomeLandingMetrics  `json:"metrics"`
	CacheTTLSeconds         int                 `json:"cache_ttl_seconds"`
}

type HomeDisplayAmount struct {
	Amount        float64 `json:"amount"`
	DisplayAmount float64 `json:"display_amount"`
	DisplayType   string  `json:"display_type"`
	Symbol        string  `json:"symbol"`
}

type HomeRecentUsage struct {
	Days          int     `json:"days"`
	Amount        float64 `json:"amount"`
	DisplayAmount float64 `json:"display_amount"`
	DisplayType   string  `json:"display_type"`
	Symbol        string  `json:"symbol"`
	RequestCount  int     `json:"request_count"`
}

type HomeSelfSummary struct {
	Balance             HomeDisplayAmount `json:"balance"`
	Used                HomeDisplayAmount `json:"used"`
	RequestCount        int               `json:"request_count"`
	AvailableModelCount int               `json:"available_model_count"`
	RecentUsage         HomeRecentUsage   `json:"recent_usage"`
}

var homeLandingSummaryCache = struct {
	sync.RWMutex
	summary   HomeLandingSummary
	expiresAt time.Time
}{}

func BuildHomeLandingSummary() (HomeLandingSummary, error) {
	now := time.Now()
	homeLandingSummaryCache.RLock()
	if !homeLandingSummaryCache.expiresAt.IsZero() && now.Before(homeLandingSummaryCache.expiresAt) {
		summary := homeLandingSummaryCache.summary
		homeLandingSummaryCache.RUnlock()
		return summary, nil
	}
	homeLandingSummaryCache.RUnlock()

	homeLandingSummaryCache.Lock()
	defer homeLandingSummaryCache.Unlock()
	if !homeLandingSummaryCache.expiresAt.IsZero() && now.Before(homeLandingSummaryCache.expiresAt) {
		return homeLandingSummaryCache.summary, nil
	}

	summary := buildHomeLandingSummaryUncached()
	homeLandingSummaryCache.summary = summary
	homeLandingSummaryCache.expiresAt = time.Now().Add(time.Duration(HomeLandingCacheTTLSeconds) * time.Second)
	return summary, nil
}

func ResetHomeLandingSummaryCache() {
	homeLandingSummaryCache.Lock()
	defer homeLandingSummaryCache.Unlock()
	homeLandingSummaryCache.summary = HomeLandingSummary{}
	homeLandingSummaryCache.expiresAt = time.Time{}
}

func buildHomeLandingSummaryUncached() HomeLandingSummary {
	generalSetting := operation_setting.GetGeneralSetting()
	pricing := model.GetPricing()
	modelNames := make(map[string]struct{}, len(pricing))
	for _, item := range pricing {
		if item.ModelName == "" {
			continue
		}
		modelNames[item.ModelName] = struct{}{}
	}

	vendors := model.GetVendors()
	modelServiceCount := len(vendors)
	if modelServiceCount == 0 {
		modelServiceCount = len(modelNames)
	}

	return HomeLandingSummary{
		SystemName:              common.SystemName,
		Logo:                    common.Logo,
		DocsLink:                generalSetting.DocsLink,
		RegisterEnabled:         common.RegisterEnabled,
		PasswordRegisterEnabled: common.PasswordRegisterEnabled,
		PricingVisible:          common.IsHeaderNavModulePubliclyVisible("pricing"),
		Currency: HomeLandingCurrency{
			QuotaPerUnit:               common.QuotaPerUnit,
			QuotaDisplayType:           operation_setting.GetQuotaDisplayType(),
			DisplayInCurrency:          operation_setting.IsCurrencyDisplay(),
			CustomCurrencySymbol:       generalSetting.CustomCurrencySymbol,
			CustomCurrencyExchangeRate: generalSetting.CustomCurrencyExchangeRate,
		},
		Metrics: HomeLandingMetrics{
			ModelServiceCount:   modelServiceCount,
			BillableModelCount:  len(modelNames),
			AppIntegrationCount: homeAppIntegrationCount,
			UsageRecordsEnabled: true,
		},
		CacheTTLSeconds: HomeLandingCacheTTLSeconds,
	}
}

func BuildHomeSelfSummary(userID int) (HomeSelfSummary, error) {
	user, err := model.GetUserById(userID, false)
	if err != nil {
		return HomeSelfSummary{}, err
	}

	availableModels := make(map[string]struct{})
	for group := range GetUserUsableGroups(user.Group) {
		for _, modelName := range model.GetGroupEnabledModels(group) {
			if modelName != "" {
				availableModels[modelName] = struct{}{}
			}
		}
	}

	recentRawQuota, recentRequestCount, err := getRecentUsageRawQuota(userID)
	if err != nil {
		return HomeSelfSummary{}, err
	}
	recentAmount := quotaToDisplayAmount(recentRawQuota)

	return HomeSelfSummary{
		Balance:             quotaToDisplayAmount(user.Quota),
		Used:                quotaToDisplayAmount(user.UsedQuota),
		RequestCount:        user.RequestCount,
		AvailableModelCount: len(availableModels),
		RecentUsage: HomeRecentUsage{
			Days:          homeRecentUsageDays,
			Amount:        recentAmount.Amount,
			DisplayAmount: recentAmount.DisplayAmount,
			DisplayType:   recentAmount.DisplayType,
			Symbol:        recentAmount.Symbol,
			RequestCount:  recentRequestCount,
		},
	}, nil
}

func getRecentUsageRawQuota(userID int) (int, int, error) {
	now := time.Now()
	start := now.Add(-time.Duration(homeRecentUsageDays) * 24 * time.Hour).Unix()
	end := now.Unix()
	quotaData, err := model.GetQuotaDataByUserId(userID, start, end)
	if err != nil {
		return 0, 0, err
	}

	totalQuota := 0
	totalCount := 0
	for _, item := range quotaData {
		if item == nil {
			continue
		}
		totalQuota += item.Quota
		totalCount += item.Count
	}
	return totalQuota, totalCount, nil
}

func quotaToDisplayAmount(rawQuota int) HomeDisplayAmount {
	displayType := operation_setting.GetQuotaDisplayType()
	amount := float64(rawQuota)
	if displayType != operation_setting.QuotaDisplayTypeTokens {
		if common.QuotaPerUnit > 0 {
			amount = amount / common.QuotaPerUnit
		} else {
			amount = 0
		}
		amount *= operation_setting.GetUsdToCurrencyRate(operation_setting.USDExchangeRate)
	}

	return HomeDisplayAmount{
		Amount:        amount,
		DisplayAmount: roundDisplayAmount(amount, displayType),
		DisplayType:   displayType,
		Symbol:        operation_setting.GetCurrencySymbol(),
	}
}
