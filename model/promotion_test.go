package model

import (
	"fmt"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupPromotionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	require.NoError(t, err)
	oldDB := DB
	oldLogDB := LOG_DB
	oldOptionMap := common.OptionMap
	oldMainDatabaseType := common.MainDatabaseType()
	oldLogDatabaseType := common.LogDatabaseType()
	DB = db
	LOG_DB = db
	common.SetDatabaseTypes(common.DatabaseTypeSQLite, common.DatabaseTypeSQLite)
	common.OptionMap = make(map[string]string)
	t.Cleanup(func() {
		DB = oldDB
		LOG_DB = oldLogDB
		common.OptionMap = oldOptionMap
		common.SetDatabaseTypes(oldMainDatabaseType, oldLogDatabaseType)
	})
	require.NoError(t, db.AutoMigrate(&User{}, &PromotionLink{}, &PromotionRegistration{}, &Option{}, &Log{}))
	return db
}

func TestApplyPromotionRegistrationWithTxTrialCoupon(t *testing.T) {
	db := setupPromotionTestDB(t)
	link := &PromotionLink{
		Code:             "trial-code",
		Name:             "trial",
		ChannelTag:       "summer",
		ActivityType:     PromotionActivityTrialCoupon,
		TrialCouponQuota: DefaultPromotionTrialCouponQuota(),
		Enabled:          true,
	}
	user := &User{Username: "u1", Email: "", Quota: 0}
	require.NoError(t, db.Create(link).Error)
	require.NoError(t, db.Create(user).Error)

	err := db.Transaction(func(tx *gorm.DB) error {
		return ApplyPromotionRegistrationWithTx(tx, user, link, "127.0.0.1", "ua")
	})
	require.NoError(t, err)

	var updatedUser User
	require.NoError(t, db.First(&updatedUser, user.Id).Error)
	require.Equal(t, 0, updatedUser.Quota)

	registration, err := GetPromotionRegistrationByUserID(user.Id)
	require.NoError(t, err)
	require.Equal(t, PromotionActivityTrialCoupon, registration.ActivityType)
	require.Equal(t, PromotionRewardStatusPendingEmail, registration.RewardStatus)
	require.Equal(t, DefaultPromotionTrialCouponQuota(), registration.RewardQuota)
	require.Equal(t, 0, registration.GrantedQuota)
}

func TestClaimPromotionReward(t *testing.T) {
	db := setupPromotionTestDB(t)
	common.OptionMap[OptionKeyPromotionRewardAllowedEmailDomains] = `["gmail.com"]`
	link := &PromotionLink{
		Code:             "trial-claim",
		Name:             "trial",
		ChannelTag:       "summer",
		ActivityType:     PromotionActivityTrialCoupon,
		TrialCouponQuota: 123,
		Enabled:          true,
	}
	user := &User{Username: "u2", Email: "user@gmail.com", Quota: 0}
	require.NoError(t, db.Create(link).Error)
	require.NoError(t, db.Create(user).Error)
	require.NoError(t, db.Create(&PromotionRegistration{
		PromotionLinkId: link.Id,
		Code:            link.Code,
		ChannelTag:      link.ChannelTag,
		UserId:          user.Id,
		Username:        user.Username,
		ActivityType:    PromotionActivityTrialCoupon,
		RewardStatus:    PromotionRewardStatusPendingEmail,
		RewardQuota:     123,
	}).Error)

	registration, err := ClaimPromotionReward(user.Id)
	require.NoError(t, err)
	require.Equal(t, PromotionRewardStatusGranted, registration.RewardStatus)
	require.Equal(t, 123, registration.GrantedQuota)

	var updatedUser User
	require.NoError(t, db.First(&updatedUser, user.Id).Error)
	require.Equal(t, 123, updatedUser.Quota)
}

func TestValidatePromotionRewardBannerConfigRejectsScript(t *testing.T) {
	config := PromotionRewardBannerConfig{
		ContentFormat: PromotionBannerContentFormatHTML,
		Content:       `<script>alert(1)</script>`,
	}
	err := ValidatePromotionRewardBannerConfig(&config)
	require.Error(t, err)
}

func TestClearBindingBlocksEmailRemovalAfterTrialRewardClaimed(t *testing.T) {
	db := setupPromotionTestDB(t)
	user := &User{Username: "u3", Email: "user@gmail.com", Quota: 123}
	require.NoError(t, db.Create(user).Error)
	require.NoError(t, db.Create(&PromotionRegistration{
		UserId:       user.Id,
		Username:     user.Username,
		ActivityType: PromotionActivityTrialCoupon,
		RewardStatus: PromotionRewardStatusGranted,
		RewardQuota:  123,
		GrantedQuota: 123,
	}).Error)

	err := user.ClearBinding("email")
	require.Error(t, err)

	var updatedUser User
	require.NoError(t, db.First(&updatedUser, user.Id).Error)
	require.Equal(t, "user@gmail.com", updatedUser.Email)
}

func TestClearBindingAllowsEmailRemovalBeforeTrialRewardClaimed(t *testing.T) {
	db := setupPromotionTestDB(t)
	user := &User{Username: "u4", Email: "user@gmail.com"}
	require.NoError(t, db.Create(user).Error)
	require.NoError(t, db.Create(&PromotionRegistration{
		UserId:       user.Id,
		Username:     user.Username,
		ActivityType: PromotionActivityTrialCoupon,
		RewardStatus: PromotionRewardStatusPendingEmail,
		RewardQuota:  123,
		GrantedQuota: 0,
	}).Error)

	err := user.ClearBinding("email")
	require.NoError(t, err)

	var updatedUser User
	require.NoError(t, db.First(&updatedUser, user.Id).Error)
	require.Equal(t, "", updatedUser.Email)
}
