package controller

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestVerifyPayssionWebhook(t *testing.T) {
	body := []byte(`{"type":"payment.succeeded","data":{"object":{"reference":"PAYSSION-1","amount":"10.00","currency":"USD"}}}`)
	secret := "whsec_test"
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	signature := hex.EncodeToString(mac.Sum(nil))

	assert.True(t, verifyPayssionWebhook(body, signature, secret))
	assert.True(t, verifyPayssionWebhook(body, "sha256="+signature, secret))
	assert.True(t, verifyPayssionWebhook(body, "v1="+signature, secret))
	assert.False(t, verifyPayssionWebhook(body, signature, "wrong"))
	assert.False(t, verifyPayssionWebhook([]byte(`{"type":"payment.failed"}`), signature, secret))
}

func TestPayssionWebhookExtraction(t *testing.T) {
	event := payssionWebhookEvent{
		Type: "payment.succeeded",
		Data: map[string]any{
			"object": map[string]any{
				"status":    "paid",
				"reference": "PAYSSION-1-1780000000000-abc123",
				"amount":    "10.00",
				"currency":  "USD",
				"metadata": map[string]any{
					"trade_no": "PAYSSION-METADATA",
				},
			},
		},
	}

	assert.Equal(t, "PAYSSION-1-1780000000000-abc123", extractPayssionTradeNo(event))
	assert.Equal(t, "paid", extractPayssionPaymentStatus(event))
	amount, ok := extractPayssionAmount(event)
	require.True(t, ok)
	assert.Equal(t, 10.0, amount)
	assert.Equal(t, "USD", extractPayssionCurrency(event))
	assert.True(t, isPayssionSuccessfulEvent(extractPayssionEventType(event), extractPayssionPaymentStatus(event)))
}

func TestExtractPayssionTradeNoFallbacks(t *testing.T) {
	event := payssionWebhookEvent{
		Type: "payment.succeeded",
		Data: map[string]any{
			"object": map[string]any{
				"metadata": map[string]any{
					"trade_no": "PAYSSION-FALLBACK",
				},
			},
		},
	}

	assert.Equal(t, "PAYSSION-FALLBACK", extractPayssionTradeNo(event))
}

func TestExtractPayssionRedirectURL(t *testing.T) {
	resp := map[string]any{
		"data": map[string]any{
			"next_action": map[string]any{
				"redirect_to_url": map[string]any{
					"url": "https://checkout.payssion.com/pay/123",
				},
			},
		},
	}

	assert.Equal(t, "https://checkout.payssion.com/pay/123", extractPayssionRedirectURL(resp))
}

func TestPayssionTopUpEnabledRequiresComplianceAndConfig(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalEnabled := setting.PayssionEnabled
	originalAPIKey := setting.PayssionApiKey
	originalWebhookSecret := setting.PayssionWebhookSecret
	originalMethods := setting.PayssionPaymentMethods
	t.Cleanup(func() {
		setting.PayssionEnabled = originalEnabled
		setting.PayssionApiKey = originalAPIKey
		setting.PayssionWebhookSecret = originalWebhookSecret
		setting.PayssionPaymentMethods = originalMethods
	})

	setting.PayssionEnabled = true
	setting.PayssionApiKey = "pk_test"
	setting.PayssionWebhookSecret = "whsec_test"
	setting.PayssionPaymentMethods = `[{"name":"GCash","type":"gcash_ph"}]`
	require.True(t, isPayssionWebhookEnabled())

	setting.PayssionPaymentMethods = "[]"
	require.False(t, isPayssionWebhookEnabled())

	setting.PayssionPaymentMethods = `[{"name":"GCash","type":"gcash_ph"}]`
	setting.PayssionWebhookSecret = ""
	require.False(t, isPayssionWebhookEnabled())

	setting.PayssionWebhookSecret = "whsec_test"
	setting.PayssionApiKey = ""
	require.False(t, isPayssionWebhookEnabled())

	setting.PayssionApiKey = "pk_test"
	setting.PayssionEnabled = false
	require.False(t, isPayssionWebhookEnabled())
}

