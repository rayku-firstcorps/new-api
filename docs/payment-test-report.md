# 支付模块测试用例报告

## 测试概述

- **测试依据**: `docs/payment-test-prd.md`
- **测试日期**: 2026-05-26
- **测试范围**: 8个支付渠道（Epay、Stripe、Creem、Waffo、Waffo Pancake、Airwallex、Payssion、Antom）
- **测试类型**: 代码审查 + 静态分析 + 逻辑验证 + 自动化测试 + Docker 冒烟
- **总用例数**: 98 个
- **P0**: 59 个 | **P1**: 36 个 | **P2**: 3 个 | **P3**: 0 个

---

## 执行摘要

| 优先级 | 总数 | 通过 | 有风险 | 未通过 | 无法验证 |
|--------|------|------|--------|--------|----------|
| P0 | 59 | 58 | 1 | 0 | 0 |
| P1 | 36 | 25 | 2 | 0 | 9 |
| P2 | 3 | 0 | 0 | 0 | 3 |
| P3 | 0 | 0 | 0 | 0 | 0 |

**结论**: 本地可执行的 P0 用例、自动化检查和 Docker 冒烟均已通过，无阻塞性代码缺陷。剩余 1 个 P0 风险项为 Antom 不支持支付方式的 provider 沙箱行为确认。

---

## 本次可交付执行记录

| 检查项 | 命令/方式 | 结果 | 证据 |
|--------|-----------|------|------|
| 后端指定包测试 | `go test ./controller ./model ./middleware ./router` | ✅ 通过 | controller/model/middleware 通过，router 无测试文件 |
| 前端 i18n 同步 | `bun run i18n:sync` | ✅ 通过 | 生成 `web/default/src/i18n/locales/_reports/_sync-report.json` |
| 前端类型检查 | `bun run typecheck` | ✅ 通过 | `tsc -b` 无错误 |
| 前端生产构建 | `bun run build` | ✅ 通过 | Rsbuild v2.0.1 构建成功 |
| Docker 镜像构建 | `docker compose build` | ✅ 通过 | `new-api:local` 构建成功 |
| Docker 服务启动 | `docker compose up -d` | ✅ 通过 | `new-api`、`postgres`、`redis` 均启动 |
| Docker 健康检查 | `GET http://localhost:3000/api/status` | ✅ 通过 | 响应包含 `"success":true` |

---

## 详细测试结果

### 7.1 合规与渠道可用性 (Compliance And Channel Availability)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-COMP-001 | P0 | 合规未确认时不暴露支付方式 | ✅ 通过 | `payment_webhook_availability.go` 所有 `is*TopUpEnabled()` 函数首先调用 `isPaymentComplianceConfirmed()`，未确认时返回 false，`GetTopUpInfo` 不会返回对应渠道 |
| PAY-COMP-002 | P0 | 合规确认存储完整信息 | ✅ 通过 | `payment_setting.go` 中 `PaymentSetting` 结构体包含 `ComplianceConfirmed`、`ComplianceTermsVersion`、`ComplianceConfirmedAt`、`ComplianceConfirmedBy`、`ComplianceConfirmedIP` 字段 |
| PAY-COMP-003 | P0 | 合规条款版本变更后视为未确认 | ✅ 通过 | `IsPaymentComplianceConfirmed()` 检查 `ComplianceTermsVersion` 是否匹配当前版本 |
| PAY-COMP-004 | P0 | API Token 不能确认合规 | ✅ 通过 | 合规确认端点使用 dashboard session 认证中间件，API token 无法访问 |
| PAY-COMP-005 | P1 | 开发环境跳过合规 | ✅ 通过 | `SKIP_PAYMENT_COMPLIANCE` 环境变量控制，仅在该进程内生效 |

### 7.2 充值信息聚合 (Top-Up Info Aggregation)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-INFO-001 | P0 | 已启用渠道正确返回 | ✅ 通过 | `GetTopUpInfo` 逐一检查每个渠道的 `is*TopUpEnabled()` 状态 |
| PAY-INFO-002 | P0 | 缺少配置的渠道隐藏 | ✅ 通过 | 每个 `is*TopUpEnabled()` 检查必要字段非空，缺少任一字段返回 false |
| PAY-INFO-003 | P1 | Payssion 方法带前缀 | ✅ 通过 | 前端接收 `payssion:gcash_ph` 格式，`normalizePayssionPaymentMethod` 处理前缀剥离 |
| PAY-INFO-004 | P1 | Antom 方法带前缀 | ✅ 通过 | 前端接收 `antom:ALIPAY_CN` 格式 |
| PAY-INFO-005 | P1 | 空 Antom 方法使用默认收银台 | ✅ 通过 | `AntomPaymentMethods=[]` 时不传 `paymentMethodType`，使用通用收银台 |

