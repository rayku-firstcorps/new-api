package common

import "strings"

type HeaderNavAccess struct {
	Enabled     bool
	RequireAuth bool
}

func GetHeaderNavAccess(module string) HeaderNavAccess {
	fallback := HeaderNavAccess{
		Enabled:     true,
		RequireAuth: false,
	}

	OptionMapRWMutex.RLock()
	raw := OptionMap["HeaderNavModules"]
	OptionMapRWMutex.RUnlock()

	if strings.TrimSpace(raw) == "" {
		return fallback
	}

	var parsed map[string]any
	if err := Unmarshal([]byte(raw), &parsed); err != nil {
		return fallback
	}

	return parseHeaderNavAccess(parsed[module], fallback)
}

func IsHeaderNavModulePubliclyVisible(module string) bool {
	access := GetHeaderNavAccess(module)
	return access.Enabled && !access.RequireAuth
}

func parseHeaderNavAccess(raw any, fallback HeaderNavAccess) HeaderNavAccess {
	switch value := raw.(type) {
	case bool:
		return HeaderNavAccess{
			Enabled:     value,
			RequireAuth: fallback.RequireAuth,
		}
	case string:
		return HeaderNavAccess{
			Enabled:     parseHeaderNavBool(value, fallback.Enabled),
			RequireAuth: fallback.RequireAuth,
		}
	case float64:
		return HeaderNavAccess{
			Enabled:     parseHeaderNavBool(value, fallback.Enabled),
			RequireAuth: fallback.RequireAuth,
		}
	case map[string]any:
		access := fallback
		if enabled, ok := value["enabled"]; ok {
			access.Enabled = parseHeaderNavBool(enabled, fallback.Enabled)
		}
		if requireAuth, ok := value["requireAuth"]; ok {
			access.RequireAuth = parseHeaderNavBool(requireAuth, fallback.RequireAuth)
		}
		return access
	default:
		return fallback
	}
}

func parseHeaderNavBool(value any, fallback bool) bool {
	switch v := value.(type) {
	case bool:
		return v
	case string:
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "true", "1":
			return true
		case "false", "0":
			return false
		default:
			return fallback
		}
	case float64:
		if v == 1 {
			return true
		}
		if v == 0 {
			return false
		}
		return fallback
	case int:
		if v == 1 {
			return true
		}
		if v == 0 {
			return false
		}
		return fallback
	default:
		return fallback
	}
}
