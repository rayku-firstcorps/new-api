package model

import (
	"fmt"
	"net/url"
	"sort"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/google/uuid"
)

const OptionKeyOfficialSocialLinks = "OfficialSocialLinks"

type OfficialSocialLink struct {
	ID       string `json:"id"`
	Platform string `json:"platform"`
	Label    string `json:"label"`
	URL      string `json:"url"`
	Enabled  bool   `json:"enabled"`
	Sort     int    `json:"sort"`
}

type PublicOfficialSocialLink struct {
	Platform string `json:"platform"`
	Label    string `json:"label"`
	URL      string `json:"url"`
	Enabled  bool   `json:"enabled"`
	Sort     int    `json:"sort"`
}

var officialSocialPlatformLabels = map[string]string{
	"telegram":  "Telegram",
	"whatsapp":  "WhatsApp",
	"facebook":  "Facebook",
	"instagram": "Instagram",
	"x":         "X",
	"vk":        "VK",
	"custom":    "Custom",
}

func IsValidOfficialSocialPlatform(platform string) bool {
	_, ok := officialSocialPlatformLabels[strings.ToLower(strings.TrimSpace(platform))]
	return ok
}

func defaultOfficialSocialLabel(platform string) string {
	if label, ok := officialSocialPlatformLabels[platform]; ok {
		return label
	}
	return officialSocialPlatformLabels["custom"]
}

func parseOfficialSocialLinks(raw string) ([]OfficialSocialLink, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return []OfficialSocialLink{}, nil
	}

	var links []OfficialSocialLink
	if err := common.UnmarshalJsonStr(raw, &links); err != nil {
		return nil, fmt.Errorf("invalid OfficialSocialLinks JSON: %w", err)
	}
	if links == nil {
		return []OfficialSocialLink{}, nil
	}
	return links, nil
}

func ValidateOfficialSocialURL(rawURL string) error {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return fmt.Errorf("url is required")
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}
	if parsed.Scheme != "https" {
		return fmt.Errorf("only https URLs are supported")
	}
	if parsed.Hostname() == "" {
		return fmt.Errorf("URL host is required")
	}
	if parsed.User != nil {
		return fmt.Errorf("URL user info is not allowed")
	}
	return nil
}

func canonicalOfficialSocialURL(rawURL string) (string, error) {
	parsed, err := url.Parse(strings.TrimSpace(rawURL))
	if err != nil {
		return "", err
	}
	host := strings.ToLower(parsed.Host)
	canonical := "https://" + host
	if parsed.EscapedPath() != "" {
		canonical += parsed.EscapedPath()
	}
	if parsed.RawQuery != "" {
		canonical += "?" + parsed.RawQuery
	}
	if parsed.Fragment != "" {
		canonical += "#" + parsed.Fragment
	}
	return canonical, nil
}

func NormalizeOfficialSocialLinks(raw string) ([]OfficialSocialLink, error) {
	links, err := parseOfficialSocialLinks(raw)
	if err != nil {
		return nil, err
	}

	seenIDs := make(map[string]struct{}, len(links))
	seenURLs := make(map[string]struct{}, len(links))
	normalized := make([]OfficialSocialLink, 0, len(links))
	for idx, link := range links {
		link.ID = strings.TrimSpace(link.ID)
		link.Platform = strings.ToLower(strings.TrimSpace(link.Platform))
		link.Label = strings.TrimSpace(link.Label)
		link.URL = strings.TrimSpace(link.URL)

		if link.ID == "" {
			link.ID = uuid.NewString()
		}
		if _, exists := seenIDs[link.ID]; exists {
			return nil, fmt.Errorf("duplicate id at item %d", idx+1)
		}
		seenIDs[link.ID] = struct{}{}

		if !IsValidOfficialSocialPlatform(link.Platform) {
			return nil, fmt.Errorf("invalid platform at item %d", idx+1)
		}
		if link.Label == "" {
			link.Label = defaultOfficialSocialLabel(link.Platform)
		}
		if link.Sort == 0 {
			link.Sort = (idx + 1) * 10
		}

		if link.URL != "" {
			if err := ValidateOfficialSocialURL(link.URL); err != nil {
				return nil, fmt.Errorf("invalid url at item %d: %w", idx+1, err)
			}
			canonicalURL, err := canonicalOfficialSocialURL(link.URL)
			if err != nil {
				return nil, fmt.Errorf("invalid url at item %d: %w", idx+1, err)
			}
			if _, exists := seenURLs[canonicalURL]; exists {
				return nil, fmt.Errorf("duplicate url at item %d", idx+1)
			}
			seenURLs[canonicalURL] = struct{}{}
		} else if link.Enabled {
			return nil, fmt.Errorf("url is required when item %d is enabled", idx+1)
		}

		normalized = append(normalized, link)
	}

	sort.SliceStable(normalized, func(i, j int) bool {
		if normalized[i].Sort == normalized[j].Sort {
			return normalized[i].ID < normalized[j].ID
		}
		return normalized[i].Sort < normalized[j].Sort
	})
	return normalized, nil
}

func NormalizeOfficialSocialLinksJSONString(raw string) (string, error) {
	links, err := NormalizeOfficialSocialLinks(raw)
	if err != nil {
		return "", err
	}
	jsonBytes, err := common.Marshal(links)
	if err != nil {
		return "", err
	}
	return string(jsonBytes), nil
}

func PublicOfficialSocialLinksFromJSON(raw string) []PublicOfficialSocialLink {
	links, err := parseOfficialSocialLinks(raw)
	if err != nil {
		return []PublicOfficialSocialLink{}
	}

	publicLinks := make([]PublicOfficialSocialLink, 0, len(links))
	for _, link := range links {
		platform := strings.ToLower(strings.TrimSpace(link.Platform))
		label := strings.TrimSpace(link.Label)
		linkURL := strings.TrimSpace(link.URL)
		if !link.Enabled || !IsValidOfficialSocialPlatform(platform) || linkURL == "" {
			continue
		}
		if err := ValidateOfficialSocialURL(linkURL); err != nil {
			continue
		}
		if label == "" {
			label = defaultOfficialSocialLabel(platform)
		}
		publicLinks = append(publicLinks, PublicOfficialSocialLink{
			Platform: platform,
			Label:    label,
			URL:      linkURL,
			Enabled:  true,
			Sort:     link.Sort,
		})
	}

	sort.SliceStable(publicLinks, func(i, j int) bool {
		if publicLinks[i].Sort == publicLinks[j].Sort {
			return publicLinks[i].Platform < publicLinks[j].Platform
		}
		return publicLinks[i].Sort < publicLinks[j].Sort
	})
	return publicLinks
}
