package controller

import (
	"context"
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	apiModel "github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	defaultAlipayClient "github.com/alipay/global-open-sdk-go/com/alipay/api"
	antomModel "github.com/alipay/global-open-sdk-go/com/alipay/api/model"
	antomRequest "github.com/alipay/global-open-sdk-go/com/alipay/api/request"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/request/notify"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/request/pay"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/response"
	responsePay "github.com/alipay/global-open-sdk-go/com/alipay/api/response/pay"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/tools"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"github.com/thanhpk/randstr"
)

var (
	antomClientMu  sync.RWMutex
	antomClient    *defaultAlipayClient.DefaultAlipayClient
	antomClientCfg struct {
		clientId   string
		privateKey string
		publicKey  string
		baseURL    string
	}
	antomExecuteRequest = func(client *defaultAlipayClient.DefaultAlipayClient, req *antomRequest.AlipayRequest) (any, error) {
		return client.Execute(req)
	}
)

func init() {
	apiModel.VerifyPendingTopUpPayment = verifyPendingTopUpPayment
}

type AntomPayRequest struct {
	Amount            int64  `json:"amount"`
	PaymentMethodType string `json:"paymentMethodType"`
}

type antomPaymentPricing struct {
	Currency  string
	UnitPrice decimal.Decimal
}

type antomOrderMetadata struct {
	UserID   string `json:"user_id,omitempty"`
	TradeNo  string `json:"trade_no,omitempty"`
	Currency string `json:"currency,omitempty"`
}

type antomWebhookResponse struct {
	Result response.Result `json:"result"`
}

func antomWebhookSuccessResponse() antomWebhookResponse {
	return antomWebhookResponse{
		Result: response.Result{
			ResultCode:    "SUCCESS",
			ResultStatus:  "S",
			ResultMessage: "Success",
		},
	}
}

func antomWebhookFailResponse() antomWebhookResponse {
	return antomWebhookResponse{
		Result: response.Result{
			ResultCode:    "FAIL",
			ResultStatus:  "F",
			ResultMessage: "Fail",
		},
	}
}

func isFinitePositive(v float64) bool {
	return !math.IsNaN(v) && !math.IsInf(v, 0) && v > 0
}

func isAntomZeroDecimalCurrency(currency string) bool {
	switch strings.ToUpper(strings.TrimSpace(currency)) {
	case "JPY", "KRW", "VND", "BIF", "CLP", "DJF", "GNF", "ISK",
		"KMF", "PYG", "RWF", "UGX", "XAF", "XOF", "XPF":
		return true
	default:
		return false
	}
}

func defaultAntomCurrencyForPaymentMethod(paymentMethodType string) string {
	switch strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(paymentMethodType), "-", "_")) {
	case "ALIPAY_CN", "ALIPAYCN":
		return "CNY"
	case "ALIPAY_HK", "ALIPAYHK":
		return "HKD"
	default:
		return ""
	}
}

func getAntomClient() *defaultAlipayClient.DefaultAlipayClient {
	baseURL := strings.TrimSpace(setting.AntomBaseURL())
	clientId := strings.TrimSpace(setting.AntomClientId)
	privateKey := strings.TrimSpace(setting.AntomMerchantPrivateKey)
	publicKey := strings.TrimSpace(setting.AntomPublicKey)
	if baseURL == "" || clientId == "" || privateKey == "" || publicKey == "" {
		return nil
	}

	antomClientMu.RLock()
	if antomClient != nil &&
		antomClientCfg.clientId == clientId &&
		antomClientCfg.privateKey == privateKey &&
		antomClientCfg.publicKey == publicKey &&
		antomClientCfg.baseURL == baseURL {
		c := antomClient
		antomClientMu.RUnlock()
		return c
	}
	antomClientMu.RUnlock()

	antomClientMu.Lock()
	defer antomClientMu.Unlock()

	if antomClient != nil &&
		antomClientCfg.clientId == clientId &&
		antomClientCfg.privateKey == privateKey &&
		antomClientCfg.publicKey == publicKey &&
		antomClientCfg.baseURL == baseURL {
		return antomClient
	}

	antomClient = defaultAlipayClient.NewDefaultAlipayClient(baseURL, clientId, privateKey, publicKey)
	antomClientCfg.clientId = clientId
	antomClientCfg.privateKey = privateKey
	antomClientCfg.publicKey = publicKey
	antomClientCfg.baseURL = baseURL
	return antomClient
}

