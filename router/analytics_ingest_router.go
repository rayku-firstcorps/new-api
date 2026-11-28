package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

// registerAnalyticsIngestRoutes mounts POST /api/analytics/events. It is a
// single route, not a group, so it never inherits the admin-only middleware of
// the /api/analytics query routes.
func registerAnalyticsIngestRoutes(apiRouter *gin.RouterGroup) {
	apiRouter.POST("/analytics/events",
		middleware.AnalyticsEnabledGate(),
		middleware.AnalyticsRateLimit(),
		middleware.AnalyticsRequestBodyLimit(),
		middleware.TryUserAuth(),
		controller.IngestAnalyticsEvents,
	)
}