### 7.3 金额计算 (Amount Calculation)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-AMT-001 | P0 | 最低金额拒绝 | ✅ 通过 | `RequestAntomPay`/`RequestPayssionPay` 等均检查 `req.Amount < getXxxMinTopup()` |
| PAY-AMT-002 | P0 | 分组倍率应用 | ✅ 通过 | `getAntomPayMoney`/`getPayssionPayMoney` 使用 `common.GetTopupGroupRatio(group)` 乘以基础金额 |
| PAY-AMT-003 | P0 | 折扣应用 | ✅ 通过 | `AmountDiscount[int(originalAmount)]` 查找预设折扣并乘入最终金额 |
| PAY-AMT-004 | P0 | Antom CNY 最小单位转换 | ✅ 通过 | `antomAmountValue(10.25, "CNY")` → `money * 100` → `"1025"`，代码在 `topup_antom.go:322-336` |
| PAY-AMT-005 | P1 | 零小数货币转换 | ✅ 通过 | `zeroDecimalCurrencies` map 包含 JPY/KRW 等，不乘100直接取整 |
| PAY-AMT-006 | P1 | Token 显示模式转换 | ✅ 通过 | `QuotaDisplayTypeTokens` 时 amount 除以 `QuotaPerUnit`，min topup 乘以 `QuotaPerUnit` |
| PAY-AMT-007 | P1 | 无效金额拒绝 | ✅ 通过 | `payMoney <= 0.01` 检查拒绝过低金额，最低金额检查拒绝0和负值 |

### 7.4 订单创建 (Order Creation)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-ORD-001 | P0 | 创建 pending 订单 | ✅ 通过 | 所有渠道创建订单时设置 `Status: common.TopUpStatusPending`，包含完整字段 |
| PAY-ORD-002 | P0 | TradeNo 唯一性 | ✅ 通过 | `TopUp` 模型 `TradeNo` 字段标记 `gorm:"unique"` 唯一索引 |
| PAY-ORD-003 | P0 | 提供商创建失败处理 | ✅ 通过 | Antom: `client.Execute` 失败后 `topUp.Status = common.TopUpStatusFailed` 并更新 |
| PAY-ORD-004 | P0 | 空支付链接处理 | ✅ 通过 | `extractAntomPaymentURL` 返回空时标记订单失败，返回错误给前端 |
| PAY-ORD-005 | P1 | 支付端点限流 | ✅ 通过 | 路由使用 `CriticalRateLimit` 中间件保护支付创建端点 |

### 7.5 Antom

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-ANTOM-001 | P0 | 支付请求成功 | ✅ 通过 | `RequestAntomPay` 返回 `payment_url` 和 `order_id` |
| PAY-ANTOM-002 | P0 | 交易号熵值 | ✅ 通过 | 格式 `ANTOM-{timestamp}-{16 random}`，使用 `randstr.String(16)` 生成随机部分，不含 user id |
| PAY-ANTOM-003 | P0 | 不支持的支付方式 | ⚠️ 有风险 | 代码逻辑正确（provider 返回空 URL 时标记失败），但需沙箱验证实际 provider 行为 |
| PAY-ANTOM-004 | P0 | Webhook 签名拒绝 | ✅ 通过 | `tools.CheckSignature` 验证失败返回 FAIL，订单不变 |
| PAY-ANTOM-005 | P0 | Webhook 成功充值一次 | ✅ 通过 | `RechargeAntom` 使用 `FOR UPDATE` 行锁 + 状态检查确保幂等 |
| PAY-ANTOM-006 | P0 | Webhook 重放幂等 | ✅ 通过 | `LockOrder(tradeNo)` 分布式锁 + `RechargeAntom` 内部状态检查双重保护 |
| PAY-ANTOM-007 | P0 | 查询所有权检查 | ✅ 通过 | `RequestAntomInquiry`: `topUp.UserId != id` 时返回"订单不存在" |
| PAY-ANTOM-008 | P0 | 查询已付补偿 | ✅ 通过 | inquiry 查到 SUCCESS 后调用 `LockOrder` + `RechargeAntom` 完成充值 |
| PAY-ANTOM-009 | P0 | 查询失败状态 | ✅ 通过 | `ResultStatus == "F"` 时标记订单 failed |
| PAY-ANTOM-010 | P1 | 查询限流 | ✅ 通过 | `AntomInquiryRateLimit` 限制每用户 10次/60秒 |
| PAY-ANTOM-011 | P1 | 前端轮询成功 | ⚠️ 无法验证 | 需要浏览器环境运行前端验证 UI 状态转换 |
| PAY-ANTOM-012 | P1 | 前端轮询清理 | ⚠️ 无法验证 | 需要浏览器环境验证导航离开时 interval 清理 |
| PAY-ANTOM-013 | P1 | 前端轮询超时 | ⚠️ 无法验证 | 需要浏览器环境验证超时 UI 展示 |

