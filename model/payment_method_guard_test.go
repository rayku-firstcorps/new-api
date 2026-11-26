package model

import (
	"os"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func insertUserForPaymentGuardTest(t *testing.T, id int, quota int) *User {
	t.Helper()
	user := &User{
		Id:       id,
		Username: "payment_guard_user",
		Status:   common.UserStatusEnabled,
		Quota:    quota,
	}
	require.NoError(t, DB.Create(user).Error)
	return user
}

func insertSubscriptionPlanForPaymentGuardTest(t *testing.T, id int) *SubscriptionPlan {
	t.Helper()
	plan := &SubscriptionPlan{
		Id:            id,
		Title:         "Guard Plan",
		PriceAmount:   9.99,
		Currency:      "USD",
		DurationUnit:  SubscriptionDurationMonth,
		DurationValue: 1,
		Enabled:       true,
		TotalAmount:   1000,
	}
	require.NoError(t, DB.Create(plan).Error)
	return plan
}

func insertSubscriptionOrderForPaymentGuardTest(t *testing.T, tradeNo string, userID int, planID int, paymentProvider string) {
	t.Helper()
	order := &SubscriptionOrder{
		UserId:          userID,
		PlanId:          planID,
		Money:           9.99,
		TradeNo:         tradeNo,
		PaymentMethod:   paymentProvider,
		PaymentProvider: paymentProvider,
		Status:          common.TopUpStatusPending,
		CreateTime:      time.Now().Unix(),
	}
	require.NoError(t, order.Insert())
}

func insertTopUpForPaymentGuardTest(t *testing.T, tradeNo string, userID int, paymentProvider string) {
	t.Helper()
	topUp := &TopUp{
		UserId:          userID,
		Amount:          2,
		Money:           9.99,
		TradeNo:         tradeNo,
		PaymentMethod:   paymentProvider,
		PaymentProvider: paymentProvider,
		Status:          common.TopUpStatusPending,
		CreateTime:      time.Now().Unix(),
	}
	require.NoError(t, topUp.Insert())
}

func getTopUpStatusForPaymentGuardTest(t *testing.T, tradeNo string) string {
	t.Helper()
	topUp := GetTopUpByTradeNo(tradeNo)
	require.NotNil(t, topUp)
	return topUp.Status
}

func countUserSubscriptionsForPaymentGuardTest(t *testing.T, userID int) int64 {
	t.Helper()
	var count int64
	require.NoError(t, DB.Model(&UserSubscription{}).Where("user_id = ?", userID).Count(&count).Error)
	return count
}

func getUserQuotaForPaymentGuardTest(t *testing.T, userID int) int {
	t.Helper()
	var user User
	require.NoError(t, DB.Select("quota").Where("id = ?", userID).First(&user).Error)
	return user.Quota
}

func TestRechargeWaffoPancake_RejectsMismatchedPaymentMethod(t *testing.T) {
	truncateTables(t)

	insertUserForPaymentGuardTest(t, 101, 0)
	insertTopUpForPaymentGuardTest(t, "waffo-pancake-guard", 101, PaymentProviderStripe)

	err := RechargeWaffoPancake("waffo-pancake-guard")
	require.Error(t, err)

	topUp := GetTopUpByTradeNo("waffo-pancake-guard")
	require.NotNil(t, topUp)
	assert.Equal(t, common.TopUpStatusPending, topUp.Status)
	assert.Equal(t, 0, getUserQuotaForPaymentGuardTest(t, 101))
}

func TestRechargePayssion_RejectsMismatchedPaymentMethod(t *testing.T) {
	truncateTables(t)

	insertUserForPaymentGuardTest(t, 102, 0)
	insertTopUpForPaymentGuardTest(t, "payssion-guard", 102, PaymentProviderStripe)

	err := RechargePayssion("payssion-guard", "127.0.0.1")
	require.Error(t, err)

	topUp := GetTopUpByTradeNo("payssion-guard")
	require.NotNil(t, topUp)
	assert.Equal(t, common.TopUpStatusPending, topUp.Status)
	assert.Equal(t, 0, getUserQuotaForPaymentGuardTest(t, 102))
}

func TestUpdatePendingTopUpStatus_RejectsMismatchedPaymentProvider(t *testing.T) {
	testCases := []struct {
		name                    string
		tradeNo                 string
		storedPaymentProvider   string
		expectedPaymentProvider string
		targetStatus            string
	}{
		{
			name:                    "stripe expire",
			tradeNo:                 "stripe-expire-guard",
			storedPaymentProvider:   PaymentProviderCreem,
			expectedPaymentProvider: PaymentProviderStripe,
			targetStatus:            common.TopUpStatusExpired,
		},
		{
			name:                    "waffo failed",
			tradeNo:                 "waffo-failed-guard",
			storedPaymentProvider:   PaymentProviderStripe,
			expectedPaymentProvider: PaymentProviderWaffo,
			targetStatus:            common.TopUpStatusFailed,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			truncateTables(t)
			insertUserForPaymentGuardTest(t, 150, 0)
			insertTopUpForPaymentGuardTest(t, tc.tradeNo, 150, tc.storedPaymentProvider)

			err := UpdatePendingTopUpStatus(tc.tradeNo, tc.expectedPaymentProvider, tc.targetStatus)
			require.ErrorIs(t, err, ErrPaymentMethodMismatch)
			assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, tc.tradeNo))
		})
	}
}

