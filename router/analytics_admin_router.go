package router

import (
	"github.com/QuantumNous/new-api/controller"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/gin-gonic/gin"
)

// registerAnalyticsAdminRoutes mounts the behavior analytics query APIs. The
// six GETs need Admin; rotate and expired need Root. There is no Casbin
// resource (progress decision); the access token rules in
// middleware/access_token_routes.go keep personal access tokens out.
// The public ingest route POST /api/analytics/events is a single route
// registered elsewhere and is not affected by these groups.
func registerAnalyticsAdminRoutes(apiRouter *gin.RouterGroup) {
	adminRoute := apiRouter.Group("/analytics", middleware.DisableCache(), middleware.AdminAuth())
	adminRoute.GET("/overview", controller.GetAnalyticsOverview)
	adminRoute.GET("/trends", controller.GetAnalyticsTrends)
	adminRoute.GET("/devices", controller.GetAnalyticsDevices)
	adminRoute.GET("/pages", controller.GetAnalyticsPages)
	adminRoute.GET("/features", controller.GetAnalyticsFeatures)
	adminRoute.GET("/health", controller.GetAnalyticsHealth)

	rootRoute := apiRouter.Group("/analytics", middleware.DisableCache(), middleware.RootAuth())
	rootRoute.POST("/salt/rotate", controller.RotateAnalyticsSecret)
	rootRoute.DELETE("/expired", controller.PurgeExpiredAnalytics)
}
