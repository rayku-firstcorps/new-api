# Payssion 支付接入开发流程 PRD

## 1. 背景

new-api 当前已支持 Epay、Stripe、Creem、Waffo、Airwallex 等充值网关。Payssion 覆盖大量本地支付方式，适合作为补充支付通道接入到现有钱包充值流程。

本 PRD 以 Payssion v2 Payins API 为主，不使用旧版 v1 表单接口。旧版文档可作为业务状态语义参考，但不作为本期实现方案。

参考文档：

- Payssion Create Payment: https://payssion.readme.io/reference/create-payment
- Payssion Webhooks: https://payssion.readme.io/reference/webhooks
- Payssion Error Handling: https://payssion.readme.io/reference/errors
- Payssion Payment Methods: https://payssion.readme.io/reference/retrieve-payment-method-list
- Payssion 旧版中文支付通知说明: https://payssion.cn/cn/docs/integration.html

## 2. 目标

### 2.1 业务目标

- 用户可在充值页选择 Payssion 支付方式并完成充值。
- 管理员可在系统设置中配置 Payssion API Key、Webhook Secret、币种、单价、最小充值金额和可用支付方式。
- 支付成功后由 Payssion Webhook 自动完成本地订单入账。
- 支付失败、取消或过期时，本地订单可被标记为失败或保留待查，不出现误入账。

### 2.2 技术目标

- 复用现有 `TopUp` 订单、`quota` 入账和首充奖励逻辑。
- 接入方式与 Airwallex 这类“后端创建支付、前端跳转 URL、Webhook 入账”的支付网关保持一致。
- 所有 JSON 编解码遵守项目规则，使用 `common.Marshal`、`common.Unmarshal` 等包装函数。
- Webhook 必须基于原始请求体验签，不能使用重新序列化后的 JSON。

## 3. 非目标

- 本期不接入 Payssion 订阅、退款、打款、Mandate 自动扣款。
- 本期不实现 Payssion 支付方式动态同步管理后台；支付方式先由管理员手动配置。
- 本期不实现 Payssion 订单主动轮询任务。可预留查询接口，二期再做定时补偿。
- 本期不改造现有 Epay、Stripe、Airwallex 的业务行为。

## 4. 用户流程

1. 用户进入充值页。
2. 前端调用 `GET /api/user/topup/info` 获取可用支付方式。
3. 用户选择某个 Payssion 支付方式，例如 `payssion:gcash_ph`。
4. 前端调用金额计算接口展示应付金额。
5. 用户确认支付，前端调用创建支付接口。
6. 后端创建本地 `TopUp` pending 订单，再调用 Payssion 创建支付。
7. 后端返回 Payssion 跳转 URL。
8. 前端打开 Payssion 支付页面。
9. Payssion 发送 Webhook 到 `POST /api/payssion/webhook`。
10. 后端验签、校验订单、校验金额和币种，成功后调用本地入账逻辑。
11. 用户回到充值记录页查看状态。

## 5. 接口设计

### 5.1 用户侧接口

#### 计算 Payssion 应付金额

`POST /api/user/payssion/amount`

请求：

```json
{
  "amount": 10,
  "payment_method": "gcash_ph"
}
```

响应：

```json
{
  "message": "success",
  "data": "10.00"
}
```

说明：

- `amount` 与现有充值页语义一致，受额度展示类型影响。
- `payment_method` 为 Payssion 支付方式代码，可选传入；本期金额计算不按支付方式差异定价。

#### 创建 Payssion 支付

`POST /api/user/payssion/pay`

请求：

```json
{
  "amount": 10,
  "payment_method": "gcash_ph"
}
```

响应：

```json
{
  "message": "success",
  "data": {
    "payment_url": "https://...",
    "order_id": "PAYSSION-1-1780000000000-abc123"
  }
}
```

失败响应沿用现有支付接口风格：

```json
{
  "message": "error",
  "data": "拉起支付失败"
}
```

### 5.2 Webhook 接口

`POST /api/payssion/webhook`

