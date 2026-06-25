package model

import (
	"github.com/QuantumNous/new-api/common"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// LockForUpdate 为给定的事务/查询应用 `SELECT ... FOR UPDATE` 行锁。
//
// 替换历史上散落的 `tx.Set("gorm:query_option", "FOR UPDATE")` 调用。后者
// 是 GORM v1 的 API，在 GORM v2 中被静默忽略（仅写入 Statement.Settings，
// 没有任何回调读取该键），导致行锁从未实际生效。
//
// SQLite 不支持 `FOR UPDATE` 子句，由于它本身采用全库写锁串行化所有写
// 事务，幂等性已由引擎保证，故在 SQLite 下直接返回原始 tx，不附加 Clauses。
func LockForUpdate(tx *gorm.DB) *gorm.DB {
	if common.UsingSQLite {
		return tx
	}
	return tx.Clauses(clause.Locking{Strength: "UPDATE"})
}
