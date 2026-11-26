package controller

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	apiModel "github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	defaultAlipayClient "github.com/alipay/global-open-sdk-go/com/alipay/api"
	antomModel "github.com/alipay/global-open-sdk-go/com/alipay/api/model"
	antomRequest "github.com/alipay/global-open-sdk-go/com/alipay/api/request"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/request/pay"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/response"
	responsePay "github.com/alipay/global-open-sdk-go/com/alipay/api/response/pay"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/tools"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestAntomWebhookSuccessResponseMatchesAntomSpec(t *testing.T) {
	body, err := common.Marshal(antomWebhookSuccessResponse())
	require.NoError(t, err)

	assert.JSONEq(t, `{"result":{"resultCode":"SUCCESS","resultStatus":"S","resultMessage":"Success"}}`, string(body))
}

func TestAntomQueryPaymentStatusRequiresPaymentStatusSuccess(t *testing.T) {
	resp := &responsePay.AlipayPayQueryResponse{
		Result: &antomModel.Result{
			ResultCode:   "SUCCESS",
			ResultStatus: "S",
		},
		PaymentStatus: antomModel.TransactionStatusType_PROCESSING,
	}

	assert.Equal(t, apiModel.TopUpRemotePaymentStatusPending, antomQueryPaymentStatus(resp))

	resp.PaymentStatus = antomModel.TransactionStatusType_PENDING
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusPending, antomQueryPaymentStatus(resp))

	resp.PaymentStatus = antomModel.TransactionStatusType_SUCCESS
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusPaid, antomQueryPaymentStatus(resp))

	resp.Result.ResultStatus = "U"
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusUnknown, antomQueryPaymentStatus(resp))
}

func TestAntomQueryPaymentStatusFailedStates(t *testing.T) {
	resp := &responsePay.AlipayPayQueryResponse{
		Result: &antomModel.Result{
			ResultCode:   "SUCCESS",
			ResultStatus: "S",
		},
		PaymentStatus: antomModel.TransactionStatusType_CANCELLED,
	}

	assert.Equal(t, apiModel.TopUpRemotePaymentStatusFailed, antomQueryPaymentStatus(resp))

	resp.PaymentStatus = antomModel.TransactionStatusType_FAIL
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusFailed, antomQueryPaymentStatus(resp))

	resp.Result.ResultStatus = "F"
	resp.PaymentStatus = antomModel.TransactionStatusType_PROCESSING
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusFailed, antomQueryPaymentStatus(resp))
}

func TestAntomQueryPaymentStatusUnknownOrMissingPaymentStatus(t *testing.T) {
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusUnknown, antomQueryPaymentStatus(nil))
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusUnknown, antomQueryPaymentStatus(&responsePay.AlipayPayQueryResponse{}))

	resp := &responsePay.AlipayPayQueryResponse{
		Result: &antomModel.Result{
			ResultCode:   "SUCCESS",
			ResultStatus: "S",
		},
	}
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusPending, antomQueryPaymentStatus(resp))

	resp.AlipayResponse.Result = response.Result{
		ResultCode:   "ORDER_NOT_EXIST",
		ResultStatus: "U",
	}
	resp.Result.ResultCode = "ORDER_NOT_EXIST"
	assert.Equal(t, apiModel.TopUpRemotePaymentStatusUnknown, antomQueryPaymentStatus(resp))
}

