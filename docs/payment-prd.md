# 支付业务 PRD — 完整流程分析与优化建议

## 一、业务全景

### 1.1 支持的支付渠道（8个）

| 渠道 | 定位 | 结算确认方式 | 货币 |
|------|------|-------------|------|
| Epay（易支付） | 国内聚合支付（微信/支付宝） | Webhook | CNY |
| Stripe | 国际信用卡 | Webhook | USD |
| Creem | 产品制支付 | Webhook | USD |
| Waffo | 全球支付（SDK） | Webhook | USD |
| Waffo Pancake | Checkout Session | Webhook | USD |
| Airwallex | 全球支付链接 | Webhook | USD |
| Payssion | 多方式聚合网关 | Webhook | USD |
| Antom（蚂蚁国际） | 支付宝全球收银台 | Webhook + 前端轮询 | CNY |

### 1.2 订单状态机

```
┌─────────┐    支付成功(webhook/inquiry)    ┌─────────┐
│ pending │ ──────────────────────────────> │ success │
└─────────┘                                 └─────────┘
     │
     │  支付失败(webhook/inquiry)           ┌─────────┐
     ├─────────────────────────────────────>│ failed  │
     │                                      └─────────┘
     │  超时5分钟(SyncOptions定时任务)       ┌─────────┐
     └─────────────────────────────────────>│ expired │
                                            └─────────┘
```

### 1.3 核心数据模型

```go
type TopUp struct {
    Id              int     // 主键
    UserId          int     // 用户ID
    Amount          int64   // 充值额度（quota单位）
    Money           float64 // 实际支付金额
    TradeNo         string  // 交易单号（唯一索引）
    PaymentMethod   string  // 支付方式（stripe/antom/payssion:alipay等）
    PaymentProvider string  // 支付提供商（epay/stripe/antom等）
    CreateTime      int64   // 创建时间（Unix秒）
    CompleteTime    int64   // 完成时间（Unix秒）
    Status          string  // 订单状态
}
```

---

## 二、完整支付流程

### 2.1 时序图（以 Antom 为例）

```
用户                    前端                      后端                     Antom
 │                      │                        │                        │
 │  1.选择金额+支付方式  │                        │                        │
 │─────────────────────>│                        │                        │
 │                      │  2.POST /antom/amount  │                        │
 │                      │───────────────────────>│                        │
 │                      │  3.返回实付金额         │                        │
 │                      │<───────────────────────│                        │
 │  4.确认支付           │                        │                        │
 │─────────────────────>│                        │                        │
 │                      │  5.POST /antom/pay     │                        │
 │                      │───────────────────────>│  6.创建订单(pending)    │
 │                      │                        │  7.调用SDK创建支付      │
 │                      │                        │───────────────────────>│
 │                      │                        │  8.返回payment_url      │
 │                      │                        │<───────────────────────│
 │                      │  9.返回url+order_id    │                        │
 │                      │<───────────────────────│                        │
 │  10.跳转支付页面      │                        │                        │
 │<─────────────────────│                        │                        │
 │  11.完成支付          │                        │                        │
 │─────────────────────────────────────────────────────────────────────>│
 │                      │                        │  12.Webhook通知(异步)   │
 │                      │                        │<───────────────────────│
 │                      │                        │  13.验签+充值+返回SUCCESS│
 │                      │                        │───────────────────────>│
 │  14.返回前端          │                        │                        │
 │─────────────────────>│                        │                        │
 │                      │  15.轮询 /antom/inquiry │                        │
 │                      │───────────────────────>│  16.查询SDK状态         │
 │                      │                        │───────────────────────>│
 │                      │                        │  17.返回SUCCESS         │
 │                      │                        │<───────────────────────│
 │                      │  18.返回"paid"          │                        │
 │                      │<───────────────────────│                        │
 │  19.刷新页面/显示成功  │                        │                        │
 │<─────────────────────│                        │                        │
```

### 2.2 各阶段详细说明

#### 阶段一：支付信息加载

