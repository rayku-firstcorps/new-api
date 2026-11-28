package operation_setting

import (
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/config"
)

const (
	AnalyticsEnabledOptionKey         = "analytics_setting.enabled"
	AnalyticsSampleRateOptionKey      = "analytics_setting.sample_rate"
	AnalyticsRetentionDaysOptionKey   = "analytics_setting.retention_days"
	AnalyticsRespectDNTOptionKey      = "analytics_setting.respect_dnt"
	AnalyticsHashSecretOptionKey      = "analytics_setting.hash_secret"
	AnalyticsSecretRotatedAtOptionKey = "analytics_setting.secret_rotated_at"
)

// AnalyticsSetting controls anonymous behavior analytics.
type AnalyticsSetting struct {
	Enabled       bool `json:"enabled"`
	SampleRate    int  `json:"sample_rate"`
	RetentionDays int  `json:"retention_days"`
	RespectDNT    bool `json:"respect_dnt"`
	// HashSecret is the HMAC key for actor hashes. It is generated and rotated
	// only by the server and must never be logged, returned or formatted.
	HashSecret      string `json:"hash_secret"`
	SecretRotatedAt int64  `json:"secret_rotated_at"`
}

var analyticsSetting = AnalyticsSetting{
	Enabled:       false,
	SampleRate:    100,
	RetentionDays: 90,
	RespectDNT:    true,
}

func init() {
	config.GlobalConfig.Register("analytics_setting", &analyticsSetting)
}

func GetAnalyticsSetting() *AnalyticsSetting {
	return &analyticsSetting
}

// IsActive reports whether events can be accepted: enabled and a secret exists.
func (s *AnalyticsSetting) IsActive() bool {
	return s.Enabled && s.HashSecret != ""
}

func ValidateAnalyticsSampleRate(value string) error {
	rate, err := strconv.Atoi(value)
	if err != nil || rate < 1 || rate > 100 {
		return common.NewMessage("The sample rate must be a whole number between 1 and 100")
	}
	return nil
}

func ValidateAnalyticsRetentionDays(value string) error {
	days, err := strconv.Atoi(value)
	if err != nil || days < 7 || days > 365 {
		return common.NewMessage("The retention period must be a whole number of days between 7 and 365")
	}
	return nil
}
