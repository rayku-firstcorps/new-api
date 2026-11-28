package controller

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// setupAnalyticsTestDB points both the main and the log database at one real
// database. It uses SQLite by default; set TEST_ANALYTICS_DB=mysql|postgres
// with TEST_MYSQL_DSN / TEST_POSTGRES_DSN to run the same test on those engines.
func setupAnalyticsTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dbType := common.DatabaseTypeSQLite
	var driver gorm.Dialector = sqlite.Open(t.TempDir() + "/analytics.db")
	switch os.Getenv("TEST_ANALYTICS_DB") {
	case "mysql":
		dbType = common.DatabaseTypeMySQL
		driver = mysql.Open(os.Getenv("TEST_MYSQL_DSN"))
	case "postgres":
		dbType = common.DatabaseTypePostgreSQL
		driver = postgres.Open(os.Getenv("TEST_POSTGRES_DSN"))
	}
	db, err := gorm.Open(driver, &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)

	setting := operation_setting.GetAnalyticsSetting()
	previousSetting := *setting
	previousDB, previousLogDB, previousMap := model.DB, model.LOG_DB, common.OptionMap
	previousMaster, previousLogType := common.IsMasterNode, common.LogDatabaseType()
	model.DB, model.LOG_DB = db, db
	common.OptionMap = map[string]string{}
	common.IsMasterNode = true
	common.SetLogDatabaseType(dbType)
	t.Cleanup(func() {
		*setting = previousSetting
		model.DB, model.LOG_DB, common.OptionMap = previousDB, previousLogDB, previousMap
		common.IsMasterNode = previousMaster
		common.SetLogDatabaseType(previousLogType)
		require.NoError(t, sqlDB.Close())
	})

	require.NoError(t, db.Migrator().DropTable(&model.Option{}, &model.BehaviorEvent{}))
	require.NoError(t, db.AutoMigrate(&model.Option{}))
	// Run the migration twice: the second run must be a no-op.
	require.NoError(t, model.MigrateBehaviorEvents())
	require.NoError(t, model.MigrateBehaviorEvents())
	return db
}

func TestAnalyticsOptionValidationBounds(t *testing.T) {
	setupAnalyticsTestDB(t)
	for _, tc := range []struct {
		key, value string
		ok         bool
	}{
		{operation_setting.AnalyticsSampleRateOptionKey, "0", false},
		{operation_setting.AnalyticsSampleRateOptionKey, "101", false},
		{operation_setting.AnalyticsSampleRateOptionKey, "abc", false},
		{operation_setting.AnalyticsSampleRateOptionKey, "1", true},
		{operation_setting.AnalyticsSampleRateOptionKey, "100", true},
		{operation_setting.AnalyticsRetentionDaysOptionKey, "6", false},
		{operation_setting.AnalyticsRetentionDaysOptionKey, "366", false},
		{operation_setting.AnalyticsRetentionDaysOptionKey, "7", true},
		{operation_setting.AnalyticsRetentionDaysOptionKey, "365", true},
		{operation_setting.AnalyticsHashSecretOptionKey, "deadbeef", false},
		{operation_setting.AnalyticsSecretRotatedAtOptionKey, "1", false},
	} {
		err := model.UpdateOption(tc.key, tc.value)
		if tc.ok {
			assert.NoError(t, err, "%s=%s", tc.key, tc.value)
		} else {
			assert.Error(t, err, "%s=%s", tc.key, tc.value)
		}
	}
	err := model.UpdateOptionsBulk(map[string]string{operation_setting.AnalyticsHashSecretOptionKey: "deadbeef"})
	require.Error(t, err)
	assert.Equal(t, "", operation_setting.GetAnalyticsSetting().HashSecret)
}

