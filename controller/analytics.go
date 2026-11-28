package controller

import (
	"slices"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// Admin query APIs for behavior analytics. All six GETs share the same window
// parameters; rotate and expired are Root only (see router/analytics_admin_router.go).

var analyticsQueryClientTypes = []string{"web_desktop", "web_mobile", "web_tablet", "electron_desktop"}

// parseAnalyticsFilter validates start_ts, end_ts and client_type. It writes
// the error response and returns false when a parameter is invalid.
func parseAnalyticsFilter(c *gin.Context) (model.BehaviorEventFilter, bool) {
	var filter model.BehaviorEventFilter
	startTs, startErr := strconv.ParseInt(c.Query("start_ts"), 10, 64)
	endTs, endErr := strconv.ParseInt(c.Query("end_ts"), 10, 64)
	if startErr != nil || endErr != nil || startTs < 0 || endTs <= startTs {
		common.ApiErrorT(c, "Invalid time range")
		return filter, false
	}
	retentionDays := operation_setting.GetAnalyticsSetting().RetentionDays
	if retentionDays <= 0 {
		retentionDays = 90
	}
	if endTs-startTs > int64(retentionDays)*86400 {
		common.ApiErrorT(c, "The time range cannot be longer than the data retention period")
		return filter, false
	}
	clientType := c.Query("client_type")
	if clientType != "" && !slices.Contains(analyticsQueryClientTypes, clientType) {
		common.ApiErrorT(c, "Invalid client type")
		return filter, false
	}
	return model.BehaviorEventFilter{StartTs: startTs, EndTs: endTs, ClientType: clientType}, true
}

// parseAnalyticsLimit reads the optional limit query param, clamped to
// [1, maxLimit]; absent or malformed values give defaultLimit.
func parseAnalyticsLimit(c *gin.Context, defaultLimit, maxLimit int) int {
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit < 1 {
		return defaultLimit
	}
	return min(limit, maxLimit)
}

// GetAnalyticsOverview: GET /api/analytics/overview
func GetAnalyticsOverview(c *gin.Context) {
	filter, ok := parseAnalyticsFilter(c)
	if !ok {
		return
	}
	overview, err := model.GetBehaviorOverview(filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, overview)
}

// GetAnalyticsTrends: GET /api/analytics/trends?granularity=hour|day
func GetAnalyticsTrends(c *gin.Context) {
	filter, ok := parseAnalyticsFilter(c)
	if !ok {
		return
	}
	granularity := c.DefaultQuery("granularity", "day")
	bucketSeconds := int64(86400)
	switch granularity {
	case "day":
	case "hour":
		if filter.EndTs-filter.StartTs > 14*86400 {
			common.ApiErrorT(c, "Hourly trends are limited to 14 days")
			return
		}
		bucketSeconds = 3600
	default:
		common.ApiErrorT(c, "Invalid granularity")
		return
	}
	series, err := model.GetBehaviorTrend(filter, bucketSeconds)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	hours, err := model.GetBehaviorHourlyDistribution(filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"granularity":         granularity,
		"series":              series,
		"hourly_distribution": hours,
	})
}

// GetAnalyticsDevices: GET /api/analytics/devices
func GetAnalyticsDevices(c *gin.Context) {
	filter, ok := parseAnalyticsFilter(c)
	if !ok {
		return
	}
	data := gin.H{}
	dimensions := []struct{ field, column string }{
		{"client_types", "client_type"},
		{"os_families", "os_family"},
		{"browsers", "browser_family"},
		{"viewports", "viewport_bucket"},
		{"langs", "lang"},
		{"themes", "theme"},
	}
	for _, dimension := range dimensions {
		items, err := model.GetBehaviorDimension(filter, dimension.column)
		if err != nil {
			common.ApiError(c, err)
			return
		}
		data[dimension.field] = items
	}
	crossDevice, err := model.GetBehaviorCrossDevice(filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	data["cross_device"] = crossDevice
	common.ApiSuccess(c, data)
}

// GetAnalyticsPages: GET /api/analytics/pages?limit=20 (1..100)
func GetAnalyticsPages(c *gin.Context) {
	filter, ok := parseAnalyticsFilter(c)
	if !ok {
		return
	}
	items, err := model.GetBehaviorPages(filter, parseAnalyticsLimit(c, 20, 100))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{"items": items})
}

// GetAnalyticsFeatures: GET /api/analytics/features?limit=20 (1..50)
func GetAnalyticsFeatures(c *gin.Context) {
	filter, ok := parseAnalyticsFilter(c)
	if !ok {
		return
	}
	features, err := model.GetBehaviorFeatures(filter, parseAnalyticsLimit(c, 20, 50))
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, features)
}

// GetAnalyticsHealth: GET /api/analytics/health
func GetAnalyticsHealth(c *gin.Context) {
	filter, ok := parseAnalyticsFilter(c)
	if !ok {
		return
	}
	vitals, err := model.GetBehaviorVitals(filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	vitalTrend := []model.BehaviorVitalTrendPoint{}
	if filter.EndTs-filter.StartTs <= 31*86400 {
		if vitalTrend, err = model.GetBehaviorVitalTrend(filter); err != nil {
			common.ApiError(c, err)
			return
		}
	}
	apiErrors, apiErrorTotal, err := model.GetBehaviorApiErrors(filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	clientErrors, clientErrorTotal, err := model.GetBehaviorClientErrors(filter)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"vitals":             vitals,
		"vital_trend":        vitalTrend,
		"api_errors":         apiErrors,
		"api_error_total":    apiErrorTotal,
		"client_errors":      clientErrors,
		"client_error_total": clientErrorTotal,
	})
}

// RotateAnalyticsSecret: POST /api/analytics/salt/rotate (Root). Neither the
// response nor any log line carries the secret, only the rotation time.
func RotateAnalyticsSecret(c *gin.Context) {
	rotatedAt, err := service.RotateAnalyticsSecret()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccessT(c, "Analytics hash secret rotated", gin.H{"rotated_at": rotatedAt})
}

// PurgeExpiredAnalytics: DELETE /api/analytics/expired (Root).
func PurgeExpiredAnalytics(c *gin.Context) {
	deleted, handledByTTL, err := service.PurgeExpiredBehaviorEvents()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	data := gin.H{"deleted": deleted, "handled_by_ttl": handledByTTL}
	if handledByTTL {
		common.ApiSuccessT(c, "Expired analytics data is removed by the database TTL", data)
		return
	}
	common.ApiSuccessT(c, "Expired analytics data deleted", data)
}
