package middleware

import (
	"bytes"
	"io"
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
)

// analyticsMaxBodyBytes is the hard body limit of the ingest route. It does
// not use the global anonymous limit, which is an operator setting.
const analyticsMaxBodyBytes = 32768

// AnalyticsEnabledGate answers 202 without touching Redis or the database when
// analytics is inactive or the visitor sent Do Not Track / Global Privacy Control.
func AnalyticsEnabledGate() gin.HandlerFunc {
	return func(c *gin.Context) {
		setting := operation_setting.GetAnalyticsSetting()
		optedOut := setting.RespectDNT && (c.GetHeader("DNT") == "1" || c.GetHeader("Sec-GPC") == "1")
		if !setting.IsActive() || optedOut {
			c.AbortWithStatusJSON(http.StatusAccepted, gin.H{
				"success": true,
				"message": "",
				"data":    gin.H{"accepted": 0},
			})
			return
		}
		c.Next()
	}
}

// AnalyticsRateLimit allows 120 requests per minute per client IP. The SDK
// flushes at most about 12 times a minute per tab, which leaves headroom for
// several tabs behind one NAT.
func AnalyticsRateLimit() gin.HandlerFunc {
	return rateLimitFactory(analyticsRateLimitNum, analyticsRateLimitDuration, "AN")
}

// AnalyticsRequestBodyLimit buffers the body up to 32 KiB; larger bodies get 413.
func AnalyticsRequestBodyLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body == nil {
			c.Next()
			return
		}
		originalBody := c.Request.Body
		body, err := readAnonymousRequestBody(originalBody, analyticsMaxBodyBytes)
		_ = originalBody.Close()
		if err != nil {
			if common.IsRequestBodyTooLargeError(err) {
				c.AbortWithStatus(http.StatusRequestEntityTooLarge)
				return
			}
			c.AbortWithStatus(http.StatusBadRequest)
			return
		}
		c.Request.Body = io.NopCloser(bytes.NewReader(body))
		c.Request.ContentLength = int64(len(body))
		c.Next()
	}
}
