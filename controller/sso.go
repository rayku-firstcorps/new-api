package controller

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/hkdf"
	"gorm.io/gorm"
)

type ssoClientRequest struct {
	Name          string   `json:"name"`
	ClientId      string   `json:"client_id"`
	ClientSecret  string   `json:"client_secret"`
	Enabled       *bool    `json:"enabled"`
	RedirectURIs  []string `json:"redirect_uris"`
	AllowedScopes []string `json:"allowed_scopes"`
}

type ssoClientResponse struct {
	Id            int      `json:"id"`
	Name          string   `json:"name"`
	ClientId      string   `json:"client_id"`
	Enabled       bool     `json:"enabled"`
	RedirectURIs  []string `json:"redirect_uris"`
	AllowedScopes []string `json:"allowed_scopes"`
	CreatedAt     int64    `json:"created_at"`
	UpdatedAt     int64    `json:"updated_at"`
}

type ssoAuthorizeRequest struct {
	ClientId    string `json:"client_id"`
	RedirectURI string `json:"redirect_uri"`
	State       string `json:"state"`
	Scope       string `json:"scope"`
}

type ssoTokenRequest struct {
	ClientId     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	Code         string `json:"code"`
	RedirectURI  string `json:"redirect_uri"`
}

type ssoApiKeyEncryptionRequest struct {
	Alg             string `json:"alg"`
	ClientPublicKey string `json:"client_public_key"`
}

type ssoCreateApiKeyRequest struct {
	ClientId       string                     `json:"client_id"`
	Name           string                     `json:"name"`
	Group          string                     `json:"group"`
	Models         []string                   `json:"models"`
	UnlimitedQuota bool                       `json:"unlimited_quota"`
	RemainQuota    int                        `json:"remain_quota"`
	ExpiredTime    int64                      `json:"expired_time"`
	AllowIps       string                     `json:"allow_ips"`
	KeyEncryption  ssoApiKeyEncryptionRequest `json:"key_encryption"`
}

type encryptedApiKeyResponse struct {
	Alg             string `json:"alg"`
	ServerPublicKey string `json:"server_public_key"`
	Nonce           string `json:"nonce"`
	Ciphertext      string `json:"ciphertext"`
	AAD             string `json:"aad"`
}

const ssoApiKeyEncryptionAlg = "X25519-HKDF-SHA256-AES-256-GCM"
const ssoApiKeyRSAEncryptionAlg = "RSA-OAEP-SHA256"

func splitSSOList(raw string) []string {
	parts := strings.Split(raw, "\n")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			result = append(result, part)
		}
	}
	return result
}

func joinSSOList(items []string) string {
	normalized := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for _, item := range items {
		item = strings.TrimSpace(item)
		if item == "" {
			continue
		}
		if _, ok := seen[item]; ok {
			continue
		}
		seen[item] = struct{}{}
		normalized = append(normalized, item)
	}
	return strings.Join(normalized, "\n")
}

func joinScopes(items []string) string {
	normalized := make([]string, 0, len(items))
	seen := make(map[string]struct{}, len(items))
	for _, item := range items {
		for _, scope := range strings.Fields(item) {
			scope = strings.TrimSpace(scope)
			if scope == "" {
				continue
			}
			if _, ok := seen[scope]; ok {
				continue
			}
			seen[scope] = struct{}{}
			normalized = append(normalized, scope)
		}
	}
	return strings.Join(normalized, " ")
}

func toSSOClientResponse(client *model.SSOClient) ssoClientResponse {
	return ssoClientResponse{
		Id:            client.Id,
		Name:          client.Name,
		ClientId:      client.ClientId,
		Enabled:       client.Enabled,
		RedirectURIs:  splitSSOList(client.RedirectURIs),
		AllowedScopes: strings.Fields(client.AllowedScopes),
		CreatedAt:     client.CreatedAt,
		UpdatedAt:     client.UpdatedAt,
	}
}

func GetSSOClients(c *gin.Context) {
	clients, err := model.GetAllSSOClients()
	if err != nil {
		common.ApiError(c, err)
		return
	}
	data := make([]ssoClientResponse, 0, len(clients))
	for _, client := range clients {
		data = append(data, toSSOClientResponse(client))
	}
	common.ApiSuccess(c, data)
}

func GetSSOClient(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "invalid id")
		return
	}
	client, err := model.GetSSOClientById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, toSSOClientResponse(client))
}