处理要求：

- 不需要用户鉴权。
- 读取原始 body。
- 读取 `Payssion-Signature` header。
- 使用 `PayssionWebhookSecret` 计算 `HMAC-SHA256(rawBody)`。
- 对动态 `notify_url` 场景，Payssion 文档说明签名 secret 使用 API Key；本期推荐固定 Webhook Endpoint，不使用动态 `notify_url`。
- 验签失败返回 `400`。
- 处理成功或无需处理的事件返回 `200`，避免重复重试。

支持事件：

| Payssion 事件 | 本地处理 |
| --- | --- |
| `payment.succeeded` | 校验状态、金额、币种后入账 |
| `payment.failed` | 将 pending 订单标记为 failed |

Webhook 字段解析策略：

- 优先从支付对象 `reference` 取本地 `trade_no`。
- 如果对象结构差异，兼容从 `data.object.reference`、`payment.reference`、`object.reference`、`metadata.trade_no` 提取。
- 支付状态优先读取 `status`，成功状态使用 `paid` 或文档明确的成功状态。
- 金额和币种必须与本地订单匹配。

## 6. 数据模型和配置

### 6.1 TopUp 常量

文件：`model/topup.go`

新增：

```go
const (
    PaymentMethodPayssion = "payssion"
)

const (
    PaymentProviderPayssion = "payssion"
)
```

订单字段复用现有 `TopUp`：

- `TradeNo`: 本地订单号，同时传给 Payssion `reference`
- `PaymentMethod`: 可存真实 Payssion method，例如 `gcash_ph`
- `PaymentProvider`: 固定为 `payssion`
- `Money`: 实际支付金额
- `Amount`: 本地充值金额
- `Status`: `pending/success/failed/expired`

### 6.2 配置项

新增文件：`setting/payment_payssion.go`

```go
var (
    PayssionEnabled       bool
    PayssionApiKey        string
    PayssionWebhookSecret string
    PayssionCurrency      string  = "USD"
    PayssionUnitPrice     float64 = 1.0
    PayssionMinTopUp      int     = 1
    PayssionPaymentMethods string
)
```

`PayssionPaymentMethods` 建议使用 JSON 数组：

```json
[
  {
    "name": "GCash",
    "type": "gcash_ph",
    "currency": "PHP",
    "icon": ""
  },
  {
    "name": "PromptPay",
    "type": "promptpay_th",
    "currency": "THB",
    "icon": ""
  }
]
```

本期若只支持统一币种，可先忽略单项 `currency`，全部使用 `PayssionCurrency`。

### 6.3 OptionMap

文件：`model/option.go`

新增初始化和更新分支：

- `PayssionEnabled`
- `PayssionApiKey`
- `PayssionWebhookSecret`
- `PayssionCurrency`
- `PayssionUnitPrice`
- `PayssionMinTopUp`
- `PayssionPaymentMethods`

敏感字段处理：

- API Key 和 Webhook Secret 在后台表单中允许留空表示不更新。
- 返回前端配置页时遵守现有敏感字段展示策略。

## 7. 后端开发任务

### 7.1 支付可用性

文件：`controller/payment_webhook_availability.go`

新增：

- `isPayssionTopUpEnabled()`
- `isPayssionWebhookConfigured()`
- `isPayssionWebhookEnabled()`

启用条件：

- 支付合规确认完成。
- `PayssionEnabled = true`。
- `PayssionApiKey` 非空。
- `PayssionWebhookSecret` 非空。
- 至少有一个可用 Payssion 支付方式。

### 7.2 充值信息暴露

文件：`controller/topup.go`

`GetTopUpInfo` 新增字段：

```json
{
  "enable_payssion_topup": true,
  "payssion_min_topup": 1
}
```

并向 `pay_methods` 追加 Payssion 支付方式：

```json
{
  "name": "GCash",
  "type": "payssion:gcash_ph",
  "color": "#2563EB",
  "min_topup": "1"
}
```

说明：

