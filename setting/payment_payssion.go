package setting

import (
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type PayssionPaymentMethod struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Currency string `json:"currency,omitempty"`
	Icon     string `json:"icon,omitempty"`
	Color    string `json:"color,omitempty"`
}

var (
	PayssionEnabled        bool
	PayssionApiKey         string
	PayssionWebhookSecret  string
	PayssionCurrency       string  = "USD"
	PayssionUnitPrice      float64 = 1.0
	PayssionMinTopUp       int     = 1
	PayssionPaymentMethods string
)

func GetPayssionPaymentMethods() []PayssionPaymentMethod {
	raw := strings.TrimSpace(PayssionPaymentMethods)
	if raw == "" {
		common.OptionMapRWMutex.RLock()
		raw = strings.TrimSpace(common.OptionMap["PayssionPaymentMethods"])
		common.OptionMapRWMutex.RUnlock()
	}
	if raw == "" {
		return nil
	}

	var methods []PayssionPaymentMethod
	if err := common.UnmarshalJsonStr(raw, &methods); err != nil {
		return nil
	}

	validMethods := make([]PayssionPaymentMethod, 0, len(methods))
	for _, method := range methods {
		method.Type = strings.TrimSpace(method.Type)
		method.Name = strings.TrimSpace(method.Name)
		if method.Type == "" {
			continue
		}
		if method.Name == "" {
			method.Name = method.Type
		}
		validMethods = append(validMethods, method)
	}
	return validMethods
}

func IsPayssionPaymentMethodAllowed(paymentMethod string) bool {
	paymentMethod = strings.TrimSpace(paymentMethod)
	if paymentMethod == "" {
		return false
	}
	for _, method := range GetPayssionPaymentMethods() {
		if method.Type == paymentMethod {
			return true
		}
	}
	return false
}
