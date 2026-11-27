package controller

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetStatusReturnsEffectiveOIDCDisplayName(t *testing.T) {
	settings := system_setting.GetOIDCSettings()
	originalDisplayName := settings.DisplayName
	originalOptionMap := common.OptionMap
	t.Cleanup(func() {
		settings.DisplayName = originalDisplayName
		common.OptionMap = originalOptionMap
	})
	common.OptionMap = map[string]string{}

	tests := []struct {
		name        string
		displayName string
		want        string
	}{
		{
			name:        "custom name is trimmed",
			displayName: "  Acme SSO  ",
			want:        "Acme SSO",
		},
		{
			name:        "whitespace-only name falls back",
			displayName: "   ",
			want:        "OIDC",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			settings.DisplayName = tt.displayName
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)

			GetStatus(context)

			var payload struct {
				Success bool           `json:"success"`
				Data    map[string]any `json:"data"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			require.True(t, payload.Success)
			assert.Equal(t, tt.want, payload.Data["oidc_display_name"])
		})
	}
}

func TestGetStatusReturnsOnboardingAndNewUserQuota(t *testing.T) {
	onboarding := operation_setting.GetOnboardingSetting()
	quota := operation_setting.GetQuotaSetting()
	originalOnboarding, originalQuota := *onboarding, *quota
	originalAmount, originalOptionMap := common.QuotaForNewUser, common.OptionMap
	t.Cleanup(func() {
		*onboarding, *quota = originalOnboarding, originalQuota
		common.QuotaForNewUser, common.OptionMap = originalAmount, originalOptionMap
	})
	common.OptionMap = map[string]string{}

	fetch := func() map[string]any {
		response := httptest.NewRecorder()
		context, _ := gin.CreateTestContext(response)
		context.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
		GetStatus(context)
		var payload struct {
			Data map[string]any `json:"data"`
		}
		require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
		return payload.Data
	}

	data := fetch()
	for _, key := range []string{"onboarding_enabled", "onboarding_auto_open", "onboarding_inline_test_enabled", "onboarding_cc_switch_enabled", "onboarding_admin_guide_enabled"} {
		assert.Equal(t, true, data[key], key)
	}

	*onboarding = operation_setting.OnboardingSetting{AutoOpenOnFirstLogin: true, ShowCCSwitch: true}
	data = fetch()
	assert.Equal(t, false, data["onboarding_enabled"])
	assert.Equal(t, true, data["onboarding_auto_open"])
	assert.Equal(t, false, data["onboarding_inline_test_enabled"])
	assert.Equal(t, true, data["onboarding_cc_switch_enabled"])
	assert.Equal(t, false, data["onboarding_admin_guide_enabled"])

	for _, tc := range []struct {
		name         string
		enabled      bool
		amount       int
		requireEmail bool
		wantAmount   float64
	}{
		{"switch off keeps the stored amount hidden", false, 500000, true, 0},
		{"switch on without an amount", true, 0, false, 0},
		{"switch on with an amount", true, 500000, false, 500000},
	} {
		quota.NewUserQuotaEnabled, quota.NewUserQuotaRequireEmail = tc.enabled, tc.requireEmail
		common.QuotaForNewUser = tc.amount
		data = fetch()
		assert.Equal(t, tc.enabled, data["new_user_quota_enabled"], tc.name)
		assert.Equal(t, tc.wantAmount, data["new_user_quota_amount"], tc.name)
		assert.Equal(t, tc.requireEmail, data["new_user_quota_require_email"], tc.name)
	}
}
