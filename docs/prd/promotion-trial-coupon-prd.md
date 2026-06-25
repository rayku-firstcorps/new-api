# 推广链接注册送体验券活动 PRD

## 1. 背景

现有后台已支持推广链接管理，包含推广码、渠道标签、注册赠送额度、首充奖励、点击数、注册数、注册明细等能力。

本期需要在已有推广链接基础上新增一种活动类型：用户通过特定渠道的推广链接注册后，先获得 5 元体验券待领取资格；完成邮箱绑定后，系统再发放体验券。该活动需要由后台配置，并且只对指定渠道生效。

## 2. 目标

1. 后台可为推广链接配置活动类型。
2. 支持“注册送 5 元体验券”活动。
3. 体验券活动只针对指定渠道标签生效。
4. 注册成功后创建体验券待领取资格，邮箱绑定后再发放体验券，并记录发放明细。
5. 不影响现有推广链接注册送额度、首充奖励、点击统计、注册统计逻辑。

## 3. 非目标

1. 本期不实现独立券账户、券包、券核销明细。
2. 本期不实现体验券有效期、指定模型可用、指定分组可用、抵扣顺序等复杂券规则。
3. 本期不调整现有推广返佣和 aff 逻辑。
4. 本期不重构现有注册流程。

## 4. 业务定义

### 4.1 活动类型

| 类型 | 标识 | 说明 |
| --- | --- | --- |
| 注册送额度 | `quota_reward` | 现有逻辑，注册后给用户增加配置额度 |
| 注册送体验券 | `trial_coupon` | 新增逻辑，注册后创建等值体验券待领取资格，邮箱绑定后发放 |
| 仅统计 | `none` | 只记录点击、注册和归因，不发放奖励 |

### 4.2 体验券口径

本期体验券按现有额度体系落地：

1. 后台以金额展示，例如 5 元。
2. 后端存储为 quota，换算规则沿用系统 `QuotaPerUnit`。
3. 用户注册后先获得待领取资格，不立即增加用户可用额度。
4. 用户完成邮箱绑定和验证码校验后，系统再发放体验券并增加用户可用额度。
5. 日志和注册明细中展示为“体验券”，用于运营区分。

如果后续需要券有效期、券余额、抵扣顺序、不可提现等能力，再扩展独立券表和券流水。

### 4.3 延迟发放口径

为降低注册机批量薅羊毛风险，`trial_coupon` 活动采用延迟发放：

1. 用户通过推广链接注册成功后，只记录推广归因和待领取资格。
2. 用户首次进入系统后，前端展示 Banner，引导用户绑定邮箱领取体验券。
3. 用户完成邮箱绑定、邮箱验证码校验，并且邮箱域名属于有效邮箱白名单后，后端原子发放体验券。
4. 已发放、推广链接失效、用户已领取过推广奖励时，不重复发放。
5. `quota_reward` 老活动默认保持注册即发放，除非后续单独增加延迟发放配置。

### 4.4 有效邮箱白名单

为降低临时邮箱、批量域名邮箱带来的薅羊毛风险，`trial_coupon` 领取体验券时需要校验邮箱域名。

默认有效邮箱域名：

| 邮箱服务 | 允许域名 |
| --- | --- |
| Gmail | `gmail.com`、`googlemail.com` |
| iCloud | `icloud.com`、`me.com`、`mac.com` |
| Outlook / Microsoft | `outlook.com`、`hotmail.com`、`live.com`、`msn.com` |
| 163 | `163.com`、`126.com`、`yeah.net` |
| QQ | `qq.com`、`foxmail.com` |
| Yahoo | `yahoo.com`、`yahoo.co.jp` |

规则：

1. 白名单只限制体验券领取，不限制普通注册、登录和邮箱绑定。
2. 邮箱域名匹配时统一转小写，并去除首尾空格。
3. 子域名默认不自动通过，例如 `mail.gmail.com` 不等于 `gmail.com`。
4. 不在白名单内的邮箱可以绑定账号，但不能领取推广体验券。
5. 白名单建议做成后台配置，默认使用上表；管理员可追加或移除域名。
6. 后端领取接口必须做最终校验，前端提示只能作为用户体验优化。

## 5. 用户故事

### 5.1 管理员创建体验券推广活动

