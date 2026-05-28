package controller

import (
	"testing"

	apiModel "github.com/QuantumNous/new-api/model"
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