func getAntomMinTopup() int64 {
	minTopup := max(setting.AntomMinTopUp, 1)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		if !isFinitePositive(common.QuotaPerUnit) {
			return common.MaxWalletQuota
		}
		dMinTopup := decimal.NewFromInt(int64(minTopup))
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		quota, err := common.WalletQuotaFromDecimalStrict(dMinTopup.Mul(dQuotaPerUnit))
		if err != nil {
			return common.MaxWalletQuota
		}
		minTopup = quota
	}
	return int64(minTopup)
}

func resolveAntomPaymentMethod(paymentMethodType string) (setting.AntomPaymentMethod, bool) {
	paymentMethodType = strings.TrimSpace(paymentMethodType)
	if paymentMethodType == "" {
		return setting.AntomPaymentMethod{}, false
	}
	for _, method := range setting.GetAntomPaymentMethods() {
		if method.Type == paymentMethodType {
			return method, true
		}
	}
	return setting.AntomPaymentMethod{}, false
}

func getAntomPaymentPricing(paymentMethodType string) antomPaymentPricing {
	currency := strings.ToUpper(strings.TrimSpace(setting.AntomCurrency))
	if currency == "" {
		currency = "CNY"
	}
	unitPrice := decimal.Zero
	if isFinitePositive(setting.AntomUnitPrice) {
		unitPrice = decimal.NewFromFloat(setting.AntomUnitPrice)
	}
	if method, ok := resolveAntomPaymentMethod(paymentMethodType); ok {
		if method.Currency != "" {
			currency = method.Currency
		} else if methodCurrency := defaultAntomCurrencyForPaymentMethod(method.Type); methodCurrency != "" {
			currency = methodCurrency
		}
		if isFinitePositive(method.UnitPrice) {
			unitPrice = decimal.NewFromFloat(method.UnitPrice)
		} else if isFinitePositive(method.ExchangeRate) {
			unitPrice = unitPrice.Mul(decimal.NewFromFloat(method.ExchangeRate))
		}
	}
	return antomPaymentPricing{Currency: currency, UnitPrice: unitPrice}
}

func calculateAntomPayMoney(amount int64, group string, paymentMethodType string) (decimal.Decimal, string, antomPaymentPricing, error) {
	if amount <= 0 {
		return decimal.Zero, "", antomPaymentPricing{}, errors.New("invalid top-up amount")
	}
	if !isFinitePositive(common.QuotaPerUnit) {
		return decimal.Zero, "", antomPaymentPricing{}, errors.New("invalid quota unit configuration")
	}

	dAmount := decimal.NewFromInt(amount)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount = dAmount.Div(decimal.NewFromFloat(common.QuotaPerUnit))
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}
	if !isFinitePositive(topupGroupRatio) {
		return decimal.Zero, "", antomPaymentPricing{}, errors.New("invalid group ratio")
	}

	discount := 1.0
	if amount <= math.MaxInt {
		if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(amount)]; ok && isFinitePositive(ds) {
			discount = ds
		}
	}

	pricing := getAntomPaymentPricing(paymentMethodType)
	if !pricing.UnitPrice.IsPositive() {
		return decimal.Zero, "", pricing, errors.New("invalid unit price")
	}

	rawMoney := dAmount.
		Mul(pricing.UnitPrice).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discount))

	if isAntomZeroDecimalCurrency(pricing.Currency) {
		rounded := rawMoney.Round(0)
		if !rounded.IsPositive() {
			return decimal.Zero, "", pricing, errors.New("payment amount is too low")
		}
		return rounded, rounded.StringFixed(0), pricing, nil
	}

	rounded := rawMoney.Round(2)
	if rounded.LessThan(decimal.NewFromFloat(0.01)) {
		return decimal.Zero, "", pricing, errors.New("payment amount is too low")
	}
	minor := rounded.Mul(decimal.NewFromInt(100)).Round(0)
	if !minor.IsPositive() {
		return decimal.Zero, "", pricing, errors.New("payment amount is too low")
	}
	return rounded, minor.StringFixed(0), pricing, nil
}