作为管理员，我希望创建一个指定渠道的推广链接，并设置活动类型为“注册送体验券”，这样用户通过该渠道链接注册后可以获得 5 元体验券待领取资格，并在绑定邮箱后领取体验额度。

### 5.2 用户通过推广链接注册

作为新用户，我通过带有推广码的注册链接完成注册后，可以先进入系统使用账号；系统在页面顶部提示我绑定邮箱，完成邮箱绑定后自动给我的账户增加 5 元体验额度。

### 5.3 运营查看活动效果

作为运营人员，我希望在后台看到该推广链接的点击数、注册数、体验券发放人数和注册明细，以评估渠道效果。

## 6. 业务规则

1. 推广链接必须启用、未过期、未达到最大注册数，才可以创建奖励资格或触发奖励。
2. 活动类型为 `trial_coupon` 时，注册奖励金额默认 5 元。
3. 后台可修改体验券金额，金额不能小于 0。
4. 活动只对推广链接配置的 `channel_tag` 生效。
5. 每个用户只能记录一次推广注册奖励，沿用现有 `PromotionRegistration.UserId` 唯一约束。
6. 用户注册时同时携带 `promotion_code` 和 `aff` 时，沿用现有 promotion 优先逻辑。
7. 活动类型为 `none` 时，不增加用户额度，但仍记录推广归因和注册统计。
8. 活动类型为 `trial_coupon` 时，首充奖励逻辑仍可继续生效，互不冲突。
9. 活动类型为 `trial_coupon` 时，注册成功只生成 `pending_email` 待领取状态，不立即发放额度。
10. 用户完成邮箱绑定、验证码校验，且邮箱域名属于有效邮箱白名单后，系统将待领取状态更新为 `granted`，并发放体验券额度。
11. 如果用户已绑定邮箱，注册后首次进入系统仍需要触发一次领取校验；校验通过后可自动发放，不需要重复绑定。
12. 推广链接停用、过期或达到注册上限后，点击上报和新注册资格创建均应返回不可用。
13. 已创建的待领取资格不因推广链接后续停用而失效；是否失效只受活动过期时间和资格有效期策略影响。本期默认待领取资格不过期。
14. 邮箱域名不在有效邮箱白名单内时，不发放体验券，并返回明确提示。
15. 老推广链接默认活动类型为 `quota_reward`，保持原行为。

## 7. 后台前端设计

### 7.1 页面入口

沿用现有后台菜单：

`Promotion Links`

### 7.2 创建/编辑表单

新增或调整字段如下：

| 字段 | 控件 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| 推广码 | Input | 是 | 空 | 沿用现有字段 |
| 名称 | Input | 是 | 空 | 沿用现有字段 |
| 渠道标签 | Input | 是 | 空 | 用于限定特定渠道 |
| 活动类型 | Select | 是 | 注册送额度 | 新增字段 |
| 注册赠送额度 | Number Input | 条件必填 | 10 元 | 活动类型为注册送额度时展示 |
| 体验券金额 | Number Input | 条件必填 | 5 元 | 活动类型为注册送体验券时展示 |
| 首充奖励金额 | Number Input | 否 | 0 | 沿用现有字段 |
| 首充最低金额 | Number Input | 否 | 0 | 沿用现有字段 |
| 最大注册数 | Number Input | 否 | 0 | 0 表示不限制 |
| 过期时间 | DateTime Picker | 否 | 永不过期 | 建议替换当前时间戳输入 |
| 启用状态 | Switch / Checkbox | 是 | 启用 | 沿用现有字段 |

### 7.3 表单联动

1. 活动类型为“注册送额度”时，展示“注册赠送额度”，隐藏“体验券金额”。
2. 活动类型为“注册送体验券”时，展示“体验券金额”，隐藏“注册赠送额度”。
3. 活动类型为“仅统计”时，隐藏注册奖励相关金额字段。
4. 首充奖励字段始终可配置。

### 7.4 列表展示

推广链接列表新增或调整列：

| 列 | 说明 |
| --- | --- |
| 名称 | 沿用现有字段 |
| 推广码 | 沿用现有字段，支持复制 |
| 渠道标签 | 沿用现有字段 |
| 活动类型 | 展示注册送额度、注册送体验券、仅统计 |
| 注册奖励 | 展示额度金额或体验券金额 |
| 点击数 | 沿用现有字段 |
| 注册数 | 沿用现有字段 |
| 首充奖励 | 沿用现有字段 |
| 首充人数 | 沿用现有字段 |
| 过期时间 | 沿用现有字段 |
| 状态 | 启用、停用、过期、已达上限 |
| 操作 | 编辑、查看注册、启用/停用、删除 |