- 前端调用 `GET /api/user/topup/info`
- 后端 `GetTopUpInfo` 聚合所有已启用渠道的支付方式列表
- 返回：启用状态、支付方式数组、最低充值金额、预设金额、折扣配置
- 前端根据返回数据渲染可用的支付方式按钮

#### 阶段二：金额计算

- 用户选择/输入充值金额后，前端调用 `POST /api/user/{provider}/amount`
- 后端根据以下因素计算实付金额：
  - 基础单价（`UnitPrice` / `Price`）
  - 用户分组倍率（`TopupGroupRatio`）
  - 预设金额折扣（`AmountDiscount`）
  - 展示类型转换（Tokens → USD）
- 返回最终实付金额供用户确认

#### 阶段三：创建订单

- 前端调用 `POST /api/user/{provider}/pay`（受 `CriticalRateLimit` 中间件保护）
- 后端执行：
  1. 校验启用状态、最低金额、用户有效性
  2. 生成唯一交易号（`TradeNo`）
  3. 创建 `TopUp` 记录（status=pending）
  4. 调用支付渠道 SDK 创建支付会话
  5. 返回支付链接（`payment_url`）给前端

#### 阶段四：用户支付

- 前端 `window.open` 打开支付链接
- 用户在第三方支付页面完成付款
- 支付完成后用户被重定向回 `/console/topup?show_history=true`

#### 阶段五：支付结果确认

**路径A — Webhook（主路径）：**
1. 支付渠道异步回调 `POST /api/{provider}/webhook`
2. 后端验签（各渠道签名算法不同）
3. 获取订单锁（`LockOrder` — Redis分布式锁/本地互斥锁）
4. 调用 `Recharge{Provider}` 在事务中完成充值：
   - `FOR UPDATE` 行级锁
   - 幂等校验（已成功则跳过）
   - 更新订单状态为 success
   - 原子增加用户 quota
5. 记录充值日志
6. 触发首充奖励 / 推广佣金

**路径B — 前端轮询（Antom 补偿路径）：**
1. 前端每3秒调用 `GET /api/user/antom/inquiry?trade_no=xxx`
2. 后端调用 Antom SDK 查询支付状态
3. 如果 SUCCESS → 执行充值逻辑
4. 最多轮询30次（90秒），超时停止

#### 阶段六：订单过期

- `SyncOptions` 定时循环中调用 `ExpirePendingTopUps(5)`
- 将 `create_time` 超过5分钟且仍为 pending 的订单标记为 expired
- 仅写系统日志，不通知用户

---

## 三、并发控制与幂等性

### 3.1 订单锁机制

```
Redis 模式：SETNX order_lock:{tradeNo}，TTL=30s，重试间隔50ms，最大等待10s
本地模式：sync.Map 存储引用计数互斥锁，按 tradeNo 粒度加锁
```

### 3.2 幂等保证

- 所有 `Recharge*` 函数在事务内先检查 `status == pending`
- 已经是 `success` 的订单直接返回 nil（不报错、不重复充值）
- `TradeNo` 字段有唯一索引，防止重复创建

---

## 四、发现的问题

### P0 — 严重问题

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| 1 | **合规声明被硬编码跳过** | `IsPaymentComplianceConfirmed()` 直接返回 `true`，绕过了合规审查机制。生产环境可能面临法律/合规风险 | `setting/operation_setting/payment_setting.go`, `controller/payment_webhook_availability.go` |
| 2 | **前端轮询无清理机制** | `setInterval` 在组件卸载时不会被清除。用户在轮询期间离开页面再返回，会产生多个并行轮询实例，造成接口压力和潜在重复触发 | `web/default/src/features/wallet/hooks/use-payment.ts:205-228` |
| 3 | **Webhook 不可达时无后端补偿** | 仅 Antom 有前端轮询作为补偿，其他7个渠道完全依赖 Webhook。Webhook 因网络问题丢失时，订单永远停留在 pending 直到过期，用户已付款但未到账 | 全局架构问题 |
| 4 | **订单过期不校验支付状态** | `ExpirePendingTopUps(5)` 将超时订单标记为 expired，但不检查该订单在支付渠道侧是否已实际支付。用户支付慢（如银行转账）时，5分钟后订单过期但钱已扣 | `model/topup.go:ExpirePendingTopUps` |

