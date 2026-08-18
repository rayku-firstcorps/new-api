package model

import (
	"errors"
	"fmt"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"

	"gorm.io/gorm"
)

const (
	ExternalBalanceStatusSuccess = "success"
	ExternalBalanceStatusFailed  = "failed"
)

type ExternalBalanceTransaction struct {
	Id           int    `json:"id"`
	RequestID    string `json:"request_id" gorm:"type:varchar(128);uniqueIndex;not null"`
	UserID       int    `json:"user_id" gorm:"type:int;not null;index"`
	Username     string `json:"username" gorm:"type:varchar(64);default:''"`
	Email        string `json:"email" gorm:"type:varchar(128);default:''"`
	Quota        int    `json:"quota" gorm:"type:int;not null"`
	QuotaBefore  int    `json:"quota_before" gorm:"type:int;not null"`
	QuotaAfter   int    `json:"quota_after" gorm:"type:int;not null"`
	Status       string `json:"status" gorm:"type:varchar(32);not null;index"`
	Reason       string `json:"reason" gorm:"type:varchar(64);default:''"`
	Description  string `json:"description" gorm:"type:varchar(255);default:''"`
	Metadata     string `json:"metadata" gorm:"type:text"`
	ErrorCode    string `json:"error_code" gorm:"type:varchar(64);default:''"`
	ErrorMessage string `json:"error_message" gorm:"type:varchar(255);default:''"`
	ClientIP     string `json:"client_ip" gorm:"type:varchar(64);default:''"`
	UserAgent    string `json:"user_agent" gorm:"type:varchar(255);default:''"`
	CreatedAt    int64  `json:"created_at" gorm:"bigint;autoCreateTime"`
	UpdatedAt    int64  `json:"updated_at" gorm:"bigint;autoUpdateTime"`
}

type UserIdentifier struct {
	UserID   int
	Username string
	Email    string
}

type DeductParams struct {
	RequestID   string
	UserID      int
	Username    string
	Email       string
	Quota       int
	Reason      string
	Description string
	Metadata    string
	ClientIP    string
	UserAgent   string
}

type ExternalBalanceTransactionDetail struct {
	Transaction *ExternalBalanceTransaction
	User        *User
}

