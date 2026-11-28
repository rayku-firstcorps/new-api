package controller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Fixture window: one UTC day starting at midnight. Run against MySQL or
// PostgreSQL with TEST_MANAGE_USER_DIALECT=mysql|postgres and the matching
// TEST_MYSQL_DSN / TEST_POSTGRES_DSN (same switches as the user management tests).
const analyticsQueryBase int64 = 1700006400

type analyticsQueryEnv struct {
	engine                       *gin.Engine
	memberJWT, adminJWT, rootJWT string
}

type analyticsQueryResponse[T any] struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    T      `json:"data"`
}

// newAnalyticsQueryEnv mirrors router/analytics_admin_router.go with the real
// AdminAuth / RootAuth middleware and real browser sessions for three roles.
func newAnalyticsQueryEnv(t *testing.T) *analyticsQueryEnv {
	t.Helper()
	db := setupManageUserTestDB(t)
	require.NoError(t, db.AutoMigrate(&model.Option{}))
	require.NoError(t, model.MigrateBehaviorEvents())

	setting := operation_setting.GetAnalyticsSetting()
	previousSetting, previousMap, previousMaster := *setting, common.OptionMap, common.IsMasterNode
	common.OptionMap = map[string]string{}
	common.IsMasterNode = true
	setting.RetentionDays = 90
	t.Cleanup(func() {
		*setting = previousSetting
		common.OptionMap, common.IsMasterNode = previousMap, previousMaster
	})

	env := &analyticsQueryEnv{}
	for i, role := range []struct {
		jwt  *string
		role int
	}{{&env.memberJWT, common.RoleCommonUser}, {&env.adminJWT, common.RoleAdminUser}, {&env.rootJWT, common.RoleRootUser}} {
		id := 100 + i
		name := "analytics-user-" + strconv.Itoa(id)
		require.NoError(t, db.Create(&model.User{Id: id, Username: name, AffCode: name, Role: role.role, Status: common.UserStatusEnabled, AuthVersion: 1}).Error)
		_, *role.jwt = createAccessTokenTestSession(t, id, "sid-"+name)
	}

	gin.SetMode(gin.TestMode)
	env.engine = gin.New()
	env.engine.Use(middleware.RequestId(), middleware.AccessTokenAudit())
	adminRoute := env.engine.Group("/api/analytics", middleware.AdminAuth())
	adminRoute.GET("/overview", GetAnalyticsOverview)
	adminRoute.GET("/trends", GetAnalyticsTrends)
	adminRoute.GET("/devices", GetAnalyticsDevices)
	adminRoute.GET("/pages", GetAnalyticsPages)
	adminRoute.GET("/features", GetAnalyticsFeatures)
	adminRoute.GET("/health", GetAnalyticsHealth)
	rootRoute := env.engine.Group("/api/analytics", middleware.RootAuth())
	rootRoute.POST("/salt/rotate", RotateAnalyticsSecret)
	rootRoute.DELETE("/expired", PurgeExpiredAnalytics)
	return env
}

func (e *analyticsQueryEnv) do(method, path, jwt string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(method, path, nil)
	request.RemoteAddr = "192.0.2.9:4567"
	if jwt != "" {
		request.Header.Set("Authorization", "Bearer "+jwt)
	}
	recorder := httptest.NewRecorder()
	e.engine.ServeHTTP(recorder, request)
	return recorder
}

func analyticsGet[T any](t *testing.T, env *analyticsQueryEnv, path string) T {
	t.Helper()
	recorder := env.do(http.MethodGet, path, env.adminJWT)
	require.Equal(t, http.StatusOK, recorder.Code, path)
	var response analyticsQueryResponse[T]
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response), recorder.Body.String())
	require.True(t, response.Success, "%s: %s", path, response.Message)
	return response.Data
}

func analyticsQueryPath(route string, start, end int64, extra string) string {
	return fmt.Sprintf("/api/analytics/%s?start_ts=%d&end_ts=%d%s", route, start, end, extra)
}

type analyticsFixtureEvent struct {
	at                    int64
	eventType, eventName  string
	actor, device, client string
	route                 string
	tz                    int16
	duration, active      int32
	status                int16
	apiRoute, errorName   string
}