func TestAntomPaymentPricingMethodOverrides(t *testing.T) {
	oldCurrency := setting.AntomCurrency
	oldUnitPrice := setting.AntomUnitPrice
	oldMethods := setting.AntomPaymentMethods
	defer func() {
		setting.AntomCurrency = oldCurrency
		setting.AntomUnitPrice = oldUnitPrice
		setting.AntomPaymentMethods = oldMethods
	}()

	setting.AntomCurrency = "CNY"
	setting.AntomUnitPrice = 1
	setting.AntomPaymentMethods = `[
		{"name":"Alipay CN","type":"ALIPAY_CN","currency":"CNY"},
		{"name":"Alipay HK","type":"ALIPAY_HK","currency":"HKD","exchange_rate":1.1},
		{"name":"Card USD","type":"CARD","currency":"USD","unit_price":0.14}
	]`

	cn := getAntomPaymentPricing("ALIPAY_CN")
	assert.Equal(t, "CNY", cn.Currency)
	assert.Equal(t, "1", cn.UnitPrice.String())

	hk := getAntomPaymentPricing("ALIPAY_HK")
	assert.Equal(t, "HKD", hk.Currency)
	assert.Equal(t, "1.1", hk.UnitPrice.String())

	card := getAntomPaymentPricing("CARD")
	assert.Equal(t, "USD", card.Currency)
	assert.Equal(t, "0.14", card.UnitPrice.String())

	fallback := getAntomPaymentPricing("")
	assert.Equal(t, "CNY", fallback.Currency)
	assert.Equal(t, "1", fallback.UnitPrice.String())
}

func TestAntomPaymentMethodAllowlistPreventsPricingBypassAndCurrencyDowngrade(t *testing.T) {
	oldCurrency := setting.AntomCurrency
	oldUnitPrice := setting.AntomUnitPrice
	oldMethods := setting.AntomPaymentMethods
	t.Cleanup(func() {
		setting.AntomCurrency = oldCurrency
		setting.AntomUnitPrice = oldUnitPrice
		setting.AntomPaymentMethods = oldMethods
	})

	setting.AntomCurrency = "USD"
	setting.AntomUnitPrice = 1.0
	setting.AntomPaymentMethods = ""

	// Empty payment methods list allows generic cashier ("") only; arbitrary method types are rejected
	// and cannot downgrade USD pricing into CNY.
	assert.True(t, setting.IsAntomPaymentMethodAllowed(""))
	assert.False(t, setting.IsAntomPaymentMethodAllowed("ALIPAY_CN"))
	pricing := getAntomPaymentPricing("ALIPAY_CN")
	assert.Equal(t, "USD", pricing.Currency)
	assert.Equal(t, "1", pricing.UnitPrice.String())

	// Configured payment methods list requires an explicit allowed method; empty method cannot bypass it.
	setting.AntomPaymentMethods = `[{"name":"Alipay CN","type":"ALIPAY_CN","currency":"CNY","unit_price":7.2}]`
	assert.False(t, setting.IsAntomPaymentMethodAllowed(""))
	assert.False(t, setting.IsAntomPaymentMethodAllowed("CARD"))
	assert.True(t, setting.IsAntomPaymentMethodAllowed("ALIPAY_CN"))
}

func TestAntomRedirectURLSafety(t *testing.T) {
	assert.Equal(t, "https://checkout.antom.com/pay/123", extractAntomPaymentURL(&responsePay.AlipayPayResponse{
		NormalUrl: "https://checkout.antom.com/pay/123",
	}))
	assert.Equal(t, "alipays://platformapi/startapp?appId=20000067", extractAntomPaymentURL(&responsePay.AlipayPayResponse{
		NormalUrl: "javascript:alert(1)",
		SchemeUrl: "alipays://platformapi/startapp?appId=20000067",
	}))
	assert.Empty(t, extractAntomPaymentURL(&responsePay.AlipayPayResponse{
		NormalUrl:  "javascript:alert(1)",
		SchemeUrl:  "data:text/html,<script>alert(1)</script>",
		ApplinkUrl: "vbscript:msgbox(1)",
	}))
}

type antomTestEnv struct {
	db             *gorm.DB
	privateKeyB64  string
	publicKeyB64   string
	clientID       string
	user           *apiModel.User
	executeHandler func(client *defaultAlipayClient.DefaultAlipayClient, req *antomRequest.AlipayRequest) (any, error)
}

