# Bug Report — debug-01

**Review 范围：** HEAD~5...HEAD（最近 5 次提交）
**Review 日期：** 2026-06-24
**涉及模块：** 生图广场、开屏广告、首页概览、注册流程、静态路由

---

## P0 — 严重，影响数据完整性

### P0-01 · SELECT FOR UPDATE 在 GORM v2 中静默失效，全局行锁缺失

**文件：** `model/user.go:369,939` · `model/topup.go`（8处）· `model/subscription.go`（9处）· `model/redemption.go:1处` · `model/promotion.go:3处` — **共 24 处**

**问题：**
`tx.Set("gorm:query_option", "FOR UPDATE")` 是 GORM v1 的行锁 API，在项目使用的 GORM v2（`v1.25.2`）中完全无效——`Set()` 仅将键值写入 `Statement.Settings`，没有任何 v2 回调读取 `"gorm:query_option"` 键并向 SQL 追加 `FOR UPDATE`。实际生成的是普通 `SELECT`，行锁从未被持有。

GORM v2 正确的行锁写法是：
```go
tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(...)
```

**影响：** 所有依赖行锁保证幂等性的事务（充值回调、额度发放、兑换码核销、订阅履约、推广奖励）均存在并发竞态。两个并发请求可以同时读到相同的"未处理"状态，各自完成写入，导致双重扣款、双重赠额或重复核销。

**失败场景：** 用户绑定邮箱后触发 `TryGrantNewUserQuota`，两个并发请求同时通过预检（`new_user_quota_rewarded = false`），均进入事务，因无行锁保护，两者均读到 `rewarded = false` 并各自执行 `quota += QuotaForNewUser`，导致新用户额度被发放两次。

---

### P0-02 · SplashAdConfig HTML 内容未经消毒即入库，存在存储型 XSS 风险

**文件：** `model/promotion.go:ValidateSplashAdConfig` · `controller/option.go:UpdateOption`

**问题：**
`ValidateSplashAdConfig` 校验了 `content_format`、长度和时间范围，但与同类型的 `PromotionRewardBannerConfig`、`PromotionLink` 不同，它**没有调用 `sanitizePromotionBannerHTML`**。

更严重的是：`SetSplashAdConfig` 函数在整个代码库中**没有任何路由调用它**。管理员实际通过 `PUT /api/option` 泛化接口保存 `SplashAdConfig`，该接口的 `switch option.Key` 中**没有 `case "SplashAdConfig"` 分支**，直接走 `model.UpdateOption(key, rawString)` 写库，绕过所有验证和消毒。

**对比：**
```go
// PromotionLink 和 PromotionRewardBannerConfig 均有：
if config.ContentFormat == "html" {
    sanitized, err := sanitizePromotionBannerHTML(config.Content)
    config.Content = sanitized
}
// SplashAdConfig 完全缺少这段
```

**失败场景：** 攻击者（或误操作的管理员）通过 `PUT /api/option` 提交 `{"key":"SplashAdConfig","value":"{\"content_format\":\"html\",\"content\":\"<script>stealCookies()</script>\"}"}` ，恶意脚本存入 DB，开屏广告对所有未登录访客展示时执行，造成存储型 XSS。

---

## P1 — 高，功能错误或注册失败

### P1-01 · RegistrationSource 无服务端长度校验，MySQL strict mode 下注册失败

**文件：** `controller/user.go:230` · `controller/oauth.go:298` · `model/user.go:54`

**问题：**
DB 字段声明为 `varchar(64)`，但注册逻辑仅做 `strings.TrimSpace()`，无长度校验：
```go
RegistrationSource: strings.TrimSpace(user.RegistrationSource),
```
`User` 结构体无 `validate:"max=64"` tag（对比 `Remark` 字段有 `validate:"max=255"`），`common.Validate.Struct()` 不会拦截超长值。OAuth 注册路径（`controller/oauth.go:298`）同样仅 TrimSpace。

**失败场景：** 攻击者或外部广告平台传入 100 字符的 `utm_source`，直接调用注册接口。MySQL strict mode（5.7.5+ 默认开启）下报 `Data too long for column 'registration_source'`，整个注册请求返回 500，用户注册失败。SQLite 下静默存储完整值，主从迁移后数据不一致。

---

### P1-02 · 生图模板批量导入无事务包裹，导入中途失败留下脏数据

**文件：** `model/image_generation.go:AdminBatchCreateImageGenerationTemplates`（约第 302-327 行）

