package service

// Single source of truth for accepted analytics events.
// The TypeScript mirror is web/src/lib/analytics/whitelist.ts; both files must
// contain exactly the same table and enums, and change together.

type analyticsPropKind int

const (
	analyticsPropBool analyticsPropKind = iota + 1
	analyticsPropEnum
	analyticsPropInt
	analyticsPropRoute
	analyticsPropErrorName
)

type analyticsPropSpec struct {
	kind     analyticsPropKind
	enum     map[string]struct{}
	min, max int64
}

type analyticsEventSpec struct {
	// routeRequired drops the event when route_path fails templating.
	routeRequired bool
	fromRoute     bool
	referrerHost  bool
	// maxDurationMs keeps duration_ms clamped to [0, max]; 0 stores 0.
	maxDurationMs int64
	statusCode    bool
	props         map[string]analyticsPropSpec
}

func analyticsEnum(values ...string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		set[value] = struct{}{}
	}
	return set
}

var (
	analyticsClientTypes     = analyticsEnum("web_desktop", "web_mobile", "web_tablet", "electron_desktop")
	analyticsOsFamilies      = analyticsEnum("windows", "macos", "ios", "android", "linux", "other")
	analyticsBrowserFamilies = analyticsEnum("chrome", "safari", "edge", "firefox", "electron", "other")
	analyticsViewports       = analyticsEnum("xs", "sm", "md", "lg", "xl", "2xl")
	analyticsThemes          = analyticsEnum("light", "dark", "system")
	analyticsLangs           = analyticsEnum("zh", "en", "zh-TW", "fr", "ru", "ja", "vi")
)

var (
	analyticsBoolProp = analyticsPropSpec{kind: analyticsPropBool}
	analyticsResults  = analyticsPropSpec{kind: analyticsPropEnum, enum: analyticsEnum("ok", "fail")}
)

func enumProp(values ...string) analyticsPropSpec {
	return analyticsPropSpec{kind: analyticsPropEnum, enum: analyticsEnum(values...)}
}

func intProp(min, max int64) analyticsPropSpec {
	return analyticsPropSpec{kind: analyticsPropInt, min: min, max: max}
}

func featureSpec(props map[string]analyticsPropSpec) analyticsEventSpec {
	return analyticsEventSpec{props: props}
}

var tokenFlagProps = map[string]analyticsPropSpec{"has_expiry": analyticsBoolProp, "has_quota_limit": analyticsBoolProp}

var analyticsVitalSpec = analyticsEventSpec{
	maxDurationMs: 600000,
	props:         map[string]analyticsPropSpec{"nav_type": enumProp("navigate", "reload", "back_forward")},
}

var analyticsRuntimeErrorSpec = analyticsEventSpec{
	props: map[string]analyticsPropSpec{
		"error_name": {kind: analyticsPropErrorName},
		"source":     enumProp("window", "promise", "react_boundary"),
	},
}

// analyticsWhitelist is keyed by event_type + "|" + event_name.
var analyticsWhitelist = map[string]analyticsEventSpec{
	"page_view|route.enter": {
		routeRequired: true, fromRoute: true, referrerHost: true,
		props: map[string]analyticsPropSpec{"is_auth": analyticsBoolProp},
	},
	"page_leave|route.leave": {
		routeRequired: true, maxDurationMs: 3600000,
		props: map[string]analyticsPropSpec{
			"active_ms": intProp(0, 3600000),
			"reason":    enumProp("navigate", "hide", "unload"),
		},
	},
	"feature_use|playground.request_submit": featureSpec(map[string]analyticsPropSpec{
		"stream": analyticsBoolProp, "has_image": analyticsBoolProp,
		"provider_family": enumProp("openai", "claude", "gemini", "deepseek", "qwen", "grok", "mistral", "llama", "glm", "moonshot", "doubao", "other"),
	}),
	"feature_use|pricing.filter_change": featureSpec(map[string]analyticsPropSpec{
		"filter_type": enumProp("vendor", "group", "endpoint_type", "billing_type", "tag", "sort", "view_mode", "other"),
	}),
	"feature_use|models.view_detail": featureSpec(map[string]analyticsPropSpec{
		"tab": enumProp("details", "api", "apps", "charts", "performance", "other"),
	}),
	"feature_use|token.create": featureSpec(tokenFlagProps),
	"feature_use|token.copy":   featureSpec(tokenFlagProps),
	"feature_use|token.toggle": featureSpec(tokenFlagProps),
	"feature_use|usage_log.filter": featureSpec(map[string]analyticsPropSpec{
		"range_bucket": enumProp("24h", "7d", "30d", "custom"),
	}),
	"feature_use|usage_log.export": featureSpec(map[string]analyticsPropSpec{
		"range_bucket": enumProp("24h", "7d", "30d", "custom"),
		"format":       enumProp("csv", "xlsx", "json", "other"),
	}),
	"feature_use|wallet.topup_open": featureSpec(map[string]analyticsPropSpec{
		"pay_method": enumProp("stripe", "creem", "epay", "alipay", "wxpay", "waffo", "airwallex", "payssion", "antom", "balance", "other"),
	}),
	"feature_use|wallet.redeem_submit": featureSpec(map[string]analyticsPropSpec{"result": analyticsResults}),
	"feature_use|subscription.view":    featureSpec(nil),
	"feature_use|preference.theme_change": featureSpec(map[string]analyticsPropSpec{
		"value": enumProp("light", "dark", "system"),
	}),
	"feature_use|preference.lang_change": featureSpec(map[string]analyticsPropSpec{
		"value": enumProp("zh", "en", "zh-TW", "fr", "ru", "ja", "vi"),
	}),
	"feature_use|preference.sidebar_toggle": featureSpec(map[string]analyticsPropSpec{
		"value": enumProp("expanded", "collapsed"),
	}),
	"feature_use|auth.login_method_select": featureSpec(map[string]analyticsPropSpec{
		"method": enumProp("password", "passkey", "oauth", "wechat"),
	}),
	"feature_use|onboarding.step_complete": featureSpec(map[string]analyticsPropSpec{"step": intProp(0, 20)}),
	"feature_use|onboarding.skip":          featureSpec(map[string]analyticsPropSpec{"step": intProp(0, 20)}),
	"perf_vital|vital.fcp":                 analyticsVitalSpec,
	"perf_vital|vital.lcp":                 analyticsVitalSpec,
	"perf_vital|vital.ttfb":                analyticsVitalSpec,
	"perf_vital|vital.route_change":        analyticsVitalSpec,
	"api_error|api.request_failed": {
		maxDurationMs: 3600000, statusCode: true,
		props: map[string]analyticsPropSpec{
			"api_route": {kind: analyticsPropRoute},
			"method":    enumProp("GET", "POST", "PUT", "PATCH", "DELETE"),
			"kind":      enumProp("http_4xx", "http_5xx", "network", "timeout"),
		},
	},
	"client_error|runtime.error":               analyticsRuntimeErrorSpec,
	"client_error|runtime.unhandled_rejection": analyticsRuntimeErrorSpec,
}