### 7.6 Payssion

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-PAYSSION-001 | P0 | 缺少配置禁用渠道 | ✅ 通过 | `isPayssionTopUpEnabled` 检查 API key、webhook secret、payment methods 三项 |
| PAY-PAYSSION-002 | P0 | 支付方式白名单 | ✅ 通过 | 提交未配置的方法时被拒绝 |
| PAY-PAYSSION-003 | P1 | 支付方式规范化 | ✅ 通过 | `normalizePayssionPaymentMethod` 剥离 `payssion:` 前缀 |
| PAY-PAYSSION-004 | P0 | Webhook 签名验证 | ✅ 通过 | HMAC-SHA256 签名验证，无效签名拒绝处理 |
| PAY-PAYSSION-005 | P0 | 金额不匹配拒绝 | ✅ 通过 | Webhook 处理中验证金额与本地订单一致 |
| PAY-PAYSSION-006 | P0 | 货币不匹配拒绝 | ✅ 通过 | 验证 webhook 货币与配置货币一致 |
| PAY-PAYSSION-007 | P0 | 提供商不匹配拒绝 | ✅ 通过 | `RechargePayssion` 检查 `topUp.PaymentProvider != PaymentProviderPayssion` |
| PAY-PAYSSION-008 | P0 | 重复成功幂等 | ✅ 通过 | `FOR UPDATE` + 状态检查，已成功订单直接返回 nil |
| PAY-PAYSSION-009 | P1 | 失败事件标记 | ✅ 通过 | 失败/取消/过期事件将 pending 订单标记为 failed |

### 7.7 Epay

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-EPAY-001 | P0 | 支付方式为空 | ✅ 通过 | `isEpayTopUpEnabled` 检查 `len(operation_setting.PayMethods) > 0` |
| PAY-EPAY-002 | P0 | 支付宝和微信方式 | ✅ 通过 | 配置 `alipay`/`wxpay` 后前端展示并提交选中类型 |
| PAY-EPAY-003 | P0 | 通知签名验证 | ✅ 通过 | Epay notify 回调验证签名 |
| PAY-EPAY-004 | P0 | 实际支付方式更新 | ✅ 通过 | Provider 返回实际支付类型时更新订单 payment_method |
| PAY-EPAY-005 | P0 | 通知重放幂等 | ✅ 通过 | `LockOrder` + 状态检查确保只充值一次 |
| PAY-EPAY-006 | P1 | 管理员手动补单 | ✅ 通过 | `ManualCompleteTopUp` 使用 `FOR UPDATE` 行锁，幂等处理已成功订单 |

### 7.8 Stripe、Creem、Waffo、Waffo Pancake、Airwallex

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-OTH-001 | P0 | Stripe webhook 签名 | ✅ 通过 | 使用 Stripe SDK 验证 webhook 签名 |
| PAY-OTH-002 | P0 | Stripe 异步成功/失败 | ✅ 通过 | 成功事件充值，失败事件标记 failed |
| PAY-OTH-003 | P1 | Stripe session 过期 | ✅ 通过 | checkout.session.expired 事件标记订单过期 |
| PAY-OTH-004 | P0 | Creem 一次性订单完成 | ✅ 通过 | `checkout.completed` + paid + one_time 条件满足时充值 |
| PAY-OTH-005 | P1 | Creem 忽略不支持事件 | ✅ 通过 | 非 paid、subscription、不支持的事件不触发充值 |
| PAY-OTH-006 | P0 | Waffo 沙箱/正式配置 | ✅ 通过 | `isWaffoWebhookConfigured` 根据 `WaffoSandbox` 切换检查字段 |
| PAY-OTH-007 | P0 | Waffo webhook 幂等 | ✅ 通过 | `LockOrder` + `RechargeWaffo` 内部状态检查 |
| PAY-OTH-008 | P0 | Airwallex 成功回调 | ✅ 通过 | 有效 webhook 完成充值 |
| PAY-OTH-009 | P0 | 提供商不匹配守卫 | ✅ 通过 | 每个 `Recharge*` 函数检查 `PaymentProvider` 匹配 |

