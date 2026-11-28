package model

import (
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// BehaviorEvent is one anonymous, whitelisted client behavior event. It never
// stores a user id, username, email, IP or free text; ActorHash is an HMAC of
// the user id and DeviceId/SessionId are random client-generated ids.
type BehaviorEvent struct {
	Id             int64  `gorm:"primaryKey"`
	EventId        string `gorm:"type:varchar(36);uniqueIndex:uidx_be_event_id"`
	CreatedAt      int64  `gorm:"type:bigint;index:idx_be_time_event,priority:1;index:idx_be_name_time,priority:2;index:idx_be_actor_time,priority:2;index:idx_be_device_time,priority:2"`
	EventType      string `gorm:"type:varchar(24);index:idx_be_time_event,priority:2"`
	EventName      string `gorm:"type:varchar(64);index:idx_be_name_time,priority:1"`
	ActorHash      string `gorm:"type:varchar(32);index:idx_be_actor_time,priority:1"`
	DeviceId       string `gorm:"type:varchar(32);index:idx_be_device_time,priority:1"`
	SessionId      string `gorm:"type:varchar(32);index"`
	RoutePath      string `gorm:"type:varchar(128);index"`
	FromRoute      string `gorm:"type:varchar(128)"`
	ReferrerHost   string `gorm:"type:varchar(128)"`
	ClientType     string `gorm:"type:varchar(24);index"`
	OsFamily       string `gorm:"type:varchar(24)"`
	BrowserFamily  string `gorm:"type:varchar(24)"`
	ViewportBucket string `gorm:"type:varchar(16)"`
	Lang           string `gorm:"type:varchar(16)"`
	Theme          string `gorm:"type:varchar(16)"`
	TzOffset       int16  `gorm:"type:smallint"`
	DurationMs     int32  `gorm:"type:int"`
	StatusCode     int16  `gorm:"type:smallint"`
	ActiveMs       int32  `gorm:"type:int"`          // page_leave only (promoted from props)
	ApiRoute       string `gorm:"type:varchar(128)"` // api_error only (promoted from props)
	ErrorName      string `gorm:"type:varchar(32)"`  // client_error only (promoted from props)
	Props          string `gorm:"type:text"`         // sanitized JSON, <=512 bytes, never a JSON column type
}

func (BehaviorEvent) TableName() string {
	return "behavior_events"
}

// MigrateBehaviorEvents creates the behavior_events table on the log database.
func MigrateBehaviorEvents() error {
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		return migrateClickHouseBehaviorEvents()
	}
	return LOG_DB.AutoMigrate(&BehaviorEvent{})
}

func migrateClickHouseBehaviorEvents() error {
	retentionDays := operation_setting.GetAnalyticsSetting().RetentionDays
	if err := LOG_DB.Exec(clickHouseBehaviorEventsCreateTableSQL(retentionDays)).Error; err != nil {
		return err
	}
	return SyncBehaviorEventsTTL(retentionDays)
}

func behaviorEventsTTLExpression(retentionDays int) string {
	if retentionDays <= 0 {
		return ""
	}
	return fmt.Sprintf("toDateTime(created_at) + INTERVAL %d DAY DELETE", retentionDays)
}

// clickHouseBehaviorEventsCreateTableSQL has no unique index: ClickHouse keeps
// duplicate event ids from retried batches (accepted tradeoff).
func clickHouseBehaviorEventsCreateTableSQL(retentionDays int) string {
	ttl := ""
	if expression := behaviorEventsTTLExpression(retentionDays); expression != "" {
		ttl = "\nTTL " + expression
	}
	return fmt.Sprintf(`
CREATE TABLE IF NOT EXISTS behavior_events (
	id Int64 DEFAULT 0,
	event_id String DEFAULT '',
	created_at Int64 DEFAULT 0,
	event_type String DEFAULT '',
	event_name String DEFAULT '',
	actor_hash String DEFAULT '',
	device_id String DEFAULT '',
	session_id String DEFAULT '',
	route_path String DEFAULT '',
	from_route String DEFAULT '',
	referrer_host String DEFAULT '',
	client_type String DEFAULT '',
	os_family String DEFAULT '',
	browser_family String DEFAULT '',
	viewport_bucket String DEFAULT '',
	lang String DEFAULT '',
	theme String DEFAULT '',
	tz_offset Int16 DEFAULT 0,
	duration_ms Int32 DEFAULT 0,
	status_code Int16 DEFAULT 0,
	active_ms Int32 DEFAULT 0,
	api_route String DEFAULT '',
	error_name String DEFAULT '',
	props String DEFAULT ''
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(toDateTime(created_at))
ORDER BY (event_type, created_at, device_id)%s`, ttl)
}

// SyncBehaviorEventsTTL aligns the ClickHouse TTL with retention_days. It does
// nothing on other databases or before the log database is connected.
func SyncBehaviorEventsTTL(retentionDays int) error {
	if LOG_DB == nil || !common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		return nil
	}
	expression := behaviorEventsTTLExpression(retentionDays)
	if expression == "" {
		return nil
	}
	return LOG_DB.Exec("ALTER TABLE behavior_events MODIFY TTL " + expression).Error
}

// InsertBehaviorEvents writes a batch. Duplicate event ids are skipped on
// SQLite/MySQL/PostgreSQL; ClickHouse has no unique index and keeps them.
func InsertBehaviorEvents(events []*BehaviorEvent) error {
	if len(events) == 0 {
		return nil
	}
	if common.UsingLogDatabase(common.DatabaseTypeClickHouse) {
		return LOG_DB.CreateInBatches(events, 100).Error
	}
	if common.UsingLogDatabase(common.DatabaseTypeMySQL) {
		// gorm's DoNothing emits `id=id`, which MySQL 5.7 rejects (error 1869)
		// for multi-row inserts into an auto-increment table. Re-assigning the
		// unique key to itself is an equivalent no-op.
		return LOG_DB.Clauses(clause.OnConflict{DoUpdates: clause.AssignmentColumns([]string{"event_id"})}).CreateInBatches(events, 100).Error
	}
	return LOG_DB.Clauses(clause.OnConflict{DoNothing: true}).CreateInBatches(events, 100).Error
}

// DeleteBehaviorEventsBefore deletes at most batchSize rows older than cutoff
// (Unix seconds) in one transaction and returns the number deleted. It is not
// used on ClickHouse, where the table TTL removes expired rows.
func DeleteBehaviorEventsBefore(cutoff int64, batchSize int) (int64, error) {
	if batchSize <= 0 {
		batchSize = 5000
	}
	var deleted int64
	err := LOG_DB.Transaction(func(tx *gorm.DB) error {
		var ids []int64
		if err := tx.Model(&BehaviorEvent{}).Where("created_at < ?", cutoff).Order("id").Limit(batchSize).Pluck("id", &ids).Error; err != nil {
			return err
		}
		if len(ids) == 0 {
			return nil
		}
		result := tx.Where("id IN ?", ids).Delete(&BehaviorEvent{})
		deleted = result.RowsAffected
		return result.Error
	})
	return deleted, err
}
