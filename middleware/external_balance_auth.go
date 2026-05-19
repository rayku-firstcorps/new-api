package middleware

import (
	"crypto/subtle"
	"net"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
)

func ExternalBalanceAuth() func(c *gin.Context) {
	return func(c *gin.Context) {
		if !setting.ExternalBalanceApiEnabled {
			abortExternalBalance(c, http.StatusForbidden, "external_api_disabled")
			return
		}

		if !externalBalanceIPAllowed(c.ClientIP(), setting.ExternalBalanceApiAllowedIPs) {
			abortExternalBalance(c, http.StatusForbidden, "ip_not_allowed")
			return
		}

		key := externalBalanceRequestKey(c)
		version := externalBalanceMatchKey(key)
		if version == "" {
			abortExternalBalance(c, http.StatusUnauthorized, "invalid_api_key")
			return
		}

		c.Set("external_balance_authenticated", true)
		c.Set("external_balance_key_version", version)
		c.Next()
	}
}

func externalBalanceRequestKey(c *gin.Context) string {
	key := strings.TrimSpace(c.GetHeader("Authorization"))
	if strings.HasPrefix(strings.ToLower(key), "bearer ") {
		key = strings.TrimSpace(key[7:])
	}
	if key == "" {
		key = strings.TrimSpace(c.GetHeader("X-External-Api-Key"))
	}
	return key
}

func externalBalanceMatchKey(input string) string {
	if input == "" {
		return ""
	}
	if constantTimeStringEqual(input, setting.ExternalBalanceApiKey) {
		return "current"
	}
	if constantTimeStringEqual(input, setting.ExternalBalanceApiKeyNext) {
		return "next"
	}
	return ""
}

func constantTimeStringEqual(input string, configured string) bool {
	if configured == "" || len(input) != len(configured) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(input), []byte(configured)) == 1
}

func externalBalanceIPAllowed(clientIP string, allowed string) bool {
	allowed = strings.TrimSpace(allowed)
	if allowed == "" {
		return true
	}
	ip := net.ParseIP(clientIP)
	if ip == nil {
		return false
	}
	for _, item := range strings.Split(allowed, ",") {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if strings.Contains(item, "/") {
			_, network, err := net.ParseCIDR(item)
			if err == nil && network.Contains(ip) {
				return true
			}
			continue
		}
		if allowedIP := net.ParseIP(item); allowedIP != nil && allowedIP.Equal(ip) {
			return true
		}
	}
	return false
}

func abortExternalBalance(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{
		"success": false,
		"message": message,
	})
	c.Abort()
}