func TestExpirePendingTopUps_SkipsVerifiedPendingAntomOrder(t *testing.T) {
	truncateTables(t)
	oldVerifier := VerifyPendingTopUpPayment
	defer func() { VerifyPendingTopUpPayment = oldVerifier }()

	insertUserForPaymentGuardTest(t, 160, 0)
	topUp := &TopUp{
		UserId:          160,
		Amount:          2,
		Money:           9.99,
		TradeNo:         "antom-pending-skip",
		PaymentMethod:   PaymentMethodAntom,
		PaymentProvider: PaymentProviderAntom,
		Status:          common.TopUpStatusPending,
		CreateTime:      time.Now().Add(-10 * time.Minute).Unix(),
	}
	require.NoError(t, topUp.Insert())

	VerifyPendingTopUpPayment = func(topUp *TopUp) (TopUpRemotePaymentStatus, error) {
		require.Equal(t, "antom-pending-skip", topUp.TradeNo)
		return TopUpRemotePaymentStatusPending, nil
	}

	ExpirePendingTopUps(5)

	assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, "antom-pending-skip"))
}

func TestExpirePendingTopUps_ExpiresOldUnverifiedTopUp(t *testing.T) {
	truncateTables(t)
	oldVerifier := VerifyPendingTopUpPayment
	VerifyPendingTopUpPayment = nil
	defer func() { VerifyPendingTopUpPayment = oldVerifier }()

	insertUserForPaymentGuardTest(t, 161, 0)
	topUp := &TopUp{
		UserId:          161,
		Amount:          2,
		Money:           9.99,
		TradeNo:         "stripe-expire-old",
		PaymentMethod:   PaymentMethodStripe,
		PaymentProvider: PaymentProviderStripe,
		Status:          common.TopUpStatusPending,
		CreateTime:      time.Now().Add(-10 * time.Minute).Unix(),
	}
	require.NoError(t, topUp.Insert())

	ExpirePendingTopUps(5)

	assert.Equal(t, common.TopUpStatusExpired, getTopUpStatusForPaymentGuardTest(t, "stripe-expire-old"))
}

func TestCompleteSubscriptionOrder_RejectsMismatchedPaymentProvider(t *testing.T) {
	truncateTables(t)

	insertUserForPaymentGuardTest(t, 202, 0)
	plan := insertSubscriptionPlanForPaymentGuardTest(t, 301)
	insertSubscriptionOrderForPaymentGuardTest(t, "sub-guard-order", 202, plan.Id, PaymentProviderStripe)

	err := CompleteSubscriptionOrder("sub-guard-order", `{"provider":"epay"}`, PaymentProviderEpay, "alipay")
	require.ErrorIs(t, err, ErrPaymentMethodMismatch)

	order := GetSubscriptionOrderByTradeNo("sub-guard-order")
	require.NotNil(t, order)
	assert.Equal(t, common.TopUpStatusPending, order.Status)
	assert.Zero(t, countUserSubscriptionsForPaymentGuardTest(t, 202))

	topUp := GetTopUpByTradeNo("sub-guard-order")
	assert.Nil(t, topUp)
}