### 7.5 注册详情弹窗

注册详情新增字段：

| 字段 | 说明 |
| --- | --- |
| 用户名 | 沿用现有字段 |
| 渠道标签 | 沿用现有字段 |
| 活动类型 | 新增字段 |
| 奖励状态 | 显示待绑定邮箱、已发放、无奖励 |
| 发放奖励 | 显示待领取 5 元体验券、已发放 5 元体验券、10 元额度或无奖励 |
| 发放时间 | 已发放时展示 |
| 注册时间 | 沿用现有字段 |
| IP | 沿用现有字段 |
| User Agent | 沿用现有字段 |

### 7.6 用户侧 Banner

用户通过 `trial_coupon` 推广链接注册后，如果存在待领取体验券资格，登录后的主界面顶部展示 Banner。

Banner 展示规则：

1. 仅对当前登录用户展示。
2. 仅当存在 `pending_email` 待领取体验券资格时展示。
3. 用户邮箱未绑定时，主按钮文案为“绑定邮箱领取 5 元体验券”。
4. 用户邮箱已绑定但奖励未发放时，主按钮文案为“领取 5 元体验券”。
5. 用户邮箱域名不在有效邮箱白名单内时，Banner 展示提示“请绑定 Gmail、iCloud、Outlook、163、QQ、Hotmail 等常见邮箱后领取”。
6. 用户领取成功后，Banner 消失并刷新用户余额。
7. 用户关闭 Banner 后，本次会话不再展示；刷新或重新登录后如果仍未领取，可以再次展示。

Banner 内容配置：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| 标题 | Plain Text | 可选，默认“绑定常见邮箱即可领取 5 元体验券” |
| 内容格式 | Select | 支持 `plain_text`、`markdown`、`html` |
| 内容 | Textarea / Markdown Editor / HTML Editor | 按内容格式渲染 |
| 图片地址 | URL Input | 可选，支持展示活动图 |
| 图片位置 | Select | `left`、`right`、`top`、`background` |
| 主按钮文案 | Plain Text | 可选，默认按邮箱状态生成 |
| 次按钮文案 | Plain Text | 可选，例如“稍后再说” |

默认 Banner 文案：

```text
绑定常见邮箱即可领取 5 元体验券
```

Markdown 示例：

```markdown
### 领取 5 元体验券

绑定 Gmail、iCloud、Outlook、163、QQ、Hotmail 等常见邮箱后即可领取。
```

HTML 示例：

```html
<strong>领取 5 元体验券</strong>
<p>绑定常见邮箱后即可领取。</p>
```

安全要求：

1. Markdown 渲染必须禁用原始 HTML，或在渲染后进行 HTML sanitize。
2. HTML 内容必须经过白名单过滤后再展示，禁止直接 `dangerouslySetInnerHTML` 渲染未清洗内容。
3. HTML 禁止 `<script>`、`iframe`、事件属性、`javascript:` URL、内联事件处理器。
4. 图片地址仅允许 `https://` 或站内相对路径。
5. 链接默认添加 `rel="noopener noreferrer"`。
6. 建议允许的 HTML 标签包括 `p`、`br`、`strong`、`em`、`ul`、`ol`、`li`、`a`、`span`、`div`、`img`。
7. Banner 内容为空时使用默认文案。

操作：

1. 点击主按钮后跳转到个人资料邮箱绑定区域，或打开邮箱绑定弹窗。
2. 邮箱绑定成功后自动调用领取接口。
3. 领取失败时展示失败原因，例如推广资格不存在、已领取、邮箱未绑定、邮箱类型不支持。

## 8. 后端设计

### 8.1 涉及模块

1. `model/promotion.go`
2. `controller/promotion.go`
3. `router/api-router.go`
4. 注册流程中调用 `ApplyPromotionRegistrationWithTx` 的位置
5. 前端 `web/default/src/features/promotions`
6. 前端 i18n `web/default/src/i18n/locales`
7. 系统配置项或运营配置项，用于维护体验券有效邮箱域名白名单
8. 系统配置项或运营配置项，用于维护体验券 Banner 内容、图片和渲染格式

### 8.2 数据模型

`PromotionLink` 新增字段：

