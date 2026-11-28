package dto

// AnalyticsIngestRequest is the body of POST /api/analytics/events.
// Numeric fields are float64 so the server can check that they are integers.
type AnalyticsIngestRequest struct {
	DeviceId       string                 `json:"device_id"`
	SessionId      string                 `json:"session_id"`
	ClientType     string                 `json:"client_type"`
	OsFamily       string                 `json:"os_family"`
	BrowserFamily  string                 `json:"browser_family"`
	ViewportBucket string                 `json:"viewport_bucket"`
	Lang           string                 `json:"lang"`
	Theme          string                 `json:"theme"`
	TzOffset       float64                `json:"tz_offset"`
	Events         []AnalyticsIngestEvent `json:"events"`
}

type AnalyticsIngestEvent struct {
	EventId      string         `json:"event_id"`
	EventType    string         `json:"event_type"`
	EventName    string         `json:"event_name"`
	RoutePath    string         `json:"route_path"`
	FromRoute    string         `json:"from_route"`
	ReferrerHost string         `json:"referrer_host"`
	DurationMs   float64        `json:"duration_ms"`
	StatusCode   float64        `json:"status_code"`
	Props        map[string]any `json:"props"`
}
