package model

import (
	"fmt"
	"os"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/mysql"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
)

const testNewUserBonus = 500000

// useNewUserQuotaDatabase swaps the package database for a fresh one. The engine
// comes from TEST_NEW_USER_QUOTA_DIALECT (sqlite by default; mysql and postgres
// read TEST_MYSQL_DSN / TEST_POSTGRES_DSN) so the same cases run on all three.
func useNewUserQuotaDatabase(t *testing.T) {
	t.Helper()
	dialect := common.DatabaseType(os.Getenv("TEST_NEW_USER_QUOTA_DIALECT"))
	var driver gorm.Dialector
	switch dialect {
	case "", common.DatabaseTypeSQLite:
		dialect = common.DatabaseTypeSQLite
		driver = sqlite.Open(":memory:")
	case common.DatabaseTypeMySQL:
		require.NotEmpty(t, os.Getenv("TEST_MYSQL_DSN"))
		driver = mysql.Open(os.Getenv("TEST_MYSQL_DSN"))
	case common.DatabaseTypePostgreSQL:
		require.NotEmpty(t, os.Getenv("TEST_POSTGRES_DSN"))
		driver = postgres.New(postgres.Config{DSN: os.Getenv("TEST_POSTGRES_DSN"), PreferSimpleProtocol: true})
	default:
		t.Fatalf("unsupported test dialect %q", dialect)
	}
	db, err := gorm.Open(driver, &gorm.Config{NamingStrategy: schema.NamingStrategy{TablePrefix: fmt.Sprintf("nuq_%d_", time.Now().UnixNano())}})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	if dialect == common.DatabaseTypeSQLite {
		sqlDB.SetMaxOpenConns(1)
	}
	models := []any{&User{}, &Option{}, &Log{}, &SystemTask{}, &SystemTaskLock{}}
	require.NoError(t, db.AutoMigrate(models...))

	oldDB, oldLogDB := DB, LOG_DB
	oldMain, oldLog := common.MainDatabaseType(), common.LogDatabaseType()
	oldRedis, oldQuota, oldOptionMap := common.RedisEnabled, common.QuotaForNewUser, common.OptionMap
	oldSetting := *operation_setting.GetQuotaSetting()
	DB, LOG_DB = db, db
	common.SetDatabaseTypes(dialect, dialect)
	initCol()
	common.RedisEnabled = false
	common.QuotaForNewUser = testNewUserBonus
	common.OptionMap = map[string]string{}
	t.Cleanup(func() {
		require.NoError(t, db.Migrator().DropTable(models...))
		_ = sqlDB.Close()
		DB, LOG_DB = oldDB, oldLogDB
		common.SetDatabaseTypes(oldMain, oldLog)
		initCol()
		common.RedisEnabled, common.QuotaForNewUser, common.OptionMap = oldRedis, oldQuota, oldOptionMap
		*operation_setting.GetQuotaSetting() = oldSetting
	})
}

func setNewUserQuotaSwitch(enabled, requireEmail bool) {
	setting := operation_setting.GetQuotaSetting()
	setting.NewUserQuotaEnabled, setting.NewUserQuotaRequireEmail = enabled, requireEmail
}

func createNewUserQuotaUser(t *testing.T, name, email string) int {
	t.Helper()
	user := User{Username: name, Email: email, Status: common.UserStatusEnabled, AffCode: name}
	require.NoError(t, DB.Create(&user).Error)
	return user.Id
}

func loadNewUserQuotaUser(t *testing.T, id int) User {
	t.Helper()
	var user User
	require.NoError(t, DB.First(&user, id).Error)
	return user
}