### 7.9 Webhook 安全与幂等 (Webhook Security And Idempotency)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-WH-001 | P0 | Webhook 禁用时拒绝 | ✅ 通过 | 每个 webhook handler 首先调用 `is*WebhookEnabled()`，禁用时返回 403 |
| PAY-WH-002 | P0 | 缺少订单号 | ✅ 通过 | `tradeNo == ""` 时返回成功响应但不处理充值 |
| PAY-WH-003 | P0 | 未知订单 | ✅ 通过 | `GetTopUpByTradeNo` 返回 nil 时返回兼容响应，不修改额度 |
| PAY-WH-004 | P0 | 并发回调 | ✅ 通过 | `LockOrder(tradeNo)` 使用 Redis 分布式锁或本地 sync.Mutex 防止并发充值 |
| PAY-WH-005 | P1 | 敏感日志 | ✅ 通过 | 日志包含 provider、trade_no、client_ip、reason，不暴露密钥值 |

### 7.10 订单状态机 (Order State Machine)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-STATE-001 | P0 | Pending → Success | ✅ 通过 | 所有 `Recharge*` 函数：`topUp.Status = common.TopUpStatusSuccess` + `topUp.CompleteTime = common.GetTimestamp()` |
| PAY-STATE-002 | P0 | Pending → Failed | ✅ 通过 | `UpdatePendingTopUpStatus` 检查当前状态为 pending 后更新为 failed |
| PAY-STATE-003 | P0 | Pending → Expired | ✅ 通过 | `ExpirePendingTopUps` 批量更新超时 pending 订单为 expired |
| PAY-STATE-004 | P0 | Success 不可变更 | ✅ 通过 | 所有 `Recharge*` 函数检查 `topUp.Status != common.TopUpStatusPending` 时返回错误或直接返回 nil（幂等） |
| PAY-STATE-005 | P0 | Failed/Expired 不可自动充值 | ✅ 通过 | `Recharge*` 函数仅处理 pending 状态，failed/expired 订单返回"状态错误" |
| PAY-STATE-006 | P1 | 历史记录展示 | ⚠️ 无法验证 | 需要浏览器环境验证 UI 展示 |

### 7.11 过期补偿 (Expiration Compensation)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-EXP-001 | P0 | 仅过期旧 pending 订单 | ✅ 通过 | `ExpirePendingTopUps(5)` 使用 `create_time < cutoff` 条件，cutoff = now - 5*60 |
| PAY-EXP-002 | P0 | Antom 过期前已付补偿 | ✅ 通过 | `VerifyPendingTopUpPayment` 返回 paid 时调用 `RechargeAntom` 完成充值，不过期 |
| PAY-EXP-003 | P0 | Antom unknown 跳过 | ✅ 通过 | `TopUpRemotePaymentStatusUnknown` 时加入 `skipTradeNos`，不过期该订单 |
| PAY-EXP-004 | P1 | Antom 远程失败标记 | ✅ 通过 | `TopUpRemotePaymentStatusFailed` 时调用 `UpdatePendingTopUpStatus` 标记 failed |
| PAY-EXP-005 | P1 | 非 Antom 旧 pending 过期 | ✅ 通过 | 非 Antom 订单无远程验证，直接被批量更新为 expired |
| PAY-EXP-006 | P1 | 过期任务节奏 | ⚠️ 有风险 | 依赖 `SyncOptions` 调度周期，实际过期延迟 = 5分钟 + 调度间隔 |

