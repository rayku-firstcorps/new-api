# 外部余额查询与扣减接口 Stage 2 开发计划

## 目标

为外部业务系统提供一组独立接口，用于查询用户余额和扣减用户余额，并使用单独配置的 API 密钥进行鉴权。

Stage 2 的目标是：

- 外部系统可以按用户 ID、用户名或邮箱查询用户余额。
- 外部系统可以原子扣减用户余额。
- 外部系统可以通过订单 ID 反查扣减记录、用户账号和当前余额。
- 接口使用独立服务级 API 密钥，不复用用户登录态、用户 access token 或 relay token。
- 扣减操作支持幂等，避免外部重试导致重复扣款。
- 所有查询和扣减操作可审计、可追踪。

## 当前项目基础

可复用能力：

- 后端使用 Go、Gin、GORM。
- 路由集中在 `router/api-router.go`。
- 用户余额字段为 `model.User.Quota`。
- 用户余额查询已有 `model.GetUserQuota(id, fromDB)`。
- 用户余额增减已有：
  - `model.IncreaseUserQuota(id, quota, db)`
  - `model.DecreaseUserQuota(id, quota, db)`
  - `model.DeltaUpdateUserQuota(id, delta)`
- 操作日志已有 `model.RecordLog`、`model.RecordLogWithAdminInfo`。
- 系统配置通过 `OptionMap`、`model.InitOptionMap()`、`model.UpdateOption()` 维护。

需要特别注意：

- 现有 `DecreaseUserQuota` 只是 `quota = quota - ?`，没有余额不足保护，外部扣款接口不能直接使用它完成核心扣减。
- 外部余额接口是高风险能力，必须独立鉴权、限流、幂等和审计。
- JSON marshal/unmarshal 必须使用 `common` 包装方法，不直接调用 `encoding/json` 做业务解析。
- 数据库实现必须兼容 SQLite、MySQL、PostgreSQL。

## 产品范围

### 包含

- 外部查询用户余额接口。
- 外部扣减用户余额接口。
- 外部扣减结果查询接口，支持通过订单 ID 反查用户信息和当前余额。
- 独立 API 密钥配置。
- API 密钥启用开关。
- 请求幂等键。
- 操作审计日志。

### 暂不包含

- 外部充值接口。
- 多租户多密钥管理页面。
- 签名验签。
- IP 白名单管理页面。
- Webhook 回调。
- 外部系统 OAuth。

## 接口设计

接口统一放在：

```text
/api/external/balance
```

建议路由：

```text
GET  /api/external/balance/user
POST /api/external/balance/deduct
GET  /api/external/balance/transaction/:request_id
```

### 鉴权方式

请求头：

```text
Authorization: Bearer <ExternalBalanceApiKey>
```

可选兼容：

```text
X-External-Api-Key: <ExternalBalanceApiKey>
```

建议只对外文档公开 `Authorization: Bearer`，`X-External-Api-Key` 作为内部兼容。

### 查询余额

```text
GET /api/external/balance/user?user_id=123
```

或：

```text
GET /api/external/balance/user?username=test
GET /api/external/balance/user?email=test@example.com
```

请求规则：

- `user_id`、`username`、`email` 三者至少传一个。
- 优先级：`user_id` > `username` > `email`。
- 默认只返回启用状态用户。

响应：

```json
{
  "success": true,
  "message": "",
  "data": {
    "user_id": 123,
    "username": "test",
    "email": "test@example.com",
    "quota": 5000000,
    "used_quota": 100000,
    "quota_per_unit": 500000,
    "balance_units": 10
  }
}
```

说明：

- `quota` 是系统内部额度。
- `quota_per_unit` 取 `common.QuotaPerUnit`。
- `balance_units = quota / quota_per_unit`，用于外部系统按金额口径展示。

### 扣减余额

```text
POST /api/external/balance/deduct
```

请求：

```json
{
  "request_id": "order_20260519_0001",
  "user_id": 123,
  "quota": 500000,
  "reason": "external_order",
  "description": "外部订单扣费",
  "metadata": {
    "order_id": "202605190001",
    "source": "partner_a"
  }
}
```

字段说明：

- `request_id`：外部请求幂等 ID，必填，全局唯一。
- `user_id`：用户 ID，推荐必填。
- `username` / `email`：可作为备选定位方式。
- `quota`：扣减额度，必须大于 0。
- `reason`：扣减原因，建议枚举。
- `description`：审计描述。
- `metadata`：外部业务扩展信息，存为 JSON 字符串。

