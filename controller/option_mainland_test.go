package controller

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func TestMainlandBaseURLValidation(t *testing.T) {
	for _, tc := range []struct {
		input string
		want  string
	}{
		{"", ""},
		{"  ", ""},
		{" cn.kucodeapi.com ", "https://cn.kucodeapi.com"},
		{"https://CN.kucodeapi.com/", "https://cn.kucodeapi.com"},
		{"https://cn.kucodeapi.com:8443/gateway/v1/", "https://cn.kucodeapi.com:8443/gateway/v1"},
	} {
		t.Run(tc.input, func(t *testing.T) {
			got, err := operation_setting.NormalizeMainlandBaseURL(tc.input)
			require.NoError(t, err)
			assert.Equal(t, tc.want, got)
		})
	}
	for _, input := range []string{
		"http://cn.example.com", "javascript:alert(1)", "https://", "/relative", "not-a-domain",
		"https://user:secret@cn.example.com", "https://@cn.example.com", "https://cn.example.com?token=secret",
		"https://cn.example.com#", "https://cn.example.com\\path", "https://cn.example.com/a b",
		"https://cn.example.com:65536", "https://cn.example.com:0", "https://cn.example.com:",
		"https://-bad.example.com", "https://cn..example.com",
	} {
		t.Run(input, func(t *testing.T) {
			_, err := operation_setting.NormalizeMainlandBaseURL(input)
			require.Error(t, err)
			body, err := common.Marshal(OptionUpdateRequest{Key: "general_setting.mainland_base_url", Value: input})
			require.NoError(t, err)
			response := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(response)
			c.Request = httptest.NewRequest(http.MethodPut, "/api/option/", bytes.NewReader(body))
			UpdateOption(c)
			var payload struct {
				Success bool   `json:"success"`
				Message string `json:"message"`
			}
			require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
			assert.False(t, payload.Success)
			assert.Equal(t, "Enter a domain or HTTPS URL without credentials, query parameters, or fragments", payload.Message)
		})
	}
}

func TestMainlandBaseURLPersistenceAndStatus(t *testing.T) {
	var driver gorm.Dialector = sqlite.Open(t.TempDir() + "/options.db")
	switch os.Getenv("TEST_MAINLAND_DB") {
	case "mysql":
		driver = mysql.Open(os.Getenv("TEST_MYSQL_DSN"))
	case "postgres":
		driver = postgres.Open(os.Getenv("TEST_POSTGRES_DSN"))
	}
	db, err := gorm.Open(driver, &gorm.Config{})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	previousDB, previousMap := model.DB, common.OptionMap
	previousURL := operation_setting.GetGeneralSetting().MainlandBaseURL
	model.DB = db
	common.OptionMap = map[string]string{}
	t.Cleanup(func() {
		model.DB, common.OptionMap = previousDB, previousMap
		operation_setting.GetGeneralSetting().MainlandBaseURL = previousURL
		require.NoError(t, sqlDB.Close())
	})
	require.NoError(t, db.AutoMigrate(&model.Option{}))
	const key = "general_setting.mainland_base_url"
	for _, value := range []string{"https://cn.kucodeapi.com", "https://backup.example.com/v1", ""} {
		require.NoError(t, model.UpdateOption(key, value))
		assert.Equal(t, value, operation_setting.GetGeneralSetting().MainlandBaseURL)
		stored, err := model.AllOption()
		require.NoError(t, err)
		require.Len(t, stored, 1)
		assert.Equal(t, key, stored[0].Key)
		assert.Equal(t, value, stored[0].Value)
		operation_setting.GetGeneralSetting().MainlandBaseURL = ""
		require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{stored[0].Key: stored[0].Value}))
		response := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(response)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/status", nil)
		GetStatus(c)
		var payload struct {
			Success bool `json:"success"`
			Data    struct {
				MainlandBaseURL string `json:"mainland_base_url"`
			} `json:"data"`
		}
		require.NoError(t, common.Unmarshal(response.Body.Bytes(), &payload))
		assert.True(t, payload.Success)
		assert.Equal(t, value, payload.Data.MainlandBaseURL)
	}
	var version string
	query := "SELECT version()"
	if os.Getenv("TEST_MAINLAND_DB") == "" {
		query = "SELECT sqlite_version()"
	}
	require.NoError(t, db.Raw(query).Scan(&version).Error)
	t.Logf("database version: %s", version)
}
