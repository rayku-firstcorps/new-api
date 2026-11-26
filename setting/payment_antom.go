package setting

import (
	"math"
	"slices"
	"strings"

	"github.com/QuantumNous/new-api/common"
)

type AntomPaymentMethod struct {
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Icon         string  `json:"icon,omitempty"`
	Color        string  `json:"color,omitempty"`
	Currency     string  `json:"currency,omitempty"`
	ExchangeRate float64 `json:"exchange_rate,omitempty"`
	UnitPrice    float64 `json:"unit_price,omitempty"`
}

var (
	AntomEnabled            bool
	AntomClientId           string
	AntomMerchantPrivateKey string
	AntomPublicKey          string
	AntomSandbox            bool
	AntomCurrency           string  = "CNY"
	AntomUnitPrice          float64 = 1.0
	AntomMinTopUp           int     = 1
	AntomPaymentMethods     string
)

func AntomBaseURL() string {
	if AntomSandbox {
		return "https://open-sea-global.alipay.com"
	}
	return "https://open-sea-global.alipay.com"
}

func GetAntomPaymentMethods() []AntomPaymentMethod {
	raw := strings.TrimSpace(AntomPaymentMethods)
	if raw == "" {
		common.OptionMapRWMutex.RLock()
		raw = strings.TrimSpace(common.OptionMap["AntomPaymentMethods"])
		common.OptionMapRWMutex.RUnlock()
	}
	if raw == "" {
		return nil
	}

	var methods []AntomPaymentMethod
	if err := common.UnmarshalJsonStr(raw, &methods); err != nil {
		return nil
	}

	validMethods := make([]AntomPaymentMethod, 0, len(methods))
	for _, method := range methods {
		method.Type = strings.TrimSpace(method.Type)
		method.Name = strings.TrimSpace(method.Name)
		method.Currency = strings.ToUpper(strings.TrimSpace(method.Currency))
		if math.IsNaN(method.UnitPrice) || math.IsInf(method.UnitPrice, 0) || method.UnitPrice < 0 {
			method.UnitPrice = 0
		}
		if math.IsNaN(method.ExchangeRate) || math.IsInf(method.ExchangeRate, 0) || method.ExchangeRate < 0 {
			method.ExchangeRate = 0
		}
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

func IsAntomPaymentMethodAllowed(paymentMethod string) bool {
	paymentMethod = strings.TrimSpace(paymentMethod)
	methods := GetAntomPaymentMethods()
	if len(methods) == 0 {
		return paymentMethod == ""
	}
	if paymentMethod == "" {
		return false
	}
	return slices.ContainsFunc(methods, func(method AntomPaymentMethod) bool {
		return method.Type == paymentMethod
	})
}
