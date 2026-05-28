package controller

import (
	"context"
	"fmt"
	"io"
	"net/http"
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
)

func init() {
	apiModel.VerifyPendingTopUpPayment = verifyPendingTopUpPayment
}

type AntomPayRequest struct {
	Amount            int64  `json:"amount"`
	PaymentMethodType string `json:"paymentMethodType"`
}

func getAntomClient() *defaultAlipayClient.DefaultAlipayClient {
	baseURL := setting.AntomBaseURL()
	clientId := setting.AntomClientId
	privateKey := setting.AntomMerchantPrivateKey
	publicKey := setting.AntomPublicKey

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

	antomClient = defaultAlipayClient.NewDefaultAlipayClient(baseURL, clientId, privateKey, publicKey)
	antomClientCfg.clientId = clientId
	antomClientCfg.privateKey = privateKey
	antomClientCfg.publicKey = publicKey
	antomClientCfg.baseURL = baseURL
	return antomClient
}

func getAntomMinTopup() int64 {
	minTopup := setting.AntomMinTopUp
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		minTopup = minTopup * int(common.QuotaPerUnit)
	}
	return int64(minTopup)
}

func getAntomPayMoney(amount float64, group string) float64 {
	originalAmount := int64(amount)
	dAmount := decimal.NewFromFloat(amount)
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount = dAmount.Div(decimal.NewFromFloat(common.QuotaPerUnit))
	}

	topupGroupRatio := common.GetTopupGroupRatio(group)
	if topupGroupRatio == 0 {
		topupGroupRatio = 1
	}

	discount := 1.0
	if ds, ok := operation_setting.GetPaymentSetting().AmountDiscount[int(originalAmount)]; ok && ds > 0 {
		discount = ds
	}

	return dAmount.
		Mul(decimal.NewFromFloat(setting.AntomUnitPrice)).
		Mul(decimal.NewFromFloat(topupGroupRatio)).
		Mul(decimal.NewFromFloat(discount)).
		InexactFloat64()
}

func RequestAntomAmount(c *gin.Context) {
	var req AntomPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getAntomMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getAntomMinTopup())})
		return
	}

	id := c.GetInt("id")
	group, err := apiModel.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}

	payMoney := getAntomPayMoney(float64(req.Amount), group)
	if payMoney <= 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": strconv.FormatFloat(payMoney, 'f', 2, 64)})
}

func RequestAntomPay(c *gin.Context) {
	if !isAntomTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "Antom 支付未启用"})
		return
	}

	var req AntomPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}

	if req.Amount < getAntomMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getAntomMinTopup())})
		return
	}

	id := c.GetInt("id")
	user, err := apiModel.GetUserById(id, false)
	if err != nil || user == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "用户不存在"})
		return
	}

	group, _ := apiModel.GetUserGroup(id, true)
	payMoney := getAntomPayMoney(float64(req.Amount), group)
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

	tradeNo := fmt.Sprintf("ANTOM-%d-%s", time.Now().UnixMilli(), randstr.String(16))
	topUp := &apiModel.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   apiModel.PaymentMethodAntom,
		PaymentProvider: apiModel.PaymentProviderAntom,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	client := getAntomClient()
	if client == nil {
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "支付服务配置错误"})
		return
	}

	callbackAddr := service.GetCallbackAddress()
	returnURL := paymentReturnPath("/console/topup?show_history=true")

	amountCents := antomAmountValue(payMoney, setting.AntomCurrency)
	payAmount := &antomModel.Amount{Value: amountCents, Currency: strings.ToUpper(setting.AntomCurrency)}

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

	if req.PaymentMethodType != "" {
		payRequest.PaymentMethod = &antomModel.PaymentMethod{PaymentMethodType: req.PaymentMethodType}
		if strings.ToUpper(req.PaymentMethodType) == "CARD" {
			payRequest.PaymentFactor = &antomModel.PaymentFactor{IsAuthorization: true}
		}
	}

	resp, err := client.Execute(request)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom 支付请求失败 user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	paymentURL := extractAntomPaymentURL(resp)
	if paymentURL == "" {
		resultInfo := ""
		if payResp, ok := resp.(*responsePay.AlipayPayResponse); ok && payResp.Result != nil {
			resultInfo = fmt.Sprintf("resultCode=%s resultStatus=%s resultMessage=%s", payResp.Result.ResultCode, payResp.Result.ResultStatus, payResp.Result.ResultMessage)
		}
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom 支付链接为空 user_id=%d trade_no=%s %s", id, tradeNo, resultInfo))
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Antom 充值订单创建成功 user_id=%d trade_no=%s amount=%d money=%.2f", id, tradeNo, req.Amount, payMoney))
	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"payment_url": paymentURL,
			"order_id":    tradeNo,
		},
	})
}

