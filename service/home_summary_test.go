package service

import (
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupHomeSummaryTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	initHomeSummaryColumnNames(t)

	originalMainDatabaseType := common.MainDatabaseType()
	originalLogDatabaseType := common.LogDatabaseType()
	originalRedisEnabled := common.RedisEnabled
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled = false

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)

	originalDB := model.DB
	originalLogDB := model.LOG_DB
	model.DB = db
	model.LOG_DB = db

	require.NoError(t, db.AutoMigrate(
		&model.User{},
		&model.Channel{},
		&model.Ability{},
		&model.QuotaData{},
		&model.Model{},
		&model.Vendor{},
	))

	model.InvalidatePricingCache()
	ResetHomeLandingSummaryCache()
	t.Cleanup(func() {
		model.InvalidatePricingCache()
		ResetHomeLandingSummaryCache()
		sqlDB, err := db.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
		model.DB = originalDB
		model.LOG_DB = originalLogDB
		common.SetDatabaseTypes(originalMainDatabaseType, originalLogDatabaseType)
		common.RedisEnabled = originalRedisEnabled
	})

	return db
}

func initHomeSummaryColumnNames(t *testing.T) {
	t.Helper()

	originalIsMasterNode := common.IsMasterNode
	originalSQLitePath := common.SQLitePath
	originalMainDatabaseType := common.MainDatabaseType()
	originalLogDatabaseType := common.LogDatabaseType()
	originalSQLDSN, hadSQLDSN := os.LookupEnv("SQL_DSN")
	originalDB := model.DB
	originalLogDB := model.LOG_DB

	common.IsMasterNode = false
	common.SQLitePath = fmt.Sprintf("file:%s_init?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	common.SetDatabaseTypes(common.DatabaseType(""), common.DatabaseType(""))
	require.NoError(t, os.Setenv("SQL_DSN", "local"))
	require.NoError(t, model.InitDB())
	if model.DB != nil {
		sqlDB, err := model.DB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	}

	model.DB = originalDB
	model.LOG_DB = originalLogDB
	common.IsMasterNode = originalIsMasterNode
	common.SQLitePath = originalSQLitePath
	common.SetDatabaseTypes(originalMainDatabaseType, originalLogDatabaseType)
	if hadSQLDSN {
		require.NoError(t, os.Setenv("SQL_DSN", originalSQLDSN))
	} else {
		require.NoError(t, os.Unsetenv("SQL_DSN"))
	}
}

func withHomeHeaderNavModules(t *testing.T, raw string) {
	t.Helper()

	common.OptionMapRWMutex.Lock()
	if common.OptionMap == nil {
		common.OptionMap = map[string]string{}
	}
	previous, hadPrevious := common.OptionMap["HeaderNavModules"]
	common.OptionMap["HeaderNavModules"] = raw
	common.OptionMapRWMutex.Unlock()

	ResetHomeLandingSummaryCache()
	t.Cleanup(func() {
		common.OptionMapRWMutex.Lock()
		defer common.OptionMapRWMutex.Unlock()
		if hadPrevious {
			common.OptionMap["HeaderNavModules"] = previous
		} else {
			delete(common.OptionMap, "HeaderNavModules")
		}
		ResetHomeLandingSummaryCache()
	})
}

func withHomeQuotaDisplay(t *testing.T, displayType string, quotaPerUnit float64, usdRate float64, customRate float64, customSymbol string) {
	t.Helper()

	originalQuotaPerUnit := common.QuotaPerUnit
	originalUSDExchangeRate := operation_setting.USDExchangeRate
	generalSetting := operation_setting.GetGeneralSetting()
	originalDisplayType := generalSetting.QuotaDisplayType
	originalCustomRate := generalSetting.CustomCurrencyExchangeRate
	originalCustomSymbol := generalSetting.CustomCurrencySymbol

	common.QuotaPerUnit = quotaPerUnit
	operation_setting.USDExchangeRate = usdRate
	generalSetting.QuotaDisplayType = displayType
	generalSetting.CustomCurrencyExchangeRate = customRate
	generalSetting.CustomCurrencySymbol = customSymbol

	t.Cleanup(func() {
		common.QuotaPerUnit = originalQuotaPerUnit
		operation_setting.USDExchangeRate = originalUSDExchangeRate
		generalSetting.QuotaDisplayType = originalDisplayType
		generalSetting.CustomCurrencyExchangeRate = originalCustomRate
		generalSetting.CustomCurrencySymbol = originalCustomSymbol
	})
}

func TestBuildHomeLandingSummaryAggregatesPublicFields(t *testing.T) {
	db := setupHomeSummaryTestDB(t)
	withHomeHeaderNavModules(t, `{"pricing":{"enabled":true,"requireAuth":false}}`)

	require.NoError(t, db.Create(&[]model.Ability{
		{Group: "default", Model: "gpt-4o-mini", ChannelId: 1, Enabled: true},
		{Group: "vip", Model: "claude-3-5-sonnet", ChannelId: 1, Enabled: true},
		{Group: "vip", Model: "gpt-4o-mini", ChannelId: 2, Enabled: true},
	}).Error)

	summary, err := BuildHomeLandingSummary()

	require.NoError(t, err)
	require.True(t, summary.PricingVisible)
	require.Equal(t, 2, summary.Metrics.BillableModelCount)
	require.GreaterOrEqual(t, summary.Metrics.ModelServiceCount, 1)
	require.Equal(t, homeAppIntegrationCount, summary.Metrics.AppIntegrationCount)
	require.True(t, summary.Metrics.UsageRecordsEnabled)
	require.Equal(t, HomeLandingCacheTTLSeconds, summary.CacheTTLSeconds)
}

func TestBuildHomeLandingSummaryReflectsPricingVisibility(t *testing.T) {
	setupHomeSummaryTestDB(t)

	testCases := []struct {
		name    string
		raw     string
		visible bool
	}{
		{name: "disabled", raw: `{"pricing":{"enabled":false,"requireAuth":false}}`, visible: false},
		{name: "requires auth", raw: `{"pricing":{"enabled":true,"requireAuth":true}}`, visible: false},
		{name: "legacy enabled", raw: `{"pricing":true}`, visible: true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			withHomeHeaderNavModules(t, tc.raw)
			summary, err := BuildHomeLandingSummary()
			require.NoError(t, err)
			require.Equal(t, tc.visible, summary.PricingVisible)
		})
	}
}