```go
ActivityType     string `json:"activity_type" gorm:"type:varchar(32);not null;default:'quota_reward';index"`
TrialCouponQuota int    `json:"trial_coupon_quota" gorm:"type:int;not null;default:0"`
```

`PromotionRegistration` 新增字段：

```go
ActivityType string `json:"activity_type" gorm:"type:varchar(32);not null;default:'quota_reward';index"`
RewardStatus string `json:"reward_status" gorm:"type:varchar(32);not null;default:'granted';index"`
GrantedQuota int    `json:"granted_quota" gorm:"type:int;not null;default:0"`
GrantedAt    int64  `json:"granted_at" gorm:"type:bigint;not null;default:0;index"`
```

### 8.3 常量

建议新增推广活动类型常量：

```go
const (
	PromotionActivityQuotaReward = "quota_reward"
	PromotionActivityTrialCoupon = "trial_coupon"
	PromotionActivityNone        = "none"
)
```

建议新增奖励状态常量：

```go
const (
	PromotionRewardStatusPendingEmail = "pending_email"
	PromotionRewardStatusGranted      = "granted"
	PromotionRewardStatusNone         = "none"
)
```

建议新增默认邮箱白名单常量或配置默认值：

```go
DefaultPromotionRewardAllowedEmailDomains = []string{
	"gmail.com",
	"googlemail.com",
	"icloud.com",
	"me.com",
	"mac.com",
	"outlook.com",
	"hotmail.com",
	"live.com",
	"msn.com",
	"163.com",
	"126.com",
	"yeah.net",
	"qq.com",
	"foxmail.com",
	"yahoo.com",
	"yahoo.co.jp",
}
```

建议新增 Banner 配置结构：

```go
type PromotionRewardBannerConfig struct {
	Title           string `json:"title"`
	ContentFormat   string `json:"content_format"`
	Content         string `json:"content"`
	ImageUrl        string `json:"image_url"`
	ImagePosition   string `json:"image_position"`
	PrimaryButton   string `json:"primary_button"`
	SecondaryButton string `json:"secondary_button"`
}
```

字段约束：

1. `content_format` 允许值：`plain_text`、`markdown`、`html`。
2. `image_position` 允许值：`left`、`right`、`top`、`background`。
3. `image_url` 仅允许 `https://` 或站内相对路径。
4. `content` 和 `title` 长度需要限制，避免配置过大影响页面加载。
5. 保存 HTML 配置时建议后端先 sanitize 一次；前端渲染前仍需二次 sanitize。

### 8.4 默认值

```go
func DefaultPromotionTrialCouponQuota() int {
	return int(5 * common.QuotaPerUnit)
}
```

老数据兼容：

1. 已存在推广链接的 `activity_type` 为空时，按 `quota_reward` 处理。
2. `trial_coupon_quota` 为空或为 0，且活动类型为 `trial_coupon` 时，默认使用 5 元。
3. 已存在注册记录的 `activity_type` 为空时，按 `quota_reward` 展示。
4. 已存在注册记录的 `reward_status` 为空时，按 `granted` 展示。
5. 已存在注册记录的 `granted_quota` 为空时，使用原 `reward_quota` 展示。

### 8.5 校验规则

创建和更新推广链接时校验：

1. `activity_type` 必须为 `quota_reward`、`trial_coupon`、`none` 之一。
2. `code` 必填，长度不超过 64。
3. `name` 必填，长度不超过 100。
4. `channel_tag` 必填，长度不超过 64。
5. `reward_quota >= 0`。
6. `trial_coupon_quota >= 0`。
7. `first_topup_reward_quota >= 0`。
8. `first_topup_min_amount >= 0`。
9. `max_registrations >= 0`。
10. 推广码不能与已有 aff code 冲突。

领取体验券时校验：

1. 当前用户必须存在待领取推广奖励。
2. `activity_type` 必须为 `trial_coupon`。
3. `reward_status` 必须为 `pending_email`。
4. 用户邮箱必须已绑定。
5. 用户邮箱必须已验证。
6. 用户邮箱域名必须命中有效邮箱白名单。
7. 领取逻辑必须在事务内执行，避免重复发放。

### 8.6 发放逻辑

注册成功后的资格创建流程：