func AntomWebhook(c *gin.Context) {
	if !isAntomWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Antom webhook 被拒绝 reason=webhook_disabled client_ip=%s", c.ClientIP()))
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	rawBody, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom webhook 读取请求体失败 client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, response.Result{ResultCode: "FAIL", ResultMessage: "fail.", ResultStatus: "F"})
		return
	}

	requestURI := c.Request.RequestURI
	requestMethod := c.Request.Method
	requestTime := c.GetHeader("request-time")
	clientID := c.GetHeader("client-id")
	signature := c.GetHeader("signature")

	checkSignature, err := tools.CheckSignature(requestURI, requestMethod, clientID, requestTime, string(rawBody), signature, setting.AntomPublicKey)
	if err != nil || !checkSignature {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("Antom webhook 验签失败 client_ip=%s", c.ClientIP()))
		c.JSON(http.StatusOK, response.Result{ResultCode: "FAIL", ResultMessage: "fail.", ResultStatus: "F"})
		return
	}

	var paymentNotify notify.AlipayPayResultNotify
	if err := common.Unmarshal(rawBody, &paymentNotify); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom webhook 解析失败 client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, response.Result{ResultCode: "FAIL", ResultMessage: "fail.", ResultStatus: "F"})
		return
	}

	tradeNo := paymentNotify.PaymentRequestId
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("Antom webhook 收到通知 trade_no=%s result_code=%s client_ip=%s", tradeNo, paymentNotify.Result.ResultCode, c.ClientIP()))

	if paymentNotify.Result.ResultCode != "SUCCESS" {
		c.JSON(http.StatusOK, response.Result{ResultCode: "SUCCESS", ResultMessage: "success.", ResultStatus: "S"})
		return
	}

	if tradeNo == "" {
		c.JSON(http.StatusOK, response.Result{ResultCode: "SUCCESS", ResultMessage: "success.", ResultStatus: "S"})
		return
	}

	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)

	if err := apiModel.RechargeAntom(tradeNo, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom 充值处理失败 trade_no=%s client_ip=%s error=%q", tradeNo, c.ClientIP(), err.Error()))
		c.JSON(http.StatusOK, response.Result{ResultCode: "FAIL", ResultMessage: "fail.", ResultStatus: "F"})
		return
	}

	c.JSON(http.StatusOK, response.Result{ResultCode: "SUCCESS", ResultMessage: "success.", ResultStatus: "S"})
}

func antomAmountValue(money float64, currency string) string {
	currency = strings.ToUpper(currency)
	// Antom 要求金额为最小货币单位（如美元为分）
	// 零小数货币（如 JPY、KRW）不需要乘以 100
	zeroDecimalCurrencies := map[string]bool{
		"JPY": true, "KRW": true, "VND": true, "BIF": true,
		"CLP": true, "DJF": true, "GNF": true, "ISK": true,
		"KMF": true, "PYG": true, "RWF": true, "UGX": true,
		"XAF": true, "XOF": true, "XPF": true,
	}
	if zeroDecimalCurrencies[currency] {
		return decimal.NewFromFloat(money).Round(0).StringFixed(0)
	}
	return decimal.NewFromFloat(money).Mul(decimal.NewFromInt(100)).Round(0).StringFixed(0)
}

func extractAntomPaymentURL(resp interface{}) string {
	if resp == nil {
		return ""
	}
	payResp, ok := resp.(*responsePay.AlipayPayResponse)
	if !ok {
		return ""
	}
	if payResp.NormalUrl != "" {
		return payResp.NormalUrl
	}
	if payResp.SchemeUrl != "" {
		return payResp.SchemeUrl
	}
	if payResp.ApplinkUrl != "" {
		return payResp.ApplinkUrl
	}
	if payResp.RedirectActionForm != nil && payResp.RedirectActionForm.RedirectUrl != "" {
		return payResp.RedirectActionForm.RedirectUrl
	}
	return ""
}

