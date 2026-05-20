# Promotion Code 首充送 Quota 策略 — 产品方案

## 1. 背景与目标

### 现状
当前 Promotion Links 系统支持一种策略：**注册即送 quota**。用户通过推广链接注册后，系统立即发放 `reward_quota` 到用户账户。

### 需求
新增一种策略：**首充送 quota**。用户通过推广链接注册后，不立即发放奖励，而是在用户完成首次充值时，额外赠送指定 quota。

### 目标
- 提高用户付费转化率（注册 → 付费）
- 给运营更灵活的推广策略组合能力
- 两种策略可独立配置，也可叠加使用

---

## 2. 策略对比

| 维度 | 注册送 Quota（现有） | 首充送 Quota（新增） |
|------|---------------------|---------------------|
| 触发时机 | 用户注册成功 | 用户首次充值成功 |
| 发放条件 | 无额外条件 | 必须完成一笔充值 |
| 运营目的 | 降低注册门槛，拉新 | 促进付费转化 |
| 风险 | 薅羊毛（批量注册） | 风险较低（需真实付费） |

---

## 3. 功能设计

### 3.1 PromotionLink 新增字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `first_topup_reward_quota` | int | 首充奖励 quota 数量，0 表示不启用此策略 |
| `first_topup_min_amount` | int | 首充最低金额要求（可选），0 表示不限制 |

### 3.2 用户侧新增字段

User 表新增：

| 字段 | 类型 | 说明 |
|------|------|------|
| `first_topup_rewarded` | bool | 是否已领取首充奖励，防止重复发放 |

### 3.3 业务流程

```
用户通过推广链接注册
    │
    ├── reward_quota > 0 → 立即发放注册奖励（现有逻辑不变）
    │
    └── first_topup_reward_quota > 0 → 标记用户有待领取的首充奖励
                │
                ▼
        用户完成首次充值
                │
                ├── 检查 user.first_topup_rewarded == false
                ├── 检查 user.promotion_code 对应的 link 仍然有效
                ├── 检查充值金额 >= first_topup_min_amount（如有设置）
                │
                ▼
        发放 first_topup_reward_quota 到用户账户
        设置 user.first_topup_rewarded = true
        记录日志
```

### 3.4 触发点

首充奖励的发放需要在所有充值成功的回调中统一处理：

- Epay 回调 (`EpayNotify`)
- Stripe 回调 (`topup_stripe.go`)
- Creem 回调 (`topup_creem.go`)
- Waffo 回调 (`topup_waffo.go`)
- Waffo Pancake 回调 (`topup_waffo_pancake.go`)
- 管理员补单 (`AdminCompleteTopUp`)

建议抽取统一方法：`TryGrantFirstTopUpReward(userId int, topUpAmount int64)` 在充值成功后调用。

### 3.5 边界条件

1. **两种策略叠加**：`reward_quota` 和 `first_topup_reward_quota` 可同时配置，注册时发注册奖励，首充时发首充奖励
2. **仅首充送**：`reward_quota = 0`，`first_topup_reward_quota > 0`，注册不送，首充才送
3. **推广链接过期/禁用**：首充奖励发放时需检查链接是否仍然有效（enabled 且未过期）。如果链接已失效，不发放
4. **重复防护**：`first_topup_rewarded` 字段 + 数据库事务保证幂等
5. **最低充值金额**：`first_topup_min_amount` 为 0 时不限制，大于 0 时充值金额必须 >= 该值才触发奖励
6. **管理员补单**：同样触发首充奖励逻辑

---

## 4. 数据模型变更

### 4.1 promotion_links 表

```sql
ALTER TABLE promotion_links ADD COLUMN first_topup_reward_quota INT NOT NULL DEFAULT 0;
ALTER TABLE promotion_links ADD COLUMN first_topup_min_amount INT NOT NULL DEFAULT 0;
```

### 4.2 users 表

```sql
ALTER TABLE users ADD COLUMN first_topup_rewarded TINYINT(1) NOT NULL DEFAULT 0;
```

> 注：三种数据库（SQLite/MySQL/PostgreSQL）均使用 GORM 迁移，无需手写 SQL。

---

## 5. API 变更

### 5.1 管理端

**创建/更新 Promotion Link** — 请求体新增字段：

```json
{
  "code": "SUMMER2026",
  "name": "夏季推广",
  "channel_tag": "twitter",
  "reward_quota": 5000000,
  "first_topup_reward_quota": 10000000,
  "first_topup_min_amount": 1,
  "max_registrations": 1000,
  "expires_at": 0,
  "enabled": true
}
```

**获取 Promotion Link** — 响应新增字段：

```json
{
  "first_topup_reward_quota": 10000000,
  "first_topup_min_amount": 1,
  "first_topup_count": 42
}
```

### 5.2 新增统计字段（可选）

`PromotionLink` 新增 `first_topup_count` 字段，记录已发放首充奖励的人数，方便运营查看转化数据。

---

## 6. 前端变更

### 6.1 Promotion 管理表单

在现有的 PromotionDrawer 中新增：

- **首充奖励 Quota** 输入框（`first_topup_reward_quota`）
- **首充最低金额** 输入框（`first_topup_min_amount`），带提示"0 表示不限制"
- 表格列表中展示首充奖励配置和已发放数

### 6.2 用户侧

- 用户注册后，如果有待领取的首充奖励，可在充值页面展示提示："首充即送 X quota"
- 充值成功后，toast 提示"首充奖励已发放"

---

## 7. 日志与审计

首充奖励发放时记录：

```
通过推广链接首充赠送 {quota_amount}（推广码: {code}，充值金额: {topup_amount}）
```

使用现有的 `RecordLog` + `LogTypeSystem` 机制。

---

## 8. 实现计划

| 阶段 | 内容 | 涉及文件 |
|------|------|----------|
| 1 | Model 层：新增字段、迁移、验证 | `model/promotion.go`, `model/user.go`, `model/main.go` |
| 2 | Service 层：`TryGrantFirstTopUpReward` 方法 | 新建 `service/promotion_reward.go` 或放入 `model/promotion.go` |
| 3 | 充值回调集成：各支付回调中调用奖励方法 | `model/topup.go`, `controller/topup*.go` |
| 4 | Controller/API：更新 CRUD 接口 | `controller/promotion.go` |
| 5 | 前端：表单、列表、用户提示 | `web/default/src/features/promotions/` |
| 6 | i18n：中英文翻译 | `i18n/`, `web/default/src/i18n/locales/` |
| 7 | 测试与验证 | 手动测试各支付渠道 + 边界条件 |

---

## 9. 风险与注意事项

1. **并发安全**：首充奖励发放必须在事务中完成，配合 `first_topup_rewarded` 字段做幂等检查，避免并发回调重复发放
2. **向后兼容**：新字段默认值为 0，现有推广链接行为不变
3. **链接失效处理**：需明确产品决策 — 如果用户注册时链接有效，但首充时链接已过期/禁用，是否仍发放奖励？（建议：不发放，以链接当前状态为准）
4. **退款场景**：如果用户充值后退款，首充奖励是否回收？（建议 V1 不处理，后续迭代考虑）