```text
读取 promotion_code
  -> 查询 PromotionLink
  -> 校验链接可用性
  -> 根据 activity_type 计算 reward_status 和 granted_quota
      quota_reward:
        reward_status = granted
        granted_quota = reward_quota
      trial_coupon:
        reward_status = pending_email
        granted_quota = 0
      none:
        reward_status = none
        granted_quota = 0
  -> 更新 User
      quota = quota + granted_quota，仅 quota_reward 注册即发放时增加
      promotion_code = link.Code
      promotion_channel_tag = link.ChannelTag
  -> 写入 PromotionRegistration
      activity_type = link.ActivityType
      reward_quota = link.RewardQuota
      granted_quota = granted_quota
      reward_status = reward_status
      granted_at = 当前时间，仅 granted 状态写入
  -> PromotionLink.registrations + 1
  -> 写系统日志
```

体验券领取流程：

```text
用户登录后请求待领取资格
  -> 后端查询当前用户 PromotionRegistration
  -> activity_type 必须为 trial_coupon
  -> reward_status 必须为 pending_email
  -> 用户邮箱必须已绑定且已验证
  -> 用户邮箱域名必须命中有效邮箱白名单
  -> 查询 PromotionLink
  -> 计算 grant_quota = trial_coupon_quota 或默认 5 元
  -> 事务内更新 User.quota = quota + grant_quota
  -> 事务内更新 PromotionRegistration
      reward_status = granted
      granted_quota = grant_quota
      granted_at = 当前时间
  -> 写系统日志
  -> 返回发放结果和最新奖励金额
```

活动类型对应日志建议：

| 活动类型 | 日志文案 |
| --- | --- |
| `quota_reward` | 通过推广链接注册赠送额度 {amount} |
| `trial_coupon` | 通过推广链接注册获得体验券资格，待绑定邮箱领取 |
| `trial_coupon` 领取成功 | 绑定邮箱后领取推广体验券 {amount} |
| `none` | 通过推广链接完成注册归因，未发放奖励 |

### 8.7 首充奖励

首充奖励继续沿用现有 `TryGrantFirstTopUpReward`：

1. 用户通过推广链接注册后仍写入 `promotion_code`。
2. 满足首充奖励条件时继续发放首充奖励。
3. `trial_coupon` 不影响首充奖励判断。
4. `none` 类型如果配置了首充奖励，也允许首充后触发奖励。

## 9. API 设计

### 9.1 创建推广链接

`POST /api/promotion`

请求示例：

```json
{
  "code": "summer-trial",
  "name": "夏季渠道体验券",
  "channel_tag": "summer-channel",
  "activity_type": "trial_coupon",
  "trial_coupon_quota": 500000,
  "reward_quota": 0,
  "first_topup_reward_quota": 0,
  "first_topup_min_amount": 0,
  "max_registrations": 1000,
  "expires_at": 0,
  "enabled": true
}
```

### 9.2 更新推广链接

`PUT /api/promotion/:id`

请求字段与创建接口一致。

### 9.3 查询推广链接列表

`GET /api/promotion`

建议新增查询参数：

| 参数 | 说明 |
| --- | --- |
| `keyword` | 按名称或推广码搜索，沿用现有逻辑 |
| `channel_tag` | 按渠道标签过滤，沿用现有逻辑 |
| `activity_type` | 按活动类型过滤，新增 |

响应新增字段：

```json
{
  "activity_type": "trial_coupon",
  "trial_coupon_quota": 500000
}
```

### 9.4 查询注册详情

`GET /api/promotion/:id/registrations`

响应新增字段：

```json
{
  "activity_type": "trial_coupon",
  "reward_status": "pending_email",
  "granted_quota": 0,
  "granted_at": 0
}
```

### 9.5 查询当前用户待领取推广奖励

`GET /api/user/self/promotion-reward`

用于前端判断是否展示 Banner。

响应示例：