响应：

```json
{
  "success": true,
  "message": "",
  "data": {
    "request_id": "order_20260519_0001",
    "user_id": 123,
    "deducted_quota": 500000,
    "quota_before": 5000000,
    "quota_after": 4500000,
    "status": "success"
  }
}
```

余额不足响应：

```json
{
  "success": false,
  "message": "insufficient quota",
  "data": {
    "request_id": "order_20260519_0001",
    "user_id": 123,
    "quota": 100000,
    "required_quota": 500000,
    "status": "failed"
  }
}
```

幂等重复请求响应：

- 如果 `request_id` 已成功扣减，返回原始成功结果，不重复扣减。
- 如果 `request_id` 已失败，可返回失败结果；是否允许同 ID 重试由实现策略决定。建议同 ID 永远返回首次结果。

### 查询扣减结果

```text
GET /api/external/balance/transaction/:request_id
```

该接口用于通过外部订单 ID 反查系统内扣减记录、用户账号和余额信息。

响应：

```json
{
  "success": true,
  "message": "",
  "data": {
    "request_id": "order_20260519_0001",
    "user_id": 123,
    "username": "test",
    "quota": 500000,
    "quota_before": 5000000,
    "quota_after": 4500000,
    "status": "success",
    "reason": "external_order",
    "description": "外部订单扣费",
    "user": {
      "user_id": 123,
      "username": "test",
      "email": "test@example.com",
      "quota": 4500000,
      "used_quota": 100000,
      "quota_per_unit": 500000,
      "balance_units": 9,
      "status": 1
    },
    "created_at": 1779120000
  }
}
```

字段说明：

- `quota_before`：该订单扣减前的用户额度快照。
- `quota_after`：该订单扣减后的用户额度快照。
- `user.quota`：查询时用户当前实时余额，可能与 `quota_after` 不同，因为用户后续可能充值或继续消费。
- `user.balance_units`：当前余额按 `common.QuotaPerUnit` 折算后的金额单位。

如果订单不存在：

```json
{
  "success": false,
  "message": "transaction not found",
  "data": {
    "request_id": "order_20260519_0001",
    "status": "not_found"
  }
}
```

如果订单存在但用户已被删除或不可查：

```json
{
  "success": true,
  "message": "",
  "data": {
    "request_id": "order_20260519_0001",
    "user_id": 123,
    "username": "test",
    "quota": 500000,
    "quota_before": 5000000,
    "quota_after": 4500000,
    "status": "success",
    "user": null,
    "created_at": 1779120000
  }
}
```

原则：

- 订单记录是审计事实，即使用户后续被删除，也应返回订单记录。
- 用户当前信息是实时关联数据，查不到时返回 `user: null`，不要隐藏订单记录。

## 配置设计

新增系统配置：

```text
ExternalBalanceApiEnabled
ExternalBalanceApiKey
ExternalBalanceApiKeyNext
ExternalBalanceApiAllowQuery
ExternalBalanceApiAllowDeduct
ExternalBalanceApiMaxDeductQuota
ExternalBalanceApiAllowedIPs
```

说明：

- `ExternalBalanceApiEnabled`：总开关。
- `ExternalBalanceApiKey`：当前密钥。
- `ExternalBalanceApiKeyNext`：轮换密钥，可为空。
- `ExternalBalanceApiAllowQuery`：是否允许查询。
- `ExternalBalanceApiAllowDeduct`：是否允许扣减。
- `ExternalBalanceApiMaxDeductQuota`：单次最大扣减额度，0 表示不限制。
- `ExternalBalanceApiAllowedIPs`：IP 白名单，逗号分隔，空表示不限制。

代码位置建议：

- 新增 `setting/external_balance.go`
- 修改 `model/option.go`
  - `InitOptionMap()` 加入默认值。
  - `updateOptionMap()` 支持上述 key。
- 前端配置页 Stage 2 可选；如果先不上页面，可通过现有系统配置接口写入。

密钥安全要求：

- 新生成密钥只展示一次。
- 后台列表不明文显示完整密钥，只显示前后 4 位。
- 日志中不能打印完整密钥。
- 支持 `ExternalBalanceApiKeyNext`，便于外部系统平滑轮换。

## 数据库设计

### external_balance_transactions

外部扣减事务表。

