# 推广功能 Stage 1 开发计划

## 目标

在现有邀请注册能力基础上，新增一套面向运营投放的推广链接功能。用户通过推广链接进入并完成注册后，系统自动赠送 10 块等值额度，同时记录渠道标签，便于后续按渠道统计注册、赠送额度、充值和消耗效果。

Stage 1 聚焦最小可用版本：

- 管理员可以创建、启用、停用推广链接。
- 推广链接支持自定义 code 和渠道标签。
- 前端识别推广链接参数并在注册时提交。
- 后端完成推广码校验、注册送额度、用户归因和日志记录。
- 管理端可以查看基础推广数据。

## 当前项目基础

项目已有部分可复用能力：

- 前端 `web/default/src/routes/__root.tsx` 已读取 URL 参数 `aff` 并保存到 localStorage。
- 注册页已尝试提交本地保存的邀请码。
- 后端 `model.User` 已有 `aff_code`、`inviter_id`、`aff_count`、`aff_quota`、`aff_history_quota`。
- 后端注册流程已有新用户赠送额度和邀请奖励逻辑。
- 系统设置已有 `QuotaForNewUser`、`QuotaForInviter`、`QuotaForInvitee`、`QuotaPerUnit`。

需要注意：

- 当前前端注册 payload 使用 `aff`，后端用户字段是 `aff_code`，Stage 1 需要做兼容。
- 推广渠道不是普通用户邀请，建议新增独立 promotion 模块，不要把运营推广强行塞进用户邀请字段。
- 额度统一使用项目现有 quota 体系。10 块对应 `10 * common.QuotaPerUnit`。

## 产品范围

### 包含

- 推广链接管理。
- 渠道标签。
- 注册来源归因。
- 注册赠送 10 块额度。
- 推广注册明细。
- 管理端基础列表和统计。

### 暂不包含

- 分佣结算。
- 多级推广。
- 复杂 ROI 看板。
- A/B 实验。
- 设备指纹。
- 点击实时埋点的复杂漏斗分析。
- 推广链接落地页编辑器。

## 数据库设计

### promotion_links

推广链接主表。

```text
id                  int primary key
code                varchar(64) unique not null
name                varchar(100) not null
channel_tag         varchar(64) not null
reward_quota        int not null default 0
enabled             bool not null default true
clicks              int not null default 0
registrations       int not null default 0
max_registrations   int not null default 0
expires_at          bigint not null default 0
created_by          int not null default 0
created_at          bigint
updated_at          bigint
deleted_at          soft delete
```

字段说明：

- `code`：推广码，例如 `douyin001`。
- `channel_tag`：渠道标签，例如 `douyin`、`wechat_group`、`kol_a`。
- `reward_quota`：注册赠送额度，默认使用 `10 * common.QuotaPerUnit`。
- `max_registrations = 0` 表示不限制注册数。
- `expires_at = 0` 表示不过期。

### promotion_registrations

推广注册归因明细表。

```text
id                  int primary key
promotion_link_id   int not null index
code                varchar(64) not null index
channel_tag         varchar(64) not null index
user_id             int not null unique index
username            varchar(64) not null
reward_quota        int not null default 0
ip                  varchar(64)
user_agent          varchar(255)
created_at          bigint
```

字段说明：

- `user_id` 建议唯一，确保一个用户只归因一次。
- `code` 和 `channel_tag` 冗余保存，避免推广链接后续改名影响历史报表。

### users 扩展字段

建议在 `users` 表增加：

```text
promotion_code          varchar(64) index
promotion_channel_tag   varchar(64) index
```

用途：

- 用户列表直接筛选来源。
- 后续充值、消耗、留存分析可按用户表字段聚合。

## 后端计划

### 1. 新增模型

新增文件：

- `model/promotion.go`

核心结构：

- `PromotionLink`
- `PromotionRegistration`

核心方法：

- `CreatePromotionLink(link *PromotionLink) error`
- `UpdatePromotionLink(link *PromotionLink) error`
- `GetPromotionLinkByCode(code string) (*PromotionLink, error)`
- `GetPromotionLinkByID(id int) (*PromotionLink, error)`
- `GetPromotionLinks(pageInfo *common.PageInfo, keyword string, channelTag string) (...)`
- `RecordPromotionRegistration(...) error`
- `IncreasePromotionClicks(code string) error`
- `IncreasePromotionRegistrations(id int) error`

数据库要求：

- 使用 GORM API，避免 raw SQL。
- 迁移必须兼容 SQLite、MySQL、PostgreSQL。
- 布尔字段使用 GORM 类型，避免写死数据库布尔字面量。

### 2. AutoMigrate 接入

修改：

- `model/main.go`

新增迁移对象：

- `&PromotionLink{}`
- `&PromotionRegistration{}`