func CreateSSOClient(c *gin.Context) {
	var req ssoClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}
	client := &model.SSOClient{
		Name:          req.Name,
		ClientId:      req.ClientId,
		ClientSecret:  req.ClientSecret,
		Enabled:       enabled,
		RedirectURIs:  joinSSOList(req.RedirectURIs),
		AllowedScopes: joinScopes(req.AllowedScopes),
	}
	if err := model.CreateSSOClient(client); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, toSSOClientResponse(client))
}

func UpdateSSOClient(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "invalid id")
		return
	}
	client, err := model.GetSSOClientById(id)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	var req ssoClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	if req.Name != "" {
		client.Name = req.Name
	}
	if req.ClientId != "" {
		client.ClientId = req.ClientId
	}
	if req.ClientSecret != "" {
		client.ClientSecret = req.ClientSecret
	}
	if req.Enabled != nil {
		client.Enabled = *req.Enabled
	}
	if len(req.RedirectURIs) > 0 {
		client.RedirectURIs = joinSSOList(req.RedirectURIs)
	}
	if len(req.AllowedScopes) > 0 {
		client.AllowedScopes = joinScopes(req.AllowedScopes)
	}
	if err := model.UpdateSSOClient(client); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, toSSOClientResponse(client))
}

func DeleteSSOClient(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.ApiErrorMsg(c, "invalid id")
		return
	}
	if err := model.DeleteSSOClient(id); err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, nil)
}

func loadAndValidateSSOAuthorizeParams(clientId, redirectURI, scope string) (*model.SSOClient, error) {
	client, err := model.GetSSOClientByClientId(clientId)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("sso client not found")
		}
		return nil, err
	}
	if !client.Enabled {
		return nil, errors.New("sso client is disabled")
	}
	if !client.RedirectURIAllowed(redirectURI) {
		return nil, errors.New("redirect_uri is not allowed")
	}
	if !client.ScopeAllowed(scope) {
		return nil, errors.New("scope is not allowed")
	}
	return client, nil
}

func GetSSOAuthorize(c *gin.Context) {
	clientId := strings.TrimSpace(c.Query("client_id"))
	redirectURI := strings.TrimSpace(c.Query("redirect_uri"))
	scope := strings.TrimSpace(c.Query("scope"))
	if scope == "" {
		scope = "profile access_token"
	}
	client, err := loadAndValidateSSOAuthorizeParams(clientId, redirectURI, scope)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"client": gin.H{
			"name":      client.Name,
			"client_id": client.ClientId,
		},
		"scope": strings.Fields(scope),
		"user": gin.H{
			"id":       c.GetInt("id"),
			"username": c.GetString("username"),
			"role":     c.GetInt("role"),
			"group":    c.GetString("group"),
		},
	})
}

func ConfirmSSOAuthorize(c *gin.Context) {
	var req ssoAuthorizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	req.ClientId = strings.TrimSpace(req.ClientId)
	req.RedirectURI = strings.TrimSpace(req.RedirectURI)
	req.Scope = strings.TrimSpace(req.Scope)
	if req.Scope == "" {
		req.Scope = "profile access_token"
	}
	client, err := loadAndValidateSSOAuthorizeParams(req.ClientId, req.RedirectURI, req.Scope)
	if err != nil {
		model.CreateSSOAuthorizationLog(&model.SSOAuthorizationLog{
			ClientId:  req.ClientId,
			UserId:    c.GetInt("id"),
			Scope:     req.Scope,
			Action:    "authorize",
			IP:        c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			Success:   false,
			Message:   err.Error(),
		})
		common.ApiError(c, err)
		return
	}
	code, err := common.GenerateRandomKey(48)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	authCode := &model.SSOAuthorizationCode{
		Code:        code,
		ClientId:    client.ClientId,
		RedirectURI: req.RedirectURI,
		UserId:      c.GetInt("id"),
		Scope:       req.Scope,
		CreatedIP:   c.ClientIP(),
		UserAgent:   c.Request.UserAgent(),
	}
	if err := model.CreateSSOAuthorizationCode(authCode); err != nil {
		common.ApiError(c, err)
		return
	}
	callbackURL, err := buildSSOCallbackURL(req.RedirectURI, code, req.State)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	model.CreateSSOAuthorizationLog(&model.SSOAuthorizationLog{
		ClientId:  client.ClientId,
		UserId:    c.GetInt("id"),
		Scope:     req.Scope,
		Action:    "authorize",
		IP:        c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Success:   true,
	})
	common.ApiSuccess(c, gin.H{
		"code":         code,
		"redirect_url": callbackURL,
		"expires_at":   authCode.ExpiresAt,
	})
}