### 7.12 前端钱包 (Frontend Wallet)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-FE-001 | P1 | 钱包加载支付方式 | ⚠️ 无法验证 | 需要浏览器环境，代码逻辑正确 |
| PAY-FE-002 | P1 | 金额端点选择 | ✅ 通过 | 前端代码根据 provider 调用对应 amount API |
| PAY-FE-003 | P1 | 支付请求选择 | ✅ 通过 | 前端根据 provider 类型打开对应 URL 或提交表单 |
| PAY-FE-004 | P1 | Antom 确认弹窗 | ⚠️ 无法验证 | 需要浏览器环境验证 |
| PAY-FE-005 | P1 | Antom 已付 UI | ⚠️ 无法验证 | 需要浏览器环境验证 |
| PAY-FE-006 | P1 | Antom 失败 UI | ⚠️ 无法验证 | 需要浏览器环境验证 |
| PAY-FE-007 | P1 | Antom 超时 UI | ⚠️ 无法验证 | 需要浏览器环境验证 |
| PAY-FE-008 | P2 | 网络错误处理 | ⚠️ 无法验证 | 需要浏览器环境验证 |
| PAY-FE-009 | P2 | 充值历史刷新 | ⚠️ 无法验证 | 需要浏览器环境验证 |

### 7.13 管理后台支付设置 (Admin Payment Settings)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-ADMIN-001 | P1 | 通用支付设置保存 | ✅ 通过 | Option 模型持久化，影响钱包页面 |
| PAY-ADMIN-002 | P1 | Antom 设置保存 | ✅ 通过 | 所有 Antom 配置字段通过 Option 系统持久化 |
| PAY-ADMIN-003 | P1 | Antom 方法 JSON 验证 | ⚠️ 有风险 | 需确认前端/后端是否有 JSON 格式校验，无效 JSON 可能导致空方法列表 |
| PAY-ADMIN-004 | P1 | Payssion 设置保存 | ✅ 通过 | 配置持久化并反映到 top-up info |
| PAY-ADMIN-005 | P1 | Epay 可视化编辑器 | ✅ 通过 | 前端编辑器生成 `alipay`/`wxpay` 类型 JSON |
| PAY-ADMIN-006 | P2 | 保存失败处理 | ⚠️ 无法验证 | 需要浏览器环境模拟保存失败 |

### 7.14 Docker 部署 (Docker Deployment)

| ID | 优先级 | 场景 | 结果 | 备注 |
|----|--------|------|------|------|
| PAY-DOCKER-001 | P0 | 构建镜像 | ✅ 通过 | 已执行 `docker compose build`，`new-api:local` 镜像构建成功 |
| PAY-DOCKER-002 | P0 | 启动服务栈 | ✅ 通过 | 已执行 `docker compose up -d`，`new-api`、PostgreSQL、Redis 均启动 |
| PAY-DOCKER-003 | P0 | 健康检查 | ✅ 通过 | `GET http://localhost:3000/api/status` 返回 `"success":true` |
| PAY-DOCKER-004 | P0 | 数据库持久化 | ✅ 通过 | Docker volume 挂载确保数据持久化 |
| PAY-DOCKER-005 | P0 | 回调地址 | ✅ 通过 | `service.GetCallbackAddress()` 使用 `ServerAddress` 配置 |
| PAY-DOCKER-006 | P1 | Redis 锁降级 | ✅ 通过 | `LockOrder`/`UnlockOrder` 支持 Redis 分布式锁和本地 mutex 双路径 |
| PAY-DOCKER-007 | P1 | 跨数据库兼容 | ✅ 通过 | 所有 SQL 使用 `commonGroupCol`/`commonKeyCol` 变量，`UsingPostgreSQL` 分支处理引号差异 |

---

## 风险项详细说明

### 高优先级风险 (需要沙箱验证)

| # | 用例 | 风险描述 | 建议操作 |
|---|------|----------|----------|
| 1 | PAY-ANTOM-003 | Antom 不支持的支付方式行为依赖 provider 实际返回 | 在沙箱环境配置 `WECHATPAY` 并验证 provider 返回空 URL 时本地订单正确标记失败 |
| 2 | PAY-EXP-006 | 过期任务实际延迟取决于 SyncOptions 调度间隔 | 确认生产环境 sync frequency 配置，验证最大过期延迟可接受 |

### 中优先级风险 (需要浏览器验证)

| # | 用例 | 风险描述 | 建议操作 |
|---|------|----------|----------|
| 1 | PAY-ANTOM-011~013 | 前端轮询状态转换和清理逻辑 | 启动前端 dev server，模拟 Antom 支付流程验证 UI 状态 |
| 2 | PAY-FE-001~009 | 前端钱包整体交互 | 配置多渠道后在浏览器中完整测试充值流程 |
| 3 | PAY-ADMIN-003 | Antom PaymentMethods JSON 校验 | 在管理后台输入无效 JSON 验证是否被拦截 |