```json
{
  "success": true,
  "data": {
    "has_pending_reward": true,
    "activity_type": "trial_coupon",
    "reward_status": "pending_email",
    "reward_quota": 500000,
    "reward_amount": 5,
    "requires_email_binding": true,
    "email_bound": false,
    "email_domain_allowed": false,
    "allowed_email_domains": [
      "gmail.com",
      "icloud.com",
      "outlook.com",
      "hotmail.com",
      "163.com",
      "qq.com"
    ],
    "banner": {
      "title": "绑定常见邮箱即可领取 5 元体验券",
      "content_format": "markdown",
      "content": "### 领取 5 元体验券\n绑定 Gmail、iCloud、Outlook、163、QQ、Hotmail 等常见邮箱后即可领取。",
      "image_url": "https://example.com/assets/trial-coupon-banner.png",
      "image_position": "right",
      "primary_button": "绑定邮箱领取",
      "secondary_button": "稍后再说"
    },
    "promotion_code": "summer-trial",
    "channel_tag": "summer-channel"
  }
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `has_pending_reward` | 是否存在待领取奖励 |
| `activity_type` | 活动类型 |
| `reward_status` | 奖励状态 |
| `reward_quota` | 预计可领取 quota |
| `reward_amount` | 前端展示金额 |
| `requires_email_binding` | 是否需要绑定邮箱 |
| `email_bound` | 当前用户是否已绑定邮箱 |
| `email_domain_allowed` | 当前绑定邮箱域名是否可领取体验券 |
| `allowed_email_domains` | 可用于前端提示的常见允许域名，建议只返回摘要列表 |
| `banner` | Banner 展示配置 |
| `promotion_code` | 推广码 |
| `channel_tag` | 渠道标签 |

### 9.6 领取当前用户推广体验券

`POST /api/user/self/promotion-reward/claim`

领取条件：

1. 当前用户已登录。
2. 当前用户存在 `trial_coupon` 待领取资格。
3. `reward_status = pending_email`。
4. 用户邮箱已绑定并完成验证。
5. 用户邮箱域名命中有效邮箱白名单。

成功响应：

```json
{
  "success": true,
  "data": {
    "reward_status": "granted",
    "granted_quota": 500000,
    "granted_amount": 5,
    "granted_at": 1710000000
  }
}
```

失败场景：

| 场景 | 建议错误信息 |
| --- | --- |
| 无待领取资格 | `promotion reward not found` |
| 已领取 | `promotion reward already granted` |
| 邮箱未绑定 | `email binding required` |
| 邮箱未验证 | `email verification required` |
| 邮箱域名不支持 | `email domain is not eligible for promotion reward` |

## 10. 数据库兼容

需要同时兼容 SQLite、MySQL 5.7.8+、PostgreSQL 9.6+。

要求：

1. 优先使用 GORM 字段迁移。
2. 不使用数据库专属字段类型。
3. `activity_type` 使用 `varchar(32)`。
4. `reward_status` 使用 `varchar(32)`。
5. `trial_coupon_quota` 和 `granted_quota` 使用 `int`。
6. `granted_at` 使用 `bigint`。
7. 如需手写迁移，必须按项目现有 `model/main.go` 中 SQLite/MySQL/PostgreSQL 分支模式处理。

## 11. 前端实现清单

### 11.1 类型

更新 `web/default/src/features/promotions/types.ts`：

1. `promotionLinkSchema` 新增 `activity_type`、`trial_coupon_quota`。
2. `promotionRegistrationSchema` 新增 `activity_type`、`reward_status`、`granted_quota`、`granted_at`。
3. `PromotionFormData` 新增 `activity_type`、`trial_coupon_quota`。

### 11.2 API

后台推广链接管理的 `web/default/src/features/promotions/api.ts` 可继续复用现有接口函数。

用户侧需要新增接口函数：

1. 查询当前用户待领取推广奖励。
2. 领取当前用户推广体验券。

后台配置侧需要支持维护有效邮箱域名白名单：

1. 查询当前白名单。
2. 保存白名单。
3. 恢复默认白名单。
4. 查询体验券 Banner 配置。
5. 保存体验券 Banner 配置。
6. 恢复默认 Banner 配置。

### 11.3 页面

更新 `web/default/src/features/promotions/index.tsx`：

1. 新增活动类型状态。
2. 新增体验券金额状态，默认 5。
3. 表单按活动类型联动展示字段。
4. 列表新增活动类型列。
5. 注册奖励列根据活动类型展示不同文案。
6. 注册详情展示活动类型、奖励状态、发放奖励和发放时间。

用户侧页面：

1. 登录后查询当前用户待领取推广奖励。
2. 存在 `pending_email` 资格时展示顶部 Banner。
3. 用户未绑定邮箱时，引导进入邮箱绑定流程。
4. 邮箱绑定成功后调用领取接口。
5. 邮箱域名不支持时，展示可领取体验券的常见邮箱提示。
6. Banner 支持后台下发图片、Markdown 和受限 HTML。
7. Markdown / HTML 渲染必须 sanitize 后展示。
8. 领取成功后隐藏 Banner，并刷新用户余额。

后台配置页面：

1. 在运营设置或推广设置中增加“体验券有效邮箱域名”配置。
2. 使用多行文本、标签输入或 JSON 数组编辑。
3. 默认展示 Gmail、iCloud、Outlook、Hotmail、163、QQ、Foxmail 等常见邮箱域名。
4. 保存时去重、转小写、去除空格。
5. 无效域名格式需要前端提示，后端仍需二次校验。
6. 增加“体验券 Banner”配置区。
7. Banner 内容格式支持纯文本、Markdown、HTML。
8. Banner 图片地址支持 `https://` 和站内相对路径。
9. HTML 编辑区需要提示仅支持受限标签，禁止脚本。