- 前端展示使用 `payssion:<method>`，避免与 Epay 现有 `payment_method` 命名冲突。
- 后端创建支付时拆出真实 Payssion `payment_method`。

### 7.3 创建支付

新增文件：`controller/topup_payssion.go`

核心函数：

- `RequestPayssionAmount(c *gin.Context)`
- `RequestPayssionPay(c *gin.Context)`
- `payssionRequest(...)`
- `extractPayssionRedirectURL(...)`

Payssion 创建请求：

```json
{
  "reference": "PAYSSION-1-1780000000000-abc123",
  "payment_method": "gcash_ph",
  "flow": "indirect",
  "terminal_type": "web",
  "currency": "USD",
  "amount": "10.00",
  "return_url": "https://example.com/console/topup?show_history=true",
  "metadata": {
    "user_id": "1",
    "trade_no": "PAYSSION-1-1780000000000-abc123"
  }
}
```

HTTP Header：

```text
Authorization: Bearer <PayssionApiKey>
Content-Type: application/json
```

建议：

- 若 Payssion 当前账号/API 支持幂等请求头，可使用本地 `tradeNo` 作为幂等键。
- 若不支持，则依赖本地唯一 `trade_no` 和创建失败状态处理。

创建顺序：

1. 校验 Payssion 已启用。
2. 校验用户请求金额不低于最小充值。
3. 校验支付方式在配置白名单内。
4. 计算 `payMoney`。
5. 创建本地 pending 订单。
6. 调用 Payssion 创建支付。
7. 成功返回 `payment_url`。
8. 如果 Payssion 创建失败，将本地订单置为 failed。

### 7.4 Webhook

新增文件：`controller/topup_payssion.go`

核心函数：

- `PayssionWebhook(c *gin.Context)`
- `verifyPayssionWebhook(body []byte, signature string, secret string) bool`
- `extractPayssionTradeNo(event payssionWebhookEvent) string`
- `extractPayssionPaymentStatus(event payssionWebhookEvent) string`
- `isPayssionSuccessfulEvent(eventType, status string) bool`
- `isPayssionFailedEvent(eventType, status string) bool`

处理原则：

- 验签失败立即 `400`。
- 未找到订单号返回 `200`，记录 warn。
- 非支持事件返回 `200`。
- 成功事件进入订单锁 `LockOrder(tradeNo)`。
- 调用 `model.RechargePayssion(tradeNo, c.ClientIP())`。
- 失败事件调用 `model.UpdatePendingTopUpStatus(tradeNo, model.PaymentProviderPayssion, common.TopUpStatusFailed)`。

### 7.5 入账逻辑

文件：`model/topup.go`

新增：

```go
func RechargePayssion(tradeNo string, callerIp string) error
```

实现要求：

- DB 事务内按 `trade_no` 查询并加锁。
- 校验 `PaymentProvider == PaymentProviderPayssion`。
- `success` 状态幂等返回 nil。
- 仅允许 `pending` 入账。
- 充值额度按现有非 Stripe 网关逻辑：`topUp.Amount * common.QuotaPerUnit`。
- 更新用户 quota。
- 更新订单 `CompleteTime` 和 `Status`。
- 事务外记录充值日志。
- 调用 `TryGrantFirstTopUpReward`。

### 7.6 路由

文件：`router/api-router.go`

新增：

```go
apiRouter.POST("/payssion/webhook", controller.PayssionWebhook)
```

用户鉴权路由内新增：

```go
selfRoute.POST("/payssion/amount", controller.RequestPayssionAmount)
selfRoute.POST("/payssion/pay", middleware.CriticalRateLimit(), controller.RequestPayssionPay)
```

## 8. 前端开发任务

### 8.1 钱包 API

文件：`web/default/src/features/wallet/api.ts`

新增：

- `calculatePayssionAmount`
- `requestPayssionPayment`

接口路径：

- `/api/user/payssion/amount`
- `/api/user/payssion/pay`

### 8.2 类型

文件：`web/default/src/features/wallet/types.ts`