---

## 代码质量发现

### 安全性 ✅

1. **签名验证**: 所有 webhook 均有签名验证（Stripe SDK、HMAC-SHA256、RSA）
2. **幂等保护**: 双重保护机制 — `LockOrder` 分布式锁 + 数据库 `FOR UPDATE` 行锁 + 状态检查
3. **提供商隔离**: 每个 `Recharge*` 函数验证 `PaymentProvider` 匹配，防止跨渠道攻击
4. **所有权验证**: Antom inquiry 检查 `topUp.UserId != id`
5. **限流保护**: 支付创建使用 `CriticalRateLimit`，Antom 查询使用独立限流

### 资金安全 ✅

1. **事务一致性**: 所有充值操作在数据库事务内完成（状态更新 + 额度增加原子执行）
2. **行级锁**: `FOR UPDATE` 防止并发事务重复充值
3. **金额验证**: Payssion webhook 验证金额和货币与本地订单一致
4. **过期补偿**: Antom 订单过期前查询远程状态，已付订单不会被错误过期

### 潜在改进建议

| # | 类型 | 描述 | 影响 |
|---|------|------|------|
| 1 | 建议 | `ExpirePendingTopUps` 中 Antom 查询失败时记录了错误但仍将订单加入 skipList，逻辑正确但建议增加告警 | 低 |
| 2 | 建议 | Payssion webhook 金额比较建议使用 decimal 精确比较而非浮点数直接比较 | 低 |
| 3 | 建议 | 考虑为 `ManualCompleteTopUp` 增加操作审计日志（当前仅记录充值日志） | 低 |

---

## 自动化测试覆盖建议

### 必须补充的单元测试

```
controller/topup_antom_test.go:
  - TestAntomAmountValue_CNY          (PAY-AMT-004)
  - TestAntomAmountValue_JPY          (PAY-AMT-005)
  - TestAntomTradeNoFormat            (PAY-ANTOM-002)
  - TestAntomInquiryOwnerCheck        (PAY-ANTOM-007)

model/topup_test.go:
  - TestRechargeAntom_Idempotent      (PAY-ANTOM-006)
  - TestRechargeAntom_ProviderMismatch (PAY-OTH-009)
  - TestExpirePendingTopUps_PaidCompensation (PAY-EXP-002)
  - TestExpirePendingTopUps_UnknownSkip     (PAY-EXP-003)
  - TestExpirePendingTopUps_FailedMark      (PAY-EXP-004)

controller/payment_webhook_availability_test.go:
  - TestComplianceDisablesAllChannels  (PAY-COMP-001)
  - TestMissingConfigDisablesChannel   (PAY-INFO-002)
```

### 前端测试建议

```
web/default/src/features/wallet/__tests__/use-payment.test.ts:
  - Antom polling cleanup on unmount   (PAY-ANTOM-012)
  - Antom polling timeout after max attempts (PAY-ANTOM-013)
  - Provider-specific API endpoint selection (PAY-FE-002)
```

---

## 发布门禁检查清单

| # | 条件 | 状态 |
|---|------|------|
| 1 | 所有 P0 测试通过 | ✅ 本地可执行项已通过，剩余 1 项需 Antom 沙箱确认 |
| 2 | 自动化检查通过 (go test, bun i18n:sync, bun typecheck, bun build) | ✅ 已通过 |
| 3 | Docker 部署冒烟通过 | ✅ 已通过 |
| 4 | 至少一笔沙箱支付成功 | ⏳ 待执行 |
| 5 | 不可用支付方式已从生产配置移除 | ⏳ 待确认 |

---

## 总结

支付模块代码实现质量高，核心安全机制（签名验证、幂等保护、状态机、提供商隔离）设计完善。所有 P0 用例的代码逻辑和本地可执行门禁均已验证通过，无阻塞性缺陷；剩余 P0 风险为 Antom provider 沙箱行为确认。

**下一步行动**:
1. 在沙箱环境完成至少一笔 Antom CNY 支付
2. 验证 Antom 不支持支付方式（如未开通 `WECHATPAY`）的 provider 实际返回行为
3. 补充上述建议的单元测试
4. 在浏览器中验证前端轮询和 UI 状态转换
