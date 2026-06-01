package model

import "testing"

func TestNormalizeOfficialSocialLinksJSONString(t *testing.T) {
	raw := `[
		{"id":"x-link","platform":"x","url":"https://x.com/example","enabled":true,"sort":20},
		{"id":"tg","platform":"telegram","label":"","url":"https://t.me/example","enabled":true,"sort":10}
	]`

	normalized, err := NormalizeOfficialSocialLinksJSONString(raw)
	if err != nil {
		t.Fatalf("NormalizeOfficialSocialLinksJSONString returned error: %v", err)
	}

	links, err := parseOfficialSocialLinks(normalized)
	if err != nil {
		t.Fatalf("parse normalized links: %v", err)
	}
	if len(links) != 2 {
		t.Fatalf("expected 2 links, got %d", len(links))
	}
	if links[0].Platform != "telegram" || links[0].Label != "Telegram" {
		t.Fatalf("expected telegram first with default label, got %+v", links[0])
	}
	if links[1].Platform != "x" || links[1].Label != "X" {
		t.Fatalf("expected x second with default label, got %+v", links[1])
	}
}

func TestNormalizeOfficialSocialLinksRejectsInvalidValues(t *testing.T) {
	tests := []struct {
		name string
		raw  string
	}{
		{
			name: "enabled empty url",
			raw:  `[{"id":"tg","platform":"telegram","enabled":true}]`,
		},
		{
			name: "non https url",
			raw:  `[{"id":"tg","platform":"telegram","url":"http://t.me/example","enabled":true}]`,
		},
		{
			name: "javascript url",
			raw:  `[{"id":"tg","platform":"telegram","url":"javascript:alert(1)","enabled":true}]`,
		},
		{
			name: "duplicate url",
			raw:  `[{"id":"one","platform":"telegram","url":"https://t.me/example","enabled":true},{"id":"two","platform":"custom","url":"https://t.me/example","enabled":true}]`,
		},
		{
			name: "invalid platform",
			raw:  `[{"id":"bad","platform":"unknown","url":"https://example.com","enabled":true}]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := NormalizeOfficialSocialLinksJSONString(tt.raw); err == nil {
				t.Fatal("expected error, got nil")
			}
		})
	}
}

func TestPublicOfficialSocialLinksFromJSONFiltersAndSorts(t *testing.T) {
	raw := `[
		{"id":"disabled","platform":"telegram","label":"Telegram","url":"https://t.me/example","enabled":false,"sort":10},
		{"id":"bad-url","platform":"whatsapp","label":"WhatsApp","url":"http://wa.me/example","enabled":true,"sort":20},
		{"id":"vk","platform":"vk","label":"","url":"https://vk.com/example","enabled":true,"sort":40},
		{"id":"ig","platform":"instagram","label":"Instagram","url":"https://www.instagram.com/example","enabled":true,"sort":30},
		{"id":"bad-platform","platform":"unknown","label":"Unknown","url":"https://example.com","enabled":true,"sort":50}
	]`

	links := PublicOfficialSocialLinksFromJSON(raw)
	if len(links) != 2 {
		t.Fatalf("expected 2 public links, got %d: %+v", len(links), links)
	}
	if links[0].Platform != "instagram" {
		t.Fatalf("expected instagram first, got %+v", links[0])
	}
	if links[1].Platform != "vk" || links[1].Label != "VK" {
		t.Fatalf("expected vk second with default label, got %+v", links[1])
	}
	if links[0].Enabled != true || links[1].Enabled != true {
		t.Fatalf("expected public links to be enabled: %+v", links)
	}
}
