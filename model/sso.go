package model

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

const (
	SSOAuthCodeTTLSeconds = 300
)

type SSOClient struct {
	Id            int    `json:"id" gorm:"primaryKey"`
	Name          string `json:"name" gorm:"type:varchar(128);not null"`
	ClientId      string `json:"client_id" gorm:"type:varchar(128);uniqueIndex;not null"`
	ClientSecret  string `json:"-" gorm:"type:varchar(255);not null"`
	Enabled       bool   `json:"enabled" gorm:"not null;default:true"`
	RedirectURIs  string `json:"redirect_uris" gorm:"type:text;not null"`
	AllowedScopes string `json:"allowed_scopes" gorm:"type:varchar(255);not null;default:'profile access_token'"`
	CreatedAt     int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
	UpdatedAt     int64  `json:"updated_at" gorm:"autoUpdateTime;column:updated_at"`
}

func (SSOClient) TableName() string {
	return "sso_clients"
}

type SSOAuthorizationCode struct {
	Id          int            `json:"id" gorm:"primaryKey"`
	Code        string         `json:"-" gorm:"type:varchar(128);uniqueIndex;not null"`
	ClientId    string         `json:"client_id" gorm:"type:varchar(128);index;not null"`
	RedirectURI string         `json:"redirect_uri" gorm:"type:varchar(1024);not null"`
	UserId      int            `json:"user_id" gorm:"index;not null"`
	Scope       string         `json:"scope" gorm:"type:varchar(255);not null"`
	ExpiresAt   int64          `json:"expires_at" gorm:"not null;index"`
	UsedAt      int64          `json:"used_at" gorm:"not null;default:0"`
	FailedCount int            `json:"failed_count" gorm:"not null;default:0"`
	CreatedIP   string         `json:"created_ip" gorm:"type:varchar(64)"`
	UserAgent   string         `json:"user_agent" gorm:"type:varchar(512)"`
	CreatedAt   int64          `json:"created_at" gorm:"autoCreateTime;column:created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}

func (SSOAuthorizationCode) TableName() string {
	return "sso_authorization_codes"
}

type SSOAuthorizationLog struct {
	Id        int    `json:"id" gorm:"primaryKey"`
	ClientId  string `json:"client_id" gorm:"type:varchar(128);index;not null"`
	UserId    int    `json:"user_id" gorm:"index;not null"`
	Scope     string `json:"scope" gorm:"type:varchar(255)"`
	Action    string `json:"action" gorm:"type:varchar(64);index;not null"`
	IP        string `json:"ip" gorm:"type:varchar(64)"`
	UserAgent string `json:"user_agent" gorm:"type:varchar(512)"`
	Success   bool   `json:"success" gorm:"not null;default:true"`
	Message   string `json:"message" gorm:"type:varchar(512)"`
	CreatedAt int64  `json:"created_at" gorm:"autoCreateTime;column:created_at"`
}

func (SSOAuthorizationLog) TableName() string {
	return "sso_authorization_logs"
}

func validateSSOClient(client *SSOClient) error {
	if client == nil {
		return errors.New("sso client is nil")
	}
	client.Name = strings.TrimSpace(client.Name)
	client.ClientId = strings.TrimSpace(client.ClientId)
	client.ClientSecret = strings.TrimSpace(client.ClientSecret)
	client.RedirectURIs = normalizeSpaceLines(client.RedirectURIs)
	client.AllowedScopes = normalizeScopes(client.AllowedScopes)
	if client.Name == "" {
		return errors.New("client name is required")
	}
	if client.ClientId == "" {
		return errors.New("client_id is required")
	}
	if client.ClientSecret == "" {
		return errors.New("client_secret is required")
	}
	if client.RedirectURIs == "" {
		return errors.New("redirect_uris is required")
	}
	for _, redirectURI := range splitLines(client.RedirectURIs) {
		if err := validateRedirectURI(redirectURI); err != nil {
			return fmt.Errorf("invalid redirect_uri %q: %w", redirectURI, err)
		}
	}
	if client.AllowedScopes == "" {
		client.AllowedScopes = "profile access_token"
	}
	return nil
}

func validateRedirectURI(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil {
		return err
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return errors.New("scheme must be http or https")
	}
	if parsed.Host == "" {
		return errors.New("host is required")
	}
	if parsed.Fragment != "" {
		return errors.New("fragment is not allowed")
	}
	return nil
}

func splitLines(value string) []string {
	lines := strings.Split(value, "\n")
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line != "" {
			result = append(result, line)
		}
	}
	return result
}

func normalizeSpaceLines(value string) string {
	return strings.Join(splitLines(value), "\n")
}

func normalizeScopes(value string) string {
	parts := strings.Fields(value)
	seen := make(map[string]struct{}, len(parts))
	normalized := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if _, ok := seen[part]; ok {
			continue
		}
		seen[part] = struct{}{}
		normalized = append(normalized, part)
	}
	return strings.Join(normalized, " ")
}

func IsSSOClientIdTaken(clientId string, excludeId int) bool {
	var count int64
	query := DB.Model(&SSOClient{}).Where("client_id = ?", strings.TrimSpace(clientId))
	if excludeId > 0 {
		query = query.Where("id != ?", excludeId)
	}
	if err := query.Count(&count).Error; err != nil {
		return true
	}
	return count > 0
}

func CreateSSOClient(client *SSOClient) error {
	if err := validateSSOClient(client); err != nil {
		return err
	}
	if IsSSOClientIdTaken(client.ClientId, 0) {
		return errors.New("client_id already exists")
	}
	return DB.Create(client).Error
}

func UpdateSSOClient(client *SSOClient) error {
	if err := validateSSOClient(client); err != nil {
		return err
	}
	if IsSSOClientIdTaken(client.ClientId, client.Id) {
		return errors.New("client_id already exists")
	}
	return DB.Save(client).Error
}

func DeleteSSOClient(id int) error {
	return DB.Delete(&SSOClient{}, id).Error
}

func GetSSOClientById(id int) (*SSOClient, error) {
	var client SSOClient
	if err := DB.First(&client, id).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

func GetSSOClientByClientId(clientId string) (*SSOClient, error) {
	var client SSOClient
	if err := DB.Where("client_id = ?", strings.TrimSpace(clientId)).First(&client).Error; err != nil {
		return nil, err
	}
	return &client, nil
}

func GetAllSSOClients() ([]*SSOClient, error) {
	var clients []*SSOClient
	err := DB.Order("id asc").Find(&clients).Error
	return clients, err
}

func (client *SSOClient) RedirectURIAllowed(redirectURI string) bool {
	redirectURI = strings.TrimSpace(redirectURI)
	for _, allowed := range splitLines(client.RedirectURIs) {
		if redirectURI == allowed {
			return true
		}
	}
	return false
}

func (client *SSOClient) ScopeAllowed(scope string) bool {
	requested := strings.Fields(scope)
	if len(requested) == 0 {
		return true
	}
	allowed := make(map[string]struct{})
	for _, item := range strings.Fields(client.AllowedScopes) {
		allowed[item] = struct{}{}
	}
	for _, item := range requested {
		if _, ok := allowed[item]; !ok {
			return false
		}
	}
	return true
}

func CreateSSOAuthorizationCode(code *SSOAuthorizationCode) error {
	if code == nil {
		return errors.New("authorization code is nil")
	}
	code.ClientId = strings.TrimSpace(code.ClientId)
	code.RedirectURI = strings.TrimSpace(code.RedirectURI)
	code.Scope = normalizeScopes(code.Scope)
	if code.ExpiresAt == 0 {
		code.ExpiresAt = common.GetTimestamp() + SSOAuthCodeTTLSeconds
	}
	return DB.Create(code).Error
}

func ConsumeSSOAuthorizationCode(rawCode string, client *SSOClient, redirectURI string) (*SSOAuthorizationCode, error) {
	rawCode = strings.TrimSpace(rawCode)
	if rawCode == "" {
		return nil, errors.New("code is required")
	}
	var code SSOAuthorizationCode
	err := DB.Where("code = ?", rawCode).First(&code).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("authorization code is invalid")
		}
		return nil, err
	}
	if code.UsedAt != 0 {
		return nil, errors.New("authorization code has been used")
	}
	if code.ExpiresAt < common.GetTimestamp() {
		return nil, errors.New("authorization code has expired")
	}
	if code.FailedCount >= 5 {
		return nil, errors.New("authorization code has too many failed attempts")
	}
	if client == nil || code.ClientId != client.ClientId || code.RedirectURI != strings.TrimSpace(redirectURI) {
		_ = DB.Model(&code).Update("failed_count", gorm.Expr("failed_count + ?", 1)).Error
		return nil, errors.New("authorization code does not match client")
	}
	code.UsedAt = common.GetTimestamp()
	if err := DB.Model(&code).Update("used_at", code.UsedAt).Error; err != nil {
		return nil, err
	}
	return &code, nil
}

func CreateSSOAuthorizationLog(log *SSOAuthorizationLog) {
	if log == nil {
		return
	}
	if len(log.UserAgent) > 512 {
		log.UserAgent = log.UserAgent[:512]
	}
	if len(log.Message) > 512 {
		log.Message = log.Message[:512]
	}
	if err := DB.Create(log).Error; err != nil {
		common.SysLog("failed to create sso authorization log: " + err.Error())
	}
}