func insertAnalyticsFixture(t *testing.T, events []analyticsFixtureEvent) {
	t.Helper()
	rows := make([]*model.BehaviorEvent, 0, len(events))
	for i, e := range events {
		rows = append(rows, &model.BehaviorEvent{
			EventId: "fixture-" + strconv.Itoa(i), CreatedAt: e.at, EventType: e.eventType, EventName: e.eventName,
			ActorHash: e.actor, DeviceId: e.device, SessionId: "session-" + e.device, RoutePath: e.route,
			ClientType: e.client, TzOffset: e.tz, DurationMs: e.duration, ActiveMs: e.active,
			StatusCode: e.status, ApiRoute: e.apiRoute, ErrorName: e.errorName,
		})
	}
	require.NoError(t, model.InsertBehaviorEvents(rows))
}

func TestAnalyticsQueryPermissions(t *testing.T) {
	env := newAnalyticsQueryEnv(t)
	overview := analyticsQueryPath("overview", analyticsQueryBase, analyticsQueryBase+86400, "")
	for _, tc := range []struct {
		name, method, path, jwt string
		wantStatus              int
	}{
		{"guest cannot query", http.MethodGet, overview, "", http.StatusUnauthorized},
		{"member cannot query", http.MethodGet, overview, env.memberJWT, http.StatusForbidden},
		{"admin can query", http.MethodGet, overview, env.adminJWT, http.StatusOK},
		{"admin cannot rotate", http.MethodPost, "/api/analytics/salt/rotate", env.adminJWT, http.StatusForbidden},
		{"admin cannot purge", http.MethodDelete, "/api/analytics/expired", env.adminJWT, http.StatusForbidden},
		{"member cannot rotate", http.MethodPost, "/api/analytics/salt/rotate", env.memberJWT, http.StatusForbidden},
		{"root can query", http.MethodGet, overview, env.rootJWT, http.StatusOK},
		{"root can purge", http.MethodDelete, "/api/analytics/expired", env.rootJWT, http.StatusOK},
	} {
		t.Run(tc.name, func(t *testing.T) {
			recorder := env.do(tc.method, tc.path, tc.jwt)
			assert.Equal(t, tc.wantStatus, recorder.Code, recorder.Body.String())
		})
	}
}

func TestAnalyticsQueryParameterValidation(t *testing.T) {
	env := newAnalyticsQueryEnv(t)
	base := analyticsQueryBase
	day := int64(86400)
	for _, tc := range []struct {
		name, path, wantMessage string
	}{
		{"missing range", "/api/analytics/overview", "Invalid time range"},
		{"end equals start", analyticsQueryPath("overview", base, base, ""), "Invalid time range"},
		{"end before start", analyticsQueryPath("pages", base+1, base, ""), "Invalid time range"},
		{"negative start", analyticsQueryPath("devices", -1, base, ""), "Invalid time range"},
		{"span over retention", analyticsQueryPath("overview", base, base+91*day, ""), "The time range cannot be longer than the data retention period"},
		{"bad client type", analyticsQueryPath("overview", base, base+day, "&client_type=toaster"), "Invalid client type"},
		{"bad granularity", analyticsQueryPath("trends", base, base+day, "&granularity=week"), "Invalid granularity"},
		{"hourly over 14 days", analyticsQueryPath("trends", base, base+15*day, "&granularity=hour"), "Hourly trends are limited to 14 days"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			recorder := env.do(http.MethodGet, tc.path, env.adminJWT)
			require.Equal(t, http.StatusOK, recorder.Code)
			var response analyticsQueryResponse[any]
			require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
			assert.False(t, response.Success)
			assert.Equal(t, tc.wantMessage, response.Message)
		})
	}
	exactRetention := env.do(http.MethodGet, analyticsQueryPath("overview", base, base+90*day, "&client_type=web_mobile"), env.adminJWT)
	assert.Contains(t, exactRetention.Body.String(), `"success":true`)
}

