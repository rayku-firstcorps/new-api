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
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

const payssionPaymentsEndpoint = "https://api.payssion.com/v2/payments"

type PayssionPayRequest struct {
	Amount        int64  `json:"amount"`
	PaymentMethod string `json:"payment_method"`
}

type payssionCreatePaymentRequest struct {
	Reference      string            `json:"reference"`
	PaymentMethod  string            `json:"payment_method"`
	Flow           string            `json:"flow"`
	TerminalType   string            `json:"terminal_type"`
	Currency       string            `json:"currency"`
	Amount         string            `json:"amount"`
	ReturnURL      string            `json:"return_url"`
	ExpirationTime string            `json:"expiration_time,omitempty"`
	Metadata       map[string]string `json:"metadata,omitempty"`
}

type payssionWebhookEvent struct {
	ID      string         `json:"id"`
	Type    string         `json:"type"`
	Event   string         `json:"event"`
	Data    map[string]any `json:"data"`
	Object  map[string]any `json:"object"`
	Payment map[string]any `json:"payment"`
}

func getPayssionCurrency() string {
	if strings.TrimSpace(setting.PayssionCurrency) != "" {
		return strings.ToUpper(strings.TrimSpace(setting.PayssionCurrency))
	}
	return "USD"
}

func getPayssionMinTopup() int64 {
	minTopup := setting.PayssionMinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		minTopup = minTopup * int(common.QuotaPerUnit)
	}
	return int64(minTopup)
}

func getPayssionPayMoney(amount float64, group string) float64 {
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

	return amount * setting.PayssionUnitPrice * topupGroupRatio * discount
}

func formatPayssionAmount(amount float64, currency string) string {
	if zeroDecimalCurrencies[strings.ToUpper(currency)] {
		return fmt.Sprintf("%.0f", amount)
	}
	return fmt.Sprintf("%.2f", amount)
}

func normalizePayssionPaymentMethod(paymentMethod string) string {
	paymentMethod = strings.TrimSpace(paymentMethod)
	paymentMethod = strings.TrimPrefix(paymentMethod, model.PaymentMethodPayssion+":")
	return paymentMethod
}

func RequestPayssionAmount(c *gin.Context) {
	var req PayssionPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getPayssionMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getPayssionMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := getPayssionPayMoney(float64(req.Amount), group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func RequestPayssionPay(c *gin.Context) {
	if !isPayssionTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Payssion 支付未启用"})
		return
	}

	var req PayssionPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getPayssionMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getPayssionMinTopup())})
		return
	}

	paymentMethod := normalizePayssionPaymentMethod(req.PaymentMethod)
	if !setting.IsPayssionPaymentMethodAllowed(paymentMethod) {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "不支持的支付方式"})
		return
	}

	id := c.GetInt("id")
	user, err := model.GetUserById(id, false)
	if err != nil || user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "用户不存在"})
		return
	}

	group, _ := model.GetUserGroup(id, true)
	payMoney := getPayssionPayMoney(float64(req.Amount), group)
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

	tradeNo := fmt.Sprintf("PAYSSION-%d-%d-%s", id, time.Now().UnixMilli(), randstr.String(6))
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   paymentMethod,
		PaymentProvider: model.PaymentProviderPayssion,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	returnURL := paymentReturnPath("/console/topup?show_history=true")
	createReq := payssionCreatePaymentRequest{
		Reference:     tradeNo,
		PaymentMethod: paymentMethod,
		Flow:          "indirect",
		TerminalType:  "web",
		Currency:      getPayssionCurrency(),
		Amount:        formatPayssionAmount(payMoney, getPayssionCurrency()),
		ReturnURL:     returnURL,
		Metadata: map[string]string{
			"user_id":  strconv.Itoa(user.Id),
			"trade_no": tradeNo,
		},
	}

	var createResp map[string]any
	if err := payssionRequest(c, createReq, &createResp); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion 创建支付失败 user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	paymentURL := extractPayssionRedirectURL(createResp)
	if paymentURL == "" {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion 支付跳转 URL 为空 user_id=%d trade_no=%s response=%q", id, tradeNo, common.GetJsonString(createResp)))
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Payssion 充值订单创建成功 user_id=%d trade_no=%s payment_method=%s amount=%d money=%.2f", id, tradeNo, paymentMethod, req.Amount, payMoney))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url": paymentURL,
			"order_id":    tradeNo,
		},
	})
}