同时为 `users` 增加 `promotion_code`、`promotion_channel_tag` 字段。优先通过 GORM AutoMigrate 完成，若需要手工补字段，必须按现有跨数据库迁移模式处理。

### 3. 注册流程接入推广码

修改：

- `controller/user.go`
- `model/user.go`

注册请求需要兼容以下字段：

```json
{
  "aff": "xxx",
  "aff_code": "xxx",
  "promo": "xxx",
  "promotion_code": "xxx"
}
```

处理顺序建议：

1. 读取推广码：优先 `promo` / `promotion_code`，其次 `aff` / `aff_code`。
2. 先尝试匹配 `promotion_links.code`。
3. 如果没有匹配，再按现有用户 `aff_code` 走邀请逻辑。
4. 如果推广链接匹配成功，则不触发普通邀请人的返佣。

注册赠送逻辑：

- 推广链接有效时，给新用户增加 `promotion.reward_quota`。
- 默认 10 块额度：`int(10 * common.QuotaPerUnit)`。
- 写入用户字段 `promotion_code`、`promotion_channel_tag`。
- 写入 `promotion_registrations`。
- `promotion_links.registrations += 1`。
- 写入系统日志：`通过推广链接注册赠送 xxx`。

有效性校验：

- `enabled = true`
- `expires_at = 0 or expires_at > now`
- `max_registrations = 0 or registrations < max_registrations`
- `reward_quota >= 0`

事务要求：

- 用户创建、额度发放、归因记录、注册数增加建议放在同一事务里。
- OAuth 注册也需要复用同一套 finalize 逻辑，避免只支持账号密码注册。

### 4. 新增控制器

新增文件：

- `controller/promotion.go`

接口：

```text
GET    /api/promotion
POST   /api/promotion
GET    /api/promotion/:id
PUT    /api/promotion/:id
DELETE /api/promotion/:id
POST   /api/promotion/:id/enable
POST   /api/promotion/:id/disable
GET    /api/promotion/:id/registrations
POST   /api/promotion/click
```

权限：

- 管理接口使用 `middleware.AdminAuth()`。
- 点击记录接口可匿名访问，但需要限流。

请求示例：

```json
{
  "code": "douyin001",
  "name": "抖音 5 月投放",
  "channel_tag": "douyin",
  "reward_quota": 5000000,
  "enabled": true,
  "max_registrations": 0,
  "expires_at": 0
}
```

### 5. 路由接入

修改：

- `router/api-router.go`

新增 admin 路由组：

```text
/api/promotion
```

点击接口可放在公开 API：

```text
POST /api/promotion/click
```

如果 Stage 1 不做点击统计，可以暂缓点击接口，只做注册统计。

### 6. 防刷策略

Stage 1 最低要求：

- 同一用户只能领取一次推广注册奖励。
- 推广注册链接过期或停用后不可领取。
- 注册奖励写日志，方便人工审计。
- 保留 IP 和 User-Agent。
- 对 `/api/user/register` 继续沿用现有 `CriticalRateLimit` 和 Turnstile。

后续增强：

- 同 IP 每日领取次数限制。
- 临时邮箱黑名单。
- 手机号或邮箱验证后才发奖励。
- 首次成功调用 API 后再发奖励。
- 首次充值后再发邀请人奖励。

## 前端计划

### 1. URL 参数采集

修改：

- `web/default/src/routes/__root.tsx`
- `web/default/src/features/auth/lib/storage.ts`

支持参数：

```text
promo
promotion_code
aff
```

保存策略：

- 若已有推广码，默认保留首次来源。
- 可增加过期时间，例如 30 天。
- 保存结构建议从纯字符串升级为 JSON：

```json
{
  "code": "douyin001",
  "source_param": "promo",
  "landing_path": "/register",
  "created_at": 1710000000
}
```

Stage 1 可以继续保存字符串，但推荐直接升级，便于后续分析。

### 2. 注册请求字段

修改：

- `web/default/src/features/auth/types.ts`
- `web/default/src/features/auth/api.ts`
- `web/default/src/features/auth/sign-up/components/sign-up-form.tsx`

注册请求增加：

```ts
promotion_code?: string
aff_code?: string
```

提交时建议同时兼容：

```ts
{
  promotion_code: getPromotionCode(),
  aff_code: getAffiliateCode()
}
```

如果仍使用一个本地字段，则后端必须兼容 `aff`。

### 3. 推广链接管理页面

新增目录建议：

```text
web/default/src/features/promotions/
  api.ts
  types.ts
  hooks/
  components/
  index.tsx
```

页面能力：

- 推广链接列表。
- 创建推广链接。
- 编辑推广链接。
- 启用/停用。
- 复制推广链接。
- 查看注册明细。

列表字段：