func RequestAntomAmount(c *gin.Context) {
	var req AntomPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		paymentError(c, common.NewMessage("Invalid parameters"))
		return
	}

	minTopup := getAntomMinTopup()
	if req.Amount < minTopup {
		paymentError(c, common.NewMessage("Top-up amount cannot be less than {{min}}", map[string]any{"min": minTopup}))
		return
	}

	req.PaymentMethodType = strings.TrimSpace(req.PaymentMethodType)
	if !setting.IsAntomPaymentMethodAllowed(req.PaymentMethodType) {
		paymentError(c, common.NewMessage("Unsupported payment method"))
		return
	}

	id := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, id, req.Amount) {
		return
	}

	group, err := apiModel.GetUserGroup(id, true)
	if err != nil {
		paymentError(c, common.NewMessage("Failed to get the user group"))
		return
	}

	payMoney, _, _, err := calculateAntomPayMoney(req.Amount, group, req.PaymentMethodType)
	if err != nil {
		paymentError(c, common.NewMessage("Payment amount is too low"))
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney.InexactFloat64(), 'f', 2, 64)})
}

func RequestAntomPay(c *gin.Context) {
	if !isAntomTopUpEnabled() {
		paymentError(c, common.NewMessage("Online payment is not enabled. Please contact the administrator."))
		return
	}

	var req AntomPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		paymentError(c, common.NewMessage("Invalid parameters"))
		return
	}

	minTopup := getAntomMinTopup()
	if req.Amount < minTopup {
		paymentError(c, common.NewMessage("Top-up amount cannot be less than {{min}}", map[string]any{"min": minTopup}))
		return
	}

	req.PaymentMethodType = strings.TrimSpace(req.PaymentMethodType)
	if !setting.IsAntomPaymentMethodAllowed(req.PaymentMethodType) {
		paymentError(c, common.NewMessage("Unsupported payment method"))
		return
	}

	id := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, id, req.Amount) {
		return
	}

	user, err := apiModel.GetUserById(id, false)
	if err != nil || user == nil {
		paymentError(c, common.NewMessage("User does not exist"))
		return
	}

	payMoneyDecimal, amountCents, pricing, err := calculateAntomPayMoney(req.Amount, user.Group, req.PaymentMethodType)
	if err != nil {
		paymentError(c, common.NewMessage("Payment amount is too low"))
		return
	}
	payMoney := payMoneyDecimal.InexactFloat64()

	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		amount = decimal.NewFromInt(req.Amount).Div(decimal.NewFromFloat(common.QuotaPerUnit)).IntPart()
		if amount < 1 {
			paymentError(c, common.NewMessage("Top-up amount cannot be less than {{min}}", map[string]any{"min": minTopup}))
			return
		}
	}

	client := getAntomClient()
	if client == nil {
		paymentError(c, common.NewMessage("Payment configuration error"))
		return
	}

	tradeNo := fmt.Sprintf("ANTOM-%d-%s", time.Now().UnixMilli(), randstr.String(16))
	topUp := &apiModel.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		Currency:        pricing.Currency,
		TradeNo:         tradeNo,
		PaymentMethod:   apiModel.PaymentMethodAntom,
		PaymentProvider: apiModel.PaymentProviderAntom,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom create top-up order failed user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		paymentError(c, common.NewMessage("Failed to create order"))
		return
	}

	callbackAddr := service.GetCallbackAddress()
	returnURL := paymentReturnPath("/console/topup?show_history=true")
	payAmount := &antomModel.Amount{Value: amountCents, Currency: pricing.Currency}

	request, payRequest := pay.NewAlipayPayRequest()
	payRequest.ProductCode = antomModel.CASHIER_PAYMENT
	payRequest.PaymentAmount = payAmount
	payRequest.PaymentRequestId = tradeNo
	payRequest.Order = &antomModel.Order{
		ReferenceOrderId: tradeNo,
		OrderDescription: fmt.Sprintf("Recharge %d credits", req.Amount),
		OrderAmount:      payAmount,
		Buyer:            &antomModel.Buyer{ReferenceBuyerId: strconv.Itoa(id)},
	}
	payRequest.Env = &antomModel.Env{TerminalType: antomModel.WEB, ClientIp: c.ClientIP()}
	payRequest.PaymentNotifyUrl = callbackAddr + "/api/antom/webhook"
	payRequest.PaymentRedirectUrl = returnURL

	if metaBytes, marshalErr := common.Marshal(antomOrderMetadata{
		UserID:   strconv.Itoa(id),
		TradeNo:  tradeNo,
		Currency: pricing.Currency,
	}); marshalErr == nil {
		payRequest.Metadata = string(metaBytes)
	}

	if req.PaymentMethodType != "" {
		payRequest.PaymentMethod = &antomModel.PaymentMethod{PaymentMethodType: req.PaymentMethodType}
		if strings.EqualFold(req.PaymentMethodType, "CARD") {
			payRequest.PaymentFactor = &antomModel.PaymentFactor{
				IsAuthorization: true,
				CaptureMode:     "AUTOMATIC",
			}
		}
	}

	resp, err := antomExecuteRequest(client, request)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom payment request failed user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		_ = apiModel.UpdatePendingTopUpStatus(tradeNo, apiModel.PaymentProviderAntom, common.TopUpStatusFailed)
		paymentError(c, common.NewMessage("Failed to start payment"))
		return
	}

	paymentURL := extractAntomPaymentURL(resp)
	if paymentURL == "" {
		resultInfo := ""
		if payResp, ok := resp.(*responsePay.AlipayPayResponse); ok && payResp.Result != nil {
			resultInfo = fmt.Sprintf("resultCode=%s resultStatus=%s resultMessage=%s", payResp.Result.ResultCode, payResp.Result.ResultStatus, payResp.Result.ResultMessage)
		}
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom payment URL empty user_id=%d trade_no=%s %s", id, tradeNo, resultInfo))
		_ = apiModel.UpdatePendingTopUpStatus(tradeNo, apiModel.PaymentProviderAntom, common.TopUpStatusFailed)
		paymentError(c, common.NewMessage("Failed to start payment"))
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Antom top-up order created user_id=%d trade_no=%s amount=%d money=%.2f currency=%s", id, tradeNo, req.Amount, payMoney, pricing.Currency))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url": paymentURL,
			"order_id":    tradeNo,
		},
	})
}