新增：

- `PayssionPaymentRequest`
- `PayssionPaymentResponse`
- `TopupInfo.enable_payssion_topup`
- `TopupInfo.payssion_min_topup`

### 8.3 支付类型

文件：`web/default/src/features/wallet/constants.ts`

新增：

```ts
PAYSSION: 'payssion'
```

### 8.4 支付分发

文件：`web/default/src/features/wallet/lib/payment.ts`

新增：

- `isPayssionPayment(paymentType: string): boolean`

规则：

- `paymentType === 'payssion'`
- 或 `paymentType.startsWith('payssion:')`

文件：`web/default/src/features/wallet/hooks/use-payment.ts`

新增处理：

- Payssion 走 `requestPayssionPayment`。
- 如果 payment type 是 `payssion:gcash_ph`，传给后端的 `payment_method` 为 `gcash_ph`。
- 响应成功后打开 `payment_url`。

### 8.5 支付图标

文件：`web/default/src/features/wallet/lib/ui.tsx`

新增 Payssion 图标兜底展示。若后端配置 `icon`，优先使用后端 icon。

### 8.6 管理后台配置

建议新增文件：

- `web/default/src/features/system-settings/integrations/payssion-settings-section.tsx`

配置字段：

- Enabled
- API Key
- Webhook Secret
- Currency
- Unit Price
- Min Top-up
- Payment Methods JSON

集成位置：

- `web/default/src/features/system-settings/billing/section-registry.tsx`
- `web/default/src/features/system-settings/billing/index.tsx`
- `web/default/src/features/system-settings/types.ts`

## 9. i18n

新增前端翻译 key 后运行：

```bash
cd web/default
bun run i18n:sync
```

至少包含：

- `Payssion Gateway`
- `Configuration for Payssion payment integration`
- `Payssion API key`
- `Payssion webhook secret`
- `Payssion currency`
- `Payssion unit price`
- `Payssion minimum top-up`
- `Payssion payment methods`
- `Save Payssion settings`

项目支持语言：

- en
- zh
- fr
- ja
- ru
- vi

## 10. 测试计划

### 10.1 单元测试

新增或扩展：

- `controller/payment_webhook_availability_test.go`
- `controller/topup_payssion_test.go`
- `model/payment_method_guard_test.go`

覆盖：

- 未确认支付合规时 Payssion 不启用。
- API Key 缺失时不启用。
- Webhook Secret 缺失时不启用。
- 支付方式白名单校验。
- Webhook 签名正确时通过。
- Webhook 签名错误时拒绝。
- 成功事件提取 `trade_no`。
- 失败事件标记订单 failed。
- 重复成功 Webhook 幂等，不重复加 quota。
- provider mismatch 时拒绝入账。

### 10.2 集成测试

使用本地测试数据库，构造 pending `TopUp`：

1. 调用 Payssion 成功 Webhook。
2. 确认订单变为 success。
3. 确认用户 quota 增加。
4. 再次调用同一 Webhook。
5. 确认 quota 不重复增加。

### 10.3 前端验证

在 `web/default` 执行：

```bash
bun run build
```

验证项：

- 系统设置页能保存 Payssion 配置。
- 充值页能展示 Payssion 支付方式。
- 金额计算正常。
- 创建支付成功后打开 Payssion URL。
- 支付失败时 toast 展示错误。

### 10.4 回归测试

必须确认不影响：

- Epay 支付创建和回调。
- Stripe 支付创建和 Webhook。
- Airwallex 支付创建和 Webhook。
- 充值记录列表。
- 管理员补单。
- 首充奖励。

后端执行：

```bash
go test ./controller ./model
```

如时间允许，执行：

```bash
go test ./...
```

## 11. 交付拆分

### Milestone 1: 后端基础接入

交付内容：

- Payssion setting 和 option。
- Payssion enabled 判断。
- `GET /api/user/topup/info` 暴露 Payssion。
- 创建 Payssion 支付接口。
- Payssion Webhook 验签和事件处理。
- `RechargePayssion`。
- 后端单测。