func setupAntomSecurityTestEnv(t *testing.T, initialQuota int) *antomTestEnv {
	t.Helper()
	gin.SetMode(gin.TestMode)

	privKey, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)
	pkcs8Bytes, err := x509.MarshalPKCS8PrivateKey(privKey)
	require.NoError(t, err)
	pubBytes, err := x509.MarshalPKIXPublicKey(&privKey.PublicKey)
	require.NoError(t, err)

	privB64 := base64.StdEncoding.EncodeToString(pkcs8Bytes)
	pubB64 := base64.StdEncoding.EncodeToString(pubBytes)

	db, err := gorm.Open(sqlite.Open(t.TempDir()+"/antom_security.db"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&apiModel.User{}, &apiModel.TopUp{}, &apiModel.Log{}))
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)

	oldDB := apiModel.DB
	oldLogDB := apiModel.LOG_DB
	oldRedisEnabled := common.RedisEnabled
	oldQuotaPerUnit := common.QuotaPerUnit
	oldDisplayType := operation_setting.GetGeneralSetting().QuotaDisplayType
	oldCompliance := operation_setting.GetPaymentSetting().ComplianceConfirmed
	oldComplianceVer := operation_setting.GetPaymentSetting().ComplianceTermsVersion
	oldAntomEnabled := setting.AntomEnabled
	oldAntomClientId := setting.AntomClientId
	oldAntomPrivateKey := setting.AntomMerchantPrivateKey
	oldAntomPublicKey := setting.AntomPublicKey
	oldAntomCurrency := setting.AntomCurrency
	oldAntomUnitPrice := setting.AntomUnitPrice
	oldAntomMinTopUp := setting.AntomMinTopUp
	oldAntomMethods := setting.AntomPaymentMethods
	oldExec := antomExecuteRequest

	env := &antomTestEnv{
		db:            db,
		privateKeyB64: privB64,
		publicKeyB64:  pubB64,
		clientID:      "TEST_CLIENT_ID_001",
	}

	apiModel.DB = db
	apiModel.LOG_DB = db
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.RedisEnabled = false
	common.QuotaPerUnit = 500000
	operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeUSD
	operation_setting.GetPaymentSetting().ComplianceConfirmed = true
	operation_setting.GetPaymentSetting().ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion
	setting.AntomEnabled = true
	setting.AntomClientId = env.clientID
	setting.AntomMerchantPrivateKey = privB64
	setting.AntomPublicKey = pubB64
	setting.AntomCurrency = "USD"
	setting.AntomUnitPrice = 1.0
	setting.AntomMinTopUp = 1
	setting.AntomPaymentMethods = ""

	antomExecuteRequest = func(client *defaultAlipayClient.DefaultAlipayClient, req *antomRequest.AlipayRequest) (any, error) {
		if env.executeHandler != nil {
			return env.executeHandler(client, req)
		}
		return nil, fmt.Errorf("unexpected antom API call: %s", req.Path)
	}

	t.Cleanup(func() {
		apiModel.DB = oldDB
		apiModel.LOG_DB = oldLogDB
		common.RedisEnabled = oldRedisEnabled
		common.QuotaPerUnit = oldQuotaPerUnit
		operation_setting.GetGeneralSetting().QuotaDisplayType = oldDisplayType
		operation_setting.GetPaymentSetting().ComplianceConfirmed = oldCompliance
		operation_setting.GetPaymentSetting().ComplianceTermsVersion = oldComplianceVer
		setting.AntomEnabled = oldAntomEnabled
		setting.AntomClientId = oldAntomClientId
		setting.AntomMerchantPrivateKey = oldAntomPrivateKey
		setting.AntomPublicKey = oldAntomPublicKey
		setting.AntomCurrency = oldAntomCurrency
		setting.AntomUnitPrice = oldAntomUnitPrice
		setting.AntomMinTopUp = oldAntomMinTopUp
		setting.AntomPaymentMethods = oldAntomMethods
		antomExecuteRequest = oldExec
		require.NoError(t, sqlDB.Close())
	})

	user := &apiModel.User{
		Id:       1001,
		Username: "antom_sec_user",
		Group:    "default",
		Quota:    initialQuota,
		Status:   common.UserStatusEnabled,
	}
	require.NoError(t, db.Create(user).Error)
	env.user = user
	return env
}