func TestTryGrantNewUserQuotaSwitches(t *testing.T) {
	useNewUserQuotaDatabase(t)
	tests := []struct {
		name         string
		enabled      bool
		requireEmail bool
		email        string
		want         int
	}{
		{"switch off keeps the amount but grants nothing", false, true, "off@example.com", 0},
		{"switch off ignores require_email=false", false, false, "", 0},
		{"require_email waits for an email", true, true, "", 0},
		{"require_email grants once the user has an email", true, true, "mail@example.com", testNewUserBonus},
		{"no email required grants at registration", true, false, "", testNewUserBonus},
	}
	for i, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			setNewUserQuotaSwitch(test.enabled, test.requireEmail)
			id := createNewUserQuotaUser(t, "switch"+strconv.Itoa(i), test.email)
			TryGrantNewUserQuota(id)
			TryGrantNewUserQuota(id)
			user := loadNewUserQuotaUser(t, id)
			assert.Equal(t, test.want, user.Quota)
			assert.Equal(t, test.want > 0, user.NewUserQuotaRewarded)
			assert.Equal(t, testNewUserBonus, common.QuotaForNewUser, "the configured amount must survive")
		})
	}
}

func TestTryGrantNewUserQuotaAfterEmailBinding(t *testing.T) {
	useNewUserQuotaDatabase(t)
	setNewUserQuotaSwitch(true, true)
	id := createNewUserQuotaUser(t, "oauth-no-email", "")

	TryGrantNewUserQuota(id)
	assert.Zero(t, loadNewUserQuotaUser(t, id).Quota, "an OAuth user without an email gets nothing at registration")

	require.NoError(t, DB.Model(&User{}).Where("id = ?", id).Update("email", "bound@example.com").Error)
	TryGrantNewUserQuota(id)
	TryGrantNewUserQuota(id)
	user := loadNewUserQuotaUser(t, id)
	assert.Equal(t, testNewUserBonus, user.Quota)
	assert.True(t, user.NewUserQuotaRewarded)
}

func TestTryGrantNewUserQuotaConcurrentCallsGrantOnce(t *testing.T) {
	useNewUserQuotaDatabase(t)
	setNewUserQuotaSwitch(true, false)
	id := createNewUserQuotaUser(t, "concurrent", "")

	var wg sync.WaitGroup
	for range 8 {
		wg.Go(func() { TryGrantNewUserQuota(id) })
	}
	wg.Wait()

	assert.Equal(t, testNewUserBonus, loadNewUserQuotaUser(t, id).Quota)
	var logs int64
	require.NoError(t, DB.Model(&Log{}).Where("user_id = ?", id).Count(&logs).Error)
	assert.EqualValues(t, 1, logs)
}

func TestInitNewUserQuotaSwitchOptionUpgradeCompatibility(t *testing.T) {
	useNewUserQuotaDatabase(t)
	key := operation_setting.NewUserQuotaEnabledOptionKey
	storedSwitch := func() string {
		var option Option
		require.NoError(t, DB.Where(commonKeyCol+" = ?", key).First(&option).Error)
		return option.Value
	}

	// A site upgraded with a bonus configured and no switch row starts enabled.
	require.NoError(t, InitNewUserQuotaSwitchOption())
	assert.Equal(t, "true", storedSwitch())
	assert.True(t, operation_setting.IsNewUserQuotaEnabled())

	// The administrator turns it off; restarts must not turn it back on.
	require.NoError(t, UpdateOption(key, "false"))
	require.NoError(t, InitNewUserQuotaSwitchOption())
	require.NoError(t, InitNewUserQuotaSwitchOption())
	assert.Equal(t, "false", storedSwitch())
	assert.False(t, operation_setting.IsNewUserQuotaEnabled())
}

func TestInitNewUserQuotaSwitchOptionFreshSiteStaysOff(t *testing.T) {
	useNewUserQuotaDatabase(t)
	common.QuotaForNewUser = 0
	require.NoError(t, InitNewUserQuotaSwitchOption())
	assert.False(t, operation_setting.IsNewUserQuotaEnabled())

	// An amount configured later must not switch the bonus on at the next start.
	common.QuotaForNewUser = testNewUserBonus
	require.NoError(t, InitNewUserQuotaSwitchOption())
	assert.False(t, operation_setting.IsNewUserQuotaEnabled())
	var option Option
	require.NoError(t, DB.Where(commonKeyCol+" = ?", operation_setting.NewUserQuotaEnabledOptionKey).First(&option).Error)
	assert.Equal(t, "false", option.Value)
}