### P1 — 重要问题

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| 5 | **Antom 金额计算精度风险** | `getAntomPayMoney` 使用 `float64` 运算而非 `decimal`，与 `getPayMoney`（使用 decimal）不一致。浮点精度问题可能导致实际收款与预期不符 | `controller/topup_antom.go:83-100` |
| 6 | **Inquiry 接口无频率限制** | `/antom/inquiry` 没有 rate limit middleware，前端每3秒轮询一次，恶意用户可高频调用对 Antom API 造成压力 | `router/api-router.go` |
| 7 | **订单号可预测** | `ANTOM-{userId}-{timestamp}-{6位随机}` 格式中 userId 和 timestamp 可预测，6位随机字符串熵值较低（约 36^6 ≈ 21亿），存在碰撞或枚举风险 | `controller/topup_antom.go:169` |
| 8 | **Recharge 函数大量重复** | `RechargeAntom`、`RechargeAirwallex`、`RechargePayssion`、`RechargeWaffoPancake` 逻辑几乎完全相同（仅 PaymentProvider 校验不同），维护成本高且容易遗漏修改 | `model/topup.go:549-800` |
| 9 | **订单过期依赖 SyncOptions 频率** | 过期逻辑在 `SyncOptions` 循环中执行，实际过期时间 = 5分钟 + SyncFrequency。如果 SyncFrequency 设置为60秒，实际过期时间可能是5~6分钟，不精确 | `model/option.go` |

### P2 — 体验问题

| # | 问题 | 影响 | 位置 |
|---|------|------|------|
| 10 | **轮询期间无 UI 反馈** | 用户支付完成返回前端后，在轮询确认期间（最长90秒）没有明确的等待状态提示 | 前端 `use-payment.ts` |
| 11 | **支付失败无重试引导** | 支付失败后仅 toast 提示，没有引导用户重新发起支付或联系客服的入口 | 前端 `use-payment.ts` |
| 12 | **多渠道最低充值金额不统一** | 每个渠道有独立的 `MinTopUp`，用户切换支付方式时可能困惑为什么刚才能充的金额现在不行 | `controller/topup.go:GetTopUpInfo` |
| 13 | **订单历史无状态筛选** | 用户只能按订单号搜索，无法按状态（pending/success/expired）筛选 | `model/topup.go:SearchUserTopUps` |
| 14 | **过期订单无用户通知** | 订单过期后仅写系统日志，用户不会收到任何通知 | `model/topup.go:ExpirePendingTopUps` |

---

## 五、优化建议

### 5.1 架构层优化

#### 建议1：引入后端主动查询补偿机制

```
当前：Webhook 是唯一确认渠道（Antom 除外）
目标：Webhook + 后端定时主动查询 双保险

方案：
- 对所有 pending 订单，在创建后 1min、3min、5min 各主动查询一次支付渠道状态
- 只有主动查询也确认未支付时，才标记为 expired
- 解决 Webhook 丢失导致的"付了钱没到账"问题
```

#### 建议2：统一 Recharge 函数

```go
// 将 6 个几乎相同的 Recharge 函数合并为一个
func RechargeByProvider(tradeNo string, provider string, callerIp string) error {
    // 统一逻辑：查订单 → 校验provider → 校验状态 → 计算额度 → 更新余额 → 记录日志 → 触发奖励
}
```

#### 建议3：前端轮询改为可控机制

```typescript
// 方案A：useEffect + cleanup
useEffect(() => {
  if (!orderId) return
  const interval = setInterval(poll, 3000)
  return () => clearInterval(interval)  // 组件卸载时清理
}, [orderId])

// 方案B（远期）：WebSocket/SSE 推送订单状态变更
```

### 5.2 安全层优化

#### 建议4：恢复合规声明机制

- 将硬编码的 `return true` 改回正常逻辑
- 开发环境通过环境变量控制（如 `SKIP_COMPLIANCE=true`），不修改业务代码

#### 建议5：Inquiry 接口加 Rate Limit