func TestAnalyticsSecretLifecycleAndExposure(t *testing.T) {
	setupAnalyticsTestDB(t)
	setting := operation_setting.GetAnalyticsSetting()

	// Disabled: nothing is generated.
	created, err := service.EnsureAnalyticsSecret()
	require.NoError(t, err)
	assert.False(t, created)
	assert.Empty(t, setting.HashSecret)
	assert.False(t, setting.IsActive())

	// A non-master node never generates it.
	require.NoError(t, model.UpdateOption(operation_setting.AnalyticsEnabledOptionKey, "true"))
	common.IsMasterNode = false
	created, err = service.EnsureAnalyticsSecret()
	require.NoError(t, err)
	assert.False(t, created)
	common.IsMasterNode = true

	created, err = service.EnsureAnalyticsSecret()
	require.NoError(t, err)
	assert.True(t, created)
	secret := setting.HashSecret
	assert.Regexp(t, "^[0-9a-f]{64}$", secret)
	assert.NotZero(t, setting.SecretRotatedAt)
	assert.True(t, setting.IsActive())

	// Repeated initialization keeps the same secret.
	created, err = service.EnsureAnalyticsSecret()
	require.NoError(t, err)
	assert.False(t, created)
	assert.Equal(t, secret, setting.HashSecret)

	// The secret is persisted, and a reload from the database restores it.
	stored, err := model.AllOption()
	require.NoError(t, err)
	persisted := map[string]string{}
	for _, option := range stored {
		persisted[option.Key] = option.Value
	}
	assert.Equal(t, secret, persisted[operation_setting.AnalyticsHashSecretOptionKey])

	// GET /api/option and /api/status never expose it.
	response := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(response)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/option/", nil)
	GetOptions(c)
	assert.NotContains(t, response.Body.String(), secret)
	assert.NotContains(t, response.Body.String(), operation_setting.AnalyticsHashSecretOptionKey)
	assert.Contains(t, response.Body.String(), operation_setting.AnalyticsSecretRotatedAtOptionKey)

	response = httptest.NewRecorder()
	c, _ = gin.CreateTestContext(response)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
	GetStatus(c)
	body := response.Body.String()
	assert.NotContains(t, body, secret)
	assert.False(t, strings.Contains(body, "hash_secret"))
	var payload struct {
		Data struct {
			Enabled    *bool `json:"analytics_enabled"`
			SampleRate *int  `json:"analytics_sample_rate"`
			RespectDNT *bool `json:"analytics_respect_dnt"`
		} `json:"data"`
	}
	require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
	require.NotNil(t, payload.Data.Enabled)
	require.NotNil(t, payload.Data.SampleRate)
	require.NotNil(t, payload.Data.RespectDNT)
	assert.True(t, *payload.Data.Enabled)
	assert.Equal(t, 100, *payload.Data.SampleRate)
	assert.True(t, *payload.Data.RespectDNT)

	// Rotation produces a new secret; actor hashes are stable per secret.
	rotatedAt, err := service.RotateAnalyticsSecret()
	require.NoError(t, err)
	assert.NotZero(t, rotatedAt)
	assert.NotEqual(t, secret, setting.HashSecret)
	hash := service.AnalyticsActorHash(7, secret)
	assert.Len(t, hash, 32)
	assert.Equal(t, hash, service.AnalyticsActorHash(7, secret))
	assert.NotEqual(t, hash, service.AnalyticsActorHash(8, secret))
	assert.NotEqual(t, hash, service.AnalyticsActorHash(7, setting.HashSecret))

	common.IsMasterNode = false
	_, err = service.RotateAnalyticsSecret()
	assert.Error(t, err)
}

func TestBehaviorEventsDedupeAndRetentionPurge(t *testing.T) {
	db := setupAnalyticsTestDB(t)
	require.NoError(t, model.UpdateOption(operation_setting.AnalyticsRetentionDaysOptionKey, "7"))
	now := common.GetTimestamp()
	day := int64(86400)
	event := func(id string, createdAt int64) *model.BehaviorEvent {
		return &model.BehaviorEvent{
			EventId: id, CreatedAt: createdAt, EventType: "page_view", EventName: "route.enter",
			DeviceId: "device-aaaaaaaaaaaa", SessionId: "session-aaaaaaaaaaa", RoutePath: "/",
			ClientType: "web_desktop",
		}
	}

	require.NoError(t, model.InsertBehaviorEvents([]*model.BehaviorEvent{
		event("evt-dup-0001", now), event("evt-dup-0001", now), event("evt-new-0002", now),
	}))
	// A retried batch with a known event_id must not fail or add rows.
	require.NoError(t, model.InsertBehaviorEvents([]*model.BehaviorEvent{event("evt-dup-0001", now)}))
	var count int64
	require.NoError(t, db.Model(&model.BehaviorEvent{}).Count(&count).Error)
	assert.EqualValues(t, 2, count)

	require.NoError(t, model.InsertBehaviorEvents([]*model.BehaviorEvent{
		event("evt-old-0001", now-8*day), event("evt-old-0002", now-30*day), event("evt-edge-001", now-6*day),
	}))
	deleted, handledByTTL, err := service.PurgeExpiredBehaviorEvents()
	require.NoError(t, err)
	assert.False(t, handledByTTL)
	assert.EqualValues(t, 2, deleted)
	require.NoError(t, db.Model(&model.BehaviorEvent{}).Count(&count).Error)
	assert.EqualValues(t, 3, count)
	var oldest int64
	require.NoError(t, db.Model(&model.BehaviorEvent{}).Select("MIN(created_at)").Scan(&oldest).Error)
	assert.Greater(t, oldest, now-7*day)

	// Batched deletion honors the batch size.
	var batch []*model.BehaviorEvent
	for i := range 5 {
		batch = append(batch, event("evt-bulk-000"+string(rune('a'+i)), now-20*day))
	}
	require.NoError(t, model.InsertBehaviorEvents(batch))
	n, err := model.DeleteBehaviorEventsBefore(now-7*day, 2)
	require.NoError(t, err)
	assert.EqualValues(t, 2, n)
}
