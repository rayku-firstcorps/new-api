package controller

import (
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

func analyticsIngestResponse(c *gin.Context, status int, success bool, message string, accepted int) {
	c.JSON(status, gin.H{"success": success, "message": message, "data": gin.H{"accepted": accepted}})
}

// IngestAnalyticsEvents accepts a batch of anonymous behavior events. It never
// echoes event content and never needs a Content-Type header (sendBeacon).
func IngestAnalyticsEvents(c *gin.Context) {
	setting := operation_setting.GetAnalyticsSetting()
	if !setting.IsActive() {
		analyticsIngestResponse(c, http.StatusAccepted, true, "", 0)
		return
	}
	var req dto.AnalyticsIngestRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request body"})
		return
	}
	if len(req.Events) > service.AnalyticsMaxEventsPerBatch {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Too many events in one batch"})
		return
	}

	// TryUserAuth sets "id" only for a valid session; a PAT never reaches here
	// as identified because the route carries the session-only token rule.
	actorHash := ""
	if userID := c.GetInt("id"); userID > 0 {
		actorHash = service.AnalyticsActorHash(userID, setting.HashSecret)
	}
	rows := service.SanitizeAnalyticsBatch(&req, actorHash, c.Request.Host, time.Now().Unix())
	dropped := service.EnqueueBehaviorEvents(rows)
	analyticsIngestResponse(c, http.StatusAccepted, true, "", len(rows)-dropped)
}