### 11.4 i18n

新增文案需要同步到：

1. `en`
2. `zh`
3. `fr`
4. `ru`
5. `ja`
6. `vi`

建议新增文案：

| Key |
| --- |
| Activity Type |
| Registration Quota Reward |
| Registration Trial Coupon |
| Tracking Only |
| Trial Coupon Amount |
| Registration Reward |
| Granted Reward |
| Reward Status |
| Pending Email Binding |
| Bind email to claim trial coupon |
| Claim Trial Coupon |
| Promotion reward already granted |
| Email binding required |
| Email domain is not eligible for promotion reward |
| Eligible email domains |
| Bind Gmail, iCloud, Outlook, 163, QQ, Hotmail or another eligible email to claim your trial coupon |
| Promotion Reward Allowed Email Domains |
| Promotion Reward Banner |
| Banner Content Format |
| Banner Image URL |
| Banner Image Position |
| Markdown |
| HTML |
| Plain Text |
| Unsupported banner image URL |
| HTML content contains unsupported tags or attributes |
| 0 means no registration reward |

## 12. 测试用例

### 12.1 后端测试

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| B-1 | 创建 `trial_coupon` 推广链接，不传体验券金额 | 默认使用 5 元 |
| B-2 | 创建 `trial_coupon` 推广链接，传入 10 元 | 注册后创建 10 元待领取资格，不立即发放 |
| B-3 | 创建 `none` 推广链接 | 注册后不增加额度，但记录注册 |
| B-4 | 停用推广链接后注册 | 不发放奖励 |
| B-5 | 过期推广链接注册 | 不发放奖励 |
| B-6 | 达到最大注册数后注册 | 不发放奖励 |
| B-7 | 推广码与 aff code 冲突 | 创建失败 |
| B-8 | 老推广链接未设置 activity_type | 按 `quota_reward` 处理 |
| B-9 | `trial_coupon` 用户首充 | 首充奖励仍可正常触发 |
| B-10 | `trial_coupon` 用户未绑定邮箱调用领取接口 | 返回邮箱绑定必需，不发放 |
| B-11 | `trial_coupon` 用户绑定邮箱后调用领取接口 | 发放体验券，状态变为 `granted` |
| B-12 | 已领取用户重复调用领取接口 | 不重复发放 |
| B-13 | 已绑定邮箱用户存在待领取资格 | 调用领取接口后直接发放 |
| B-14 | 用户绑定 Gmail 邮箱领取 | 领取成功 |
| B-15 | 用户绑定 QQ 邮箱领取 | 领取成功 |
| B-16 | 用户绑定临时邮箱域名领取 | 返回邮箱域名不支持，不发放 |
| B-17 | 白名单配置中存在大写域名 | 保存后统一转小写，匹配成功 |
| B-18 | 保存 Banner HTML 包含 `<script>` | 保存失败或 sanitize 后不包含脚本 |
| B-19 | 保存 Banner 图片为 `javascript:` URL | 保存失败 |
| B-20 | 查询待领取奖励 | 返回 Banner 配置 |

