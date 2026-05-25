package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupAffCommissionTest(t *testing.T) {
	t.Helper()
	truncateTables(t)

	// Enable compliance by default for commission tests
	ps := operation_setting.GetPaymentSetting()
	ps.ComplianceConfirmed = true
	ps.ComplianceTermsVersion = operation_setting.CurrentComplianceTermsVersion
	t.Cleanup(func() {
		ps.ComplianceConfirmed = false
		ps.ComplianceTermsVersion = ""
		common.AffCommissionRate = 0
		common.AffCommissionDurationDays = 0
		common.AffCommissionMaxPerTopup = 0
		common.AffFirstTopupMinAmount = 0
	})
}

func createInviterAndInvitee(t *testing.T, inviterID, inviteeID int) {
	t.Helper()
	inviter := &User{
		Id:       inviterID,
		Username: "inviter",
		Status:   common.UserStatusEnabled,
		Quota:    0,
		AffCode:  common.GetRandomString(8),
	}
	require.NoError(t, DB.Create(inviter).Error)

	invitee := &User{
		Id:        inviteeID,
		Username:  "invitee",
		Status:    common.UserStatusEnabled,
		InviterId: inviterID,
		CreatedAt: common.GetTimestamp(),
		AffCode:   common.GetRandomString(8),
	}
	require.NoError(t, DB.Create(invitee).Error)
}

func TestTryGrantAffCommission_NoInviter(t *testing.T) {
	setupAffCommissionTest(t)
	common.AffCommissionRate = 10

	user := &User{
		Id:        100,
		Username:  "no_inviter_user",
		Status:    common.UserStatusEnabled,
		InviterId: 0,
		CreatedAt: common.GetTimestamp(),
		AffCode:   common.GetRandomString(8),
	}
	require.NoError(t, DB.Create(user).Error)

	TryGrantAffCommission(100, 5000000, 1000)

	// No inviter, nothing should happen — no panic, no error
}

func TestTryGrantAffCommission_RateZero(t *testing.T) {
	setupAffCommissionTest(t)
	common.AffCommissionRate = 0

	createInviterAndInvitee(t, 1, 2)

	TryGrantAffCommission(2, 5000000, 1000)

	var inviter User
	require.NoError(t, DB.Where("id = ?", 1).First(&inviter).Error)
	assert.Equal(t, 0, inviter.AffQuota)
	assert.Equal(t, 0, inviter.AffHistoryQuota)
}

func TestTryGrantAffCommission_NormalCommission(t *testing.T) {
	setupAffCommissionTest(t)
	common.AffCommissionRate = 10

	createInviterAndInvitee(t, 1, 2)

	topUpQuota := 5000000 // $10 worth of quota
	TryGrantAffCommission(2, topUpQuota, 1000)

	var inviter User
	require.NoError(t, DB.Where("id = ?", 1).First(&inviter).Error)

	expectedCommission := 500000 // 10% of 5000000
	assert.Equal(t, expectedCommission, inviter.AffQuota)
	assert.Equal(t, expectedCommission, inviter.AffHistoryQuota)
}

func TestTryGrantAffCommission_MaxPerTopupCap(t *testing.T) {
	setupAffCommissionTest(t)
	common.AffCommissionRate = 50
	common.AffCommissionMaxPerTopup = 1000000 // cap at $2

	createInviterAndInvitee(t, 1, 2)

	topUpQuota := 50000000 // $100 worth
	TryGrantAffCommission(2, topUpQuota, 10000)

	var inviter User
	require.NoError(t, DB.Where("id = ?", 1).First(&inviter).Error)

	// 50% of 50000000 = 25000000, but capped at 1000000
	assert.Equal(t, 1000000, inviter.AffQuota)
	assert.Equal(t, 1000000, inviter.AffHistoryQuota)
}

func TestTryGrantAffCommission_Expired(t *testing.T) {
	setupAffCommissionTest(t)
	common.AffCommissionRate = 10
	common.AffCommissionDurationDays = 1

	inviter := &User{
		Id:       1,
		Username: "inviter",
		Status:   common.UserStatusEnabled,
		AffCode:  common.GetRandomString(8),
	}
	require.NoError(t, DB.Create(inviter).Error)

	// Invitee registered 2 days ago
	invitee := &User{
		Id:        2,
		Username:  "invitee",
		Status:    common.UserStatusEnabled,
		InviterId: 1,
		CreatedAt: common.GetTimestamp() - 2*86400,
		AffCode:   common.GetRandomString(8),
	}
	require.NoError(t, DB.Create(invitee).Error)

	TryGrantAffCommission(2, 5000000, 1000)

	var inv User
	require.NoError(t, DB.Where("id = ?", 1).First(&inv).Error)
	assert.Equal(t, 0, inv.AffQuota, "expired invitee should not grant commission")
}

func TestTryGrantAffCommission_FirstTopupThreshold(t *testing.T) {
	setupAffCommissionTest(t)
	common.AffCommissionRate = 10
	common.AffFirstTopupMinAmount = 1000 // $10 minimum

	createInviterAndInvitee(t, 1, 2)

	// First topup below threshold
	TryGrantAffCommission(2, 2500000, 500) // $5, below $10 threshold

	var inviter User
	require.NoError(t, DB.Where("id = ?", 1).First(&inviter).Error)
	assert.Equal(t, 0, inviter.AffQuota, "below threshold should not grant commission")

	// Second topup meets threshold
	TryGrantAffCommission(2, 5000000, 1000) // $10, meets threshold

	require.NoError(t, DB.Where("id = ?", 1).First(&inviter).Error)
	assert.Equal(t, 500000, inviter.AffQuota, "meeting threshold should grant commission")

	// Verify aff_first_topup_passed is now true
	var invitee User
	require.NoError(t, DB.Where("id = ?", 2).First(&invitee).Error)
	assert.True(t, invitee.AffFirstTopupPassed)

	// Third topup (below original threshold) should still work
	TryGrantAffCommission(2, 1500000, 300) // $3, below threshold but already passed

	require.NoError(t, DB.Where("id = ?", 1).First(&inviter).Error)
	assert.Equal(t, 650000, inviter.AffQuota, "after passing threshold, all topups should grant commission")
}

func TestTryGrantAffCommission_ComplianceNotConfirmed(t *testing.T) {
	setupAffCommissionTest(t)
	common.AffCommissionRate = 10

	// Disable compliance
	ps := operation_setting.GetPaymentSetting()
	ps.ComplianceConfirmed = false

	createInviterAndInvitee(t, 1, 2)

	TryGrantAffCommission(2, 5000000, 1000)

	var inviter User
	require.NoError(t, DB.Where("id = ?", 1).First(&inviter).Error)
	assert.Equal(t, 0, inviter.AffQuota, "compliance not confirmed should not grant commission")
}

