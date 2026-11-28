package service

import (
	"net"
	"regexp"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
)

const (
	analyticsMaxRouteLength = 128
	analyticsMaxRouteSegs   = 8
	analyticsMaxPropsBytes  = 512
	// AnalyticsMaxEventsPerBatch is the hard cap of events in one request.
	AnalyticsMaxEventsPerBatch = 50
)

var (
	analyticsIdPattern        = regexp.MustCompile(`^[A-Za-z0-9_-]{16,32}$`)
	analyticsEventIdPattern   = regexp.MustCompile(`^[A-Za-z0-9_-]{8,36}$`)
	analyticsUUIDPattern      = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
	analyticsHexPattern       = regexp.MustCompile(`^[0-9a-fA-F]+$`)
	analyticsDigitsPattern    = regexp.MustCompile(`^[0-9]+$`)
	analyticsSafeSegPattern   = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
	analyticsHasDigitPattern  = regexp.MustCompile(`[0-9]`)
	analyticsHasLetterPattern = regexp.MustCompile(`[A-Za-z]`)
	analyticsReferrerPattern  = regexp.MustCompile(`^[a-z0-9.-]{1,128}$`)
	analyticsErrorNamePattern = regexp.MustCompile(`^[A-Za-z][A-Za-z0-9_]{0,31}$`)
)

// TemplateAnalyticsRoute strips query and hash and replaces id-like segments
// with :id. An empty result means the route must be dropped. The TypeScript
// twin is templateRoute in web/src/lib/analytics/sanitize.ts; keep both in sync.
func TemplateAnalyticsRoute(input string) string {
	path, _, _ := strings.Cut(input, "?")
	path, _, _ = strings.Cut(path, "#")
	if !strings.HasPrefix(path, "/") {
		return ""
	}
	segments := make([]string, 0, analyticsMaxRouteSegs)
	for segment := range strings.SplitSeq(path, "/") {
		if segment != "" {
			segments = append(segments, segment)
		}
	}
	if len(segments) > analyticsMaxRouteSegs {
		return ""
	}
	for i, segment := range segments {
		isId := analyticsDigitsPattern.MatchString(segment) ||
			analyticsUUIDPattern.MatchString(segment) ||
			(len(segment) >= 16 && analyticsHexPattern.MatchString(segment)) ||
			!analyticsSafeSegPattern.MatchString(segment) ||
			(len(segment) >= 20 && analyticsHasDigitPattern.MatchString(segment) && analyticsHasLetterPattern.MatchString(segment))
		if isId {
			segments[i] = ":id"
		}
	}
	result := "/" + strings.Join(segments, "/")
	if len(result) > analyticsMaxRouteLength {
		return ""
	}
	return result
}

// analyticsInteger reports the value as an int64 when it is an integral number.
func analyticsInteger(value any) (int64, bool) {
	number, ok := value.(float64)
	if !ok || number != float64(int64(number)) {
		return 0, false
	}
	return int64(number), true
}

func analyticsEnumOr(value string, set map[string]struct{}, fallback string) string {
	if _, ok := set[value]; ok {
		return value
	}
	return fallback
}