func payssionRequest(ctx *gin.Context, body any, out any) error {
	payload, err := common.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx.Request.Context(), http.MethodPost, payssionPaymentsEndpoint, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(setting.PayssionApiKey))
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
		return fmt.Errorf("payssion api status=%d body=%s", resp.StatusCode, string(respBody))
	}
	if out == nil {
		return nil
	}
	return common.Unmarshal(respBody, out)
}

func extractPayssionRedirectURL(resp map[string]any) string {
	for _, path := range [][]string{
		{"payment_url"},
		{"checkout_url"},
		{"redirect_url"},
		{"url"},
		{"data", "payment_url"},
		{"data", "checkout_url"},
		{"data", "redirect_url"},
		{"data", "url"},
		{"next_action", "redirect_to_url", "url"},
		{"data", "next_action", "redirect_to_url", "url"},
		{"action", "url"},
		{"data", "action", "url"},
	} {
		if value := payssionStringAtPath(resp, path...); isHTTPURL(value) {
			return value
		}
	}

	return findPayssionURL(resp, 0)
}

func payssionStringAtPath(source map[string]any, path ...string) string {
	var current any = source
	for _, key := range path {
		object, ok := current.(map[string]any)
		if !ok {
			return ""
		}
		current = object[key]
	}
	if value, ok := current.(string); ok {
		return value
	}
	return ""
}

func findPayssionURL(value any, depth int) string {
	if depth > 6 {
		return ""
	}
	switch typed := value.(type) {
	case string:
		if isHTTPURL(typed) {
			return typed
		}
	case []any:
		for _, item := range typed {
			if found := findPayssionURL(item, depth+1); found != "" {
				return found
			}
		}
	case map[string]any:
		preferredKeys := []string{"payment_url", "checkout_url", "redirect_url", "url", "href", "link"}
		for _, key := range preferredKeys {
			if found := findPayssionURL(typed[key], depth+1); found != "" {
				return found
			}
		}
		for _, item := range typed {
			if found := findPayssionURL(item, depth+1); found != "" {
				return found
			}
		}
	}
	return ""
}

func isHTTPURL(raw string) bool {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	return err == nil && (parsed.Scheme == "http" || parsed.Scheme == "https") && parsed.Host != ""
}

func PayssionWebhook(c *gin.Context) {
	if !isPayssionWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Payssion webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion webhook 读取请求体失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	signature := c.GetHeader("Payssion-Signature")
	if signature == "" {
		signature = c.GetHeader("X-Payssion-Signature")
	}
	if !verifyPayssionWebhook(body, signature, setting.PayssionWebhookSecret) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Payssion webhook 验签失败 path=%q client_ip=%s signature=%q", c.Request.RequestURI, c.ClientIP(), signature))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	var event payssionWebhookEvent
	if err := common.Unmarshal(body, &event); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion webhook 解析失败 path=%q client_ip=%s error=%q body=%q", c.Request.RequestURI, c.ClientIP(), err.Error(), string(body)))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	eventType := extractPayssionEventType(event)
	tradeNo := extractPayssionTradeNo(event)
	status := extractPayssionPaymentStatus(event)
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Payssion webhook 收到事件 event_id=%s event=%s trade_no=%s status=%s client_ip=%s", event.ID, eventType, tradeNo, status, c.ClientIP()))

	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Payssion webhook 缺少本地订单号 event=%s client_ip=%s", eventType, c.ClientIP()))
		c.Status(http.StatusOK)
		return
	}

	if !isPayssionSuccessfulEvent(eventType, status) {
		if isPayssionFailedEvent(eventType, status) {
			if err := model.UpdatePendingTopUpStatus(tradeNo, model.PaymentProviderPayssion, common.TopUpStatusFailed); err != nil &&
				!errors.Is(err, model.ErrTopUpNotFound) &&
				!errors.Is(err, model.ErrTopUpStatusInvalid) {
				logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion 标记失败订单失败 trade_no=%s error=%q", tradeNo, err.Error()))
			}
		}
		c.Status(http.StatusOK)
		return
	}

	if err := validatePayssionPaidOrder(event, tradeNo); err != nil {
		if errors.Is(err, model.ErrTopUpNotFound) {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("Payssion webhook 本地订单不存在 trade_no=%s event=%s client_ip=%s", tradeNo, eventType, c.ClientIP()))
			c.Status(http.StatusOK)
			return
		}
		logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion webhook 支付校验失败 trade_no=%s event=%s error=%q", tradeNo, eventType, err.Error()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	if err := model.RechargePayssion(tradeNo, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Payssion 充值处理失败 trade_no=%s event=%s client_ip=%s error=%q", tradeNo, eventType, c.ClientIP(), err.Error()))
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	c.Status(http.StatusOK)
}