func (e *antomTestEnv) userQuota(t *testing.T, userID int) int {
	t.Helper()
	var user apiModel.User
	require.NoError(t, e.db.Select("quota").Where("id = ?", userID).First(&user).Error)
	return user.Quota
}

func (e *antomTestEnv) sendSignedWebhook(t *testing.T, clientID string, body string, privKeyB64 string) *httptest.ResponseRecorder {
	t.Helper()
	const path = "/api/antom/webhook"
	reqTime := time.Now().UTC().Format(time.RFC3339)
	sigVal, err := tools.GenSign(http.MethodPost, path, clientID, reqTime, body, privKeyB64)
	require.NoError(t, err)

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	c.Request.RequestURI = path
	c.Request.Header.Set("Content-Type", "application/json")
	c.Request.Header.Set("client-id", clientID)
	c.Request.Header.Set("request-time", reqTime)
	c.Request.Header.Set("signature", "algorithm=RSA256,keyVersion=1,signature="+sigVal)

	AntomWebhook(c)
	return rec
}

func TestRequestAntomPaySecurityBoundsAndMetadata(t *testing.T) {
	t.Run("rejects excessive amount before calling Antom", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		called := false
		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, _ *antomRequest.AlipayRequest) (any, error) {
			called = true
			return nil, nil
		}

		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Set("id", env.user.Id)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/user/antom/pay", strings.NewReader(`{"amount":9223372036854775807}`))
		c.Request.Header.Set("Content-Type", "application/json")

		RequestAntomPay(c)
		assert.Equal(t, http.StatusOK, rec.Code)
		assert.Contains(t, rec.Body.String(), `"message":"error"`)
		assert.False(t, called)
	})

	t.Run("rejects zero-decimal currency rounding to zero and invalid unit price", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		setting.AntomCurrency = "JPY"
		setting.AntomUnitPrice = 0.4

		_, _, _, err := calculateAntomPayMoney(1, "default", "")
		require.Error(t, err)

		setting.AntomUnitPrice = math.NaN()
		_, _, _, err = calculateAntomPayMoney(10, "default", "")
		require.Error(t, err)

		_ = env
	})

	t.Run("rejects sub-unit tokens amount without rounding up to 1", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		operation_setting.GetGeneralSetting().QuotaDisplayType = operation_setting.QuotaDisplayTypeTokens
		setting.AntomMinTopUp = 0 // even if misconfigured, must clamp >= 1 unit

		called := false
		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, _ *antomRequest.AlipayRequest) (any, error) {
			called = true
			return nil, nil
		}

		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Set("id", env.user.Id)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/user/antom/pay", strings.NewReader(`{"amount":5000}`))
		c.Request.Header.Set("Content-Type", "application/json")

		RequestAntomPay(c)
		assert.Contains(t, rec.Body.String(), `"message":"error"`)
		assert.False(t, called)
	})

	t.Run("stores order currency, sends metadata and automatic capture for CARD", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		setting.AntomPaymentMethods = `[{"name":"Card USD","type":"CARD","currency":"USD","unit_price":1.5}]`

		var capturedPayReq *pay.AlipayPayRequest
		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, req *antomRequest.AlipayRequest) (any, error) {
			capturedPayReq = req.Param.(*pay.AlipayPayRequest)
			return &responsePay.AlipayPayResponse{
				Result:    &antomModel.Result{ResultCode: "SUCCESS", ResultStatus: "S"},
				NormalUrl: "https://checkout.antom.com/pay/order1",
			}, nil
		}

		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Set("id", env.user.Id)
		c.Request = httptest.NewRequest(http.MethodPost, "/api/user/antom/pay", strings.NewReader(`{"amount":10,"paymentMethodType":"CARD"}`))
		c.Request.Header.Set("Content-Type", "application/json")

		RequestAntomPay(c)
		require.Equal(t, http.StatusOK, rec.Code)
		require.Contains(t, rec.Body.String(), `"message":"success"`)
		require.NotNil(t, capturedPayReq)
		assert.Equal(t, "USD", capturedPayReq.PaymentAmount.Currency)
		assert.Equal(t, "1500", capturedPayReq.PaymentAmount.Value)
		require.NotNil(t, capturedPayReq.PaymentFactor)
		assert.True(t, capturedPayReq.PaymentFactor.IsAuthorization)
		assert.Equal(t, "AUTOMATIC", capturedPayReq.PaymentFactor.CaptureMode)
		assert.Contains(t, capturedPayReq.Metadata, fmt.Sprintf(`"user_id":"%d"`, env.user.Id))
		assert.Contains(t, capturedPayReq.Metadata, `"currency":"USD"`)

		stored := apiModel.GetTopUpByTradeNo(capturedPayReq.PaymentRequestId)
		require.NotNil(t, stored)
		assert.Equal(t, "USD", stored.Currency)
		assert.Equal(t, 15.0, stored.Money)
		assert.Equal(t, int64(10), stored.Amount)
	})
}