func GetExternalBalanceTransactionByRequestID(requestID string) (*ExternalBalanceTransaction, error) {
	var record ExternalBalanceTransaction
	err := DB.Where("request_id = ?", requestID).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func GetExternalBalanceTransactionWithUser(requestID string) (*ExternalBalanceTransactionDetail, error) {
	record, err := GetExternalBalanceTransactionByRequestID(requestID)
	if err != nil {
		return nil, err
	}
	user, userErr := GetUserById(record.UserID, false)
	if userErr != nil {
		if errors.Is(userErr, gorm.ErrRecordNotFound) {
			user = nil
		} else {
			return nil, userErr
		}
	}
	return &ExternalBalanceTransactionDetail{
		Transaction: record,
		User:        user,
	}, nil
}

func CreateExternalBalanceTransaction(tx *gorm.DB, record *ExternalBalanceTransaction) error {
	if tx == nil {
		tx = DB
	}
	return tx.Create(record).Error
}

func RecordExternalBalanceFailure(params DeductParams, code string, message string) (*ExternalBalanceTransaction, error) {
	params.RequestID = strings.TrimSpace(params.RequestID)
	if params.RequestID == "" {
		return nil, errors.New("request_id is required")
	}
	if existing, err := GetExternalBalanceTransactionByRequestID(params.RequestID); err == nil {
		return existing, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var user *User
	if found, err := FindExternalBalanceUser(UserIdentifier{
		UserID:   params.UserID,
		Username: params.Username,
		Email:    params.Email,
	}); err == nil {
		user = found
	}
	record := buildExternalBalanceFailure(params, user, code, message)
	if err := DB.Create(record).Error; err != nil {
		if existing, getErr := GetExternalBalanceTransactionByRequestID(params.RequestID); getErr == nil {
			return existing, nil
		}
		return nil, err
	}
	return record, nil
}

func FindExternalBalanceUser(identifier UserIdentifier) (*User, error) {
	query := DB.Omit("password")
	return findExternalBalanceUserWithDB(query, identifier)
}

func DeductUserQuotaAtomically(params DeductParams) (*ExternalBalanceTransaction, error) {
	params.RequestID = strings.TrimSpace(params.RequestID)
	if params.RequestID == "" {
		return nil, errors.New("request_id is required")
	}

	existing, err := GetExternalBalanceTransactionByRequestID(params.RequestID)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	var resultRecord *ExternalBalanceTransaction
	err = DB.Transaction(func(tx *gorm.DB) error {
		var existing ExternalBalanceTransaction
		err := tx.Where("request_id = ?", params.RequestID).First(&existing).Error
		if err == nil {
			resultRecord = &existing
			return nil
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		user, err := findExternalBalanceUserWithDB(tx.Omit("password"), UserIdentifier{
			UserID:   params.UserID,
			Username: params.Username,
			Email:    params.Email,
		})
		if err != nil {
			record := buildExternalBalanceFailure(params, nil, "user_not_found", "user not found")
			if createErr := tx.Create(record).Error; createErr != nil {
				return createErr
			}
			resultRecord = record
			return nil
		}

		if user.Status != common.UserStatusEnabled {
			record := buildExternalBalanceFailure(params, user, "user_disabled", "user disabled")
			if createErr := tx.Create(record).Error; createErr != nil {
				return createErr
			}
			resultRecord = record
			return nil
		}

		quotaBefore := user.Quota
		if quotaBefore < params.Quota {
			record := buildExternalBalanceFailure(params, user, "insufficient_quota", "insufficient quota")
			record.QuotaBefore = quotaBefore
			record.QuotaAfter = quotaBefore
			if createErr := tx.Create(record).Error; createErr != nil {
				return createErr
			}
			resultRecord = record
			return nil
		}

		update := tx.Model(&User{}).
			Where("id = ? AND quota >= ?", user.Id, params.Quota).
			Update("quota", gorm.Expr("quota - ?", params.Quota))
		if update.Error != nil {
			return update.Error
		}
		if update.RowsAffected == 0 {
			record := buildExternalBalanceFailure(params, user, "insufficient_quota", "insufficient quota")
			record.QuotaBefore = quotaBefore
			record.QuotaAfter = quotaBefore
			if createErr := tx.Create(record).Error; createErr != nil {
				return createErr
			}
			resultRecord = record
			return nil
		}

		var quotaAfter int
		if err := tx.Model(&User{}).Where("id = ?", user.Id).Select("quota").First(&quotaAfter).Error; err != nil {
			return err
		}

		record := &ExternalBalanceTransaction{
			RequestID:   params.RequestID,
			UserID:      user.Id,
			Username:    user.Username,
			Email:       user.Email,
			Quota:       params.Quota,
			QuotaBefore: quotaBefore,
			QuotaAfter:  quotaAfter,
			Status:      ExternalBalanceStatusSuccess,
			Reason:      params.Reason,
			Description: params.Description,
			Metadata:    params.Metadata,
			ClientIP:    params.ClientIP,
			UserAgent:   params.UserAgent,
		}
		if err := tx.Create(record).Error; err != nil {
			return err
		}
		resultRecord = record
		return nil
	})
	if err != nil {
		if existing, getErr := GetExternalBalanceTransactionByRequestID(params.RequestID); getErr == nil {
			return existing, nil
		}
		return nil, err
	}

	if resultRecord != nil && resultRecord.Status == ExternalBalanceStatusSuccess {
		_ = RefreshUserQuotaCache(resultRecord.UserID)
		RecordLog(resultRecord.UserID, LogTypeSystem, fmt.Sprintf(
			"External balance deduction %s, request_id=%s, reason=%s",
			logger.LogQuota(resultRecord.Quota), resultRecord.RequestID, resultRecord.Reason,
		))
	}
	return resultRecord, nil
}

func RefreshUserQuotaCache(userId int) error {
	if !common.RedisEnabled {
		return nil
	}
	if err := invalidateUserCache(userId); err != nil {
		return err
	}
	_, err := GetUserCache(userId)
	return err
}

func findExternalBalanceUserWithDB(db *gorm.DB, identifier UserIdentifier) (*User, error) {
	identifier.Username = strings.TrimSpace(identifier.Username)
	identifier.Email = strings.TrimSpace(identifier.Email)

	var user User
	query := db
	switch {
	case identifier.UserID > 0:
		query = query.Where("id = ?", identifier.UserID)
	case identifier.Username != "":
		query = query.Where("username = ?", identifier.Username)
	case identifier.Email != "":
		query = query.Where("email = ?", identifier.Email)
	default:
		return nil, errors.New("user identifier is required")
	}
	if err := query.First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func buildExternalBalanceFailure(params DeductParams, user *User, code string, message string) *ExternalBalanceTransaction {
	record := &ExternalBalanceTransaction{
		RequestID:    params.RequestID,
		Quota:        params.Quota,
		Status:       ExternalBalanceStatusFailed,
		Reason:       params.Reason,
		Description:  params.Description,
		Metadata:     params.Metadata,
		ErrorCode:    code,
		ErrorMessage: message,
		ClientIP:     params.ClientIP,
		UserAgent:    params.UserAgent,
		QuotaBefore:  0,
		QuotaAfter:   0,
		UserID:       params.UserID,
		Username:     strings.TrimSpace(params.Username),
		Email:        strings.TrimSpace(params.Email),
	}
	if user != nil {
		record.UserID = user.Id
		record.Username = user.Username
		record.Email = user.Email
		record.QuotaBefore = user.Quota
		record.QuotaAfter = user.Quota
	}
	return record
}
