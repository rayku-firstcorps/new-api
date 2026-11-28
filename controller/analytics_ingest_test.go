package controller

import (
	"context"
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

const (
	testDeviceId  = "dev_AAAAAAAAAAAAAAAA"
	testDeviceId2 = "dev_BBBBBBBBBBBBBBBB"
	testSessionId = "ses_AAAAAAAAAAAAAAAA"
)

// newAnalyticsIngestEngine mirrors router/analytics_ingest_router.go, with a
// fake identity middleware in place of TryUserAuth (header X-Test-User).
func newAnalyticsIngestEngine(t *testing.T) *gin.Engine {
	t.Helper()
	gin.SetMode(gin.TestMode)
	previousRedis := common.RedisEnabled
	common.RedisEnabled = false
	t.Cleanup(func() { common.RedisEnabled = previousRedis })
	engine := gin.New()
	fakeAuth := func(c *gin.Context) {
		if id, err := strconv.Atoi(c.GetHeader("X-Test-User")); err == nil {
			c.Set("id", id)
		}
		c.Next()
	}
	engine.POST("/api/analytics/events",
		middleware.AnalyticsEnabledGate(),
		middleware.AnalyticsRateLimit(),
		middleware.AnalyticsRequestBodyLimit(),
		fakeAuth,
		IngestAnalyticsEvents,
	)
	return engine
}

func postAnalytics(t *testing.T, engine *gin.Engine, body string, headers map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/analytics/events", strings.NewReader(body))
	req.RemoteAddr = "10.0.0.1:1234"
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	recorder := httptest.NewRecorder()
	engine.ServeHTTP(recorder, req)
	return recorder
}

// flushAnalyticsWriter drains the queue into the test database.
func flushAnalyticsWriter() {
	service.StartAnalyticsWriter()
	service.StopAnalyticsWriter(context.Background())
}

func activateAnalytics(secret string) {
	setting := operation_setting.GetAnalyticsSetting()
	setting.Enabled = true
	setting.HashSecret = secret
	setting.RespectDNT = true
}

func analyticsBatch(deviceId string, events string) string {
	return `{"device_id":"` + deviceId + `","session_id":"` + testSessionId +
		`","client_type":"web_desktop","os_family":"beos","browser_family":"chrome","viewport_bucket":"xx","lang":"zh","theme":"dark","tz_offset":-480,"events":[` + events + `]}`
}

func TestAnalyticsTemplateRoute(t *testing.T) {
	cases := map[string]string{
		"/channels/123?x=1":                         "/channels/:id",
		"/request-processing":                       "/request-processing",
		"/api/channel/12":                           "/api/channel/:id",
		"/a/550e8400-e29b-41d4-a716-446655440000#x": "/a/:id",
		"/files/deadbeefdeadbeef00":                 "/files/:id",
		"/u/john@example.com":                       "/u/:id",
		"/t/sk4ab29cd81ef7g6h5i4j3k":                "/t/:id",
		"/users/":                                   "/users",
		"/":                                         "/",
		"https://example.com/a":                     "",
		"/1/2/3/4/5/6/7/8/9":                        "",
		"/" + strings.Repeat("g", 129):              "",
	}
	for input, want := range cases {
		assert.Equal(t, want, service.TemplateAnalyticsRoute(input), input)
	}
}

func TestAnalyticsIngestSanitizesAndStores(t *testing.T) {
	db := setupAnalyticsTestDB(t)
	activateAnalytics(strings.Repeat("ab", 32))
	engine := newAnalyticsIngestEngine(t)

	events := strings.Join([]string{
		`{"event_id":"evt-000001","event_type":"page_view","event_name":"route.enter","route_path":"/channels/123?token=sk-secret#h","from_route":"/a/42","referrer_host":"example.org","duration_ms":99,"status_code":500,"props":{"is_auth":true,"email":"a@b.c"}}`,
		`{"event_id":"evt-000002","event_type":"page_leave","event_name":"route.leave","route_path":"/x","duration_ms":9999999,"props":{"active_ms":1200,"reason":"hide","extra":"drop"}}`,
		`{"event_id":"evt-000003","event_type":"api_error","event_name":"api.request_failed","route_path":"/x","duration_ms":12,"status_code":404,"props":{"api_route":"/api/channel/12?x=1","method":"GET","kind":"http_4xx"}}`,
		`{"event_id":"evt-000004","event_type":"api_error","event_name":"api.request_failed","route_path":"/x","props":{"api_route":"/api/analytics/events"}}`,
		`{"event_id":"evt-000005","event_type":"client_error","event_name":"runtime.error","route_path":"/x","props":{"error_name":"bad name with spaces","source":"window"}}`,
		`{"event_id":"evt-000006","event_type":"feature_use","event_name":"made.up","route_path":"/x"}`,
		`{"event_id":"bad","event_type":"feature_use","event_name":"subscription.view","route_path":"/x"}`,
		`{"event_id":"evt-000008","event_type":"page_view","event_name":"route.enter","route_path":"https://evil.example/x"}`,
		`{"event_id":"evt-000009","event_type":"feature_use","event_name":"token.create","route_path":"/keys","duration_ms":5,"props":{"has_expiry":"yes","has_quota_limit":false}}`,
		`{"event_id":"evt-000010","event_type":"feature_use","event_name":"onboarding.skip","route_path":"/","props":{"step":99}}`,
		`{"event_id":"evt-000011","event_type":"page_view","event_name":"route.enter","route_path":"/big","props":{"is_auth":true,"unknown":"` + strings.Repeat("z", 600) + `"}}`,
	}, ",")
	recorder := postAnalytics(t, engine, analyticsBatch(testDeviceId, events), nil)
	require.Equal(t, http.StatusAccepted, recorder.Code)
	assert.JSONEq(t, `{"success":true,"message":"","data":{"accepted":7}}`, recorder.Body.String())
	flushAnalyticsWriter()

	var rows []model.BehaviorEvent
	require.NoError(t, db.Order("event_id").Find(&rows).Error)
	require.Len(t, rows, 7)
	byId := map[string]model.BehaviorEvent{}
	for _, row := range rows {
		byId[row.EventId] = row
	}

	view := byId["evt-000001"]
	assert.Equal(t, "/channels/:id", view.RoutePath)
	assert.Equal(t, "/a/:id", view.FromRoute)
	assert.Equal(t, "example.org", view.ReferrerHost)
	assert.Equal(t, `{"is_auth":true}`, view.Props)
	assert.Zero(t, view.DurationMs)
	assert.Zero(t, view.StatusCode)
	assert.Equal(t, "other", view.OsFamily)
	assert.Equal(t, "", view.ViewportBucket)
	assert.Equal(t, int16(-480), view.TzOffset)
	assert.Equal(t, "", view.ActorHash)
	assert.NotZero(t, view.CreatedAt)

	leave := byId["evt-000002"]
	assert.Equal(t, int32(3600000), leave.DurationMs)
	assert.Equal(t, int32(1200), leave.ActiveMs)
	assert.Equal(t, `{"reason":"hide"}`, leave.Props)

	apiErr := byId["evt-000003"]
	assert.Equal(t, "/api/channel/:id", apiErr.ApiRoute)
	assert.Equal(t, int16(404), apiErr.StatusCode)
	assert.Equal(t, `{"kind":"http_4xx","method":"GET"}`, apiErr.Props)

	assert.Equal(t, "Unknown", byId["evt-000005"].ErrorName)
	assert.Equal(t, `{"source":"window"}`, byId["evt-000005"].Props)
	assert.Equal(t, `{"has_quota_limit":false}`, byId["evt-000009"].Props)
	assert.Zero(t, byId["evt-000009"].DurationMs)
	assert.Equal(t, "", byId["evt-000010"].Props)
	assert.Equal(t, `{"is_auth":true}`, byId["evt-000011"].Props)

	// A retry with the same event ids is accepted but stores nothing new
	// (ClickHouse keeps duplicates by design).
	recorder = postAnalytics(t, engine, analyticsBatch(testDeviceId, events), nil)
	require.Equal(t, http.StatusAccepted, recorder.Code)
	flushAnalyticsWriter()
	var count int64
	require.NoError(t, db.Model(&model.BehaviorEvent{}).Count(&count).Error)
	assert.Equal(t, int64(7), count)
}

func TestAnalyticsIngestActorHash(t *testing.T) {
	db := setupAnalyticsTestDB(t)
	secret := strings.Repeat("cd", 32)
	activateAnalytics(secret)
	engine := newAnalyticsIngestEngine(t)
	event := func(id string) string {
		return `{"event_id":"` + id + `","event_type":"feature_use","event_name":"subscription.view","route_path":"/x"}`
	}
	postAnalytics(t, engine, analyticsBatch(testDeviceId, event("evt-user-a1")), map[string]string{"X-Test-User": "4242"})
	postAnalytics(t, engine, strings.Replace(analyticsBatch(testDeviceId2, event("evt-user-a2")), "web_desktop", "web_mobile", 1), map[string]string{"X-Test-User": "4242"})
	postAnalytics(t, engine, analyticsBatch(testDeviceId, event("evt-anon-01")), nil)
	flushAnalyticsWriter()

	var rows []model.BehaviorEvent
	require.NoError(t, db.Find(&rows).Error)
	hashes := map[string]string{}
	for _, row := range rows {
		hashes[row.EventId] = row.ActorHash
	}
	want := service.AnalyticsActorHash(4242, secret)
	assert.Len(t, want, 32)
	assert.Equal(t, want, hashes["evt-user-a1"])
	assert.Equal(t, want, hashes["evt-user-a2"])
	assert.Equal(t, "", hashes["evt-anon-01"])
	assert.NotContains(t, want, "4242")
	assert.NotEqual(t, want, service.AnalyticsActorHash(4242, strings.Repeat("ef", 32)))
}

func TestAnalyticsIngestGateAndLimits(t *testing.T) {
	db := setupAnalyticsTestDB(t)
	engine := newAnalyticsIngestEngine(t)
	event := `{"event_id":"evt-000001","event_type":"feature_use","event_name":"subscription.view","route_path":"/x"}`
	accepted0 := `{"success":true,"message":"","data":{"accepted":0}}`

	// Disabled, or enabled without a secret: 202 and nothing stored.
	recorder := postAnalytics(t, engine, analyticsBatch(testDeviceId, event), nil)
	assert.Equal(t, http.StatusAccepted, recorder.Code)
	assert.JSONEq(t, accepted0, recorder.Body.String())
	operation_setting.GetAnalyticsSetting().Enabled = true
	recorder = postAnalytics(t, engine, analyticsBatch(testDeviceId, event), nil)
	assert.JSONEq(t, accepted0, recorder.Body.String())

	activateAnalytics(strings.Repeat("ab", 32))
	// DNT and GPC are honored while respect_dnt is on.
	recorder = postAnalytics(t, engine, analyticsBatch(testDeviceId, event), map[string]string{"DNT": "1"})
	assert.JSONEq(t, accepted0, recorder.Body.String())
	recorder = postAnalytics(t, engine, analyticsBatch(testDeviceId, event), map[string]string{"Sec-GPC": "1"})
	assert.JSONEq(t, accepted0, recorder.Body.String())

	// Invalid context drops the whole batch with 202.
	recorder = postAnalytics(t, engine, analyticsBatch("short", event), nil)
	assert.Equal(t, http.StatusAccepted, recorder.Code)
	assert.JSONEq(t, accepted0, recorder.Body.String())
	recorder = postAnalytics(t, engine, strings.Replace(analyticsBatch(testDeviceId, event), "web_desktop", "smart_tv", 1), nil)
	assert.JSONEq(t, accepted0, recorder.Body.String())

	// Empty array is accepted; malformed JSON and a non-array events are 400.
	recorder = postAnalytics(t, engine, analyticsBatch(testDeviceId, ""), nil)
	assert.Equal(t, http.StatusAccepted, recorder.Code)
	assert.Equal(t, http.StatusBadRequest, postAnalytics(t, engine, `{not json`, nil).Code)
	assert.Equal(t, http.StatusBadRequest, postAnalytics(t, engine, `{"device_id":"x","events":{"a":1}}`, nil).Code)

	// 51 events: 400. 50 events: accepted.
	many := func(n int) string {
		items := make([]string, n)
		for i := range items {
			items[i] = `{"event_id":"evt-` + strconv.Itoa(100000+i) + `","event_type":"feature_use","event_name":"subscription.view","route_path":"/x"}`
		}
		return analyticsBatch(testDeviceId, strings.Join(items, ","))
	}
	recorder = postAnalytics(t, engine, many(51), nil)
	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.Contains(t, recorder.Body.String(), "Too many events in one batch")
	recorder = postAnalytics(t, engine, many(50), nil)
	assert.JSONEq(t, `{"success":true,"message":"","data":{"accepted":50}}`, recorder.Body.String())

	// Body over 32 KiB: 413.
	recorder = postAnalytics(t, engine, analyticsBatch(testDeviceId, event)+strings.Repeat(" ", 33000), nil)
	assert.Equal(t, http.StatusRequestEntityTooLarge, recorder.Code)

	flushAnalyticsWriter()
	var count int64
	require.NoError(t, db.Model(&model.BehaviorEvent{}).Count(&count).Error)
	assert.Equal(t, int64(50), count)
}

func TestAnalyticsIngestBackpressure(t *testing.T) {
	db := setupAnalyticsTestDB(t)
	activateAnalytics(strings.Repeat("ab", 32))
	engine := newAnalyticsIngestEngine(t)

	// No writer is running, so the 4096-slot queue fills up.
	filler := make([]*model.BehaviorEvent, 4096)
	for i := range filler {
		filler[i] = &model.BehaviorEvent{EventId: "fill-" + strconv.Itoa(i), EventType: "feature_use", EventName: "subscription.view"}
	}
	require.Zero(t, service.EnqueueBehaviorEvents(filler))

	recorder := postAnalytics(t, engine, analyticsBatch(testDeviceId,
		`{"event_id":"evt-000001","event_type":"feature_use","event_name":"subscription.view","route_path":"/x"}`), nil)
	assert.Equal(t, http.StatusAccepted, recorder.Code)
	assert.JSONEq(t, `{"success":true,"message":"","data":{"accepted":0}}`, recorder.Body.String())

	flushAnalyticsWriter()
	var count int64
	require.NoError(t, db.Model(&model.BehaviorEvent{}).Where("event_id = ?", "evt-000001").Count(&count).Error)
	assert.Zero(t, count)
	require.NoError(t, db.Model(&model.BehaviorEvent{}).Count(&count).Error)
	assert.Equal(t, int64(4096), count)
}
