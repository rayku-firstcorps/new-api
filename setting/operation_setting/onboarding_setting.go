package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// OnboardingSetting controls the first-setup guide shown to new users and administrators.
type OnboardingSetting struct {
	Enabled                bool `json:"enabled"`                   // 引导总开关
	AutoOpenOnFirstLogin   bool `json:"auto_open_on_first_login"`  // 首次登录自动打开引导
	AllowInlineTestRequest bool `json:"allow_inline_test_request"` // 允许在引导中发送一键测试请求
	ShowCCSwitch           bool `json:"show_cc_switch"`            // 引导中展示 CC Switch 入口
	AdminGuideEnabled      bool `json:"admin_guide_enabled"`       // 管理员首启引导
}

// 默认配置：全部开启
var onboardingSetting = OnboardingSetting{
	Enabled:                true,
	AutoOpenOnFirstLogin:   true,
	AllowInlineTestRequest: true,
	ShowCCSwitch:           true,
	AdminGuideEnabled:      true,
}

func init() {
	config.GlobalConfig.Register("onboarding_setting", &onboardingSetting)
}

// GetOnboardingSetting returns the live onboarding configuration.
func GetOnboardingSetting() *OnboardingSetting {
	return &onboardingSetting
}