func TestExpireSubscriptionOrder_RejectsMismatchedPaymentProvider(t *testing.T) {
	truncateTables(t)

	insertUserForPaymentGuardTest(t, 303, 0)
	plan := insertSubscriptionPlanForPaymentGuardTest(t, 401)
	insertSubscriptionOrderForPaymentGuardTest(t, "sub-expire-guard", 303, plan.Id, PaymentProviderStripe)

	err := ExpireSubscriptionOrder("sub-expire-guard", PaymentProviderCreem)
	require.ErrorIs(t, err, ErrPaymentMethodMismatch)

	order := GetSubscriptionOrderByTradeNo("sub-expire-guard")
	require.NotNil(t, order)
	assert.Equal(t, common.TopUpStatusPending, order.Status)
}

func createEpayTestOrder(t *testing.T, userId int, tradeNo string, provider string, status string) TopUp {
	t.Helper()
	topUp := TopUp{
		UserId:          userId,
		Amount:          2,
		Money:           10.0,
		TradeNo:         tradeNo,
		PaymentMethod:   "alipay",
		PaymentProvider: provider,
		CreateTime:      common.GetTimestamp(),
		Status:          status,
	}
	require.NoError(t, DB.Create(&topUp).Error)
	return topUp
}

func TestRechargeEpayCreditsQuotaExactlyOnce(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 501, 0)
	order := createEpayTestOrder(t, user.Id, "EPAYTESTONCE", PaymentProviderEpay, common.TopUpStatusPending)

	alreadyDone, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)
	assert.Equal(t, 2*500000, getUserQuotaForPaymentGuardTest(t, user.Id))

	reloaded := GetTopUpByTradeNo(order.TradeNo)
	require.NotNil(t, reloaded)
	assert.Equal(t, common.TopUpStatusSuccess, reloaded.Status)
	assert.NotZero(t, reloaded.CompleteTime)

	alreadyDone, err = RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.True(t, alreadyDone)
	assert.Equal(t, 2*500000, getUserQuotaForPaymentGuardTest(t, user.Id))
}

func TestRechargeEpayKeepsRedisAndDatabaseCreditInSync(t *testing.T) {
	truncateTables(t)
	useUserCacheMiniRedis(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 5
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 502, 7)
	require.NoError(t, populateUserCache(*user))
	order := createEpayTestOrder(t, user.Id, "EPAYTESTREDISSYNC", PaymentProviderEpay, common.TopUpStatusPending)

	alreadyDone, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)
	assert.Equal(t, 17, getUserQuotaForPaymentGuardTest(t, user.Id))
	cached, err := cacheGetUserBase(user.Id)
	require.NoError(t, err)
	assert.Equal(t, 17, cached.Quota)

	alreadyDone, err = RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.NoError(t, err)
	assert.True(t, alreadyDone)
	cached, err = cacheGetUserBase(user.Id)
	require.NoError(t, err)
	assert.Equal(t, 17, cached.Quota)
}

func TestRechargeEpayUpdatesPaymentMethodToActual(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 503, 0)
	order := createEpayTestOrder(t, user.Id, "EPAYTESTMETHOD", PaymentProviderEpay, common.TopUpStatusPending)

	alreadyDone, err := RechargeEpay(order.TradeNo, "wxpay", "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)

	reloaded := GetTopUpByTradeNo(order.TradeNo)
	require.NotNil(t, reloaded)
	assert.Equal(t, "wxpay", reloaded.PaymentMethod)
	assert.Equal(t, 2*500000, getUserQuotaForPaymentGuardTest(t, user.Id))
}

