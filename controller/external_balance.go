package controller

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const externalBalanceMetadataMaxLength = 4096

type externalBalanceDeductRequest struct {
	RequestID   string                 `json:"request_id"`
	UserID      int                    `json:"user_id"`
	Username    string                 `json:"username"`
	Email       string                 `json:"email"`
	Quota       int                    `json:"quota"`
	Reason      string                 `json:"reason"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata"`
}

func GetExternalUserBalance(c *gin.Context) {
	if !setting.ExternalBalanceApiAllowQuery {
		externalBalanceError(c, http.StatusForbidden, "query_disabled", nil)
		return
	}

	identifier, ok := externalBalanceIdentifierFromQuery(c)
	if !ok {
		externalBalanceError(c, http.StatusBadRequest, "invalid_request", nil)
		return
	}

	user, err := model.FindExternalBalanceUser(identifier)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			externalBalanceError(c, http.StatusNotFound, "user_not_found", nil)
			return
		}
		externalBalanceError(c, http.StatusInternalServerError, "database_error", nil)
		return
	}
	if user.Status != common.UserStatusEnabled {
		externalBalanceError(c, http.StatusNotFound, "user_not_found", nil)
		return
	}

	externalBalanceSuccess(c, externalBalanceUserResponse(user))
}

func DeductExternalUserBalance(c *gin.Context) {
	if !setting.ExternalBalanceApiAllowDeduct {
		externalBalanceError(c, http.StatusForbidden, "deduct_disabled", nil)
		return
	}

	var req externalBalanceDeductRequest
	if err := common.UnmarshalBodyReusable(c, &req); err != nil {
		externalBalanceError(c, http.StatusBadRequest, "invalid_request", nil)
		return
	}

	if msg := validateExternalBalanceDeductRequest(&req); msg != "" {
		data := gin.H{
			"request_id": strings.TrimSpace(req.RequestID),
			"status":     model.ExternalBalanceStatusFailed,
		}
		if strings.TrimSpace(req.RequestID) != "" {
			if record, err := recordExternalBalanceControllerFailure(c, req, "", msg); err == nil {
				data = externalBalanceDeductResponse(record)
			}
		}
		status := http.StatusBadRequest
		if msg == "quota_limit_exceeded" {
			status = http.StatusConflict
		}
		externalBalanceError(c, status, msg, data)
		return
	}

	metadata, err := marshalExternalBalanceMetadata(req.Metadata)
	if err != nil {
		data := gin.H{
			"request_id": strings.TrimSpace(req.RequestID),
			"status":     model.ExternalBalanceStatusFailed,
		}
		if record, recordErr := recordExternalBalanceControllerFailure(c, req, "", "invalid_request"); recordErr == nil {
			data = externalBalanceDeductResponse(record)
		}
		externalBalanceError(c, http.StatusBadRequest, err.Error(), data)
		return
	}

	record, err := model.DeductUserQuotaAtomically(model.DeductParams{
		RequestID:   strings.TrimSpace(req.RequestID),
		UserID:      req.UserID,
		Username:    strings.TrimSpace(req.Username),
		Email:       strings.TrimSpace(req.Email),
		Quota:       req.Quota,
		Reason:      strings.TrimSpace(req.Reason),
		Description: strings.TrimSpace(req.Description),
		Metadata:    metadata,
		ClientIP:    c.ClientIP(),
		UserAgent:   truncateString(c.Request.UserAgent(), 255),
	})
	if err != nil {
		externalBalanceError(c, http.StatusInternalServerError, "database_error", nil)
		return
	}

	data := externalBalanceDeductResponse(record)
	if record.Status == model.ExternalBalanceStatusSuccess {
		externalBalanceSuccess(c, data)
		return
	}

	status := http.StatusConflict
	if record.ErrorCode == "user_not_found" {
		status = http.StatusNotFound
	} else if record.ErrorCode == "user_disabled" {
		status = http.StatusForbidden
	}
	message := record.ErrorMessage
	if message == "" {
		message = record.ErrorCode
	}
	externalBalanceError(c, status, message, data)
}

func GetExternalBalanceTransaction(c *gin.Context) {
	if !setting.ExternalBalanceApiAllowQuery {
		externalBalanceError(c, http.StatusForbidden, "query_disabled", nil)
		return
	}

	requestID := strings.TrimSpace(c.Param("request_id"))
	if requestID == "" || len(requestID) > 128 {
		externalBalanceError(c, http.StatusBadRequest, "invalid_request", nil)
		return
	}

	detail, err := model.GetExternalBalanceTransactionWithUser(requestID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			externalBalanceError(c, http.StatusNotFound, "transaction not found", gin.H{
				"request_id": requestID,
				"status":     "not_found",
			})
			return
		}
		externalBalanceError(c, http.StatusInternalServerError, "database_error", nil)
		return
	}
	externalBalanceSuccess(c, externalBalanceTransactionResponse(detail))
}