func TestAnalyticsQueryAggregations(t *testing.T) {
	env := newAnalyticsQueryEnv(t)
	base := analyticsQueryBase
	const (
		actorA, actorB = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
		d1, d2, d3, d4 = "device-d1-aaaaaaaa", "device-d2-aaaaaaaa", "device-d3-aaaaaaaa", "device-d4-aaaaaaaa"
		desktop        = "web_desktop"
		mobile         = "web_mobile"
	)
	events := []analyticsFixtureEvent{
		// Page views: actor A on two devices, an anonymous device, actor B on
		// the exact start boundary. 4 views are inside the window.
		{at: base + 10*3600, eventType: "page_view", eventName: "route.enter", actor: actorA, device: d1, client: desktop, route: "/a", tz: -480},
		{at: base + 11*3600, eventType: "page_view", eventName: "route.enter", actor: actorA, device: d2, client: mobile, route: "/a", tz: -480},
		{at: base + 10*3600, eventType: "page_view", eventName: "route.enter", device: d3, client: desktop, route: "/b", tz: 0},
		{at: base, eventType: "page_view", eventName: "route.enter", actor: actorB, device: d4, client: desktop, route: "/a", tz: -480},
		// Outside the half-open window: one second before start, exactly at end.
		{at: base - 1, eventType: "page_view", eventName: "route.enter", device: "device-out-1-aaaa", client: desktop, route: "/out"},
		{at: base + 86400, eventType: "page_view", eventName: "route.enter", device: "device-out-2-aaaa", client: desktop, route: "/out"},
		// Page leaves on /a: average duration 2000, average active 500.
		{at: base + 12*3600, eventType: "page_leave", eventName: "route.leave", device: d3, client: desktop, route: "/a", duration: 1000, active: 400},
		{at: base + 12*3600, eventType: "page_leave", eventName: "route.leave", device: d3, client: desktop, route: "/a", duration: 3000, active: 600},
		// Feature use: token.create x3 (two desktop, one mobile by actor A).
		{at: base + 3600, eventType: "feature_use", eventName: "token.create", device: d3, client: desktop, route: "/keys"},
		{at: base + 3600, eventType: "feature_use", eventName: "token.create", device: d3, client: desktop, route: "/keys"},
		{at: base + 3600, eventType: "feature_use", eventName: "token.create", actor: actorA, device: d2, client: mobile, route: "/keys"},
		{at: base + 3600, eventType: "feature_use", eventName: "token.copy", device: d3, client: desktop, route: "/keys"},
		{at: base + 3600, eventType: "feature_use", eventName: "playground.request_submit", device: d3, client: desktop, route: "/playground"},
		{at: base + 3600, eventType: "feature_use", eventName: "playground.request_submit", device: d3, client: desktop, route: "/playground"},
		// Errors.
		{at: base + 5, eventType: "api_error", eventName: "api.request_failed", device: d3, client: desktop, status: 500, apiRoute: "/api/channel/:id", duration: 100},
		{at: base + 5, eventType: "api_error", eventName: "api.request_failed", device: d3, client: desktop, status: 500, apiRoute: "/api/channel/:id", duration: 200},
		{at: base + 5, eventType: "api_error", eventName: "api.request_failed", device: d3, client: desktop, status: 500, apiRoute: "/api/channel/:id", duration: 300},
		{at: base + 5, eventType: "api_error", eventName: "api.request_failed", device: d3, client: desktop, status: 404, apiRoute: "/api/x", duration: 50},
		{at: base + 5, eventType: "client_error", eventName: "runtime.error", device: d3, client: desktop, errorName: "TypeError"},
		{at: base + 5, eventType: "client_error", eventName: "runtime.error", device: d3, client: desktop, errorName: "TypeError"},
		{at: base + 5, eventType: "client_error", eventName: "runtime.unhandled_rejection", device: d3, client: desktop, errorName: "Unknown"},
		// A lone fast vital: bin 50.
		{at: base + 20, eventType: "perf_vital", eventName: "vital.fcp", device: d3, client: desktop, duration: 75},
	}
	// vital.lcp = 100, 200, ... 1000: nearest-rank P50 = 500, P95 = 1000.
	for i := 1; i <= 10; i++ {
		events = append(events, analyticsFixtureEvent{at: base + 20, eventType: "perf_vital", eventName: "vital.lcp", device: d3, client: desktop, duration: int32(i * 100)})
	}
	insertAnalyticsFixture(t, events)
	end := base + 86400

	t.Run("overview", func(t *testing.T) {
		got := analyticsGet[model.BehaviorOverview](t, env, analyticsQueryPath("overview", base, end, ""))
		assert.Equal(t, int64(4), got.Pv)
		assert.Equal(t, int64(4), got.DeviceUv, "start boundary is inclusive, end boundary exclusive")
		assert.Equal(t, int64(2), got.ActorUv, "anonymous events are not actors")
		assert.Equal(t, int64(1), got.MultiDeviceActorUv)
		assert.InDelta(t, 0.5, got.MultiDeviceRatio, 1e-9)
		assert.InDelta(t, 2000, got.AvgDurationMs, 1e-6)
		assert.InDelta(t, 500, got.AvgActiveMs, 1e-6)
		assert.Equal(t, int64(4), got.ApiErrorCount)
		assert.InDelta(t, 1.0, got.ApiErrorsPerPv, 1e-9)

		mobileOnly := analyticsGet[model.BehaviorOverview](t, env, analyticsQueryPath("overview", base, end, "&client_type=web_mobile"))
		assert.Equal(t, int64(1), mobileOnly.Pv)
		assert.Equal(t, int64(1), mobileOnly.ActorUv)
		assert.Equal(t, int64(0), mobileOnly.MultiDeviceActorUv, "one device inside the filter")
		empty := analyticsGet[model.BehaviorOverview](t, env, analyticsQueryPath("overview", end+86400, end+2*86400, ""))
		assert.Equal(t, model.BehaviorOverview{}, empty)
	})

	t.Run("trends and local hour", func(t *testing.T) {
		type trends struct {
			Granularity string                     `json:"granularity"`
			Series      []model.BehaviorTrendPoint `json:"series"`
			Hourly      []model.BehaviorHourCount  `json:"hourly_distribution"`
		}
		day := analyticsGet[trends](t, env, analyticsQueryPath("trends", base, end, ""))
		assert.Equal(t, "day", day.Granularity)
		assert.Equal(t, []model.BehaviorTrendPoint{{Ts: base, Pv: 4, DeviceUv: 4}}, day.Series)

		hour := analyticsGet[trends](t, env, analyticsQueryPath("trends", base, end, "&granularity=hour"))
		require.Len(t, hour.Series, 24, "zero-filled")
		assert.Equal(t, model.BehaviorTrendPoint{Ts: base, Pv: 1, DeviceUv: 2}, hour.Series[0])
		assert.Equal(t, int64(2), hour.Series[10].Pv)
		assert.Equal(t, int64(1), hour.Series[11].Pv)
		assert.Equal(t, int64(0), hour.Series[5].Pv)

		// The same UTC hour (10:00) is local hour 18 for tz_offset -480 and 10
		// for tz_offset 0; 11:00 UTC is 19, and the 00:00 view is local hour 8.
		require.Len(t, day.Hourly, 24)
		want := map[int]int64{8: 1, 10: 1, 18: 1, 19: 1}
		for _, item := range day.Hourly {
			assert.Equal(t, want[item.Hour], item.Pv, "local hour %d", item.Hour)
		}
	})

	t.Run("devices and cross-device", func(t *testing.T) {
		type devices struct {
			ClientTypes []model.BehaviorDimensionItem `json:"client_types"`
			OsFamilies  []model.BehaviorDimensionItem `json:"os_families"`
			CrossDevice model.BehaviorCrossDevice     `json:"cross_device"`
		}
		got := analyticsGet[devices](t, env, analyticsQueryPath("devices", base, end, ""))
		assert.Equal(t, []model.BehaviorDimensionItem{
			{Key: desktop, Devices: 3, Pv: 3},
			{Key: mobile, Devices: 1, Pv: 1},
		}, got.ClientTypes)
		assert.Equal(t, []model.BehaviorDimensionItem{{Key: "unknown", Devices: 4, Pv: 4}}, got.OsFamilies)
		assert.Equal(t, model.BehaviorCrossDevice{
			ActorsTotal: 2, ActorsMultiDevice: 1, ActorsMultiClient: 1,
			Combos: []model.BehaviorDeviceCombo{{Combo: desktop, Actors: 1}, {Combo: desktop + "+" + mobile, Actors: 1}},
		}, got.CrossDevice)
	})

	t.Run("pages", func(t *testing.T) {
		type pages struct {
			Items []model.BehaviorPageItem `json:"items"`
		}
		got := analyticsGet[pages](t, env, analyticsQueryPath("pages", base, end, ""))
		assert.Equal(t, []model.BehaviorPageItem{
			{RoutePath: "/a", Pv: 3, Uv: 3, AvgDurationMs: 2000, AvgActiveMs: 500},
			{RoutePath: "/b", Pv: 1, Uv: 1},
		}, got.Items)
		limited := analyticsGet[pages](t, env, analyticsQueryPath("pages", base, end, "&limit=1"))
		assert.Len(t, limited.Items, 1)
	})

	t.Run("features", func(t *testing.T) {
		got := analyticsGet[model.BehaviorFeatures](t, env, analyticsQueryPath("features", base, end, "&limit=2"))
		assert.Equal(t, []model.BehaviorFeatureItem{
			{EventName: "token.create", Count: 3, Devices: 2},
			{EventName: "playground.request_submit", Count: 2, Devices: 1},
		}, got.Items)
		assert.Equal(t, []model.BehaviorFeatureModule{{Module: "token", Count: 4}, {Module: "playground", Count: 2}}, got.Modules)
		assert.Equal(t, []model.BehaviorFeatureByClient{
			{EventName: "playground.request_submit", ClientType: desktop, Count: 2},
			{EventName: "token.create", ClientType: desktop, Count: 2},
			{EventName: "token.create", ClientType: mobile, Count: 1},
		}, got.ByClientType)
	})

	t.Run("health percentiles and errors", func(t *testing.T) {
		type health struct {
			Vitals           []model.BehaviorVitalSummary    `json:"vitals"`
			VitalTrend       []model.BehaviorVitalTrendPoint `json:"vital_trend"`
			ApiErrors        []model.BehaviorApiErrorItem    `json:"api_errors"`
			ApiErrorTotal    int64                           `json:"api_error_total"`
			ClientErrors     []model.BehaviorClientErrorItem `json:"client_errors"`
			ClientErrorTotal int64                           `json:"client_error_total"`
		}
		got := analyticsGet[health](t, env, analyticsQueryPath("health", base, end, ""))
		require.Len(t, got.Vitals, 4)
		assert.Equal(t, model.BehaviorVitalSummary{Name: "vital.fcp", Count: 1, AvgMs: 75, P50Ms: 50, P95Ms: 50}, got.Vitals[0])
		assert.Equal(t, model.BehaviorVitalSummary{Name: "vital.lcp", Count: 10, AvgMs: 550, P50Ms: 500, P95Ms: 1000}, got.Vitals[1])
		assert.Equal(t, model.BehaviorVitalSummary{Name: "vital.ttfb"}, got.Vitals[2])
		assert.Equal(t, model.BehaviorVitalSummary{Name: "vital.route_change"}, got.Vitals[3])
		assert.Equal(t, []model.BehaviorVitalTrendPoint{
			{Ts: base, Name: "vital.fcp", Count: 1, P50Ms: 50, P95Ms: 50},
			{Ts: base, Name: "vital.lcp", Count: 10, P50Ms: 500, P95Ms: 1000},
		}, got.VitalTrend)
		assert.Equal(t, []model.BehaviorApiErrorItem{
			{ApiRoute: "/api/channel/:id", StatusCode: 500, Count: 3, AvgDurationMs: 200},
			{ApiRoute: "/api/x", StatusCode: 404, Count: 1, AvgDurationMs: 50},
		}, got.ApiErrors)
		assert.Equal(t, int64(4), got.ApiErrorTotal)
		assert.Equal(t, []model.BehaviorClientErrorItem{{ErrorName: "TypeError", Count: 2}, {ErrorName: "Unknown", Count: 1}}, got.ClientErrors)
		assert.Equal(t, int64(3), got.ClientErrorTotal)

		longSpan := analyticsGet[health](t, env, analyticsQueryPath("health", base-40*86400, end, ""))
		assert.Equal(t, []model.BehaviorVitalTrendPoint{}, longSpan.VitalTrend, "no vital trend beyond 31 days")
		assert.Len(t, longSpan.Vitals, 4)
	})
}

