package controller

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/types"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// A playground Messages request reaches a pass-through Anthropic channel as
// the client's native body, without the playground-only group field.
func TestPlaygroundMessagesPassThroughOmitsGroup(t *testing.T) {
	gin.SetMode(gin.TestMode)
	service.InitHttpClient()

	previousDB, previousLogDB := model.DB, model.LOG_DB
	previousMemoryCache, previousRedis := common.MemoryCacheEnabled, common.RedisEnabled
	previousBatchUpdate := common.BatchUpdateEnabled
	fetchSettings := system_setting.GetFetchSetting()
	previousFetchSettings := *fetchSettings
	previousPrices := ratio_setting.ModelPrice2JSONString()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&model.User{}, &model.Channel{}, &model.Log{}, &model.UserSubscription{}))
	model.DB, model.LOG_DB = database, database
	common.MemoryCacheEnabled, common.RedisEnabled, common.BatchUpdateEnabled = false, false, false
	fetchSettings.AllowPrivateIp = true
	fetchSettings.AllowedPorts = []string{"1-65535"}
	const claudeModel = "claude-playground-test"
	require.NoError(t, ratio_setting.UpdateModelPriceByJSONString(`{"`+claudeModel+`":0.01}`))
	t.Cleanup(func() {
		model.DB, model.LOG_DB = previousDB, previousLogDB
		common.MemoryCacheEnabled, common.RedisEnabled = previousMemoryCache, previousRedis
		common.BatchUpdateEnabled = previousBatchUpdate
		*fetchSettings = previousFetchSettings
		require.NoError(t, ratio_setting.UpdateModelPriceByJSONString(previousPrices))
	})
	require.NoError(t, database.Create(&model.User{Id: 7, Username: "playground-user", Group: "default", Quota: 1_000_000}).Error)

	var upstreamPath, upstreamBody string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamPath = r.URL.Path
		body, _ := io.ReadAll(r.Body)
		upstreamBody = string(body)
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"id":"msg_1","type":"message","role":"assistant","model":"`+claudeModel+`",`+
			`"content":[{"type":"text","text":"hello"}],"stop_reason":"end_turn","usage":{"input_tokens":3,"output_tokens":1}}`)
	}))
	defer upstream.Close()
	channelSetting := `{"pass_through_body_enabled":true}`
	channel := model.Channel{Id: 1, Type: constant.ChannelTypeAnthropic, Name: "anthropic-pass-through", Key: "sk-ant", BaseURL: &upstream.URL,
		Status: common.ChannelStatusEnabled, Models: claudeModel, Group: "default", Setting: &channelSetting}
	require.NoError(t, database.Create(&channel).Error)

	engine := gin.New()
	engine.POST("/pg/messages", func(c *gin.Context) {
		c.Set("id", 7)
		common.SetContextKey(c, constant.ContextKeyUsingGroup, "default")
		common.SetContextKey(c, constant.ContextKeyTokenGroup, "default")
		require.Nil(t, middleware.SetupContextForSelectedChannel(c, &channel, claudeModel))
		Playground(c, types.RelayFormatClaude)
	})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/pg/messages", strings.NewReader(
		`{"model":"`+claudeModel+`","group":"default","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}`))
	request.Header.Set("Content-Type", "application/json")
	engine.ServeHTTP(recorder, request)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	assert.Contains(t, recorder.Body.String(), `"text":"hello"`)
	assert.Equal(t, "/v1/messages", upstreamPath)
	assert.JSONEq(t, `{"model":"`+claudeModel+`","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}`, upstreamBody)
}
