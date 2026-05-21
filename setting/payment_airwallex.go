package setting

var (
	AirwallexEnabled       bool
	AirwallexClientId      string
	AirwallexApiKey        string
	AirwallexWebhookSecret string
	AirwallexSandbox       bool
	AirwallexCurrency      string  = "USD"
	AirwallexUnitPrice     float64 = 1.0
	AirwallexMinTopUp      int     = 1
)