- 名称
- 推广码
- 渠道标签
- 注册奖励
- 点击数
- 注册数
- 状态
- 过期时间
- 创建时间
- 操作

表单字段：

- 名称
- 推广码
- 渠道标签
- 注册赠送额度
- 最大注册数
- 过期时间
- 是否启用

### 4. 管理端导航

修改位置需要根据现有 sidebar 配置确认，候选：

- `web/default/src/hooks/use-sidebar-data.ts`
- `web/default/src/hooks/use-top-nav-links.ts`
- `model/user.go` 中默认 sidebar 配置

新增菜单：

```text
管理 / 推广链接
```

只对 admin/root 可见。

### 5. i18n

使用项目 i18n 规范：

- 所有 UI 文案使用 `t('English key')`。
- 更新语言文件：
  - `web/default/src/i18n/locales/en.json`
  - `web/default/src/i18n/locales/zh.json`
  - `web/default/src/i18n/locales/fr.json`
  - `web/default/src/i18n/locales/ja.json`
  - `web/default/src/i18n/locales/ru.json`
  - `web/default/src/i18n/locales/vi.json`

建议完成页面后在 `web/default/` 运行：

```text
bun run i18n:sync
```

## API 草案

### 创建推广链接

```text
POST /api/promotion
```

```json
{
  "code": "douyin001",
  "name": "抖音 5 月投放",
  "channel_tag": "douyin",
  "reward_quota": 5000000,
  "enabled": true,
  "max_registrations": 0,
  "expires_at": 0
}
```

### 推广链接列表

```text
GET /api/promotion?p=0&page_size=10&keyword=douyin&channel_tag=douyin
```

返回：

```json
{
  "items": [],
  "total": 0
}
```

### 注册明细

```text
GET /api/promotion/:id/registrations?p=0&page_size=10
```

### 点击记录

```text
POST /api/promotion/click
```

```json
{
  "code": "douyin001"
}
```

Stage 1 可选。如果实现，需要匿名限流。

## 关键业务规则

### 归因优先级

建议：

1. `promotion_code`
2. `promo`
3. `aff_code`
4. `aff`

如果 code 同时命中推广链接和用户邀请码：

- 优先识别为推广链接。
- 为避免冲突，创建推广链接时需要校验不能与现有用户 `aff_code` 重复。

### 首次归因

建议首次归因优先：

- 用户第一次访问带推广码链接时保存。
- 后续访问其他推广码不覆盖。
- 注册成功后清理本地推广码。

### 奖励额度

默认 10 块：

```text
reward_quota = int(10 * common.QuotaPerUnit)
```

不要直接存金额，避免破坏现有 quota 体系。

### 合规开关

建议新增系统配置：

```text
PromotionEnabled
PromotionRewardEnabled
DefaultPromotionRewardQuota
```

Stage 1 可以先不做配置页，使用推广链接自己的 `enabled` 和 `reward_quota` 控制。

## 测试计划

### 后端单元测试

覆盖：

- 创建推广链接 code 唯一。
- 停用链接不能发奖励。
- 过期链接不能发奖励。
- 达到最大注册数不能发奖励。
- 注册成功后用户获得正确 quota。
- 注册成功后写入 `promotion_registrations`。
- 同一用户不会重复领取推广奖励。
- 无效推广码回退到普通邀请码逻辑。

### 后端集成测试

覆盖数据库：

- SQLite
- MySQL
- PostgreSQL

重点：

- AutoMigrate 成功。
- bool、时间戳、软删除、索引行为正常。

### 前端测试

覆盖：

- URL `?promo=xxx` 可以保存。
- URL `?aff=xxx` 兼容保存。
- 注册请求携带推广码。
- 管理端列表、创建、编辑、启停流程可用。
- 复制链接生成正确 URL。

## 验收标准

Stage 1 完成后，应满足：

- 管理员可以创建推广链接并设置渠道标签。
- 用户访问推广链接后注册，账号自动获得 10 块等值额度。
- 用户详情或数据库可看到 `promotion_code` 和 `promotion_channel_tag`。
- 推广链接列表能看到注册数增长。
- 推广注册明细能查到对应用户。
- 普通邀请码功能不受影响。
- SQLite、MySQL、PostgreSQL 迁移兼容。
- 前端构建通过。
- 后端编译通过。

## 建议开发顺序

1. 后端模型和迁移。
2. 后端推广链接 CRUD。
3. 注册流程接入推广归因和赠送。
4. 后端测试。
5. 前端 URL 参数保存和注册请求兼容。
6. 前端推广管理页面。
7. i18n 同步。
8. 联调和验收。

## 预估工作量

- 后端模型、接口、注册接入：1.5 - 2.5 天。
- 前端管理页和注册接入：1.5 - 2 天。
- 测试和联调：1 - 2 天。

合计：4 - 6.5 天。