func TestAntomWebhookSecurityControls(t *testing.T) {
	newOrder := func(t *testing.T, env *antomTestEnv, tradeNo string, status string) *apiModel.TopUp {
		t.Helper()
		order := &apiModel.TopUp{
			UserId:          env.user.Id,
			Amount:          10,
			Money:           10.0,
			Currency:        "USD",
			TradeNo:         tradeNo,
			PaymentMethod:   apiModel.PaymentMethodAntom,
			PaymentProvider: apiModel.PaymentProviderAntom,
			CreateTime:      time.Now().Unix(),
			Status:          status,
		}
		require.NoError(t, order.Insert())
		return order
	}

	validQueryResp := func(tradeNo string, userID int) *responsePay.AlipayPayQueryResponse {
		return &responsePay.AlipayPayQueryResponse{
			Result:           &antomModel.Result{ResultCode: "SUCCESS", ResultStatus: "S"},
			PaymentStatus:    antomModel.TransactionStatusType_SUCCESS,
			PaymentRequestId: tradeNo,
			PaymentAmount:    &antomModel.Amount{Currency: "USD", Value: "1000"},
			Metadata:         fmt.Sprintf(`{"user_id":"%d","trade_no":"%s","currency":"USD"}`, userID, tradeNo),
		}
	}

	t.Run("credits once on valid PAYMENT_RESULT and ignores duplicate", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		tradeNo := "ANTOM-SEC-OK-1"
		newOrder(t, env, tradeNo, common.TopUpStatusPending)

		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, _ *antomRequest.AlipayRequest) (any, error) {
			return validQueryResp(tradeNo, env.user.Id), nil
		}

		body := fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"},"metadata":"{\"user_id\":\"%d\",\"trade_no\":\"%s\",\"currency\":\"USD\"}"}`, tradeNo, env.user.Id, tradeNo)
		rec := env.sendSignedWebhook(t, env.clientID, body, env.privateKeyB64)
		assert.JSONEq(t, `{"result":{"resultCode":"SUCCESS","resultStatus":"S","resultMessage":"Success"}}`, rec.Body.String())
		assert.Equal(t, 10*500000, env.userQuota(t, env.user.Id))

		// Replay the same webhook: must not double-credit.
		rec2 := env.sendSignedWebhook(t, env.clientID, body, env.privateKeyB64)
		assert.JSONEq(t, `{"result":{"resultCode":"SUCCESS","resultStatus":"S","resultMessage":"Success"}}`, rec2.Body.String())
		assert.Equal(t, 10*500000, env.userQuota(t, env.user.Id))
	})

	t.Run("rejects invalid signature and mismatched client-id", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		tradeNo := "ANTOM-SEC-SIG-1"
		newOrder(t, env, tradeNo, common.TopUpStatusPending)

		body := fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, tradeNo)

		// Wrong client-id (even validly signed with same key).
		recWrongClient := env.sendSignedWebhook(t, "OTHER_MERCHANT_CLIENT", body, env.privateKeyB64)
		assert.Contains(t, recWrongClient.Body.String(), `"resultStatus":"F"`)
		assert.Equal(t, 0, env.userQuota(t, env.user.Id))

		// Wrong signature (signed with different RSA key).
		attackerKey, err := rsa.GenerateKey(rand.Reader, 2048)
		require.NoError(t, err)
		attackerPKCS8, err := x509.MarshalPKCS8PrivateKey(attackerKey)
		require.NoError(t, err)
		recWrongSig := env.sendSignedWebhook(t, env.clientID, body, base64.StdEncoding.EncodeToString(attackerPKCS8))
		assert.Contains(t, recWrongSig.Body.String(), `"resultStatus":"F"`)
		assert.Equal(t, 0, env.userQuota(t, env.user.Id))
	})

	t.Run("ignores PAYMENT_PENDING and OFFLINE_PAYMENT_CODE even with SUCCESS result", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		tradeNo := "ANTOM-SEC-PENDING-1"
		newOrder(t, env, tradeNo, common.TopUpStatusPending)

		for _, notifyType := range []string{"PAYMENT_PENDING", "OFFLINE_PAYMENT_CODE", "REFUND_RESULT"} {
			body := fmt.Sprintf(`{"notifyType":"%s","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, notifyType, tradeNo)
			rec := env.sendSignedWebhook(t, env.clientID, body, env.privateKeyB64)
			assert.Contains(t, rec.Body.String(), `"resultStatus":"S"`)
			assert.Equal(t, 0, env.userQuota(t, env.user.Id))
			assert.Equal(t, common.TopUpStatusPending, apiModel.GetTopUpByTradeNo(tradeNo).Status)
		}
	})

	t.Run("marks order failed on PAYMENT_RESULT with resultStatus F", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		tradeNo := "ANTOM-SEC-FAIL-1"
		newOrder(t, env, tradeNo, common.TopUpStatusPending)

		body := fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"PAYMENT_FAIL","resultStatus":"F"},"paymentRequestId":"%s"}`, tradeNo)
		rec := env.sendSignedWebhook(t, env.clientID, body, env.privateKeyB64)
		assert.Contains(t, rec.Body.String(), `"resultStatus":"S"`)
		assert.Equal(t, 0, env.userQuota(t, env.user.Id))
		assert.Equal(t, common.TopUpStatusFailed, apiModel.GetTopUpByTradeNo(tradeNo).Status)
	})

	t.Run("rejects amount, currency, order ID, buyer, and inquiry status mismatches", func(t *testing.T) {
		testCases := []struct {
			name      string
			bodyFn    func(tradeNo string, uid int) string
			queryResp func(tradeNo string, uid int) *responsePay.AlipayPayQueryResponse
		}{
			{
				name: "webhook amount mismatch",
				bodyFn: func(tradeNo string, uid int) string {
					return fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"100"}}`, tradeNo)
				},
				queryResp: validQueryResp,
			},
			{
				name: "webhook currency mismatch",
				bodyFn: func(tradeNo string, uid int) string {
					return fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"CNY","value":"1000"}}`, tradeNo)
				},
				queryResp: validQueryResp,
			},
			{
				name: "inquiry still processing",
				bodyFn: func(tradeNo string, uid int) string {
					return fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, tradeNo)
				},
				queryResp: func(tradeNo string, uid int) *responsePay.AlipayPayQueryResponse {
					r := validQueryResp(tradeNo, uid)
					r.PaymentStatus = antomModel.TransactionStatusType_PROCESSING
					return r
				},
			},
			{
				name: "inquiry amount mismatch",
				bodyFn: func(tradeNo string, uid int) string {
					return fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, tradeNo)
				},
				queryResp: func(tradeNo string, uid int) *responsePay.AlipayPayQueryResponse {
					r := validQueryResp(tradeNo, uid)
					r.PaymentAmount = &antomModel.Amount{Currency: "USD", Value: "999"}
					return r
				},
			},
			{
				name: "inquiry currency mismatch",
				bodyFn: func(tradeNo string, uid int) string {
					return fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, tradeNo)
				},
				queryResp: func(tradeNo string, uid int) *responsePay.AlipayPayQueryResponse {
					r := validQueryResp(tradeNo, uid)
					r.PaymentAmount = &antomModel.Amount{Currency: "HKD", Value: "1000"}
					return r
				},
			},
			{
				name: "inquiry paymentRequestId mismatch",
				bodyFn: func(tradeNo string, uid int) string {
					return fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, tradeNo)
				},
				queryResp: func(tradeNo string, uid int) *responsePay.AlipayPayQueryResponse {
					r := validQueryResp(tradeNo, uid)
					r.PaymentRequestId = "DIFFERENT-ORDER"
					return r
				},
			},
			{
				name: "inquiry buyer metadata mismatch",
				bodyFn: func(tradeNo string, uid int) string {
					return fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, tradeNo)
				},
				queryResp: func(tradeNo string, uid int) *responsePay.AlipayPayQueryResponse {
					r := validQueryResp(tradeNo, uid)
					r.Metadata = fmt.Sprintf(`{"user_id":"9999","trade_no":"%s","currency":"USD"}`, tradeNo)
					return r
				},
			},
		}

		for idx, tc := range testCases {
			t.Run(tc.name, func(t *testing.T) {
				env := setupAntomSecurityTestEnv(t, 0)
				tradeNo := fmt.Sprintf("ANTOM-SEC-MISMATCH-%d", idx)
				newOrder(t, env, tradeNo, common.TopUpStatusPending)

				env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, _ *antomRequest.AlipayRequest) (any, error) {
					return tc.queryResp(tradeNo, env.user.Id), nil
				}

				rec := env.sendSignedWebhook(t, env.clientID, tc.bodyFn(tradeNo, env.user.Id), env.privateKeyB64)
				assert.Contains(t, rec.Body.String(), `"resultStatus":"F"`)
				assert.Equal(t, 0, env.userQuota(t, env.user.Id))
				assert.Equal(t, common.TopUpStatusPending, apiModel.GetTopUpByTradeNo(tradeNo).Status)
			})
		}
	})

	t.Run("does not credit expired order or exceed wallet ceiling", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, common.MaxWalletQuota-1000)
		expiredNo := "ANTOM-SEC-EXP-1"
		newOrder(t, env, expiredNo, common.TopUpStatusExpired)
		limitNo := "ANTOM-SEC-LIM-1"
		newOrder(t, env, limitNo, common.TopUpStatusPending)

		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, req *antomRequest.AlipayRequest) (any, error) {
			q := req.Param.(*pay.AlipayPayQueryRequest)
			return validQueryResp(q.PaymentRequestId, env.user.Id), nil
		}

		bodyExpired := fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, expiredNo)
		env.sendSignedWebhook(t, env.clientID, bodyExpired, env.privateKeyB64)
		assert.Equal(t, common.MaxWalletQuota-1000, env.userQuota(t, env.user.Id))
		assert.Equal(t, common.TopUpStatusExpired, apiModel.GetTopUpByTradeNo(expiredNo).Status)

		bodyLimit := fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, limitNo)
		recLimit := env.sendSignedWebhook(t, env.clientID, bodyLimit, env.privateKeyB64)
		assert.Contains(t, recLimit.Body.String(), `"resultStatus":"F"`)
		assert.Equal(t, common.MaxWalletQuota-1000, env.userQuota(t, env.user.Id))
		assert.Equal(t, common.TopUpStatusPending, apiModel.GetTopUpByTradeNo(limitNo).Status)
	})

	t.Run("concurrent webhook and inquiry settle at most once", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		tradeNo := "ANTOM-SEC-CONC-1"
		newOrder(t, env, tradeNo, common.TopUpStatusPending)

		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, _ *antomRequest.AlipayRequest) (any, error) {
			return validQueryResp(tradeNo, env.user.Id), nil
		}

		body := fmt.Sprintf(`{"notifyType":"PAYMENT_RESULT","result":{"resultCode":"SUCCESS","resultStatus":"S"},"paymentRequestId":"%s","paymentAmount":{"currency":"USD","value":"1000"}}`, tradeNo)

		var wg sync.WaitGroup
		wg.Go(func() {
			env.sendSignedWebhook(t, env.clientID, body, env.privateKeyB64)
		})
		wg.Go(func() {
			rec := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(rec)
			c.Set("id", env.user.Id)
			c.Request = httptest.NewRequest(http.MethodGet, "/api/user/antom/inquiry?trade_no="+tradeNo, nil)
			RequestAntomInquiry(c)
		})
		wg.Wait()

		assert.Equal(t, 10*500000, env.userQuota(t, env.user.Id))
		assert.Equal(t, common.TopUpStatusSuccess, apiModel.GetTopUpByTradeNo(tradeNo).Status)
	})
}

func TestAntomInquiryAndExpiredCompensationSecurity(t *testing.T) {
	t.Run("rejects non-antom provider order without calling Antom or mutating status", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		called := false
		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, _ *antomRequest.AlipayRequest) (any, error) {
			called = true
			return nil, nil
		}

		stripeOrder := &apiModel.TopUp{
			UserId:          env.user.Id,
			Amount:          5,
			Money:           5.0,
			TradeNo:         "STRIPE-ORDER-1",
			PaymentMethod:   apiModel.PaymentMethodStripe,
			PaymentProvider: apiModel.PaymentProviderStripe,
			CreateTime:      time.Now().Unix(),
			Status:          common.TopUpStatusPending,
		}
		require.NoError(t, stripeOrder.Insert())

		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Set("id", env.user.Id)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/user/antom/inquiry?trade_no=STRIPE-ORDER-1", nil)

		RequestAntomInquiry(c)
		assert.Contains(t, rec.Body.String(), `"message":"error"`)
		assert.False(t, called)
		assert.Equal(t, common.TopUpStatusPending, apiModel.GetTopUpByTradeNo("STRIPE-ORDER-1").Status)
	})

	t.Run("rejects mismatched amount in inquiry and expired compensation", func(t *testing.T) {
		env := setupAntomSecurityTestEnv(t, 0)
		order := &apiModel.TopUp{
			UserId:          env.user.Id,
			Amount:          10,
			Money:           10.0,
			Currency:        "USD",
			TradeNo:         "ANTOM-INQ-MISMATCH-1",
			PaymentMethod:   apiModel.PaymentMethodAntom,
			PaymentProvider: apiModel.PaymentProviderAntom,
			CreateTime:      time.Now().Add(-10 * time.Minute).Unix(),
			Status:          common.TopUpStatusPending,
		}
		require.NoError(t, order.Insert())

		env.executeHandler = func(_ *defaultAlipayClient.DefaultAlipayClient, _ *antomRequest.AlipayRequest) (any, error) {
			return &responsePay.AlipayPayQueryResponse{
				Result:           &antomModel.Result{ResultCode: "SUCCESS", ResultStatus: "S"},
				PaymentStatus:    antomModel.TransactionStatusType_SUCCESS,
				PaymentRequestId: order.TradeNo,
				PaymentAmount:    &antomModel.Amount{Currency: "USD", Value: "100"},
			}, nil
		}

		rec := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(rec)
		c.Set("id", env.user.Id)
		c.Request = httptest.NewRequest(http.MethodGet, "/api/user/antom/inquiry?trade_no="+order.TradeNo, nil)
		RequestAntomInquiry(c)
		assert.Contains(t, rec.Body.String(), `"message":"error"`)
		assert.NotContains(t, rec.Body.String(), `"data":"paid"`)
		assert.Equal(t, 0, env.userQuota(t, env.user.Id))
		assert.Equal(t, common.TopUpStatusPending, apiModel.GetTopUpByTradeNo(order.TradeNo).Status)

		status, err := verifyPendingTopUpPayment(order)
		require.Error(t, err)
		assert.Equal(t, apiModel.TopUpRemotePaymentStatusUnknown, status)
		assert.Equal(t, 0, env.userQuota(t, env.user.Id))
		assert.Equal(t, common.TopUpStatusPending, apiModel.GetTopUpByTradeNo(order.TradeNo).Status)
	})
}
