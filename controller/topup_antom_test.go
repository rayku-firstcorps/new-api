package controller

import (
	"testing"

	apiModel "github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	antomModel "github.com/alipay/global-open-sdk-go/com/alipay/api/model"
	"github.com/alipay/global-open-sdk-go/com/alipay/api/response"
	responsePay "github.com/alipay/global-open-sdk-go/com/alipay/api/response/pay"
	"github.com/stretchr/testify/assert"
)

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