```text
id              int primary key
request_id      varchar(128) unique not null
user_id         int not null index
username        varchar(64)
email           varchar(128)
quota           int not null
quota_before    int not null
quota_after     int not null
status          varchar(32) not null
reason          varchar(64)
description     varchar(255)
metadata        text
client_ip       varchar(64)
user_agent      varchar(255)
created_at      bigint
updated_at      bigint
```

状态枚举：

```text
success
failed
```

失败也建议记录，原因包括：

- `user_not_found`
- `user_disabled`
- `insufficient_quota`
- `invalid_request`
- `deduct_disabled`

如果希望失败原因更结构化，可增加：

```text
error_code varchar(64)
error_message varchar(255)
```

字段建议冗余保存 `username` 和 `email`：

- 便于通过订单 ID 反查时，即使用户信息变更，也能展示订单发生时的账号快照。
- 当前实时余额仍通过 `user_id` 关联 `users` 表查询。

### 通过订单 ID 反查用户信息

实现方式：

1. 通过 `request_id` 查询 `external_balance_transactions`。
2. 使用记录中的 `user_id` 查询 `users` 当前信息。
3. 返回交易快照和当前用户信息。

返回数据必须同时包含：

- 外部订单 ID。
- 扣减状态。
- 扣减额度。
- 扣减前余额。
- 扣减后余额。
- 用户 ID。
- 用户名。
- 邮箱。
- 用户当前余额。
- 用户当前已用额度。
- 用户状态。

### 是否需要改 users 表

Stage 2 不需要新增用户字段。

## 后端开发计划

### 1. 新增 setting

新增文件：

```text
setting/external_balance.go
```

内容：

```go
var ExternalBalanceApiEnabled = false
var ExternalBalanceApiKey = ""
var ExternalBalanceApiKeyNext = ""
var ExternalBalanceApiAllowQuery = true
var ExternalBalanceApiAllowDeduct = false
var ExternalBalanceApiMaxDeductQuota = 0
var ExternalBalanceApiAllowedIPs = ""
```

### 2. 接入 OptionMap

修改：

```text
model/option.go
```

在 `InitOptionMap()` 中加入配置默认值。

在 `updateOptionMap()` 中加入配置解析。

注意：

- bool 使用 `strconv.FormatBool` 和 `value == "true"`。
- int 使用 `strconv.Atoi`。
- 字符串直接保存。

### 3. 新增模型

新增文件：

```text
model/external_balance.go
```

结构：

```go
type ExternalBalanceTransaction struct {
    Id           int
    RequestID    string
    UserID       int
    Username     string
    Email        string
    Quota        int
    QuotaBefore  int
    QuotaAfter   int
    Status       string
    Reason       string
    Description  string
    Metadata     string
    ClientIP     string
    UserAgent    string
    CreatedAt    int64
    UpdatedAt    int64
}
```

核心方法：

- `GetExternalBalanceTransactionByRequestID(requestID string) (*ExternalBalanceTransaction, error)`
- `GetExternalBalanceTransactionWithUser(requestID string) (*ExternalBalanceTransactionDetail, error)`
- `CreateExternalBalanceTransaction(tx *gorm.DB, record *ExternalBalanceTransaction) error`
- `FindExternalBalanceUser(identifier UserIdentifier) (*User, error)`
- `DeductUserQuotaAtomically(params DeductParams) (*ExternalBalanceTransaction, error)`

`ExternalBalanceTransactionDetail` 建议包含：

- `transaction`：外部扣减交易快照。
- `user`：当前用户信息，可为空。
- `current_quota`：用户当前余额。
- `current_used_quota`：用户当前已用额度。
- `balance_units`：按 `QuotaPerUnit` 折算后的当前余额。

### 4. 原子扣减实现

不能直接调用现有 `DecreaseUserQuota` 作为核心扣减，因为它没有余额不足判断。

推荐事务流程：

1. 根据 `request_id` 查询事务记录。
2. 如果已存在，直接返回该记录。
3. 查找用户。
4. 校验用户启用状态。
5. 读取当前 quota。
6. 如果余额不足，写失败事务记录并返回。
7. 执行条件更新：

```go
result := tx.Model(&User{}).
    Where("id = ? AND quota >= ?", user.Id, quota).
    Update("quota", gorm.Expr("quota - ?", quota))
```

8. 如果 `RowsAffected == 0`，说明并发下余额不足或用户不存在，回滚或写失败记录。
9. 再读取更新后的 quota，写成功事务记录。
10. 更新用户 quota cache。
11. 写系统日志。

缓存注意：

