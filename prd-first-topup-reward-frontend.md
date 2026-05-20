# 首充送 Quota — 前端对接 PRD

## 1. 功能概述

在现有推广链接管理中新增"首充送 Quota"策略。管理员可为推广链接配置首充奖励，用户通过该链接注册后，首次充值时自动获得额外 quota 奖励。

奖励发放由后端自动完成，前端无需调用额外接口触发。

---

## 2. 后端 API 变更

### 2.1 PromotionLink 新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `first_topup_reward_quota` | number | 0 | 首充奖励 quota，0 表示不启用 |
| `first_topup_min_amount` | number | 0 | 首充最低金额要求，0 表示不限制 |
| `first_topup_count` | number | 0 | 已发放首充奖励人数（只读统计） |

### 2.2 User 新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `first_topup_rewarded` | boolean | false | 是否已领取首充奖励 |

### 2.3 接口变更

接口地址和方法不变，仅请求/响应体新增字段。

#### 创建推广链接 `POST /api/promotion`

请求体新增：

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

#### 更新推广链接 `PUT /api/promotion/:id`

请求体同创建，新增 `first_topup_reward_quota` 和 `first_topup_min_amount`。

#### 获取推广链接列表 / 详情

响应中每个 PromotionLink 对象新增：

```json
{
  "first_topup_reward_quota": 10000000,
  "first_topup_min_amount": 1,
  "first_topup_count": 42
}
```

---

## 3. 前端改动范围

### 3.1 TypeScript 类型更新

**文件：** `web/default/src/features/promotions/types.ts`

```typescript
// promotionLinkSchema 新增字段
export const promotionLinkSchema = z.object({
  // ...existing fields...
  first_topup_reward_quota: z.number().default(0),
  first_topup_min_amount: z.number().default(0),
  first_topup_count: z.number().default(0),
})

// PromotionFormData 新增字段
export interface PromotionFormData {
  // ...existing fields...
  first_topup_reward_quota: number
  first_topup_min_amount: number
}
```

> 注：加 `.default(0)` 确保旧数据兼容。

---

### 3.2 管理端 — 推广链接表单 (PromotionDrawer)

**文件：** `web/default/src/features/promotions/index.tsx`

在现有 `reward_quota` 输入框下方新增两个字段：

#### 首充奖励 Quota 输入框

| 属性 | 值 |
|------|------|
| 字段名 | `first_topup_reward_quota` |
| 标签 | "First Topup Reward Quota" |
| 类型 | 数字输入框 |
| 默认值 | `0` |
| placeholder | "0" |
| 帮助文案 | "0 means first topup reward is disabled" |
| 验证 | >= 0 |

#### 首充最低金额输入框

| 属性 | 值 |
|------|------|
| 字段名 | `first_topup_min_amount` |
| 标签 | "First Topup Min Amount" |
| 类型 | 数字输入框 |
| 默认值 | `0` |
| placeholder | "0" |
| 帮助文案 | "0 means no minimum amount required" |
| 验证 | >= 0 |

#### 表单默认值

```typescript
const defaultValues: PromotionFormData = {
  code: '',
  name: '',
  channel_tag: '',
  reward_quota: 5000000,
  first_topup_reward_quota: 0,  // 默认不启用
  first_topup_min_amount: 0,    // 默认不限制
  max_registrations: 0,
  expires_at: 0,
  enabled: true,
}
```

---

### 3.3 管理端 — 推广链接列表

在表格中新增列（建议放在 Registrations 列之后）：

| 列标题 | 字段 | 渲染逻辑 |
|--------|------|----------|
| First Topup Reward | `first_topup_reward_quota` | quota 格式化显示，0 时显示 "—" |
| First Topup Count | `first_topup_count` | 数字直接显示 |

---

### 3.4 用户端 — 充值页面提示实现）

**条件：** 当前用户满足以下全部条件时展示横幅提示：

- `user.promotion_code` 不为空
- `user.first_topup_rewarded` 为 false

**提示文案：** "首充即送额外额度！" / "Get bonus quota on your first top-up!"

> 此功能为可选增强。后端已自动处理奖励发放，充值成功后用户会在日志中看到奖励记录。V1 可不实现此提示。

---

## 4. 策略组合说明

供管理员理解配置效果：

| reward_quota | first_topup_reward_quota | 效果 |
|---|---|---|
| > 0 | 0 | 仅注册送（现有行为） |
| 0 | > 0 | 仅首充送（注册不送） |
| > 0 | > 0 | 注册送 + 首充送叠加 |

当两者都为 0 时，后端会自动将 `reward_quota` 设为默认值（5,000,000）。

---

## 5. i18n 新增 Key

**文件：** `web/default/src/i18n/locales/en.json`

```json
{
  "First Topup Reward Quota": "First Topup Reward Quota",
  "First Topup Min Amount": "First Topup Min Amount",
  "First Topup Count": "First Topup Count",
  "0 means first topup reward is disabled": "0 means first topup reward is disabled",
  "0 means no minimum amount required": "0 means no minimum amount required"
}
```

**文件：** `web/default/src/i18n/locales/zh.json`

```json
{
  "First Topup Reward Quota": "首充奖励额度",
  "First Topup Min Amount": "首充最低金额",
  "First Topup Count": "首充发放数",
  "0 means first topup reward is disabled": "0 表示不启用首充奖励",
  "0 means no minimum amount required": "0 表示不限制充值金额"
}
```

---

## 6. 注意事项

1. **`first_topup_count` 为只读字段** — 表单中不可编辑，仅在列表中展示
* — 新字段默认值为 0，现有推广链接行为不变。Zod schema 使用 `.default(0)` 处理旧数据
4. **quota 显示格式** — 与现有 `reward_quota` 保持一致的格式化方式
5. **首充金额单位** — `first_topup_min_amount` 的单位与充值订单的 `amount` 字段一致（美元整数）