func DenySSOAuthorize(c *gin.Context) {
	var req ssoAuthorizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}
	callbackURL, err := buildSSOErrorCallbackURL(req.RedirectURI, "access_denied", req.State)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	model.CreateSSOAuthorizationLog(&model.SSOAuthorizationLog{
		ClientId:  strings.TrimSpace(req.ClientId),
		UserId:    c.GetInt("id"),
		Scope:     strings.TrimSpace(req.Scope),
		Action:    "deny",
		IP:        c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Success:   true,
	})
	common.ApiSuccess(c, gin.H{"redirect_url": callbackURL})
}

func ExchangeSSOToken(c *gin.Context) {
	var req ssoTokenRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	client, err := model.GetSSOClientByClientId(req.ClientId)
	if err != nil {
		common.ApiErrorMsg(c, "invalid client")
		return
	}
	if !client.Enabled || client.ClientSecret != strings.TrimSpace(req.ClientSecret) {
		model.CreateSSOAuthorizationLog(&model.SSOAuthorizationLog{
			ClientId:  strings.TrimSpace(req.ClientId),
			Action:    "token",
			IP:        c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			Success:   false,
			Message:   "invalid client credentials",
		})
		common.ApiErrorMsg(c, "invalid client")
		return
	}
	code, err := model.ConsumeSSOAuthorizationCode(req.Code, client, req.RedirectURI)
	if err != nil {
		model.CreateSSOAuthorizationLog(&model.SSOAuthorizationLog{
			ClientId:  client.ClientId,
			Action:    "token",
			IP:        c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			Success:   false,
			Message:   err.Error(),
		})
		common.ApiError(c, err)
		return
	}
	user, err := model.GetUserById(code.UserId, true)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if user.Status != common.UserStatusEnabled {
		common.ApiErrorMsg(c, "user is disabled")
		return
	}
	accessToken, err := ensureUserAccessToken(user)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	model.CreateSSOAuthorizationLog(&model.SSOAuthorizationLog{
		ClientId:  client.ClientId,
		UserId:    user.Id,
		Scope:     code.Scope,
		Action:    "token",
		IP:        c.ClientIP(),
		UserAgent: c.Request.UserAgent(),
		Success:   true,
	})
	common.ApiSuccess(c, gin.H{
		"token_type":   "Bearer",
		"access_token": accessToken,
		"user": gin.H{
			"id":           user.Id,
			"username":     user.Username,
			"display_name": user.DisplayName,
			"role":         user.Role,
			"group":        user.Group,
		},
	})
}

func ensureUserAccessToken(user *model.User) (string, error) {
	if user.GetAccessToken() != "" {
		return user.GetAccessToken(), nil
	}
	for i := 0; i < 5; i++ {
		randI := common.GetRandomInt(4)
		key, err := common.GenerateRandomKey(29 + randI)
		if err != nil {
			return "", err
		}
		var count int64
		if err := model.DB.Model(&model.User{}).Where("access_token = ?", key).Count(&count).Error; err != nil {
			return "", err
		}
		if count != 0 {
			continue
		}
		user.SetAccessToken(key)
		if err := user.Update(false); err != nil {
			return "", err
		}
		return key, nil
	}
	return "", errors.New("failed to generate unique access token")
}

func getUserAvailableGroups(userGroup string) map[string]map[string]interface{} {
	usableGroups := make(map[string]map[string]interface{})
	userUsableGroups := service.GetUserUsableGroups(userGroup)
	for groupName := range ratio_setting.GetGroupRatioCopy() {
		if desc, ok := userUsableGroups[groupName]; ok {
			usableGroups[groupName] = map[string]interface{}{
				"ratio": service.GetUserGroupRatio(userGroup, groupName),
				"desc":  desc,
			}
		}
	}
	if _, ok := userUsableGroups["auto"]; ok {
		usableGroups["auto"] = map[string]interface{}{
			"ratio": "auto",
			"desc":  setting.GetUsableGroupDescription("auto"),
		}
	}
	return usableGroups
}

func getUserAvailableModels(userGroup string) []string {
	groups := service.GetUserUsableGroups(userGroup)
	modelSet := make(map[string]struct{})
	for group := range groups {
		for _, modelName := range model.GetGroupEnabledModels(group) {
			modelSet[modelName] = struct{}{}
		}
	}
	models := make([]string, 0, len(modelSet))
	for modelName := range modelSet {
		models = append(models, modelName)
	}
	sort.Strings(models)
	return models
}