func TestRechargeEpayRejectsForeignAndNonPendingOrders(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 504, 7)

	t.Run("order from another payment provider", func(t *testing.T) {
		order := createEpayTestOrder(t, user.Id, "EPAYTESTSTRIPE", PaymentProviderStripe, common.TopUpStatusPending)
		_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
		assert.ErrorIs(t, err, ErrPaymentMethodMismatch)
		assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, user.Id))
	})

	t.Run("order that is not pending", func(t *testing.T) {
		order := createEpayTestOrder(t, user.Id, "EPAYTESTEXPIRED", PaymentProviderEpay, common.TopUpStatusExpired)
		_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
		assert.ErrorIs(t, err, ErrTopUpStatusInvalid)
		assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, user.Id))
	})

	t.Run("missing order", func(t *testing.T) {
		_, err := RechargeEpay("EPAYTESTMISSING", "alipay", "127.0.0.1")
		assert.ErrorIs(t, err, ErrTopUpNotFound)
	})
}

func TestRechargeEpayRejectsQuotaOverflowBeforeCompletingOrder(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = float64(common.MaxWalletQuota + 1)
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 505, 3)
	order := createEpayTestOrder(t, user.Id, "EPAYTESTOVERFLOW", PaymentProviderEpay, common.TopUpStatusPending)

	_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
	require.Error(t, err)
	assert.Equal(t, 3, getUserQuotaForPaymentGuardTest(t, user.Id))
	assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, order.TradeNo))
}

func TestRechargeEpayEnforcesFinalWalletQuotaLimit(t *testing.T) {
	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	testCases := []struct {
		name         string
		currentQuota int
		wantErr      bool
		wantQuota    int
		wantStatus   string
	}{
		{
			name:         "allows exact highest representable wallet balance",
			currentQuota: common.MaxWalletQuota - 1_000_000,
			wantQuota:    common.MaxWalletQuota,
			wantStatus:   common.TopUpStatusSuccess,
		},
		{
			name:         "rejects balance above wallet quota domain",
			currentQuota: common.MaxWalletQuota - 999_999,
			wantErr:      true,
			wantQuota:    common.MaxWalletQuota - 999_999,
			wantStatus:   common.TopUpStatusPending,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			truncateTables(t)
			user := insertUserForPaymentGuardTest(t, 506, tc.currentQuota)
			order := createEpayTestOrder(t, user.Id, "EPAYTESTWALLETLIMIT", PaymentProviderEpay, common.TopUpStatusPending)

			_, err := RechargeEpay(order.TradeNo, "alipay", "127.0.0.1")
			if tc.wantErr {
				require.ErrorIs(t, err, ErrTopUpQuotaLimitExceeded)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tc.wantQuota, getUserQuotaForPaymentGuardTest(t, user.Id))
			assert.Equal(t, tc.wantStatus, getTopUpStatusForPaymentGuardTest(t, order.TradeNo))
		})
	}
}

func createAntomTestOrder(t *testing.T, userId int, tradeNo string, provider string, status string) TopUp {
	t.Helper()
	topUp := TopUp{
		UserId:          userId,
		Amount:          2,
		Money:           10.0,
		Currency:        "USD",
		TradeNo:         tradeNo,
		PaymentMethod:   PaymentMethodAntom,
		PaymentProvider: provider,
		CreateTime:      common.GetTimestamp(),
		Status:          status,
	}
	require.NoError(t, DB.Create(&topUp).Error)
	return topUp
}