- 如果直接用 GORM 条件更新绕过 `DecreaseUserQuota`，需要同步 Redis 用户余额缓存。
- 可新增模型内部方法调用现有 cache 更新能力。
- 如果现有 cache 方法不可导出，建议在 `model/user.go` 增加安全封装，例如 `RefreshUserQuotaCache(userId int)`。

### 5. 新增鉴权中间件

新增或扩展：

```text
middleware/external_balance_auth.go
```

职责：

- 检查 `ExternalBalanceApiEnabled`。
- 从 `Authorization: Bearer` 或 `X-External-Api-Key` 读取密钥。
- 与 `ExternalBalanceApiKey` 或 `ExternalBalanceApiKeyNext` 常量时间比较。
- 校验 IP 白名单。
- 写入上下文：
  - `external_balance_authenticated = true`
  - `external_balance_key_version = current|next`

密钥比较建议使用：

```go
subtle.ConstantTimeCompare([]byte(input), []byte(configured)) == 1
```

不要把密钥写入日志。

### 6. 新增控制器

新增文件：

```text
controller/external_balance.go
```

控制器：

- `GetExternalUserBalance(c *gin.Context)`
- `DeductExternalUserBalance(c *gin.Context)`
- `GetExternalBalanceTransaction(c *gin.Context)`

`GetExternalBalanceTransaction` 返回内容：

- 交易表中的订单快照。
- 当前用户信息。
- 当前用户余额。
- 当前余额按 `QuotaPerUnit` 折算后的金额单位。

如果交易存在但用户不存在，接口仍返回交易信息，`user` 字段为 `null`。

请求结构：

```go
type ExternalBalanceUserQuery struct {
    UserID   int
    Username string
    Email    string
}

type ExternalBalanceDeductRequest struct {
    RequestID   string                 `json:"request_id"`
    UserID      int                    `json:"user_id"`
    Username    string                 `json:"username"`
    Email       string                 `json:"email"`
    Quota       int                    `json:"quota"`
    Reason      string                 `json:"reason"`
    Description string                 `json:"description"`
    Metadata    map[string]interface{} `json:"metadata"`
}
```

校验：

- `request_id` 必填，长度限制建议 128。
- `quota > 0`。
- `quota <= ExternalBalanceApiMaxDeductQuota`，当最大值大于 0 时。
- 至少提供一个用户定位字段。
- `reason` 长度限制建议 64。
- `description` 长度限制建议 255。
- `metadata` marshal 后长度建议限制，例如 4096。

### 7. 路由接入

修改：

```text
router/api-router.go
```

新增：

```go
externalBalanceRoute := apiRouter.Group("/external/balance")
externalBalanceRoute.Use(middleware.CriticalRateLimit())
externalBalanceRoute.Use(middleware.ExternalBalanceAuth())
{
    externalBalanceRoute.GET("/user", controller.GetExternalUserBalance)
    externalBalanceRoute.POST("/deduct", controller.DeductExternalUserBalance)
    externalBalanceRoute.GET("/transaction/:request_id", controller.GetExternalBalanceTransaction)
}
```

### 8. 日志与审计

扣减成功后写用户日志：

```text
外部系统扣减额度 xxx，request_id=xxx，reason=xxx
```

同时写 `external_balance_transactions`。

建议不要把完整 metadata 全量写入普通日志，避免敏感信息污染日志。

## 前端计划

Stage 2 前端不是必须项，但建议增加最小配置入口。

### 配置页面

修改候选：

```text
web/default/src/features/system-settings/
```

新增一个系统设置 section：

```text
External Balance API
```

字段：

- 启用外部余额 API。
- 当前 API 密钥。
- 轮换 API 密钥。
- 允许查询。
- 允许扣减。
- 单次最大扣减额度。
- IP 白名单。

交互要求：

- 密钥输入使用 password。
- 已保存密钥不回显完整值。
- 提供“生成新密钥”按钮。
- 保存前提示：该接口可扣减用户余额，必须限制可信来源。

### i18n

所有新增 UI 文案使用 `t('English key')`。

更新：

```text
web/default/src/i18n/locales/en.json
web/default/src/i18n/locales/zh.json
web/default/src/i18n/locales/fr.json
web/default/src/i18n/locales/ja.json
web/default/src/i18n/locales/ru.json
web/default/src/i18n/locales/vi.json
```

或在 `web/default/` 下运行：

```text
bun run i18n:sync
```

## 安全要求

### 必须项