func validateRequestedModels(requested []string, available []string) (string, error) {
	if len(requested) == 0 {
		return "", nil
	}
	availableSet := make(map[string]struct{}, len(available))
	for _, modelName := range available {
		availableSet[modelName] = struct{}{}
	}
	normalized := make([]string, 0, len(requested))
	seen := make(map[string]struct{}, len(requested))
	for _, modelName := range requested {
		modelName = strings.TrimSpace(modelName)
		if modelName == "" {
			continue
		}
		if _, ok := availableSet[modelName]; !ok {
			return "", fmt.Errorf("model %q is not available for this user", modelName)
		}
		if _, ok := seen[modelName]; ok {
			continue
		}
		seen[modelName] = struct{}{}
		normalized = append(normalized, modelName)
	}
	sort.Strings(normalized)
	return strings.Join(normalized, ","), nil
}

func encryptApiKeyForSSOClient(apiKey string, req ssoApiKeyEncryptionRequest, aad string) (*encryptedApiKeyResponse, error) {
	if req.Alg == ssoApiKeyRSAEncryptionAlg {
		clientPubBytes, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(req.ClientPublicKey))
		if err != nil {
			return nil, fmt.Errorf("invalid client_public_key: %w", err)
		}
		parsedKey, err := x509.ParsePKIXPublicKey(clientPubBytes)
		if err != nil {
			return nil, fmt.Errorf("invalid client_public_key: %w", err)
		}
		clientPub, ok := parsedKey.(*rsa.PublicKey)
		if !ok {
			return nil, errors.New("client_public_key must be an RSA public key")
		}
		ciphertext, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, clientPub, []byte(apiKey), []byte(aad))
		if err != nil {
			return nil, err
		}
		return &encryptedApiKeyResponse{
			Alg:        ssoApiKeyRSAEncryptionAlg,
			Ciphertext: base64.RawURLEncoding.EncodeToString(ciphertext),
			AAD:        aad,
		}, nil
	}
	if req.Alg != ssoApiKeyEncryptionAlg {
		return nil, fmt.Errorf("unsupported key encryption alg %q", req.Alg)
	}
	clientPubBytes, err := base64.RawURLEncoding.DecodeString(strings.TrimSpace(req.ClientPublicKey))
	if err != nil {
		return nil, fmt.Errorf("invalid client_public_key: %w", err)
	}
	curve := ecdh.X25519()
	clientPub, err := curve.NewPublicKey(clientPubBytes)
	if err != nil {
		return nil, fmt.Errorf("invalid client_public_key: %w", err)
	}
	serverPriv, err := curve.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	sharedSecret, err := serverPriv.ECDH(clientPub)
	if err != nil {
		return nil, err
	}
	h := hkdf.New(sha256.New, sharedSecret, nil, []byte("new-api sso api key encryption v1"))
	aesKey := make([]byte, 32)
	if _, err := io.ReadFull(h, aesKey); err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(aesKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	ciphertext := gcm.Seal(nil, nonce, []byte(apiKey), []byte(aad))
	return &encryptedApiKeyResponse{
		Alg:             ssoApiKeyEncryptionAlg,
		ServerPublicKey: base64.RawURLEncoding.EncodeToString(serverPriv.PublicKey().Bytes()),
		Nonce:           base64.RawURLEncoding.EncodeToString(nonce),
		Ciphertext:      base64.RawURLEncoding.EncodeToString(ciphertext),
		AAD:             aad,
	}, nil
}