### 12.2 前端测试

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| F-1 | 打开创建弹窗 | 活动类型默认注册送额度 |
| F-2 | 切换为注册送体验券 | 展示体验券金额，默认 5 |
| F-3 | 切换为仅统计 | 隐藏注册奖励金额字段 |
| F-4 | 编辑老推广链接 | 能正常回显为注册送额度 |
| F-5 | 列表查看体验券活动 | 活动类型和注册奖励展示正确 |
| F-6 | 查看注册详情 | 能看到活动类型、奖励状态和发放奖励 |
| F-7 | 体验券用户注册后进入系统 | 顶部展示绑定邮箱领取 Banner |
| F-8 | 用户未绑定邮箱点击 Banner | 进入邮箱绑定流程 |
| F-9 | 用户绑定邮箱成功 | 自动领取体验券并刷新余额 |
| F-10 | 用户领取成功后刷新页面 | Banner 不再展示 |
| F-11 | 用户绑定非白名单邮箱 | Banner 提示绑定常见邮箱后领取 |
| F-12 | 管理员编辑有效邮箱域名白名单 | 可保存、去重、恢复默认 |
| F-13 | Banner 配置为 Markdown | 前端按 Markdown 渲染，布局正常 |
| F-14 | Banner 配置为 HTML | 前端 sanitize 后渲染，脚本不执行 |
| F-15 | Banner 配置图片 | 图片正常展示，移动端不遮挡内容 |

### 12.3 数据库测试

| 编号 | 数据库 | 预期 |
| --- | --- | --- |
| D-1 | SQLite | 新增字段迁移成功 |
| D-2 | MySQL 5.7.8+ | 新增字段迁移成功 |
| D-3 | PostgreSQL 9.6+ | 新增字段迁移成功 |

## 13. 验收标准

1. 管理员可以创建、编辑、启用、停用“注册送体验券”活动。
2. 体验券活动默认金额为 5 元。
3. 用户通过有效体验券推广链接注册后，先创建待领取资格，账户额度不立即增加。
4. 待领取用户登录后能看到绑定邮箱领取体验券 Banner。
5. 用户完成邮箱绑定、邮箱验证，且邮箱域名属于有效邮箱白名单后，账户额度增加 5 元等值 quota。
6. Gmail、iCloud、Outlook、Hotmail、163、QQ 等默认白名单邮箱可以领取体验券。
7. 非白名单邮箱不能领取体验券，并展示明确提示。
8. 管理员可以维护体验券有效邮箱域名白名单。
9. 管理员可以维护体验券 Banner 的图片、Markdown 和 HTML 内容。
10. 用户侧 Banner 能正确展示后台配置的图片、Markdown 和受限 HTML。
11. HTML 内容经过安全过滤，脚本和危险属性不会执行。
12. 注册明细记录活动类型、奖励状态、实际发放额度和发放时间。
13. 已领取用户不会重复发放体验券。
14. 推广链接列表能区分注册送额度、注册送体验券、仅统计。
15. 停用、过期、超注册上限的推广链接不会创建新的奖励资格。
16. 老推广链接行为不变。
17. 首充奖励行为不变。
18. 前端新增文案完成 i18n 同步。
19. 后端测试和前端构建通过。

## 14. 交付范围

### 后端

1. 数据模型字段新增。
2. 数据迁移兼容三类数据库。
3. 推广链接创建、更新、查询接口字段扩展。
4. 注册资格创建逻辑扩展。
5. 邮箱绑定后领取体验券接口。
6. 体验券有效邮箱域名白名单配置和校验。
7. 体验券 Banner 配置保存、查询和安全过滤。
8. 注册明细字段扩展。
9. 单元测试覆盖核心发放场景。

### 前端

1. 推广链接表单增加活动类型和体验券金额。
2. 推广链接列表增加活动类型和注册奖励展示。
3. 注册详情增加活动类型、奖励状态和发放奖励展示。
4. 用户侧增加待领取体验券 Banner。
5. 邮箱绑定成功后触发领取并刷新余额。
6. 非白名单邮箱提示用户更换常见邮箱。
7. 后台增加有效邮箱域名白名单配置。
8. 后台增加体验券 Banner 图片、Markdown、HTML 配置。
9. 用户侧 Banner 支持图片、Markdown 和受限 HTML 安全渲染。
10. 新增文案 i18n。
11. 前端构建验证。

## 15. 风险与注意事项

1. 当前体验券按 quota 发放，无法与普通余额做消耗隔离。
2. 如果业务要求体验券有过期时间，需要另起券账户设计。
3. 注册流程需要保证事务一致性，避免用户已创建但推广奖励未记录。
4. 并发注册场景下需要继续依赖注册记录唯一约束，避免重复发放。
5. 金额和 quota 换算必须使用系统统一 `QuotaPerUnit`，避免前后端展示不一致。
