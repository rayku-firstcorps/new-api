package controller

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

var airwallexTokenCache = struct {
	sync.Mutex
	token     string
	expiresAt time.Time
}{}

type AirwallexPayRequest struct {
	Amount int64 `json:"amount"`
}

type airwallexAuthResponse struct {
	Token         string `json:"token"`
	ExpiresAt     string `json:"expires_at"`
	ExpiresIn     int64  `json:"expires_in"`
	Expiry        int64  `json:"expiry"`
	ErrorCode     string `json:"code"`
	ErrorMessage  string `json:"message"`
	ErrorDetail   string `json:"details"`
	ErrorResponse string `json:"error"`
}

type airwallexPaymentLinkRequest struct {
	Amount               float64                `json:"amount"`
	Currency             string                 `json:"currency"`
	MerchantOrderId      string                 `json:"merchant_order_id"`
	RequestId            string                 `json:"request_id"`
	ReturnUrl            string                 `json:"return_url,omitempty"`
	SuccessUrl           string                 `json:"success_url,omitempty"`
	FailureUrl           string                 `json:"failure_url,omitempty"`
	CancelUrl            string                 `json:"cancel_url,omitempty"`
	Title                string                 `json:"title"`
	Reusable             bool                   `json:"reusable"`
	Metadata             map[string]string      `json:"metadata,omitempty"`
	Customer             map[string]string      `json:"customer,omitempty"`
	PaymentIntentData    map[string]interface{} `json:"payment_intent_data,omitempty"`
	PaymentMethods       []string               `json:"payment_methods,omitempty"`
	PaymentMethodOptions map[string]interface{} `json:"payment_method_options,omitempty"`
}

type airwallexPaymentLinkResponse struct {
	Id             string `json:"id"`
	Url            string `json:"url"`
	PaymentLinkUrl string `json:"payment_link_url"`
	RedirectUrl    string `json:"redirect_url"`
	Status         string `json:"status"`
	Code           string `json:"code"`
	Message        string `json:"message"`
	Details        string `json:"details"`
}

type airwallexWebhookEvent struct {
	Id        string                 `json:"id"`
	Name      string                 `json:"name"`
	EventType string                 `json:"event_type"`
	Resource  map[string]interface{} `json:"resource"`
	Data      map[string]interface{} `json:"data"`
	Object    map[string]interface{} `json:"object"`
	CreatedAt string                 `json:"created_at"`
}

func airwallexBaseURL() string {
	if setting.AirwallexSandbox {
		return "https://api-demo.airwallex.com"
	}
	return "https://api.airwallex.com"
}

func getAirwallexCurrency() string {
	if setting.AirwallexCurrency != "" {
		return strings.ToUpper(setting.AirwallexCurrency)
	}
	return "USD"
}

func getAirwallexMinTopup() int64 {
	minTopup := setting.AirwallexMinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		minTopup = minTopup * int(common.QuotaPerUnit)
	}
	return int64(minTopup)
}

func getAirwallexPayMoney(amount float64, group string) float64 {
	originalAmount := amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		amount = amount / common.QuotaPerUnit
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(originalAmount)]; ok && ds > 0 {
		discount = ds
	}

	return amount * setting.AirwallexUnitPrice * topupGroupRatio * discount
}

func airwallexRequest(ctx *gin.Context, method string, path string, body any, out any) error {
	token, err := getAirwallexToken()
	if err != nil {
		return err
	}

	var payload []byte
	if body != nil {
		payload, err = common.Marshal(body)
		if err != nil {
			return err
		}
	}

	req, err := http.NewRequestWithContext(ctx.Request.Context(), method, airwallexBaseURL()+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("airwallex api status=%d body=%s", resp.StatusCode, string(respBody))
	}

	if out == nil {
		return nil
	}

	return common.Unmarshal(respBody, out)
}

