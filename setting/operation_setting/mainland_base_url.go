package operation_setting

import (
	"errors"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

var mainlandHostnamePattern = regexp.MustCompile(`^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$`)

// NormalizeMainlandBaseURL accepts a domain or HTTPS base URL for homepage display.
// An empty value disables the additional endpoint.
func NormalizeMainlandBaseURL(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", nil
	}
	invalid := errors.New("Enter a domain or HTTPS URL without credentials, query parameters, or fragments")
	if strings.ContainsAny(value, "\\\t\r\n ?#@") {
		return "", invalid
	}
	if !strings.Contains(value, "://") {
		value = "https://" + value
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.Scheme != "https" || parsed.User != nil || !mainlandHostnamePattern.MatchString(parsed.Hostname()) || len(parsed.Hostname()) > 253 {
		return "", invalid
	}
	if strings.HasSuffix(parsed.Host, ":") {
		return "", invalid
	}
	if port := parsed.Port(); port != "" {
		number, err := strconv.Atoi(port)
		if err != nil || number < 1 || number > 65535 {
			return "", invalid
		}
	}
	parsed.Host = strings.ToLower(parsed.Host)
	return strings.TrimRight(parsed.String(), "/"), nil
}