func externalBalanceIdentifierFromQuery(c *gin.Context) (model.UserIdentifier, bool) {
	identifier := model.UserIdentifier{
		Username: strings.TrimSpace(c.Query("username")),
		Email:    strings.TrimSpace(c.Query("email")),
	}
	if userID, ok := parsePositiveIntQuery(c, "user_id"); ok {
		identifier.UserID = userID
	}
	return identifier, identifier.UserID > 0 || identifier.Username != "" || identifier.Email != ""
}

func parsePositiveIntQuery(c *gin.Context, key string) (int, bool) {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return 0, false
	}
	return parsed, true
}

func validateExternalBalanceDeductRequest(req *externalBalanceDeductRequest) string {
	req.RequestID = strings.TrimSpace(req.RequestID)
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)
	req.Reason = strings.TrimSpace(req.Reason)
	req.Description = strings.TrimSpace(req.Description)
	if req.RequestID == "" || len(req.RequestID) > 128 {
		return "invalid_request"
	}
	if req.UserID <= 0 && req.Username == "" && req.Email == "" {
		return "invalid_request"
	}
	if req.Quota <= 0 {
		return "invalid_request"
	}
	if setting.ExternalBalanceApiMaxDeductQuota > 0 && req.Quota > setting.ExternalBalanceApiMaxDeductQuota {
		return "quota_limit_exceeded"
	}
	if len(req.Reason) > 64 || len(req.Description) > 255 {
		return "invalid_request"
	}
	return ""
}

func marshalExternalBalanceMetadata(metadata map[string]interface{}) (string, error) {
	if len(metadata) == 0 {
		return "", nil
	}
	bytes, err := common.Marshal(metadata)
	if err != nil {
		return "", errors.New("invalid_request")
	}
	if len(bytes) > externalBalanceMetadataMaxLength {
		return "", errors.New("invalid_request")
	}
	return string(bytes), nil
}

func recordExternalBalanceControllerFailure(c *gin.Context, req externalBalanceDeductRequest, metadata string, code string) (*model.ExternalBalanceTransaction, error) {
	return model.RecordExternalBalanceFailure(model.DeductParams{
		RequestID:   strings.TrimSpace(req.RequestID),
		UserID:      req.UserID,
		Username:    strings.TrimSpace(req.Username),
		Email:       strings.TrimSpace(req.Email),
		Quota:       req.Quota,
		Reason:      strings.TrimSpace(req.Reason),
		Description: strings.TrimSpace(req.Description),
		Metadata:    metadata,
		ClientIP:    c.ClientIP(),
		UserAgent:   truncateString(c.Request.UserAgent(), 255),
	}, code, code)
}

func externalBalanceUserResponse(user *model.User) gin.H {
	return gin.H{
		"user_id":        user.Id,
		"username":       user.Username,
		"email":          user.Email,
		"quota":          user.Quota,
		"used_quota":     user.UsedQuota,
		"quota_per_unit": common.QuotaPerUnit,
		"balance_units":  externalBalanceUnits(user.Quota),
		"status":         user.Status,
	}
}

func externalBalanceDeductResponse(record *model.ExternalBalanceTransaction) gin.H {
	data := gin.H{
		"request_id":     record.RequestID,
		"user_id":        record.UserID,
		"quota":          record.Quota,
		"deducted_quota": record.Quota,
		"quota_before":   record.QuotaBefore,
		"quota_after":    record.QuotaAfter,
		"status":         record.Status,
	}
	if record.Status != model.ExternalBalanceStatusSuccess {
		data["required_quota"] = record.Quota
		data["error_code"] = record.ErrorCode
	}
	return data
}

func externalBalanceTransactionResponse(detail *model.ExternalBalanceTransactionDetail) gin.H {
	record := detail.Transaction
	var user any
	if detail.User != nil {
		user = externalBalanceUserResponse(detail.User)
	} else {
		user = nil
	}
	return gin.H{
		"request_id":    record.RequestID,
		"user_id":       record.UserID,
		"username":      record.Username,
		"email":         record.Email,
		"quota":         record.Quota,
		"quota_before":  record.QuotaBefore,
		"quota_after":   record.QuotaAfter,
		"status":        record.Status,
		"reason":        record.Reason,
		"description":   record.Description,
		"metadata":      record.Metadata,
		"error_code":    record.ErrorCode,
		"error_message": record.ErrorMessage,
		"user":          user,
		"created_at":    record.CreatedAt,
	}
}

func externalBalanceUnits(quota int) float64 {
	if common.QuotaPerUnit <= 0 {
		return 0
	}
	return float64(quota) / common.QuotaPerUnit
}

func externalBalanceSuccess(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    data,
	})
}

func externalBalanceError(c *gin.Context, status int, message string, data any) {
	payload := gin.H{
		"success": false,
		"message": message,
	}
	if data != nil {
		payload["data"] = data
	}
	c.JSON(status, payload)
}

func truncateString(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}