func getAirwallexToken() (string, error) {
	airwallexTokenCache.Lock()
	defer airwallexTokenCache.Unlock()

	if airwallexTokenCache.token != "" && time.Now().Before(airwallexTokenCache.expiresAt.Add(-time.Minute)) {
		return airwallexTokenCache.token, nil
	}

	req, err := http.NewRequest(http.MethodPost, airwallexBaseURL()+"/api/v1/authentication/login", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("x-client-id", setting.AirwallexClientId)
	req.Header.Set("x-api-key", setting.AirwallexApiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("airwallex auth status=%d body=%s", resp.StatusCode, string(body))
	}

	var auth airwallexAuthResponse
	if err := common.Unmarshal(body, &auth); err != nil {
		return "", err
	}
	if auth.Token == "" {
		return "", fmt.Errorf("airwallex auth returned empty token: %s", string(body))
	}

	expiresAt := time.Now().Add(25 * time.Minute)
	if auth.ExpiresIn > 0 {
		expiresAt = time.Now().Add(time.Duration(auth.ExpiresIn) * time.Second)
	} else if auth.Expiry > 0 {
		expiresAt = time.Unix(auth.Expiry, 0)
	} else if auth.ExpiresAt != "" {
		if parsed, err := time.Parse(time.RFC3339, auth.ExpiresAt); err == nil {
			expiresAt = parsed
		}
	}

	airwallexTokenCache.token = auth.Token
	airwallexTokenCache.expiresAt = expiresAt
	return auth.Token, nil
}

func RequestAirwallexAmount(c *gin.Context) {
	var req AirwallexPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getAirwallexMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getAirwallexMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := getAirwallexPayMoney(float64(req.Amount), group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func RequestAirwallexPay(c *gin.Context) {
	if !isAirwallexTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Airwallex 支付未启用"})
		return
	}

	var req AirwallexPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getAirwallexMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getAirwallexMinTopup())})
		return
	}

	id := c.GetInt("id")
	user, err := model.GetUserById(id, false)
	if err != nil || user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "用户不存在"})
		return
	}

	group, _ := model.GetUserGroup(id, true)
	payMoney := getAirwallexPayMoney(float64(req.Amount), group)
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		amount = decimal.NewFromInt(req.Amount).Div(decimal.NewFromFloat(common.QuotaPerUnit)).IntPart()
		if amount < 1 {
			amount = 1
		}
	}

	tradeNo := fmt.Sprintf("AIRWALLEX-%d-%d-%s", id, time.Now().UnixMilli(), randstr.String(6))
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodAirwallex,
		PaymentProvider: model.PaymentProviderAirwallex,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Airwallex 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	returnURL := paymentReturnPath("/console/topup?show_history=true")
	callbackAddr := service.GetCallbackAddress()
	createReq := airwallexPaymentLinkRequest{
		Amount:          payMoney,
		Currency:        getAirwallexCurrency(),
		MerchantOrderId: tradeNo,
		RequestId:       tradeNo,
		ReturnUrl:       returnURL,
		SuccessUrl:      returnURL,
		FailureUrl:      returnURL,
		CancelUrl:       returnURL,
		Title:           fmt.Sprintf("Recharge %d credits", req.Amount),
		Reusable:        false,
		Metadata: map[string]string{
			"user_id":  strconv.Itoa(id),
			"trade_no": tradeNo,
			"notify":   callbackAddr + "/api/airwallex/webhook",
		},
	}
	if strings.TrimSpace(user.Email) != "" {
		createReq.Customer = map[string]string{
			"email": strings.TrimSpace(user.Email),
		}
	}

	var createResp airwallexPaymentLinkResponse
	if err := airwallexRequest(c, http.MethodPost, "/api/v1/pa/payment_links/create", createReq, &createResp); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Airwallex 创建支付链接失败 user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	paymentURL := createResp.PaymentLinkUrl
	if paymentURL == "" {
		paymentURL = createResp.Url
	}
	if paymentURL == "" {
		paymentURL = createResp.RedirectUrl
	}
	if paymentURL == "" {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Airwallex 支付链接为空 user_id=%d trade_no=%s response=%q", id, tradeNo, common.GetJsonString(createResp)))
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Airwallex 充值订单创建成功 user_id=%d trade_no=%s amount=%d money=%.2f", id, tradeNo, req.Amount, payMoney))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url": paymentURL,
			"order_id":    tradeNo,
		},
	})
}