func TestAnalyticsRotateAndPurge(t *testing.T) {
	env := newAnalyticsQueryEnv(t)
	setting := operation_setting.GetAnalyticsSetting()
	oldSecret := strings.Repeat("ab", 32)
	setting.Enabled, setting.HashSecret = true, oldSecret

	type rotateResult struct {
		RotatedAt int64 `json:"rotated_at"`
	}
	recorder := env.do(http.MethodPost, "/api/analytics/salt/rotate", env.rootJWT)
	require.Equal(t, http.StatusOK, recorder.Code)
	var rotated analyticsQueryResponse[rotateResult]
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &rotated))
	require.True(t, rotated.Success, rotated.Message)
	assert.Equal(t, "Analytics hash secret rotated", rotated.Message)
	assert.InDelta(t, common.GetTimestamp(), rotated.Data.RotatedAt, 5)

	newSecret := setting.HashSecret
	require.Len(t, newSecret, 64)
	assert.NotEqual(t, oldSecret, newSecret)
	assert.NotEqual(t, service.AnalyticsActorHash(7, oldSecret), service.AnalyticsActorHash(7, newSecret), "new events get a different actor_hash")
	assert.Equal(t, rotated.Data.RotatedAt, setting.SecretRotatedAt)
	assert.NotContains(t, recorder.Body.String(), oldSecret)
	assert.NotContains(t, recorder.Body.String(), newSecret)

	var audits []model.AuditLog
	require.NoError(t, model.LOG_DB.Find(&audits).Error)
	require.NotEmpty(t, audits)
	for _, audit := range audits {
		dump, err := common.Marshal(audit)
		require.NoError(t, err)
		assert.NotContains(t, string(dump), newSecret, "audit log must not contain the secret")
		assert.NotContains(t, string(dump), oldSecret)
	}

	// A non-primary node cannot rotate.
	common.IsMasterNode = false
	denied := env.do(http.MethodPost, "/api/analytics/salt/rotate", env.rootJWT)
	assert.Contains(t, denied.Body.String(), "Only the primary node can rotate the analytics hash secret")
	assert.Equal(t, newSecret, setting.HashSecret)
	common.IsMasterNode = true

	// Purge deletes only rows older than retention_days.
	now := common.GetTimestamp()
	insertAnalyticsFixture(t, []analyticsFixtureEvent{
		{at: now - 100*86400, eventType: "page_view", eventName: "route.enter", device: "device-old-aaaaaaa", client: "web_desktop", route: "/old"},
		{at: now - 100*86400, eventType: "page_view", eventName: "route.enter", device: "device-old-aaaaaaa", client: "web_desktop", route: "/old"},
		{at: now - 10*86400, eventType: "page_view", eventName: "route.enter", device: "device-new-aaaaaaa", client: "web_desktop", route: "/new"},
	})
	type purgeResult struct {
		Deleted      int64 `json:"deleted"`
		HandledByTTL bool  `json:"handled_by_ttl"`
	}
	purge := env.do(http.MethodDelete, "/api/analytics/expired", env.rootJWT)
	var purged analyticsQueryResponse[purgeResult]
	require.NoError(t, common.Unmarshal(purge.Body.Bytes(), &purged))
	require.True(t, purged.Success, purged.Message)
	assert.Equal(t, "Expired analytics data deleted", purged.Message)
	assert.Equal(t, purgeResult{Deleted: 2}, purged.Data)
	var remaining int64
	require.NoError(t, model.LOG_DB.Model(&model.BehaviorEvent{}).Count(&remaining).Error)
	assert.Equal(t, int64(1), remaining)
}
