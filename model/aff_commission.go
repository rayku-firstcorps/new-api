package model

import (
	"fmt"
	"math"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"gorm.io/gorm"
)

func TryGrantAffCommission(userId int, topUpQuota int, topUpAmount int64) {
	if common.AffCommissionRate <= 0 {
		return
	}
	if !operation_setting.IsPaymentComplianceConfirmed() {
		return
	}

	var user User
	if err := DB.Select("id", "inviter_id", "created_at", "aff_first_topup_passed").
		Where("id = ?", userId).First(&user).Error; err != nil {
		return
	}
	if user.InviterId == 0 {
		return
	}

	if common.AffCommissionDurationDays > 0 {
		expireTime := user.CreatedAt + int64(common.AffCommissionDurationDays)*86400
		if common.GetTimestamp() > expireTime {
			return
		}
	}

	if common.AffFirstTopupMinAmount > 0 && !user.AffFirstTopupPassed {
		if topUpAmount < int64(common.AffFirstTopupMinAmount) {
			return
		}
		DB.Model(&User{}).Where("id = ?", userId).Update("aff_first_topup_passed", true)
	}

	commission := int(math.Round(float64(topUpQuota) * common.AffCommissionRate / 100))
	if commission <= 0 {
		return
	}
	if common.AffCommissionMaxPerTopup > 0 && commission > common.AffCommissionMaxPerTopup {
		commission = common.AffCommissionMaxPerTopup
	}

	err := DB.Model(&User{}).Where("id = ?", user.InviterId).
		UpdateColumns(map[string]interface{}{
			"aff_quota":   gorm.Expr("aff_quota + ?", commission),
			"aff_history": gorm.Expr("aff_history + ?", commission),
		}).Error
	if err != nil {
		common.SysError(fmt.Sprintf("failed to grant aff commission: inviter_id=%d error=%s", user.InviterId, err.Error()))
		return
	}

	RecordLog(user.InviterId, LogTypeSystem, fmt.Sprintf("邀请用户充值返佣 %s（被邀请人ID: %d，充值金额: %d）",
		logger.LogQuota(commission), userId, topUpAmount))
}