func verifyPayssionWebhook(body []byte, signature string, secret string) bool {
	secret = strings.TrimSpace(secret)
	if secret == "" || strings.TrimSpace(signature) == "" {
		return false
	}

	normalized := normalizePayssionSignature(signature)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expectedRaw := mac.Sum(nil)
	expectedHex := hex.EncodeToString(expectedRaw)
	if hmac.Equal([]byte(strings.ToLower(normalized)), []byte(expectedHex)) {
		return true
	}

	decoded, err := base64.StdEncoding.DecodeString(normalized)
	return err == nil && hmac.Equal(decoded, expectedRaw)
}

func normalizePayssionSignature(signature string) string {
	normalized := strings.TrimSpace(signature)
	if strings.Contains(normalized, "=") {
		for _, part := range strings.Split(normalized, ",") {
			kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
			if len(kv) != 2 {
				continue
			}
			if strings.EqualFold(kv[0], "v1") || strings.EqualFold(kv[0], "signature") || strings.EqualFold(kv[0], "sha256") {
				normalized = kv[1]
				break
			}
		}
	}
	return strings.TrimPrefix(normalized, "sha256=")
}

func extractPayssionEventType(event payssionWebhookEvent) string {
	if event.Type != "" {
		return event.Type
	}
	return event.Event
}

func extractPayssionTradeNo(event payssionWebhookEvent) string {
	for _, source := range payssionEventSources(event) {
		for _, path := range [][]string{
			{"reference"},
			{"merchant_order_id"},
			{"order_id"},
			{"metadata", "trade_no"},
			{"metadata", "reference"},
			{"payment", "reference"},
			{"object", "reference"},
			{"data", "object", "reference"},
		} {
			if value := payssionNestedString(source, path...); value != "" {
				return value
			}
		}
	}
	return ""
}

func extractPayssionPaymentStatus(event payssionWebhookEvent) string {
	for _, source := range payssionEventSources(event) {
		for _, path := range [][]string{
			{"status"},
			{"payment_status"},
			{"state"},
			{"payment", "status"},
			{"object", "status"},
			{"data", "object", "status"},
		} {
			if value := payssionNestedString(source, path...); value != "" {
				return strings.ToLower(value)
			}
		}
	}
	return ""
}

func isPayssionSuccessfulEvent(eventType, status string) bool {
	event := strings.ToLower(eventType)
	if event == "payment.succeeded" || strings.Contains(event, "payment_succeeded") {
		return true
	}

	switch strings.ToLower(status) {
	case "paid", "succeeded", "success", "completed", "complete":
		return true
	default:
		return false
	}
}

func isPayssionFailedEvent(eventType, status string) bool {
	event := strings.ToLower(eventType)
	if event == "payment.failed" || strings.Contains(event, "payment_failed") ||
		strings.Contains(event, "cancel") || strings.Contains(event, "expired") {
		return true
	}

	switch strings.ToLower(status) {
	case "failed", "failure", "canceled", "cancelled", "expired", "voided":
		return true
	default:
		return false
	}
}