func expectedAntomCurrency(topUp *apiModel.TopUp) string {
	if topUp != nil {
		if currency := strings.ToUpper(strings.TrimSpace(topUp.Currency)); currency != "" {
			return currency
		}
	}
	return getAntomPaymentPricing("").Currency
}

func validateAntomAmount(topUp *apiModel.TopUp, amount *antomModel.Amount) error {
	if topUp == nil {
		return errors.New("missing_order")
	}
	if amount == nil {
		return errors.New("missing_payment_amount")
	}

	expectedCurrency := expectedAntomCurrency(topUp)
	actualCurrency := strings.ToUpper(strings.TrimSpace(amount.Currency))
	if actualCurrency == "" {
		return errors.New("missing_payment_currency")
	}
	if actualCurrency != expectedCurrency {
		return fmt.Errorf("currency_mismatch(expected=%s,actual=%s)", expectedCurrency, actualCurrency)
	}

	expectedValue := antomAmountValue(topUp.Money, expectedCurrency)
	if expectedValue == "" {
		return errors.New("invalid_expected_amount")
	}
	expectedDecimal, err := decimal.NewFromString(expectedValue)
	if err != nil || !expectedDecimal.IsPositive() {
		return errors.New("invalid_expected_amount")
	}

	rawActual := strings.TrimSpace(amount.Value)
	if rawActual == "" {
		return errors.New("missing_payment_value")
	}
	actualDecimal, err := decimal.NewFromString(rawActual)
	if err != nil || !actualDecimal.IsInteger() || !actualDecimal.IsPositive() {
		return fmt.Errorf("invalid_payment_value(%q)", rawActual)
	}
	if !actualDecimal.Equal(expectedDecimal) {
		return fmt.Errorf("amount_mismatch(expected=%s,actual=%s)", expectedDecimal.String(), actualDecimal.String())
	}
	return nil
}

func validateAntomMetadata(topUp *apiModel.TopUp, rawMetadata string) error {
	rawMetadata = strings.TrimSpace(rawMetadata)
	if rawMetadata == "" || topUp == nil {
		return nil
	}

	var meta antomOrderMetadata
	if err := common.UnmarshalJsonStr(rawMetadata, &meta); err != nil {
		return errors.New("invalid_metadata")
	}

	if uid := strings.TrimSpace(meta.UserID); uid != "" && uid != strconv.Itoa(topUp.UserId) {
		return fmt.Errorf("buyer_mismatch(expected=%d,actual=%s)", topUp.UserId, uid)
	}
	if metaTradeNo := strings.TrimSpace(meta.TradeNo); metaTradeNo != "" && metaTradeNo != topUp.TradeNo {
		return fmt.Errorf("order_mismatch(expected=%s,actual=%s)", topUp.TradeNo, metaTradeNo)
	}
	if metaCurrency := strings.ToUpper(strings.TrimSpace(meta.Currency)); metaCurrency != "" && metaCurrency != expectedAntomCurrency(topUp) {
		return fmt.Errorf("metadata_currency_mismatch(expected=%s,actual=%s)", expectedAntomCurrency(topUp), metaCurrency)
	}
	return nil
}