func AirwallexWebhook(c *gin.Context) {
	if !isAirwallexWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Airwallex webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Airwallex webhook 读取请求体失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	if !verifyAirwallexWebhook(c, body) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Airwallex webhook 验签失败 path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	var event airwallexWebhookEvent
	if err := common.Unmarshal(body, &event); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Airwallex webhook 解析失败 path=%q client_ip=%s error=%q body=%q", c.Request.RequestURI, c.ClientIP(), err.Error(), string(body)))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	eventName := event.Name
	if eventName == "" {
		eventName = event.EventType
	}
	tradeNo := extractAirwallexTradeNo(event)
	status := strings.ToUpper(extractAirwallexStatus(event))
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Airwallex webhook 收到事件 event_id=%s event=%s trade_no=%s status=%s client_ip=%s", event.Id, eventName, tradeNo, status, c.ClientIP()))

	if tradeNo == "" {
		c.Status(http.StatusOK)
		return
	}

	if !isAirwallexSuccessfulEvent(eventName, status) {
		if isAirwallexFailedEvent(eventName, status) {
			if err := model.UpdatePendingTopUpStatus(tradeNo, model.PaymentProviderAirwallex, common.TopUpStatusFailed); err != nil &&
				!errors.Is(err, model.ErrTopUpNotFound) &&
				!errors.Is(err, model.ErrTopUpStatusInvalid) {
				logger.LogError(c.Request.Context(), fmt.Sprintf("Airwallex 标记失败订单失败 trade_no=%s error=%q", tradeNo, err.Error()))
			}
		}
		c.Status(http.StatusOK)
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	if err := model.RechargeAirwallex(tradeNo, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Airwallex 充值处理失败 trade_no=%s event=%s client_ip=%s error=%q", tradeNo, eventName, c.ClientIP(), err.Error()))
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	c.Status(http.StatusOK)
}

func verifyAirwallexWebhook(c *gin.Context, body []byte) bool {
	secret := strings.TrimSpace(setting.AirwallexWebhookSecret)
	if secret == "" {
		return false
	}

	signatures := []string{
		c.GetHeader("x-signature"),
		c.GetHeader("X-Signature"),
		c.GetHeader("Airwallex-Signature"),
		c.GetHeader("X-Airwallex-Signature"),
	}
	timestamp := firstNonEmptyAirwallexHeader(c.GetHeader("x-timestamp"), c.GetHeader("X-Timestamp"), c.GetHeader("Airwallex-Timestamp"))

	for _, signature := range signatures {
		if signature == "" {
			continue
		}
		if verifyAirwallexSignature(body, secret, signature) {
			return true
		}
		if timestamp != "" && verifyAirwallexSignature([]byte(timestamp+"."+string(body)), secret, signature) {
			return true
		}
		if timestamp != "" && verifyAirwallexSignature([]byte(timestamp+string(body)), secret, signature) {
			return true
		}
	}

	return false
}

func verifyAirwallexSignature(payload []byte, secret string, signature string) bool {
	normalized := strings.TrimSpace(signature)
	if strings.Contains(normalized, "=") {
		parts := strings.Split(normalized, ",")
		for _, part := range parts {
			kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
			if len(kv) == 2 && (strings.EqualFold(kv[0], "v1") || strings.EqualFold(kv[0], "signature")) {
				normalized = kv[1]
				break
			}
		}
	}
	normalized = strings.TrimPrefix(normalized, "sha256=")

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedRaw := mac.Sum(nil)
	expectedHex := hex.EncodeToString(expectedRaw)
	if hmac.Equal([]byte(strings.ToLower(normalized)), []byte(expectedHex)) {
		return true
	}

	decoded, err := base64.StdEncoding.DecodeString(normalized)
	if err == nil && hmac.Equal(decoded, expectedRaw) {
		return true
	}

	return false
}

func firstNonEmptyAirwallexHeader(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func extractAirwallexTradeNo(event airwallexWebhookEvent) string {
	for _, source := range []map[string]interface{}{event.Resource, event.Data, event.Object} {
		if source == nil {
			continue
		}
		for _, key := range []string{"merchant_order_id", "merchantOrderId", "request_id", "requestId", "order_id", "orderId"} {
			if value, ok := source[key].(string); ok && value != "" {
				return value
			}
		}
		if metadata, ok := source["metadata"].(map[string]interface{}); ok {
			if value, ok := metadata["trade_no"].(string); ok && value != "" {
				return value
			}
		}
		if pi, ok := source["payment_intent"].(map[string]interface{}); ok {
			for _, key := range []string{"merchant_order_id", "merchantOrderId", "request_id", "requestId"} {
				if value, ok := pi[key].(string); ok && value != "" {
					return value
				}
			}
		}
	}
	return ""
}

func extractAirwallexStatus(event airwallexWebhookEvent) string {
	for _, source := range []map[string]interface{}{event.Resource, event.Data, event.Object} {
		if source == nil {
			continue
		}
		for _, key := range []string{"status", "payment_status", "paymentStatus", "state"} {
			if value, ok := source[key].(string); ok && value != "" {
				return value
			}
		}
		if pi, ok := source["payment_intent"].(map[string]interface{}); ok {
			for _, key := range []string{"status", "payment_status", "paymentStatus"} {
				if value, ok := pi[key].(string); ok && value != "" {
					return value
				}
			}
		}
	}
	return ""
}

func isAirwallexSuccessfulEvent(eventName string, status string) bool {
	event := strings.ToLower(eventName)
	if strings.Contains(event, "succeeded") || strings.Contains(event, "success") || strings.Contains(event, "paid") {
		return true
	}

	switch status {
	case "SUCCEEDED", "SUCCESS", "PAID", "PAY_SUCCESS", "CAPTURED", "SETTLED":
		return true
	default:
		return false
	}
}

func isAirwallexFailedEvent(eventName string, status string) bool {
	event := strings.ToLower(eventName)
	if strings.Contains(event, "failed") || strings.Contains(event, "cancelled") || strings.Contains(event, "canceled") || strings.Contains(event, "expired") {
		return true
	}

	switch status {
	case "FAILED", "CANCELLED", "CANCELED", "EXPIRED":
		return true
	default:
		return false
	}
}