```go
selfRoute.GET("/antom/inquiry", middleware.RateLimit(10, 60), controller.RequestAntomInquiry)
// 每用户每分钟最多10次查询
```

#### 建议6：增强订单号随机性

```go
// 当前：ANTOM-{userId}-{timestamp}-{6位随机}
// 建议：ANTOM-{timestamp}-{16位随机}
tradeNo := fmt.Sprintf("ANTOM-%d-%s", time.Now().UnixMilli(), randstr.String(16))
```

### 5.3 体验层优化

#### 建议7：支付等待状态 UI

```
支付完成返回后 → 显示"正在确认支付结果..."动画 + 进度条
轮询成功     → 显示成功动画 + 余额变化数字
轮询超时     → 显示"支付确认中，请稍后刷新查看" + 手动刷新按钮 + 客服入口
```

#### 建议8：订单过期前预警

- 订单创建4分钟后仍为 pending，前端显示倒计时提醒
- 过期后在订单历史中明确标注"已超时关闭"，并提供"重新充值"按钮

#### 建议9：统一最低充值金额展示

- 在支付方式选择时，灰显不满足最低金额的渠道
- Tooltip 提示"该方式最低充值 X 元"
- 或在用户输入金额后，自动过滤不可用的支付方式

### 5.4 运营层优化

#### 建议10：订单对账机制

- 每日定时任务：拉取各渠道的交易记录，与本地订单交叉比对
- 发现"渠道已支付但本地未到账"的订单，自动补单或告警管理员
- 生成对账报告供财务审核

#### 建议11：支付漏斗数据埋点

```
选择金额 → 选择支付方式 → 发起支付 → 跳转支付页 → 支付完成 → 到账确认
   100%       85%           70%         65%          45%         44%
```

每一步记录转化率，定位流失环节，指导产品优化方向。

---

## 六、优先级排序与实施计划

| 优先级 | 事项 | 预估工作量 | 影响面 |
|--------|------|-----------|--------|
| **P0-紧急** | 修复前端轮询内存泄漏（useEffect cleanup） | 0.5h | 客户端性能 |
| **P0-紧急** | 订单过期前主动查询支付状态（防止误过期） | 4h | 用户资金安全 |
| **P1-重要** | Antom 金额计算改用 decimal | 0.5h | 金额准确性 |
| **P1-重要** | Inquiry 接口加 Rate Limit | 0.5h | 系统安全 |
| **P1-重要** | 统一 Recharge 函数 | 3h | 代码可维护性 |
| **P1-重要** | 合规声明改为环境变量控制 | 1h | 合规风险 |
| **P2-改善** | 支付等待状态 UI | 2h | 用户体验 |
| **P2-改善** | 订单历史增加状态筛选 | 2h | 用户体验 |
| **P2-改善** | 后端统一主动查询补偿机制（全渠道） | 8h | 系统可靠性 |
| **P3-远期** | WebSocket 推送订单状态 | 8h | 架构升级 |
| **P3-远期** | 每日对账任务 | 8h | 运营保障 |
| **P3-远期** | 支付漏斗埋点 | 4h | 数据驱动 |

---

## 七、关键文件索引

| 分类 | 文件路径 |
|------|----------|
| 订单模型 | `model/topup.go` |
| 状态常量 | `common/constants.go` |
| 主控制器 | `controller/topup.go` |
| Antom 控制器 | `controller/topup_antom.go` |
| Stripe 控制器 | `controller/topup_stripe.go` |
| Airwallex 控制器 | `controller/topup_airwallex.go` |
| Payssion 控制器 | `controller/topup_payssion.go` |
| Webhook 启用检查 | `controller/payment_webhook_availability.go` |
| 合规控制 | `controller/payment_compliance.go` |
| Antom 配置 | `setting/payment_antom.go` |
| 路由注册 | `router/api-router.go` |
| 前端 API 层 | `web/default/src/features/wallet/api.ts` |
| 前端支付 Hook | `web/default/src/features/wallet/hooks/use-payment.ts` |
| 前端充值表单 | `web/default/src/features/wallet/components/recharge-form-card.tsx` |
| 前端类型定义 | `web/default/src/features/wallet/types.ts` |