func validateAntomNotifyPayload(topUp *apiModel.TopUp, paymentNotify *notify.AlipayPayResultNotify) error {
	if topUp == nil || paymentNotify == nil {
		return errors.New("missing_notify_payload")
	}
	if strings.TrimSpace(paymentNotify.PaymentRequestId) != topUp.TradeNo {
		return fmt.Errorf("payment_request_id_mismatch(expected=%s,actual=%s)", topUp.TradeNo, strings.TrimSpace(paymentNotify.PaymentRequestId))
	}
	if err := validateAntomAmount(topUp, paymentNotify.PaymentAmount); err != nil {
		return err
	}
	return validateAntomMetadata(topUp, paymentNotify.Metadata)
}

func validateAntomQueryPayment(topUp *apiModel.TopUp, queryResp *responsePay.AlipayPayQueryResponse) error {
	if topUp == nil {
		return errors.New("missing_order")
	}
	if topUp.PaymentProvider != apiModel.PaymentProviderAntom {
		return errors.New("provider_mismatch")
	}
	if queryResp == nil || queryResp.Result == nil {
		return errors.New("missing_query_result")
	}
	if strings.ToUpper(strings.TrimSpace(string(queryResp.Result.ResultStatus))) != "S" ||
		strings.ToUpper(strings.TrimSpace(queryResp.Result.ResultCode)) != "SUCCESS" {
		return fmt.Errorf("invalid_result(status=%s,code=%s)", queryResp.Result.ResultStatus, queryResp.Result.ResultCode)
	}
	if queryResp.PaymentStatus != antomModel.TransactionStatusType_SUCCESS {
		return fmt.Errorf("payment_status_not_success(%s)", queryResp.PaymentStatus)
	}
	if strings.TrimSpace(queryResp.PaymentRequestId) != topUp.TradeNo {
		return fmt.Errorf("payment_request_id_mismatch(expected=%s,actual=%s)", topUp.TradeNo, strings.TrimSpace(queryResp.PaymentRequestId))
	}
	if err := validateAntomAmount(topUp, queryResp.PaymentAmount); err != nil {
		return err
	}
	return validateAntomMetadata(topUp, queryResp.Metadata)
}