- 独立 API 密钥。
- 总开关默认关闭。
- 扣减开关默认关闭。
- 扣减接口必须幂等。
- 扣减必须原子化，不允许余额扣成负数。
- 单次最大扣减额度可配置。
- 支持 IP 白名单。
- 日志不得输出完整密钥。
- 请求失败和成功都应有审计记录。

### 建议项

- 后续增加 HMAC 签名：

```text
X-Timestamp
X-Nonce
X-Signature
```

- 后续增加每个外部系统独立密钥表。
- 后续增加按 key 的权限范围，例如只查、可扣、最大额度、IP 白名单。

## 错误码建议

```text
external_api_disabled
invalid_api_key
ip_not_allowed
query_disabled
deduct_disabled
invalid_request
user_not_found
user_disabled
insufficient_quota
quota_limit_exceeded
duplicate_request
transaction_not_found
database_error
```

HTTP 状态建议：

- `401`：密钥无效。
- `403`：IP 不允许、功能未启用。
- `400`：请求参数错误。
- `404`：用户或交易不存在。
- `409`：幂等冲突或余额不足。
- `500`：数据库错误。

项目现有 API 常用 `success/message/data` 格式，建议保持一致。

## 测试计划

### 后端单元测试

覆盖：

- 未启用时拒绝访问。
- 密钥为空时拒绝访问。
- 当前密钥可访问。
- 轮换密钥可访问。
- 错误密钥不可访问。
- IP 白名单生效。
- 查询用户余额成功。
- 通过订单 ID 查询扣减交易成功。
- 通过订单 ID 可以返回用户账号、邮箱、当前余额和用户状态。
- 交易存在但用户不存在时，仍返回交易快照且 `user` 为 `null`。
- 用户不存在返回错误。
- 禁用用户不可扣减。
- 扣减成功后 quota 正确减少。
- 余额不足不会扣成负数。
- 并发扣减不会扣成负数。
- 相同 `request_id` 重复调用不重复扣减。
- `ExternalBalanceApiMaxDeductQuota` 生效。
- metadata 使用 `common.Marshal` 序列化。

### 数据库兼容测试

必须验证：

- SQLite
- MySQL
- PostgreSQL

重点：

- `request_id` 唯一索引。
- 条件更新 `WHERE id = ? AND quota >= ?`。
- 事务回滚。
- 软删除不影响交易记录查询。

### 接口测试示例

查询：

```bash
curl -H "Authorization: Bearer $EXTERNAL_BALANCE_API_KEY" \
  "https://example.com/api/external/balance/user?user_id=123"
```

扣减：

```bash
curl -X POST "https://example.com/api/external/balance/deduct" \
  -H "Authorization: Bearer $EXTERNAL_BALANCE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "order_20260519_0001",
    "user_id": 123,
    "quota": 500000,
    "reason": "external_order",
    "description": "external order charge"
  }'
```

查询交易：

```bash
curl -H "Authorization: Bearer $EXTERNAL_BALANCE_API_KEY" \
  "https://example.com/api/external/balance/transaction/order_20260519_0001"
```

## 验收标准

Stage 2 完成后，应满足：

- 外部系统可以使用独立 API 密钥查询用户余额。
- 外部系统可以使用独立 API 密钥扣减用户余额。
- 外部系统可以通过订单 ID 反查扣减记录、用户账号、邮箱、当前余额和用户状态。
- API 密钥与普通用户 token、管理 access token、relay token 隔离。
- 扣减接口支持幂等，同一 `request_id` 不会重复扣款。
- 并发扣减时用户余额不会变成负数。
- 每次扣减有交易记录和用户日志。
- 可以通过配置关闭查询或扣减能力。
- 可以配置单次最大扣减额度。
- 可以配置 IP 白名单。
- 后端编译通过。
- SQLite、MySQL、PostgreSQL 迁移兼容。

## 建议开发顺序

1. 新增 setting 和 OptionMap 配置。
2. 新增外部扣减交易模型和迁移。
3. 实现独立鉴权中间件。
4. 实现用户余额查询接口。
5. 实现原子扣减和幂等逻辑。
6. 接入路由。
7. 增加审计日志。
8. 补充后端测试。
9. 可选：增加前端系统设置配置区。
10. 联调外部系统。

## 预估工作量

- 后端配置、模型、鉴权、接口：1.5 - 2.5 天。
- 幂等、并发扣减和测试：1 - 2 天。
- 前端配置页：0.5 - 1 天。
- 联调和安全检查：0.5 - 1 天。

合计：3.5 - 6.5 天。