func antomQueryPaymentStatus(queryResp *responsePay.AlipayPayQueryResponse) apiModel.TopUpRemotePaymentStatus {
	if queryResp == nil || queryResp.Result == nil {
		return apiModel.TopUpRemotePaymentStatusUnknown
	}
	if queryResp.Result.ResultStatus == "F" {
		return apiModel.TopUpRemotePaymentStatusFailed
	}

	switch queryResp.PaymentStatus {
	case antomModel.TransactionStatusType_SUCCESS:
		return apiModel.TopUpRemotePaymentStatusPaid
	case antomModel.TransactionStatusType_FAIL, antomModel.TransactionStatusType_CANCELLED:
		return apiModel.TopUpRemotePaymentStatusFailed
	case antomModel.TransactionStatusType_PROCESSING, antomModel.TransactionStatusType_PENDING:
		return apiModel.TopUpRemotePaymentStatusPending
	default:
		if queryResp.Result.ResultCode != "SUCCESS" {
			return apiModel.TopUpRemotePaymentStatusUnknown
		}
		return apiModel.TopUpRemotePaymentStatusPending
	}
}

func queryAntomPaymentStatus(tradeNo string) (apiModel.TopUpRemotePaymentStatus, error) {
	client := getAntomClient()
	if client == nil {
		return apiModel.TopUpRemotePaymentStatusUnknown, nil
	}

	queryRequest, queryParam := pay.NewAlipayPayQueryRequest()
	queryParam.PaymentRequestId = tradeNo
	resp, err := client.Execute(queryRequest)
	if err != nil {
		return apiModel.TopUpRemotePaymentStatusUnknown, err
	}

	queryResp, ok := resp.(*responsePay.AlipayPayQueryResponse)
	if !ok || queryResp.Result == nil {
		return apiModel.TopUpRemotePaymentStatusUnknown, nil
	}

	return antomQueryPaymentStatus(queryResp), nil
}

func verifyPendingTopUpPayment(topUp *apiModel.TopUp) (apiModel.TopUpRemotePaymentStatus, error) {
	if topUp == nil || topUp.PaymentProvider != apiModel.PaymentProviderAntom {
		return apiModel.TopUpRemotePaymentStatusUnknown, nil
	}

	status, err := queryAntomPaymentStatus(topUp.TradeNo)
	if err != nil || status != apiModel.TopUpRemotePaymentStatusPaid {
		return status, err
	}

	LockOrder(topUp.TradeNo)
	defer UnlockOrder(topUp.TradeNo)
	if err := apiModel.RechargeAntom(topUp.TradeNo, "system"); err != nil {
		logger.LogError(context.Background(), fmt.Sprintf("Antom expired-order compensation failed trade_no=%s error=%q", topUp.TradeNo, err.Error()))
		return apiModel.TopUpRemotePaymentStatusUnknown, err
	}

	return apiModel.TopUpRemotePaymentStatusPaid, nil
}

func RequestAntomInquiry(c *gin.Context) {
	tradeNo := c.Query("trade_no")
	if tradeNo == "" {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "缺少订单号"})
		return
	}

	id := c.GetInt("id")
	topUp := apiModel.GetTopUpByTradeNo(tradeNo)
	if topUp == nil || topUp.UserId != id {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "订单不存在"})
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

	client := getAntomClient()
	if client == nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "支付服务配置错误"})
		return
	}

	queryRequest, queryParam := pay.NewAlipayPayQueryRequest()
	queryParam.PaymentRequestId = tradeNo
	resp, err := client.Execute(queryRequest)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("Antom 查询支付状态失败 trade_no=%s error=%q", tradeNo, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "查询失败"})
		return
	}

	queryResp, ok := resp.(*responsePay.AlipayPayQueryResponse)
	if !ok || queryResp.Result == nil {
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": "pending"})
		return
	}

	status := antomQueryPaymentStatus(queryResp)
	if status == apiModel.TopUpRemotePaymentStatusPaid {
		LockOrder(tradeNo)
		defer UnlockOrder(tradeNo)
		if err := apiModel.RechargeAntom(tradeNo, c.ClientIP()); err != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("Antom 查询后充值失败 trade_no=%s error=%q", tradeNo, err.Error()))
		}
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": "paid"})
		return
	}

	if status == apiModel.TopUpRemotePaymentStatusFailed {
		topUp.Status = common.TopUpStatusFailed
		_ = topUp.Update()
		c.JSON(http.StatusOK, gin.H{"message": "success", "data": "failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "success", "data": "pending"})
}