func AntomWebhook(c *gin.Context) {
	ctx := c.Request.Context()
	if !isAntomWebhookEnabled() {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=webhook_disabled client_ip=%s", c.ClientIP()))
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Antom webhook read body failed client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}

	requestURI := c.Request.RequestURI
	requestMethod := c.Request.Method
	requestTime := strings.TrimSpace(c.GetHeader("request-time"))
	clientID := strings.TrimSpace(c.GetHeader("client-id"))
	signature := strings.TrimSpace(c.GetHeader("signature"))

	if requestTime == "" || clientID == "" || signature == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=missing_headers client_ip=%s", c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}

	if clientID != strings.TrimSpace(setting.AntomClientId) {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=client_id_mismatch client_id=%q client_ip=%s", clientID, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}

	checkSignature, err := tools.CheckSignature(requestURI, requestMethod, clientID, requestTime, string(rawBody), signature, strings.TrimSpace(setting.AntomPublicKey))
	if err != nil || !checkSignature {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=invalid_signature client_ip=%s", c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}

	var paymentNotify notify.AlipayPayResultNotify
	if err := common.Unmarshal(rawBody, &paymentNotify); err != nil {
		logger.LogError(ctx, fmt.Sprintf("Antom webhook unmarshal failed client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}

	notifyType := strings.ToUpper(strings.TrimSpace(paymentNotify.NotifyType))
	resultCode := strings.ToUpper(strings.TrimSpace(paymentNotify.Result.ResultCode))
	resultStatus := strings.ToUpper(strings.TrimSpace(paymentNotify.Result.ResultStatus))
	tradeNo := strings.TrimSpace(paymentNotify.PaymentRequestId)

	logger.LogInfo(ctx, fmt.Sprintf("Antom webhook received trade_no=%s notify_type=%s result_code=%s result_status=%s client_ip=%s", tradeNo, notifyType, resultCode, resultStatus, c.ClientIP()))

	if notifyType != "PAYMENT_RESULT" {
		logger.LogInfo(ctx, fmt.Sprintf("Antom webhook ignored reason=non_payment_result trade_no=%s notify_type=%s result_code=%s result_status=%s client_ip=%s", tradeNo, notifyType, resultCode, resultStatus, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}

	if tradeNo == "" {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook ignored reason=missing_trade_no result_code=%s result_status=%s client_ip=%s", resultCode, resultStatus, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}

	if resultStatus == "F" {
		LockOrder(tradeNo)
		markErr := apiModel.UpdatePendingTopUpStatus(tradeNo, apiModel.PaymentProviderAntom, common.TopUpStatusFailed)
		UnlockOrder(tradeNo)
		if markErr != nil &&
			!errors.Is(markErr, apiModel.ErrTopUpNotFound) &&
			!errors.Is(markErr, apiModel.ErrPaymentMethodMismatch) &&
			!errors.Is(markErr, apiModel.ErrTopUpStatusInvalid) {
			logger.LogError(ctx, fmt.Sprintf("Antom webhook mark failed error trade_no=%s client_ip=%s error=%q", tradeNo, c.ClientIP(), markErr.Error()))
		}
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}

	if resultStatus != "S" || resultCode != "SUCCESS" {
		logger.LogInfo(ctx, fmt.Sprintf("Antom webhook ignored reason=non_success_result trade_no=%s result_code=%s result_status=%s client_ip=%s", tradeNo, resultCode, resultStatus, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}

	topUp := apiModel.GetTopUpByTradeNo(tradeNo)
	if topUp == nil {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=order_not_found trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}
	if topUp.PaymentProvider != apiModel.PaymentProviderAntom {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=provider_mismatch trade_no=%s user_id=%d provider=%s client_ip=%s", tradeNo, topUp.UserId, topUp.PaymentProvider, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}
	if topUp.Status == common.TopUpStatusSuccess {
		logger.LogInfo(ctx, fmt.Sprintf("Antom webhook duplicate ignored trade_no=%s user_id=%d client_ip=%s", tradeNo, topUp.UserId, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}
	if topUp.Status != common.TopUpStatusPending {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=order_status_invalid trade_no=%s user_id=%d status=%s client_ip=%s", tradeNo, topUp.UserId, topUp.Status, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		return
	}

	if err := validateAntomNotifyPayload(topUp, &paymentNotify); err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=%s trade_no=%s user_id=%d expected_money=%.2f expected_currency=%s client_ip=%s", err.Error(), tradeNo, topUp.UserId, topUp.Money, expectedAntomCurrency(topUp), c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}

	queryResp, status, err := queryAntomPayment(tradeNo)
	if err != nil {
		logger.LogError(ctx, fmt.Sprintf("Antom webhook inquiry failed trade_no=%s user_id=%d client_ip=%s error=%q", tradeNo, topUp.UserId, c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}
	if status != apiModel.TopUpRemotePaymentStatusPaid {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=inquiry_not_paid trade_no=%s user_id=%d remote_status=%s client_ip=%s", tradeNo, topUp.UserId, status, c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}
	if err := validateAntomQueryPayment(topUp, queryResp); err != nil {
		logger.LogWarn(ctx, fmt.Sprintf("Antom webhook rejected reason=inquiry_%s trade_no=%s user_id=%d expected_money=%.2f expected_currency=%s client_ip=%s", err.Error(), tradeNo, topUp.UserId, topUp.Money, expectedAntomCurrency(topUp), c.ClientIP()))
		c.JSON(http.StatusOK, antomWebhookFailResponse())
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	alreadyDone, err := apiModel.RechargeAntom(tradeNo, c.ClientIP())
	if err != nil {
		switch {
		case errors.Is(err, apiModel.ErrTopUpNotFound),
			errors.Is(err, apiModel.ErrPaymentMethodMismatch),
			errors.Is(err, apiModel.ErrTopUpStatusInvalid):
			logger.LogWarn(ctx, fmt.Sprintf("Antom webhook skipped after lock trade_no=%s user_id=%d client_ip=%s error=%q", tradeNo, topUp.UserId, c.ClientIP(), err.Error()))
			c.JSON(http.StatusOK, antomWebhookSuccessResponse())
		default:
			logger.LogError(ctx, fmt.Sprintf("Antom webhook recharge failed trade_no=%s user_id=%d client_ip=%s error=%q", tradeNo, topUp.UserId, c.ClientIP(), err.Error()))
			c.JSON(http.StatusOK, antomWebhookFailResponse())
		}
		return
	}
	if alreadyDone {
		logger.LogInfo(ctx, fmt.Sprintf("Antom webhook duplicate ignored after lock trade_no=%s user_id=%d client_ip=%s", tradeNo, topUp.UserId, c.ClientIP()))
	} else {
		logger.LogInfo(ctx, fmt.Sprintf("Antom webhook top-up succeeded trade_no=%s user_id=%d money=%.2f currency=%s client_ip=%s", tradeNo, topUp.UserId, topUp.Money, expectedAntomCurrency(topUp), c.ClientIP()))
	}

	c.JSON(http.StatusOK, antomWebhookSuccessResponse())
}

func antomAmountValue(money float64, currency string) string {
	if !isFinitePositive(money) {
		return ""
	}
	if isAntomZeroDecimalCurrency(currency) {
		return decimal.NewFromFloat(money).Round(0).StringFixed(0)
	}
	return decimal.NewFromFloat(money).Mul(decimal.NewFromInt(100)).Round(0).StringFixed(0)
}

func isSafeAntomRedirectURL(raw string) bool {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || strings.ContainsAny(trimmed, "\r\n") {
		return false
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" {
		return false
	}
	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		return parsed.Host != ""
	case "javascript", "data", "vbscript", "file", "blob":
		return false
	default:
		return true
	}
}

func extractAntomPaymentURL(resp any) string {
	if resp == nil {
		return ""
	}
	payResp, ok := resp.(*responsePay.AlipayPayResponse)
	if !ok {
		return ""
	}
	candidates := []string{
		payResp.NormalUrl,
		payResp.SchemeUrl,
		payResp.ApplinkUrl,
	}
	if payResp.RedirectActionForm != nil {
		candidates = append(candidates, payResp.RedirectActionForm.RedirectUrl)
	}
	for _, candidate := range candidates {
		if isSafeAntomRedirectURL(candidate) {
			return strings.TrimSpace(candidate)
		}
	}
	return ""
}

func antomQueryPaymentStatus(queryResp *responsePay.AlipayPayQueryResponse) apiModel.TopUpRemotePaymentStatus {
	if queryResp == nil || queryResp.Result == nil {
		return apiModel.TopUpRemotePaymentStatusUnknown
	}
	resultStatus := strings.ToUpper(strings.TrimSpace(string(queryResp.Result.ResultStatus)))
	resultCode := strings.ToUpper(strings.TrimSpace(queryResp.Result.ResultCode))
	if resultStatus == "F" {
		return apiModel.TopUpRemotePaymentStatusFailed
	}

	switch queryResp.PaymentStatus {
	case antomModel.TransactionStatusType_SUCCESS:
		if resultStatus != "S" || resultCode != "SUCCESS" {
			return apiModel.TopUpRemotePaymentStatusUnknown
		}
		return apiModel.TopUpRemotePaymentStatusPaid
	case antomModel.TransactionStatusType_FAIL, antomModel.TransactionStatusType_CANCELLED:
		return apiModel.TopUpRemotePaymentStatusFailed
	case antomModel.TransactionStatusType_PROCESSING, antomModel.TransactionStatusType_PENDING:
		return apiModel.TopUpRemotePaymentStatusPending
	default:
		if resultCode != "SUCCESS" {
			return apiModel.TopUpRemotePaymentStatusUnknown
		}
		return apiModel.TopUpRemotePaymentStatusPending
	}
}

func queryAntomPayment(tradeNo string) (*responsePay.AlipayPayQueryResponse, apiModel.TopUpRemotePaymentStatus, error) {
	client := getAntomClient()
	if client == nil {
		return nil, apiModel.TopUpRemotePaymentStatusUnknown, errors.New("antom client not configured")
	}

	queryRequest, queryParam := pay.NewAlipayPayQueryRequest()
	queryParam.PaymentRequestId = tradeNo
	resp, err := antomExecuteRequest(client, queryRequest)
	if err != nil {
		return nil, apiModel.TopUpRemotePaymentStatusUnknown, err
	}

	queryResp, ok := resp.(*responsePay.AlipayPayQueryResponse)
	if !ok || queryResp == nil || queryResp.Result == nil {
		return nil, apiModel.TopUpRemotePaymentStatusUnknown, nil
	}

	return queryResp, antomQueryPaymentStatus(queryResp), nil
}

func verifyPendingTopUpPayment(topUp *apiModel.TopUp) (apiModel.TopUpRemotePaymentStatus, error) {
	if topUp == nil || topUp.PaymentProvider != apiModel.PaymentProviderAntom {
		return apiModel.TopUpRemotePaymentStatusUnknown, nil
	}

	queryResp, status, err := queryAntomPayment(topUp.TradeNo)
	if err != nil || status != apiModel.TopUpRemotePaymentStatusPaid {
		return status, err
	}

	if err := validateAntomQueryPayment(topUp, queryResp); err != nil {
		logger.LogWarn(context.Background(), fmt.Sprintf("Antom expired-order compensation rejected reason=%s trade_no=%s user_id=%d expected_money=%.2f expected_currency=%s", err.Error(), topUp.TradeNo, topUp.UserId, topUp.Money, expectedAntomCurrency(topUp)))
		return apiModel.TopUpRemotePaymentStatusUnknown, err
	}

	LockOrder(topUp.TradeNo)
	defer UnlockOrder(topUp.TradeNo)
	if _, err := apiModel.RechargeAntom(topUp.TradeNo, "system"); err != nil {
		logger.LogError(context.Background(), fmt.Sprintf("Antom expired-order compensation failed trade_no=%s error=%q", topUp.TradeNo, err.Error()))
		return apiModel.TopUpRemotePaymentStatusUnknown, err
	}

	return apiModel.TopUpRemotePaymentStatusPaid, nil
}

func RequestAntomInquiry(c *gin.Context) {
	tradeNo := strings.TrimSpace(c.Query("trade_no"))
	if tradeNo == "" {
		paymentError(c, common.NewMessage("Order number not provided"))
		return
	}

	id := c.GetInt("id")
	topUp := apiModel.GetTopUpByTradeNo(tradeNo)
	if topUp == nil || topUp.UserId != id || topUp.PaymentProvider != apiModel.PaymentProviderAntom {
		paymentError(c, common.NewMessage("Top-up order does not exist"))
		return
	}

	if topUp.Status == common.TopUpStatusSuccess {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": "paid"})
		return
	}

	if topUp.Status != common.TopUpStatusPending {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": "failed"})
		return
	}

	queryResp, status, err := queryAntomPayment(tradeNo)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom payment inquiry failed trade_no=%s user_id=%d error=%q", tradeNo, id, err.Error()))
		paymentError(c, common.NewMessage("Payment request failed"))
		return
	}

	if status == apiModel.TopUpRemotePaymentStatusPaid {
		if err := validateAntomQueryPayment(topUp, queryResp); err != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("Antom inquiry rejected reason=%s trade_no=%s user_id=%d expected_money=%.2f expected_currency=%s client_ip=%s", err.Error(), tradeNo, id, topUp.Money, expectedAntomCurrency(topUp), c.ClientIP()))
			paymentError(c, common.NewMessage("Payment failed. You can start a new payment or contact support."))
			return
		}

		LockOrder(tradeNo)
		defer UnlockOrder(tradeNo)
		if _, err := apiModel.RechargeAntom(tradeNo, c.ClientIP()); err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Antom recharge after inquiry failed trade_no=%s user_id=%d error=%q", tradeNo, id, err.Error()))
			paymentError(c, err)
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": "paid"})
		return
	}

	if status == apiModel.TopUpRemotePaymentStatusFailed {
		LockOrder(tradeNo)
		markErr := apiModel.UpdatePendingTopUpStatus(tradeNo, apiModel.PaymentProviderAntom, common.TopUpStatusFailed)
		UnlockOrder(tradeNo)
		if errors.Is(markErr, apiModel.ErrTopUpStatusInvalid) {
			if latest := apiModel.GetTopUpByTradeNo(tradeNo); latest != nil && latest.Status == common.TopUpStatusSuccess {
				c.JSON(http.StatusOK, gin.H{"message": "success", "data": "paid"})
				return
			}
		} else if markErr != nil && !errors.Is(markErr, apiModel.ErrTopUpNotFound) {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Antom mark failed after inquiry error trade_no=%s user_id=%d error=%q", tradeNo, id, markErr.Error()))
		}
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": "failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": "pending"})
}