验收标准：

- 能通过配置启用/禁用 Payssion。
- 能创建本地 pending 订单并返回支付 URL。
- 能通过模拟 Webhook 完成入账。
- 重复 Webhook 不重复入账。

### Milestone 2: 前端钱包接入

交付内容：

- 钱包页识别 Payssion 支付方式。
- 金额计算接口接入。
- 支付创建接口接入。
- 跳转 Payssion 支付 URL。
- 前端类型和 i18n。

验收标准：

- 用户可从充值页选择 Payssion 并跳转。
- 支付返回后可查看充值记录。
- 前端生产构建通过。

### Milestone 3: 管理后台配置

交付内容：

- Payssion 设置区。
- 敏感字段留空不更新。
- 支付方式 JSON 配置。
- 配置校验。

验收标准：

- Root 管理员可完成 Payssion 配置。
- 配置保存后无需重启即可影响充值页展示。
- 错误 JSON 有明确提示，不写入坏配置。

### Milestone 4: 沙箱联调和上线

交付内容：

- Payssion Dashboard Webhook Endpoint 配置。
- 沙箱或小额真实支付联调记录。
- 上线配置清单。
- 回滚说明。

验收标准：

- 至少一笔小额支付完整走通：创建支付、跳转、Webhook、入账、充值记录。
- Webhook 验签失败日志可观测。
- 支付失败事件不会入账。

## 12. 上线步骤

1. 合并代码并部署后端。
2. 部署前端静态资源。
3. Root 管理员确认支付合规条款。
4. 在系统设置中启用 Payssion。
5. 配置 API Key、Webhook Secret、币种、单价、最小充值金额和支付方式。
6. 在 Payssion Dashboard 配置固定 Webhook Endpoint：

```text
https://<your-domain>/api/payssion/webhook
```

7. 订阅事件：

- `payment.succeeded`
- `payment.failed`

8. 使用小额支付验证。
9. 验证充值记录和用户额度。
10. 观察日志 30 分钟。

## 13. 回滚方案

### 13.1 配置回滚

优先回滚方式：

- 将 `PayssionEnabled` 设置为 `false`。
- 或清空 `PayssionPaymentMethods`。

结果：

- 充值页不再展示 Payssion。
- 已创建的 pending 订单仍可等待 Webhook 或由管理员补单/处理。

### 13.2 代码回滚

如需代码回滚：

- 先禁用 Payssion。
- 再回滚部署。
- 保留数据库中的 `TopUp` 订单，不删除充值记录。

### 13.3 异常订单处理

- 已支付但未入账：管理员核对 Payssion 后台交易后使用现有补单能力。
- 未支付 pending：等待自然过期或后台标记失败。
- 重复 Webhook：入账逻辑幂等，不需要人工处理。

## 14. 风险和约束

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| Payssion 支付方式返回结构不完全一致 | 无法提取跳转 URL | 响应解析兼容多种 action 类型，日志记录完整响应 |
| Webhook 事件结构差异 | 无法提取订单号 | 兼容多路径提取 `reference` 和 `metadata.trade_no` |
| 用户依赖 return_url 判断成功 | 可能误入账 | 后端不提供 return_url 入账逻辑，只信任 Webhook |
| 金额或币种不匹配 | 资金风险 | Webhook 入账前强校验 `Money` 和 `Currency` |
| Payssion Webhook 延迟 | 用户短时间看不到到账 | 充值记录保持 pending，二期可加主动查询补偿 |

## 15. Definition of Done

- 后端 Payssion 创建支付、Webhook、入账功能完成。
- 管理后台可配置 Payssion。
- 前端充值页可选择 Payssion 并跳转支付。
- Webhook 验签、幂等、provider guard、金额币种校验均有测试覆盖。
- `go test ./controller ./model` 通过。
- `cd web/default && bun run build` 通过。
- 文档包含上线配置和回滚步骤。
- 未修改或移除项目受保护信息。