func TestBuildHomeLandingSummaryAllowsEmptyPricingData(t *testing.T) {
	setupHomeSummaryTestDB(t)
	withHomeHeaderNavModules(t, "")

	summary, err := BuildHomeLandingSummary()

	require.NoError(t, err)
	require.Equal(t, 0, summary.Metrics.BillableModelCount)
	require.Equal(t, 0, summary.Metrics.ModelServiceCount)
}

func TestBuildHomeSelfSummaryConvertsQuotaAndAggregatesUsage(t *testing.T) {
	db := setupHomeSummaryTestDB(t)
	withHomeQuotaDisplay(t, operation_setting.QuotaDisplayTypeCNY, 100, 7, 1, "¤")

	now := time.Now()
	require.NoError(t, db.Create(&model.User{
		Id:           1001,
		Username:     "home-user",
		Password:     "password",
		Group:        "default",
		Quota:        240,
		UsedQuota:    69,
		RequestCount: 182,
		Status:       common.UserStatusEnabled,
	}).Error)
	require.NoError(t, db.Create(&[]model.Ability{
		{Group: "default", Model: "gpt-4o-mini", ChannelId: 1, Enabled: true},
		{Group: "vip", Model: "claude-3-5-sonnet", ChannelId: 1, Enabled: true},
		{Group: "default", Model: "gpt-4o-mini", ChannelId: 2, Enabled: true},
		{Group: "default", Model: "disabled-model", ChannelId: 2, Enabled: false},
	}).Error)
	require.NoError(t, db.Create(&[]model.QuotaData{
		{UserID: 1001, Username: "home-user", ModelName: "gpt-4o-mini", CreatedAt: now.Add(-24 * time.Hour).Unix(), Count: 40, Quota: 10},
		{UserID: 1001, Username: "home-user", ModelName: "claude-3-5-sonnet", CreatedAt: now.Add(-2 * time.Hour).Unix(), Count: 2, Quota: 6},
		{UserID: 1001, Username: "home-user", ModelName: "old-model", CreatedAt: now.Add(-8 * 24 * time.Hour).Unix(), Count: 99, Quota: 1000},
		{UserID: 2002, Username: "other", ModelName: "gpt-4o-mini", CreatedAt: now.Add(-2 * time.Hour).Unix(), Count: 99, Quota: 1000},
	}).Error)

	summary, err := BuildHomeSelfSummary(1001)

	require.NoError(t, err)
	require.InDelta(t, 2.4*7, summary.Balance.Amount, 0.000001)
	require.Equal(t, summary.Balance.Amount, summary.Balance.DisplayAmount)
	require.Equal(t, operation_setting.QuotaDisplayTypeCNY, summary.Balance.DisplayType)
	require.Equal(t, "¥", summary.Balance.Symbol)
	require.InDelta(t, 0.69*7, summary.Used.Amount, 0.000001)
	require.Equal(t, 182, summary.RequestCount)
	require.Equal(t, 2, summary.AvailableModelCount)
	require.Equal(t, homeRecentUsageDays, summary.RecentUsage.Days)
	require.InDelta(t, 0.16*7, summary.RecentUsage.Amount, 0.000001)
	require.Equal(t, 42, summary.RecentUsage.RequestCount)

	payload, err := common.Marshal(summary)
	require.NoError(t, err)
	serialized := string(payload)
	require.NotContains(t, serialized, "email")
	require.NotContains(t, serialized, "group")
	require.NotContains(t, serialized, "token")
	require.NotContains(t, serialized, "password")
}

func TestQuotaToDisplayAmountSupportsTokensAndCustomCurrency(t *testing.T) {
	withHomeQuotaDisplay(t, operation_setting.QuotaDisplayTypeTokens, 100, 7, 1, "¤")
	tokenAmount := quotaToDisplayAmount(123)
	require.Equal(t, float64(123), tokenAmount.Amount)
	require.Equal(t, operation_setting.QuotaDisplayTypeTokens, tokenAmount.DisplayType)
	require.Equal(t, "", tokenAmount.Symbol)

	withHomeQuotaDisplay(t, operation_setting.QuotaDisplayTypeCustom, 100, 7, 3, "C")
	customAmount := quotaToDisplayAmount(200)
	require.Equal(t, float64(6), customAmount.Amount)
	require.Equal(t, "C", customAmount.Symbol)
}