// SanitizeAnalyticsBatch turns a request into storable rows. It returns nil
// when the shared context is invalid. Rows never carry user_id; actorHash is
// the already computed pseudonym ("" for anonymous). requestHost is the Host
// header of the request, used to clear same-site referrers.
func SanitizeAnalyticsBatch(req *dto.AnalyticsIngestRequest, actorHash string, requestHost string, now int64) []*model.BehaviorEvent {
	if !analyticsIdPattern.MatchString(req.DeviceId) || !analyticsIdPattern.MatchString(req.SessionId) {
		return nil
	}
	if _, ok := analyticsClientTypes[req.ClientType]; !ok {
		return nil
	}
	tz, ok := analyticsInteger(req.TzOffset)
	if !ok || tz < -840 || tz > 840 {
		tz = 0
	}
	host := strings.ToLower(requestHost)
	if hostOnly, _, err := net.SplitHostPort(host); err == nil {
		host = hostOnly
	}

	osFamily := analyticsEnumOr(req.OsFamily, analyticsOsFamilies, "other")
	browser := analyticsEnumOr(req.BrowserFamily, analyticsBrowserFamilies, "other")
	viewport := analyticsEnumOr(req.ViewportBucket, analyticsViewports, "")
	lang := analyticsEnumOr(req.Lang, analyticsLangs, "")
	theme := analyticsEnumOr(req.Theme, analyticsThemes, "")

	rows := make([]*model.BehaviorEvent, 0, len(req.Events))
	for i := range req.Events {
		event := &req.Events[i]
		spec, known := analyticsWhitelist[event.EventType+"|"+event.EventName]
		if !known || !analyticsEventIdPattern.MatchString(event.EventId) {
			continue
		}
		row := &model.BehaviorEvent{
			EventId:        event.EventId,
			CreatedAt:      now,
			EventType:      event.EventType,
			EventName:      event.EventName,
			ActorHash:      actorHash,
			DeviceId:       req.DeviceId,
			SessionId:      req.SessionId,
			RoutePath:      TemplateAnalyticsRoute(event.RoutePath),
			ClientType:     req.ClientType,
			OsFamily:       osFamily,
			BrowserFamily:  browser,
			ViewportBucket: viewport,
			Lang:           lang,
			Theme:          theme,
			TzOffset:       int16(tz),
		}
		if spec.routeRequired && row.RoutePath == "" {
			continue
		}
		if spec.fromRoute {
			row.FromRoute = TemplateAnalyticsRoute(event.FromRoute)
		}
		if spec.referrerHost && analyticsReferrerPattern.MatchString(event.ReferrerHost) &&
			net.ParseIP(event.ReferrerHost) == nil && event.ReferrerHost != host {
			row.ReferrerHost = event.ReferrerHost
		}
		if spec.maxDurationMs > 0 {
			if duration, ok := analyticsInteger(event.DurationMs); ok && duration > 0 {
				row.DurationMs = int32(min(duration, spec.maxDurationMs))
			}
		}
		if spec.statusCode {
			if status, ok := analyticsInteger(event.StatusCode); ok && status >= 0 && status <= 599 {
				row.StatusCode = int16(status)
			}
		}
		if !applyAnalyticsProps(row, &spec, event.Props) {
			continue
		}
		rows = append(rows, row)
	}
	return rows
}

// applyAnalyticsProps filters props through the whitelist, promotes the scalar
// columns (active_ms, api_route, error_name) and stores the rest as sorted
// JSON. It returns false when the event must be dropped.
func applyAnalyticsProps(row *model.BehaviorEvent, spec *analyticsEventSpec, props map[string]any) bool {
	kept := make(map[string]any, len(props))
	for key, raw := range props {
		propSpec, allowed := spec.props[key]
		if !allowed {
			continue
		}
		switch propSpec.kind {
		case analyticsPropBool:
			if value, ok := raw.(bool); ok {
				kept[key] = value
			}
		case analyticsPropEnum:
			if value, ok := raw.(string); ok {
				if _, valid := propSpec.enum[value]; valid {
					kept[key] = value
				}
			}
		case analyticsPropInt:
			value, ok := analyticsInteger(raw)
			if !ok || value < propSpec.min || value > propSpec.max {
				continue
			}
			if key == "active_ms" {
				row.ActiveMs = int32(value)
				continue
			}
			kept[key] = value
		case analyticsPropRoute:
			value, _ := raw.(string)
			apiRoute := TemplateAnalyticsRoute(value)
			if apiRoute == "/api/analytics" || strings.HasPrefix(apiRoute, "/api/analytics/") {
				return false
			}
			if strings.HasPrefix(apiRoute, "/api/") {
				row.ApiRoute = apiRoute
			}
		}
	}
	if _, ok := spec.props["error_name"]; ok {
		name, _ := props["error_name"].(string)
		if !analyticsErrorNamePattern.MatchString(name) {
			name = "Unknown"
		}
		row.ErrorName = name
	}
	row.Props = marshalAnalyticsProps(kept)
	return true
}

// marshalAnalyticsProps writes sorted-key JSON; "" when empty or over 512 bytes.
func marshalAnalyticsProps(props map[string]any) string {
	if len(props) == 0 {
		return ""
	}
	keys := make([]string, 0, len(props))
	for key := range props {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	var builder strings.Builder
	builder.WriteByte('{')
	for i, key := range keys {
		keyJSON, err := common.Marshal(key)
		if err != nil {
			return ""
		}
		valueJSON, err := common.Marshal(props[key])
		if err != nil {
			return ""
		}
		if i > 0 {
			builder.WriteByte(',')
		}
		builder.Write(keyJSON)
		builder.WriteByte(':')
		builder.Write(valueJSON)
	}
	builder.WriteByte('}')
	if builder.Len() > analyticsMaxPropsBytes {
		return ""
	}
	return builder.String()
}