func validatePayssionPaidOrder(event payssionWebhookEvent, tradeNo string) error {
	topUp := model.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		return model.ErrTopUpNotFound
	}
	if topUp.PaymentProvider != model.PaymentProviderPayssion {
		return model.ErrPaymentMethodMismatch
	}

	eventAmount, ok := extractPayssionAmount(event)
	if !ok {
		return errors.New("missing payment amount")
	}
	expectedAmount := parsePayssionAmount(formatPayssionAmount(topUp.Money, getPayssionCurrency()))
	if math.Abs(eventAmount-expectedAmount) > 0.000001 {
		return fmt.Errorf("amount mismatch: order=%.6f event=%.6f", expectedAmount, eventAmount)
	}

	eventCurrency := extractPayssionCurrency(event)
	if eventCurrency == "" {
		return errors.New("missing payment currency")
	}
	if !strings.EqualFold(eventCurrency, getPayssionCurrency()) {
		return fmt.Errorf("currency mismatch: order=%s event=%s", getPayssionCurrency(), eventCurrency)
	}

	return nil
}

func extractPayssionAmount(event payssionWebhookEvent) (float64, bool) {
	for _, source := range payssionEventSources(event) {
		for _, path := range [][]string{
			{"amount"},
			{"paid_amount"},
			{"payment_amount"},
			{"payment", "amount"},
			{"object", "amount"},
			{"data", "object", "amount"},
		} {
			if value, ok := payssionNestedFloat(source, path...); ok {
				return value, true
			}
		}
	}
	return 0, false
}

func extractPayssionCurrency(event payssionWebhookEvent) string {
	for _, source := range payssionEventSources(event) {
		for _, path := range [][]string{
			{"currency"},
			{"payment_currency"},
			{"payment", "currency"},
			{"object", "currency"},
			{"data", "object", "currency"},
		} {
			if value := payssionNestedString(source, path...); value != "" {
				return strings.ToUpper(value)
			}
		}
	}
	return ""
}

func payssionEventSources(event payssionWebhookEvent) []map[string]any {
	sources := make([]map[string]any, 0, 5)
	root := map[string]any{}
	if event.Type != "" {
		root["type"] = event.Type
	}
	if event.Event != "" {
		root["event"] = event.Event
	}
	if event.Data != nil {
		root["data"] = event.Data
	}
	if event.Object != nil {
		root["object"] = event.Object
	}
	if event.Payment != nil {
		root["payment"] = event.Payment
	}
	sources = append(sources, root)
	if event.Data != nil {
		sources = append(sources, event.Data)
		if object, ok := event.Data["object"].(map[string]any); ok {
			sources = append(sources, object)
		}
	}
	if event.Object != nil {
		sources = append(sources, event.Object)
	}
	if event.Payment != nil {
		sources = append(sources, event.Payment)
	}
	return sources
}

func payssionNestedString(source map[string]any, path ...string) string {
	value, ok := payssionNestedValue(source, path...)
	if !ok || value == nil {
		return ""
	}
	switch typed := value.(type) {
	case string:
		return strings.TrimSpace(typed)
	case fmt.Stringer:
		return strings.TrimSpace(typed.String())
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", typed))
	}
}

func payssionNestedFloat(source map[string]any, path ...string) (float64, bool) {
	value, ok := payssionNestedValue(source, path...)
	if !ok || value == nil {
		return 0, false
	}
	switch typed := value.(type) {
	case float64:
		return typed, true
	case float32:
		return float64(typed), true
	case int:
		return float64(typed), true
	case int64:
		return float64(typed), true
	case string:
		parsed := parsePayssionAmount(typed)
		return parsed, strings.TrimSpace(typed) != ""
	default:
		parsed, err := strconv.ParseFloat(fmt.Sprintf("%v", typed), 64)
		return parsed, err == nil
	}
}

func payssionNestedValue(source map[string]any, path ...string) (any, bool) {
	var current any = source
	for _, key := range path {
		object, ok := current.(map[string]any)
		if !ok {
			return nil, false
		}
		current, ok = object[key]
		if !ok {
			return nil, false
		}
	}
	return current, true
}

func parsePayssionAmount(raw string) float64 {
	value, _ := strconv.ParseFloat(strings.TrimSpace(raw), 64)
	return value
}
