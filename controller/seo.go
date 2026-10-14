package controller

import (
	"html"
	"net/http"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

var publicSitemapPaths = []string{
	"/",
	"/docs",
	"/pricing",
	"/rankings",
	"/about",
	"/image-generation",
	"/privacy-policy",
	"/user-agreement",
}

func publicSiteURL() string {
	configuredURL := strings.TrimSpace(system_setting.ServerAddress)
	parsedURL, err := url.Parse(configuredURL)
	if err != nil || parsedURL.Host == "" || parsedURL.User != nil || (parsedURL.Scheme != "http" && parsedURL.Scheme != "https") {
		return "http://localhost:3000"
	}
	parsedURL.RawQuery = ""
	parsedURL.Fragment = ""
	parsedURL.Path = strings.TrimRight(parsedURL.Path, "/")
	return strings.TrimRight(parsedURL.String(), "/")
}

func RobotsTxt(c *gin.Context) {
	baseURL := publicSiteURL()
	body := "User-agent: *\n" +
		"Allow: /\n" +
		"Disallow: /api\n" +
		"Disallow: /v1\n" +
		"Disallow: /oauth\n" +
		"Disallow: /setup\n" +
		"Disallow: /sign-in\n" +
		"Disallow: /sign-up\n" +
		"Disallow: /register\n" +
		"Disallow: /forgot-password\n" +
		"Disallow: /reset\n" +
		"Disallow: /otp\n" +
		"Disallow: /channels\n" +
		"Disallow: /chat\n" +
		"Disallow: /dashboard\n" +
		"Disallow: /keys\n" +
		"Disallow: /models\n" +
		"Disallow: /playground\n" +
		"Disallow: /profile\n" +
		"Disallow: /promotions\n" +
		"Disallow: /redemption-codes\n" +
		"Disallow: /subscriptions\n" +
		"Disallow: /system-info\n" +
		"Disallow: /system-settings\n" +
		"Disallow: /usage-logs\n" +
		"Disallow: /users\n" +
		"Disallow: /wallet\n" +
		"Sitemap: " + baseURL + "/sitemap.xml\n"
	c.Data(http.StatusOK, "text/plain; charset=utf-8", []byte(body))
}

func SitemapXML(c *gin.Context) {
	baseURL := publicSiteURL()
	var body strings.Builder
	body.WriteString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
	body.WriteString("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n")
	for _, path := range publicSitemapPaths {
		body.WriteString("  <url><loc>")
		body.WriteString(html.EscapeString(baseURL))
		body.WriteString(path)
		body.WriteString("</loc></url>\n")
	}
	body.WriteString("</urlset>\n")
	c.Data(http.StatusOK, "application/xml; charset=utf-8", []byte(body.String()))
}