func TestRechargeAntomCreditsQuotaExactlyOnceAndSyncsCache(t *testing.T) {
	truncateTables(t)
	useUserCacheMiniRedis(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 5
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 601, 7)
	require.NoError(t, populateUserCache(*user))
	order := createAntomTestOrder(t, user.Id, "ANTOMTESTONCE", PaymentProviderAntom, common.TopUpStatusPending)

	alreadyDone, err := RechargeAntom(order.TradeNo, "127.0.0.1")
	require.NoError(t, err)
	assert.False(t, alreadyDone)
	assert.Equal(t, 17, getUserQuotaForPaymentGuardTest(t, user.Id))

	cached, err := cacheGetUserBase(user.Id)
	require.NoError(t, err)
	assert.Equal(t, 17, cached.Quota)

	reloaded := GetTopUpByTradeNo(order.TradeNo)
	require.NotNil(t, reloaded)
	assert.Equal(t, common.TopUpStatusSuccess, reloaded.Status)
	assert.Equal(t, "USD", reloaded.Currency)
	assert.NotZero(t, reloaded.CompleteTime)

	alreadyDone, err = RechargeAntom(order.TradeNo, "127.0.0.1")
	require.NoError(t, err)
	assert.True(t, alreadyDone)
	assert.Equal(t, 17, getUserQuotaForPaymentGuardTest(t, user.Id))
	cached, err = cacheGetUserBase(user.Id)
	require.NoError(t, err)
	assert.Equal(t, 17, cached.Quota)
}

func TestRechargeAntomRejectsForeignAndNonPendingOrders(t *testing.T) {
	truncateTables(t)

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	user := insertUserForPaymentGuardTest(t, 602, 7)

	t.Run("order from another payment provider", func(t *testing.T) {
		order := createAntomTestOrder(t, user.Id, "ANTOMTESTSTRIPE", PaymentProviderStripe, common.TopUpStatusPending)
		_, err := RechargeAntom(order.TradeNo, "127.0.0.1")
		assert.ErrorIs(t, err, ErrPaymentMethodMismatch)
		assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, user.Id))
		assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, order.TradeNo))
	})

	t.Run("expired order", func(t *testing.T) {
		order := createAntomTestOrder(t, user.Id, "ANTOMTESTEXPIRED", PaymentProviderAntom, common.TopUpStatusExpired)
		_, err := RechargeAntom(order.TradeNo, "127.0.0.1")
		assert.ErrorIs(t, err, ErrTopUpStatusInvalid)
		assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, user.Id))
	})

	t.Run("failed order", func(t *testing.T) {
		order := createAntomTestOrder(t, user.Id, "ANTOMTESTFAILED", PaymentProviderAntom, common.TopUpStatusFailed)
		_, err := RechargeAntom(order.TradeNo, "127.0.0.1")
		assert.ErrorIs(t, err, ErrTopUpStatusInvalid)
		assert.Equal(t, 7, getUserQuotaForPaymentGuardTest(t, user.Id))
	})

	t.Run("missing order", func(t *testing.T) {
		_, err := RechargeAntom("ANTOMTESTMISSING", "127.0.0.1")
		assert.ErrorIs(t, err, ErrTopUpNotFound)
	})
}

func TestRechargeAntomEnforcesWalletQuotaLimitAndOverflow(t *testing.T) {
	t.Run("rejects quota overflow before completing order", func(t *testing.T) {
		truncateTables(t)
		oldQuotaPerUnit := common.QuotaPerUnit
		common.QuotaPerUnit = float64(common.MaxWalletQuota + 1)
		t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

		user := insertUserForPaymentGuardTest(t, 603, 3)
		order := createAntomTestOrder(t, user.Id, "ANTOMTESTOVERFLOW", PaymentProviderAntom, common.TopUpStatusPending)

		_, err := RechargeAntom(order.TradeNo, "127.0.0.1")
		require.ErrorIs(t, err, ErrInvalidTopUpQuota)
		assert.Equal(t, 3, getUserQuotaForPaymentGuardTest(t, user.Id))
		assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, order.TradeNo))
	})

	oldQuotaPerUnit := common.QuotaPerUnit
	common.QuotaPerUnit = 500000
	t.Cleanup(func() { common.QuotaPerUnit = oldQuotaPerUnit })

	for _, tc := range []struct {
		name         string
		currentQuota int
		wantErr      bool
		wantQuota    int
		wantStatus   string
	}{
		{
			name:         "allows exact highest representable wallet balance",
			currentQuota: common.MaxWalletQuota - 1_000_000,
			wantQuota:    common.MaxWalletQuota,
			wantStatus:   common.TopUpStatusSuccess,
		},
		{
			name:         "rejects balance above wallet quota domain",
			currentQuota: common.MaxWalletQuota - 999_999,
			wantErr:      true,
			wantQuota:    common.MaxWalletQuota - 999_999,
			wantStatus:   common.TopUpStatusPending,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			truncateTables(t)
			user := insertUserForPaymentGuardTest(t, 604, tc.currentQuota)
			order := createAntomTestOrder(t, user.Id, "ANTOMTESTWALLETLIMIT", PaymentProviderAntom, common.TopUpStatusPending)

			_, err := RechargeAntom(order.TradeNo, "127.0.0.1")
			if tc.wantErr {
				require.ErrorIs(t, err, ErrTopUpQuotaLimitExceeded)
			} else {
				require.NoError(t, err)
			}
			assert.Equal(t, tc.wantQuota, getUserQuotaForPaymentGuardTest(t, user.Id))
			assert.Equal(t, tc.wantStatus, getTopUpStatusForPaymentGuardTest(t, order.TradeNo))
		})
	}
}