func TestGetPayssionPaymentMethodsFiltersInvalidEntries(t *testing.T) {
	originalMethods := setting.PayssionPaymentMethods
	t.Cleanup(func() {
		setting.PayssionPaymentMethods = originalMethods
	})

	setting.PayssionPaymentMethods = `[{"name":"GCash","type":"gcash_ph"},{"name":"Invalid","type":""},{"type":"promptpay_th"}]`
	methods := setting.GetPayssionPaymentMethods()

	require.Len(t, methods, 2)
	assert.Equal(t, "GCash", methods[0].Name)
	assert.Equal(t, "gcash_ph", methods[0].Type)
	assert.Equal(t, "promptpay_th", methods[1].Name)
	assert.True(t, setting.IsPayssionPaymentMethodAllowed("gcash_ph"))
	assert.False(t, setting.IsPayssionPaymentMethodAllowed("card"))
}

func TestNormalizePayssionPaymentMethod(t *testing.T) {
	assert.Equal(t, "gcash_ph", normalizePayssionPaymentMethod("payssion:gcash_ph"))
	assert.Equal(t, "gcash_ph", normalizePayssionPaymentMethod(" gcash_ph "))
}

func TestPayssionAmountFormatting(t *testing.T) {
	assert.Equal(t, "10.25", formatPayssionAmount(10.25, "USD"))
	assert.Equal(t, "10", formatPayssionAmount(10.25, "JPY"))
}

func TestValidatePayssionPaidOrderRejectsMismatch(t *testing.T) {
	originalCurrency := setting.PayssionCurrency
	t.Cleanup(func() {
		setting.PayssionCurrency = originalCurrency
	})
	setting.PayssionCurrency = "USD"

	event := payssionWebhookEvent{
		Type: "payment.succeeded",
		Data: map[string]any{
			"object": map[string]any{
				"reference": "missing-order",
				"status":    "paid",
				"amount":    "10.00",
				"currency":  "USD",
			},
		},
	}

	assert.ErrorIs(t, validatePayssionPaidOrder(event, "missing-order"), model.ErrTopUpNotFound)
}

func TestPayssionWebhookUnknownOrderReturnsOK(t *testing.T) {
	confirmPaymentComplianceForTest(t)
	originalEnabled := setting.PayssionEnabled
	originalAPIKey := setting.PayssionApiKey
	originalWebhookSecret := setting.PayssionWebhookSecret
	originalMethods := setting.PayssionPaymentMethods
	originalCurrency := setting.PayssionCurrency
	t.Cleanup(func() {
		setting.PayssionEnabled = originalEnabled
		setting.PayssionApiKey = originalAPIKey
		setting.PayssionWebhookSecret = originalWebhookSecret
		setting.PayssionPaymentMethods = originalMethods
		setting.PayssionCurrency = originalCurrency
	})

	setting.PayssionEnabled = true
	setting.PayssionApiKey = "pk_test"
	setting.PayssionWebhookSecret = "whsec_test"
	setting.PayssionPaymentMethods = `[{"name":"GCash","type":"gcash_ph"}]`
	setting.PayssionCurrency = "USD"

	body := `{"type":"payment.succeeded","data":{"object":{"reference":"missing-order","status":"paid","amount":"10.00","currency":"USD"}}}`
	mac := hmac.New(sha256.New, []byte(setting.PayssionWebhookSecret))
	mac.Write([]byte(body))
	signature := hex.EncodeToString(mac.Sum(nil))

	gin.SetMode(gin.TestMode)
	req := httptest.NewRequest(http.MethodPost, "/api/payssion/webhook", strings.NewReader(body))
	req.Header.Set("Payssion-Signature", signature)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = req

	PayssionWebhook(c)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestPayssionUsesCommonJSONWrapper(t *testing.T) {
	payload, err := common.Marshal(map[string]string{"reference": "PAYSSION-1"})
	require.NoError(t, err)
	var parsed map[string]string
	require.NoError(t, common.Unmarshal(payload, &parsed))
	assert.Equal(t, "PAYSSION-1", parsed["reference"])
}
