package controller

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSEOEndpointsUseConfiguredPublicAddress(t *testing.T) {
	gin.SetMode(gin.TestMode)
	originalAddress := system_setting.ServerAddress
	t.Cleanup(func() { system_setting.ServerAddress = originalAddress })
	system_setting.ServerAddress = "https://gateway.example.com/"

	engine := gin.New()
	engine.GET("/robots.txt", RobotsTxt)
	engine.GET("/sitemap.xml", SitemapXML)

	robotsRecorder := httptest.NewRecorder()
	robotsRequest := httptest.NewRequest(http.MethodGet, "/robots.txt", nil)
	engine.ServeHTTP(robotsRecorder, robotsRequest)
	require.Equal(t, http.StatusOK, robotsRecorder.Code)
	assert.Contains(t, robotsRecorder.Body.String(), "Sitemap: https://gateway.example.com/sitemap.xml")
	assert.Contains(t, robotsRecorder.Body.String(), "Disallow: /api")
	assert.Contains(t, robotsRecorder.Body.String(), "Disallow: /system-settings")

	sitemapRecorder := httptest.NewRecorder()
	sitemapRequest := httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil)
	engine.ServeHTTP(sitemapRecorder, sitemapRequest)
	require.Equal(t, http.StatusOK, sitemapRecorder.Code)
	assert.Contains(t, sitemapRecorder.Header().Get("Content-Type"), "application/xml")
	assert.Contains(t, sitemapRecorder.Body.String(), "<loc>https://gateway.example.com/</loc>")
	assert.Contains(t, sitemapRecorder.Body.String(), "<loc>https://gateway.example.com/docs</loc>")
	assert.False(t, strings.Contains(sitemapRecorder.Body.String(), "/dashboard"))
	assert.False(t, strings.Contains(sitemapRecorder.Body.String(), "/api/"))
}

func TestPublicSiteURLRejectsInvalidConfiguredAddress(t *testing.T) {
	originalAddress := system_setting.ServerAddress
	t.Cleanup(func() { system_setting.ServerAddress = originalAddress })
	system_setting.ServerAddress = "javascript:alert(1)"

	assert.Equal(t, "http://localhost:3000", publicSiteURL())

	system_setting.ServerAddress = "https://user:secret@example.com"
	assert.Equal(t, "http://localhost:3000", publicSiteURL())
}