**问题：**
批量导入循环对每条记录单独调用 `DB.Create(t)`，没有外层事务：
```go
for i := range inputs {
    if err := DB.Create(t).Error; err != nil {
        return imported, err   // 前 N 条已提交，后续未处理
    }
    imported++
}
```

**失败场景：** 导入 200 条模板，第 101 条触发 DB 约束错误（如连接中断或字段过长），前 100 条已永久提交，接口返回错误。管理员重新导入会产生重复记录（无去重键），无法回滚，需手动清理 DB。

---

## P2 — 中，影响功能正确性

### P2-01 · Tag 精确搜索因 LIKE 模糊匹配返回错误结果

**文件：** `model/image_generation.go:176-179`（`GetImageGenerationTemplates`）

**问题：**
tags 字段以 JSON 数组字符串存储（如 `["art","abstract","portrait"]`），搜索时使用 `LIKE '%tag%'`，无法区分 tag 边界：
```go
tagLike := "%" + tag + "%"
query = query.Where("tags LIKE ?", tagLike)
```
搜索 `"art"` 会命中 `"abstract"` 和 `"heart"`；用户输入含 `%`、`_` 等 SQL LIKE 元字符时，匹配范围进一步扩大（通配符未转义）。

**修复建议：** 将 LIKE 模式改为 `%"tag"%`（含引号），精确匹配 JSON 字符串边界，同时对 `%`、`_`、`\` 做转义。

---

### P2-02 · `GetImageGenerationTags` 全表扫描，无分页无缓存

**文件：** `model/image_generation.go:GetImageGenerationTags`（约第 133-157 行）

**问题：**
该函数加载所有可见模板行到内存计算 tag 频次，无 LIMIT，无缓存层：
```go
var templates []ImageGenerationTemplate
DB.Where("visible = ?", true).Select("tags").Find(&templates)
// 在 Go 内存中统计，无任何 limit
```
该接口挂载在公开路由 `GET /api/image-generation/tags` 上，任何用户可访问。

**失败场景：** 模板数量增长至数千条时，每次请求全表扫描并在应用层 JSON 解析，高并发下造成显著内存压力和响应延迟，无上限。

---

## P3 — 低，代码规范 / 轻微问题

### P3-01 · `controller/image_generation.go` 直接 import `encoding/json`（违反 Rule 1）

**文件：** `controller/image_generation.go:4`

`encoding/json` 被 import 仅用于 `json.RawMessage` 类型声明。CLAUDE.md Rule 1 注明类型引用可以使用，但在 controller 业务代码中出现裸 `encoding/json` import，与项目规范不符，为后续直接调用 `json.Marshal/Unmarshal` 埋下隐患。

**建议：** 在 `common/json.go` 中添加 `type RawMessage = json.RawMessage` 类型别名，controller 改用 `common.RawMessage`，消除对 `encoding/json` 的直接依赖。

---

### P3-02 · `HomeDisplayAmount.Amount` 与 `DisplayAmount` 始终相同，字段冗余

**文件：** `service/home_summary.go:quotaToDisplayAmount`（约第 203-221 行）

`quotaToDisplayAmount` 始终将 `Amount` 和 `DisplayAmount` 赋为同一值，没有实现任何差异化（如四舍五入、格式化）。每次首页请求都序列化两个相同的 float64，字段设计意图不明。

---

## 修复优先级汇总

| ID | 优先级 | 文件 | 一句话描述 |
|---|---|---|---|
| P0-01 | **P0** | `model/*.go`（24处） | GORM v2 行锁失效，全局幂等保护缺失 |
| P0-02 | **P0** | `model/promotion.go` · `controller/option.go` | SplashAdConfig HTML 未消毒，存储型 XSS |
| P1-01 | **P1** | `controller/user.go` · `model/user.go` | RegistrationSource 无长度校验，MySQL 下注册 500 |
| P1-02 | **P1** | `model/image_generation.go` | 批量导入无事务，失败留脏数据 |
| P2-01 | **P2** | `model/image_generation.go` | Tag LIKE 搜索模糊匹配，结果不准确 |
| P2-02 | **P2** | `model/image_generation.go` | GetImageGenerationTags 全表扫描无缓存 |
| P3-01 | **P3** | `controller/image_generation.go` | 直接 import encoding/json 违反 Rule 1 |
| P3-02 | **P3** | `service/home_summary.go` | HomeDisplayAmount 两字段值恒相同 |
