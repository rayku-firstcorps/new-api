package service

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"
)

var analyticsSecretMutex sync.Mutex

func newAnalyticsSecret() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// EnsureAnalyticsSecret creates the hash secret when analytics is enabled and
// none exists. Only the master node writes it; other nodes receive it through
// the option sync. It is idempotent and never logs the secret.
func EnsureAnalyticsSecret() (created bool, err error) {
	analyticsSecretMutex.Lock()
	defer analyticsSecretMutex.Unlock()
	setting := operation_setting.GetAnalyticsSetting()
	if !common.IsMasterNode || !setting.Enabled || setting.HashSecret != "" {
		return false, nil
	}
	secret, err := newAnalyticsSecret()
	if err != nil {
		return false, err
	}
	if err := model.SetAnalyticsSecret(secret, common.GetTimestamp()); err != nil {
		return false, err
	}
	return true, nil
}

// RotateAnalyticsSecret replaces the hash secret. Actor hashes written before
// and after the rotation cannot be linked.
func RotateAnalyticsSecret() (rotatedAt int64, err error) {
	if !common.IsMasterNode {
		return 0, common.NewMessage("Only the primary node can rotate the analytics hash secret")
	}
	analyticsSecretMutex.Lock()
	defer analyticsSecretMutex.Unlock()
	secret, err := newAnalyticsSecret()
	if err != nil {
		return 0, err
	}
	rotatedAt = common.GetTimestamp()
	if err := model.SetAnalyticsSecret(secret, rotatedAt); err != nil {
		return 0, err
	}
	return rotatedAt, nil
}

// AnalyticsActorHash returns the pseudonymous actor id for a user.
func AnalyticsActorHash(userID int, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("u:" + strconv.Itoa(userID)))
	return hex.EncodeToString(mac.Sum(nil))[:32]
}

const (
	analyticsRetentionInterval   = time.Hour
	analyticsSecretCheckInterval = time.Minute
	analyticsPurgeBatchSize      = 5000
)

// PurgeExpiredBehaviorEvents deletes rows older than retention_days in
// batches. ClickHouse relies on the table TTL and reports handledByTTL.
func PurgeExpiredBehaviorEvents() (deleted int64, handledByTTL bool, err error) {
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		return 0, true, nil
	}
	retentionDays := operation_setting.GetAnalyticsSetting().RetentionDays
	cutoff := common.GetTimestamp() - int64(retentionDays)*86400
	for {
		n, err := model.DeleteBehaviorEventsBefore(cutoff, analyticsPurgeBatchSize)
		deleted += n
		if err != nil {
			return deleted, false, err
		}
		if n < analyticsPurgeBatchSize {
			return deleted, false, nil
		}
	}
}

// StartAnalyticsRetentionCleanup runs the hourly retention purge and the
// 60-second secret check on the master node. The secret check covers option
// writes that landed on a non-master node.
func StartAnalyticsRetentionCleanup() {
	if !common.IsMasterNode {
		return
	}
	go func() {
		runAnalyticsSecretCheck()
		runAnalyticsPurge()
		secretTicker := time.NewTicker(analyticsSecretCheckInterval)
		purgeTicker := time.NewTicker(analyticsRetentionInterval)
		defer secretTicker.Stop()
		defer purgeTicker.Stop()
		for {
			select {
			case <-secretTicker.C:
				runAnalyticsSecretCheck()
			case <-purgeTicker.C:
				runAnalyticsPurge()
			}
		}
	}()
}

func runAnalyticsSecretCheck() {
	if _, err := EnsureAnalyticsSecret(); err != nil {
		common.SysError(common.LogText("failed to ensure analytics hash secret: %s", err.Error()))
	}
}

func runAnalyticsPurge() {
	deleted, _, err := PurgeExpiredBehaviorEvents()
	if err != nil {
		common.SysError(common.LogText("failed to purge expired behavior events: %s", err.Error()))
		return
	}
	if deleted > 0 {
		common.SysLog(common.LogText("purged expired behavior events: %d", deleted))
	}
}