func TestRechargeAntomCrossDatabaseMigrationAndSettlement(t *testing.T) {
	type legacyTopUp struct {
		Id              int `gorm:"primaryKey"`
		UserId          int `gorm:"index"`
		Amount          int64
		Money           float64
		TradeNo         string `gorm:"unique;type:varchar(255);index"`
		PaymentMethod   string `gorm:"type:varchar(50)"`
		PaymentProvider string `gorm:"type:varchar(50);default:''"`
		CreateTime      int64
		CompleteTime    int64
		Status          string
	}

	type dbTarget struct {
		name      string
		dbType    common.DatabaseType
		dialector gorm.Dialector
	}

	targets := []dbTarget{
		{
			name:      "sqlite",
			dbType:    common.DatabaseTypeSQLite,
			dialector: sqlite.Open(t.TempDir() + "/antom_cross_db.db"),
		},
	}
	if dsn := os.Getenv("TEST_ANTOM_MYSQL_DSN"); dsn != "" {
		targets = append(targets, dbTarget{
			name:      "mysql",
			dbType:    common.DatabaseTypeMySQL,
			dialector: mysql.Open(dsn),
		})
	}
	if dsn := os.Getenv("TEST_ANTOM_POSTGRES_DSN"); dsn != "" {
		targets = append(targets, dbTarget{
			name:      "postgres",
			dbType:    common.DatabaseTypePostgreSQL,
			dialector: postgres.Open(dsn),
		})
	}

	oldDB := DB
	oldLogDB := LOG_DB
	oldMainType := common.MainDatabaseType()
	oldLogType := common.LogDatabaseType()
	oldQuotaPerUnit := common.QuotaPerUnit
	t.Cleanup(func() {
		DB = oldDB
		LOG_DB = oldLogDB
		common.SetDatabaseTypes(oldMainType, oldLogType)
		common.QuotaPerUnit = oldQuotaPerUnit
		initCol()
	})

	for _, target := range targets {
		t.Run(target.name, func(t *testing.T) {
			db, err := gorm.Open(target.dialector, &gorm.Config{})
			require.NoError(t, err)
			sqlDB, err := db.DB()
			require.NoError(t, err)
			t.Cleanup(func() { require.NoError(t, sqlDB.Close()) })

			DB = db
			LOG_DB = db
			common.SetDatabaseTypes(target.dbType, target.dbType)
			common.QuotaPerUnit = 500000
			initCol()

			// Simulate upgrading from legacy top_ups table (without currency column).
			_ = db.Migrator().DropTable(&TopUp{}, &User{}, &Log{})
			require.NoError(t, db.Table("top_ups").AutoMigrate(&legacyTopUp{}))
			require.NoError(t, db.AutoMigrate(&User{}, &Log{}))

			require.NoError(t, db.Table("top_ups").Create(&legacyTopUp{
				UserId:          701,
				Amount:          2,
				Money:           10.0,
				TradeNo:         "ANTOM-LEGACY-UPGRADE-1",
				PaymentMethod:   PaymentMethodAntom,
				PaymentProvider: PaymentProviderAntom,
				CreateTime:      common.GetTimestamp(),
				Status:          common.TopUpStatusPending,
			}).Error)

			// Run AutoMigrate twice to prove upgrade + idempotency.
			require.NoError(t, db.AutoMigrate(&User{}, &TopUp{}, &Log{}))
			require.NoError(t, db.AutoMigrate(&User{}, &TopUp{}, &Log{}))
			assert.True(t, db.Migrator().HasColumn(&TopUp{}, "currency"))

			// Insert user and settle upgraded legacy order.
			insertUserForPaymentGuardTest(t, 701, 0)
			alreadyDone, err := RechargeAntom("ANTOM-LEGACY-UPGRADE-1", "127.0.0.1")
			require.NoError(t, err)
			assert.False(t, alreadyDone)
			assert.Equal(t, 2*500000, getUserQuotaForPaymentGuardTest(t, 701))

			// Duplicate TradeNo unique constraint preserved.
			dupOrder := &TopUp{
				UserId:          701,
				Amount:          1,
				Money:           5.0,
				Currency:        "USD",
				TradeNo:         "ANTOM-LEGACY-UPGRADE-1",
				PaymentMethod:   PaymentMethodAntom,
				PaymentProvider: PaymentProviderAntom,
				CreateTime:      common.GetTimestamp(),
				Status:          common.TopUpStatusPending,
			}
			require.Error(t, dupOrder.Insert())

			// New order with currency snapshot + idempotent settlement + wallet ceiling enforcement.
			newOrder := &TopUp{
				UserId:          701,
				Amount:          3,
				Money:           15.0,
				Currency:        "HKD",
				TradeNo:         "ANTOM-NEW-ORDER-1",
				PaymentMethod:   PaymentMethodAntom,
				PaymentProvider: PaymentProviderAntom,
				CreateTime:      common.GetTimestamp(),
				Status:          common.TopUpStatusPending,
			}
			require.NoError(t, newOrder.Insert())

			alreadyDone, err = RechargeAntom("ANTOM-NEW-ORDER-1", "127.0.0.1")
			require.NoError(t, err)
			assert.False(t, alreadyDone)
			assert.Equal(t, 5*500000, getUserQuotaForPaymentGuardTest(t, 701))

			loaded := GetTopUpByTradeNo("ANTOM-NEW-ORDER-1")
			require.NotNil(t, loaded)
			assert.Equal(t, "HKD", loaded.Currency)
			assert.Equal(t, common.TopUpStatusSuccess, loaded.Status)

			alreadyDone, err = RechargeAntom("ANTOM-NEW-ORDER-1", "127.0.0.1")
			require.NoError(t, err)
			assert.True(t, alreadyDone)
			assert.Equal(t, 5*500000, getUserQuotaForPaymentGuardTest(t, 701))

			// Wallet ceiling check under transaction + row lock.
			require.NoError(t, DB.Create(&User{
				Id:       702,
				Username: "payment_guard_user_702",
				AffCode:  "aff_702",
				Status:   common.UserStatusEnabled,
				Quota:    common.MaxWalletQuota - 100,
			}).Error)
			limitOrder := &TopUp{
				UserId:          702,
				Amount:          1,
				Money:           1.0,
				Currency:        "USD",
				TradeNo:         "ANTOM-LIMIT-ORDER-1",
				PaymentMethod:   PaymentMethodAntom,
				PaymentProvider: PaymentProviderAntom,
				CreateTime:      common.GetTimestamp(),
				Status:          common.TopUpStatusPending,
			}
			require.NoError(t, limitOrder.Insert())
			_, err = RechargeAntom("ANTOM-LIMIT-ORDER-1", "127.0.0.1")
			require.ErrorIs(t, err, ErrTopUpQuotaLimitExceeded)
			assert.Equal(t, common.TopUpStatusPending, getTopUpStatusForPaymentGuardTest(t, "ANTOM-LIMIT-ORDER-1"))
			assert.Equal(t, common.MaxWalletQuota-100, getUserQuotaForPaymentGuardTest(t, 702))
		})
	}
}