func CreateSSOApiKey(c *gin.Context) {
	var req ssoCreateApiKeyRequest
	if err := common.DecodeJson(c.Request.Body, &req); err != nil {
		common.ApiError(c, err)
		return
	}
	req.ClientId = strings.TrimSpace(req.ClientId)
	req.Name = strings.TrimSpace(req.Name)
	req.Group = strings.TrimSpace(req.Group)
	if req.Name == "" {
		req.Name = "SSO API Key"
	}
	if len(req.Name) > 50 {
		common.ApiErrorMsg(c, "token name too long")
		return
	}
	client, err := model.GetSSOClientByClientId(req.ClientId)
	if err != nil {
		common.ApiErrorMsg(c, "invalid sso client")
		return
	}
	if !client.Enabled {
		common.ApiErrorMsg(c, "sso client is disabled")
		return
	}
	if req.KeyEncryption.ClientPublicKey == "" {
		common.ApiErrorMsg(c, "key_encryption.client_public_key is required")
		return
	}
	userID := c.GetInt("id")
	user, err := model.GetUserCache(userID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if req.Group == "" {
		req.Group = user.Group
	}
	if req.Group == "" {
		req.Group = "default"
	}
	if !service.GroupInUserUsableGroups(user.Group, req.Group) {
		common.ApiErrorMsg(c, "group is not available for this user")
		return
	}
	if !req.UnlimitedQuota {
		if req.RemainQuota < 0 {
			common.ApiErrorMsg(c, "quota cannot be negative")
			return
		}
		maxQuotaValue := int(1000000000 * common.QuotaPerUnit)
		if req.RemainQuota > maxQuotaValue {
			common.ApiErrorMsg(c, fmt.Sprintf("quota exceeds max value %d", maxQuotaValue))
			return
		}
	}
	maxTokens := operation_setting.GetMaxUserTokens()
	count, err := model.CountUserTokens(userID)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	if int(count) >= maxTokens {
		common.ApiErrorMsg(c, fmt.Sprintf("maximum token count reached (%d)", maxTokens))
		return
	}
	availableModels := getUserAvailableModels(user.Group)
	modelLimits, err := validateRequestedModels(req.Models, availableModels)
	if err != nil {
		common.ApiError(c, err)
		return
	}
	key, err := common.GenerateKey()
	if err != nil {
		common.ApiErrorMsg(c, "failed to generate token key")
		common.SysLog("failed to generate sso api key: " + err.Error())
		return
	}
	var allowIps *string
	if strings.TrimSpace(req.AllowIps) != "" {
		allowIpsValue := strings.TrimSpace(req.AllowIps)
		allowIps = &allowIpsValue
	}
	token := model.Token{
		UserId:             userID,
		Name:               req.Name,
		Key:                key,
		CreatedTime:        common.GetTimestamp(),
		AccessedTime:       common.GetTimestamp(),
		ExpiredTime:        req.ExpiredTime,
		RemainQuota:        req.RemainQuota,
		UnlimitedQuota:     req.UnlimitedQuota,
		ModelLimitsEnabled: modelLimits != "",
		ModelLimits:        modelLimits,
		AllowIps:           allowIps,
		Group:              req.Group,
		CrossGroupRetry:    false,
	}
	if token.ExpiredTime == 0 {
		token.ExpiredTime = -1
	}
	if err := token.Insert(); err != nil {
		common.ApiError(c, err)
		return
	}
	aad := fmt.Sprintf("sso-api-key:%s:%d:%d", client.ClientId, userID, token.Id)
	encryptedKey, err := encryptApiKeyForSSOClient("sk-"+token.GetFullKey(), req.KeyEncryption, aad)
	if err != nil {
		_ = token.Delete()
		common.ApiError(c, err)
		return
	}
	common.ApiSuccess(c, gin.H{
		"encrypted_api_key": encryptedKey,
		"token": gin.H{
			"id":                   token.Id,
			"name":                 token.Name,
			"group":                token.Group,
			"model_limits_enabled": token.ModelLimitsEnabled,
			"model_limits":         token.GetModelLimits(),
			"expired_time":         token.ExpiredTime,
			"unlimited_quota":      token.UnlimitedQuota,
			"remain_quota":         token.RemainQuota,
		},
		"user": gin.H{
			"id":       userID,
			"username": user.Username,
			"group":    user.Group,
		},
		"available_groups": getUserAvailableGroups(user.Group),
		"available_models": availableModels,
	})
}

func buildSSOCallbackURL(rawURL string, code string, state string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	query := parsed.Query()
	query.Set("code", code)
	if state != "" {
		query.Set("state", state)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func buildSSOErrorCallbackURL(rawURL string, errorCode string, state string) (string, error) {
	if strings.TrimSpace(rawURL) == "" {
		return "", fmt.Errorf("redirect_uri is required")
	}
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	query := parsed.Query()
	query.Set("error", errorCode)
	if state != "" {
		query.Set("state", state)
	}
	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func RedirectSSOAuthorize(c *gin.Context) {
	clientId := c.Query("client_id")
	redirectURI := c.Query("redirect_uri")
	scope := c.Query("scope")
	if scope == "" {
		scope = "profile access_token"
	}
	client, err := loadAndValidateSSOAuthorizeParams(clientId, redirectURI, scope)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	_ = client
	c.Redirect(http.StatusFound, "/sso/authorize?"+c.Request.URL.RawQuery)
}
