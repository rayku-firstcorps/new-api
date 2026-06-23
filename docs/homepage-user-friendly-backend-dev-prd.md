# 首页用户友好化改版后端开发 PRD

## 1. 背景

参考产品文档：[homepage-user-friendly-redesign-prd.md](homepage-user-friendly-redesign-prd.md)。

原产品 PRD 的核心目标是把默认首页从“开发者和基础设施视角”调整为“普通用户能快速理解的一站式 AI 模型账户、应用连接、额度、账单与用量管理入口”。该 PRD 明确说明本期不要求后台能力变更，但从工程落地角度看，首页改版会持续依赖后端提供以下稳定能力：

- 判断未登录/已登录用户的 CTA 去向。
- 读取自定义首页内容，并在配置存在时继续覆盖默认首页。
- 获取文档链接、注册开关、价格页可见性、站点品牌、货币展示等公共配置。
- 在不泄露敏感信息的前提下，支撑首页展示“模型、应用、余额、用量、成本、连接状态”等普通用户可理解概念。
- 为后续转化分析预留事件口径，但不引入新的分析平台。

因此，本后端开发 PRD 的目标不是重写业务能力，而是定义首页改版所需的后端优化边界、接口契约、安全策略、缓存策略和验收标准。

## 2. 产品理解

首页首屏需要从“API Gateway、curl、JSON、协议兼容”切换为“一个账户连接和管理多个 AI 模型与应用”。这意味着后端对首页的支持应遵循两个原则：

1. 普通访客只看到公共、聚合、不可反推出租户或用户行为的数据。
2. 登录用户可看到轻量个人摘要，但不应在匿名接口中混入个人额度、请求记录、Token、密钥、分组权限等敏感字段。

视觉层可以使用静态产品预览完成 P0 交付；后端优化作为 P1 提供真实摘要和更稳定的数据来源。

## 3. 当前后端现状

| 能力 | 当前接口/位置 | 现状说明 |
| --- | --- | --- |
| 自定义首页内容 | `GET /api/home_page_content` / `controller.GetHomePageContent` | 从 `common.OptionMap["HomePageContent"]` 返回字符串。前端存在内容时覆盖默认首页。 |
| 公共站点配置 | `GET /api/status` / `controller.GetStatus` | 已包含 `system_name`、`logo`、`docs_link`、`register_enabled`、货币配置、导航模块配置等。 |
| 价格与模型信息 | `GET /api/pricing` / `controller.GetPricing` | 受 `HeaderNavModuleAuth("pricing")` 控制，支持未登录或登录后按用户组过滤。 |
| 用户基础摘要 | `GET /api/user/self` / `controller.GetSelf` | 登录态接口，返回 `quota`、`used_quota`、`request_count`、用户组和权限等。 |
| 用户可用模型 | `GET /api/user/models` / `controller.GetUserModels` | 登录态接口，按用户可用组聚合模型列表。 |
| 用户用量趋势 | `GET /api/data/self` / `controller.GetUserQuotaDates` | 登录态接口，时间范围最大 1 个月。 |

当前能力足以完成前端 P0 改版，但存在两个工程问题：

- 首页若直接组合多个现有接口，会增加首屏请求数量和前端耦合。
- 若为了视觉预览复用登录后接口，容易把敏感字段带到首页组件或缓存中。

## 4. 目标

### 4.1 P0 目标

- 不阻塞原首页改版交付。
- 继续保持 `HomePageContent` 自定义覆盖行为。
- 复用 `/api/status`、`/api/home_page_content`、`/api/pricing` 等现有能力，不新增数据库表。
- 不把用户额度、请求记录、Token、用户组权限暴露到匿名接口。

### 4.2 P1 后端优化目标

- 新增首页专用聚合接口，减少前端首屏对多个业务接口的直接依赖。
- 提供公共首页摘要：模型服务数量、计费模型数量、应用集成数量、文档链接、注册可用性、价格页可见性等。
- 提供登录用户首页摘要：展示余额、展示已用金额、请求数、可用模型数、近 7 天展示用量汇总。后端需要把内部 quota 单位转换为用户实际看到的余额单位。
- 明确缓存策略，避免首页高频访问放大数据库压力。
- 保持 SQLite、MySQL、PostgreSQL 兼容，不引入数据库特有 SQL。

## 5. 非目标

- 不修改登录、注册、充值、订阅、计费、Token 管理核心逻辑。
- 不新增支付、账单、模型管理或渠道管理能力。
- 不替换、删除或弱化受保护的项目身份、组织身份、版权、许可证或归属信息。
- 不引入新的埋点平台或第三方分析 SDK。
- 不在匿名接口返回真实用户余额、用量、Token、分组、权限或最近请求记录。
- 不新增大依赖，不改变现有 Gin、GORM、OptionMap、缓存体系。

## 6. 总体方案

### 6.1 分阶段交付

| 阶段 | 范围 | 后端改动 | 交付价值 |
| --- | --- | --- | --- |
| P0 | 前端默认首页改版 | 无强制后端改动 | 快速满足产品首屏、文案、CTA、i18n、视觉要求。 |
| P1 | 首页聚合接口 | 新增首页公共摘要和个人摘要接口 | 降低前端耦合，统一首页数据来源。 |
| P2 | 转化事件预留 | 可选新增轻量事件接收或复用现有推广点击接口 | 为后续转化分析留口径，不阻塞上线。 |

### 6.2 推荐新增接口

新增两个接口，避免一个匿名接口同时承担公共数据和个人数据：

- `GET /api/home/landing`：匿名可访问，只返回公共首页摘要。
- `GET /api/home/self_summary`：登录后访问，只返回首页需要的个人轻量摘要。

路由建议放在 `router/api-router.go` 的匿名公共 API 分组内：

```go
apiRouter.GET("/home/landing", controller.GetHomeLanding)
apiRouter.GET("/home/self_summary", middleware.UserAuth(), controller.GetHomeSelfSummary)
```

## 7. 接口设计

### 7.1 公共首页摘要

`GET /api/home/landing`

认证：无需登录。

用途：默认首页首屏、统计区、CTA、开发者入口、产品预览静态数字。

响应示例：

```json
{
  "success": true,
  "message": "",
  "data": {
    "system_name": "New API",
    "logo": "/logo.png",
    "docs_link": "https://docs.newapi.pro",
    "register_enabled": true,
    "password_register_enabled": true,
    "pricing_visible": true,
    "currency": {
      "quota_per_unit": 500000,
      "quota_display_type": "USD",
      "display_in_currency": false,
      "custom_currency_symbol": "$",
      "custom_currency_exchange_rate": 1
    },
    "metrics": {
      "model_service_count": 50,
      "billable_model_count": 100,
      "app_integration_count": 4,
      "usage_records_enabled": true
    },
    "cache_ttl_seconds": 60
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `system_name` | string | 站点名称，来源同 `/api/status`。 |
| `logo` | string | 站点 logo，来源同 `/api/status`。 |
| `docs_link` | string | 文档链接，来源 `operation_setting.GetGeneralSetting().DocsLink`。 |
| `register_enabled` | boolean | 注册总开关。 |
| `password_register_enabled` | boolean | 密码注册开关。 |
| `pricing_visible` | boolean | 价格页是否对当前匿名访问可见。 |
| `currency` | object | 额度展示所需公共换算配置。 |
| `metrics.model_service_count` | number | 公共展示用模型服务数量，建议从 vendor 数或配置兜底值计算。 |
| `metrics.billable_model_count` | number | 公共展示用计费模型数量，建议从 `model.GetPricing()` 聚合。 |
| `metrics.app_integration_count` | number | 支持应用展示数量，首期可使用服务端常量或配置项。 |
| `metrics.usage_records_enabled` | boolean | 是否可展示“用量记录”能力，默认 true。 |
| `cache_ttl_seconds` | number | 前端可参考的缓存时间。 |

实现要求：

- 不返回 `HeaderNavModules` 原始 JSON，避免前端重复解析后台配置。
- 不返回 `HomePageContent` 内容，继续由现有 `/api/home_page_content` 控制覆盖行为，降低兼容风险。
- `pricing_visible` 应复用 `HeaderNavModules` 的访问规则语义，不能出现“前端显示价格 CTA 但后端价格接口 403”的明显不一致。
- 模型和供应商统计必须容错：价格配置为空时返回 `0` 或产品兜底文案需要的安全默认值，不能 500。

### 7.2 登录用户首页摘要

`GET /api/home/self_summary`

认证：`middleware.UserAuth()`。

用途：已登录用户首页 CTA、产品预览、控制台入口旁的轻量摘要。

重要规则：用户展示的 quota 不是内部原始 quota 单位，而是实际余额展示值。后端必须按站点当前额度展示配置完成换算，避免前端把 `quota` 原始单位直接显示成余额。

响应示例：

```json
{
  "success": true,
  "message": "",
  "data": {
    "balance": {
      "amount": 2.4,
      "display_amount": 2.4,
      "display_type": "USD",
      "symbol": "$"
    },
    "used": {
      "amount": 0.69,
      "display_amount": 0.69,
      "display_type": "USD",
      "symbol": "$"
    },
    "request_count": 182,
    "available_model_count": 36,
    "recent_usage": {
      "days": 7,
      "amount": 0.112,
      "display_amount": 0.112,
      "display_type": "USD",
      "symbol": "$",
      "request_count": 42
    }
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `balance.amount` | number | 用户当前实际余额数值，已从内部 quota 换算为当前展示单位。 |
| `balance.display_amount` | number | 与 `amount` 同值，供前端明确使用展示语义，避免误用内部 quota。 |
| `balance.display_type` | string | 当前额度展示类型：`USD`、`CNY`、`CUSTOM`、`TOKENS`。 |
| `balance.symbol` | string | 当前展示符号；`TOKENS` 可为空字符串。 |
| `used.amount` | number | 用户已用额度对应的实际展示数值。 |
| `request_count` | number | 用户累计请求数。 |
| `available_model_count` | number | 按用户可用组聚合后的模型数量。 |
| `recent_usage.days` | number | 固定 7 天。 |
| `recent_usage.amount` | number | 近 7 天聚合消耗对应的实际展示数值。 |
| `recent_usage.request_count` | number | 如底层日用量数据可提供请求数则返回；不可提供时可省略或返回 0。 |

换算规则：

| 展示类型 | 换算规则 |
| --- | --- |
| `USD` | `display_amount = raw_quota / common.QuotaPerUnit` |
| `CNY` | `display_amount = raw_quota / common.QuotaPerUnit * operation_setting.USDExchangeRate` |
| `CUSTOM` | `display_amount = raw_quota / common.QuotaPerUnit * operation_setting.GetGeneralSetting().CustomCurrencyExchangeRate` |
| `TOKENS` | `display_amount = raw_quota` |

实现时建议封装 `quotaToDisplayAmount(rawQuota int) HomeDisplayAmount`，统一用于余额、已用额度和近 7 天消耗，避免各处重复计算或出现双重换算。

安全要求：

- 不返回用户邮箱、第三方绑定 ID、邀请码、用户组、权限、Token、访问密钥、最近请求明细。
- 不返回模型具体列表，仅返回数量；具体模型列表继续走控制台已有接口。
- 近 7 天数据只返回聚合值，不返回每日明细，避免首页承担图表接口职责。
- 不允许通过 query 参数指定任意用户 ID。

## 8. 后端实现建议

### 8.1 文件组织

推荐新增：

- `controller/home.go`
- `service/home_summary.go`
- `service/home_summary_test.go` 或 `controller/home_test.go`

推荐修改：

- `router/api-router.go`
- 必要时补充 `middleware/header_nav.go` 的可复用访问判断函数，但不要破坏现有中间件行为。

### 8.2 服务层职责

`service/home_summary.go` 建议提供：

- `BuildHomeLandingSummary()`
- `BuildHomeSelfSummary(userID int)`

控制器只负责读取登录态、调用服务、返回 JSON；聚合逻辑放在 service，方便测试。

### 8.3 缓存策略

公共摘要建议使用 60 秒进程内缓存：

- 缓存 key 固定为 `home_landing_summary`。
- 缓存内容只包含公共数据。
- `model.GetPricing()` 已有 1 分钟缓存，可直接复用。
- 配置更新后如已有全局 OptionMap 刷新机制，可接受最多 60 秒延迟。

个人摘要不建议跨用户共享缓存：

- 可不缓存，或仅在单请求内聚合。
- 如果后续需要缓存，key 必须包含 userID，TTL 不超过 30 秒。

### 8.4 数据来源

公共摘要：

- 站点品牌、注册开关、文档链接、货币配置：复用 `/api/status` 内同源配置。
- 模型数量：复用 `model.GetPricing()` 后按 `ModelName` 去重。
- 供应商数量：复用 `model.GetVendors()` 或按可展示供应商去重。
- 价格页可见性：复用 `HeaderNavModules` 解析逻辑。

个人摘要：

- 用户额度和请求数：复用 `model.GetUserById(userID, false)` 或用户缓存读取内部 quota 字段；返回给首页前必须转换为实际展示余额，不能直接透传内部 quota。
- 可用模型数量：复用 `service.GetUserUsableGroups(user.Group)` 和 `model.GetGroupEnabledModels(group)`。
- 近 7 天用量：复用 `model.GetQuotaDataByUserId(userID, start, end)` 后先在服务层聚合为内部 raw quota，再通过统一换算函数转换为展示金额。

### 8.5 JSON 与数据库约束

- 实际 JSON 编解码必须使用 `common.Marshal`、`common.Unmarshal`、`common.DecodeJson` 等项目封装。
- 可引用 `encoding/json` 类型，但业务代码不得直接调用 `json.Marshal` / `json.Unmarshal`。
- 不新增数据库表，避免迁移风险。
- 如后续 P2 需要事件记录表，必须同时兼容 SQLite、MySQL 5.7.8+、PostgreSQL 9.6+，优先使用 GORM。
- 避免 raw SQL；确需 raw SQL 时必须按项目规范处理不同数据库的列引用、布尔值和保留字。

## 9. CTA 与注册状态规则

首页 CTA 建议由前端基于以下规则判断：

| 场景 | 主 CTA | 后端依赖 |
| --- | --- | --- |
| 未登录且允许注册 | `Get Started` -> `/sign-up` | `register_enabled=true` 且 `password_register_enabled=true` 或存在可用 OAuth 注册入口。 |
| 未登录但关闭注册 | `Sign in` 或联系管理员入口 | `register_enabled=false` 或 `password_register_enabled=false`。 |
| 已登录 | `Go to Dashboard` -> `/dashboard` | 前端 auth store 或 `/api/user/self`。 |
| 价格页可访问 | 展示 `View Pricing` | `pricing_visible=true`。 |
| 文档链接存在 | 展示 `Developer Docs` | `docs_link` 非空。 |

后端不负责决定按钮文案，但需要提供稳定、语义明确的开关字段。

## 10. 安全与隐私

- 匿名接口只返回公共聚合数据。
- 登录用户摘要接口必须使用 session 用户 ID，不接受用户输入的 userID。
- 所有首页接口继续走现有全局 API 限流和 gzip 中间件。
- 不在首页接口返回 API Key、Token Key、渠道 Key、上游余额、用户邮箱、OAuth ID、用户组权限。
- 自定义首页内容继续按现有逻辑返回；本 PRD 不新增 HTML 清洗策略。如需加强 XSS 防护，应另立安全 PRD。
- 对外链文档链接和应用链接，前端仍需使用 `rel="noopener noreferrer"`；后端仅提供配置。

## 11. 兼容性要求

- 保持 `/api/home_page_content` 响应结构不变。
- 保持 `/api/status` 响应结构不变，不删除既有字段。
- 保持 `/api/pricing` 访问控制不变。
- 新接口失败不能影响旧首页和控制台可用性。
- 自定义首页配置存在时，默认首页仍完全被覆盖。
- 不修改受保护项目名、组织名、版权、许可证、包路径和归属信息。

## 12. 开发任务拆分

### P0：无需后端改动但需联调确认

- 确认 `/api/home_page_content` 为空时默认首页展示，非空时继续覆盖。
- 确认 `/api/status` 可提供 `docs_link`、注册开关、货币配置、品牌信息。
- 确认 `/api/pricing` 在当前导航模块配置下与价格 CTA 行为一致。

### P1：新增首页聚合接口

- 新增 `controller.GetHomeLanding`。
- 新增 `controller.GetHomeSelfSummary`。
- 新增 `service.BuildHomeLandingSummary`。
- 新增 `service.BuildHomeSelfSummary`。
- 路由注册：
  - `GET /api/home/landing`
  - `GET /api/home/self_summary`
- 补充单元测试覆盖匿名摘要、登录摘要、价格关闭、价格需登录、空价格数据等场景。

### P2：转化事件预留

可选方案：

- 复用现有 `/api/promotion/click` 记录推广点击，不新增通用埋点。
- 或新增极简事件接口 `POST /api/home/event`，仅允许白名单事件：
  - `hero_get_started_click`
  - `hero_pricing_click`
  - `hero_docs_click`

P2 不作为首页改版上线前置条件。

## 13. 测试计划

后端单元测试：

- 公共摘要在无 pricing 数据时返回成功。
- 公共摘要不包含用户字段。
- `pricing_visible` 与 `HeaderNavModules` 配置一致。
- 登录摘要只能读取当前 session 用户。
- 登录摘要不包含敏感字段。
- 近 7 天用量聚合范围正确。

回归测试：

- `GET /api/home_page_content` 响应结构不变。
- `GET /api/status` 响应结构不变。
- `GET /api/pricing` 原访问控制不变。
- 自定义首页配置存在时前端仍使用自定义内容。

推荐命令：

```bash
go test ./controller ./service ./middleware ./model
cd web/default
bun run build
```

如修改了前端 i18n，还需执行：

```bash
cd web/default
bun run i18n:sync
```

## 14. 验收标准

### 功能验收

- 未登录用户访问默认首页不需要登录态接口即可渲染。
- 已登录用户可通过个人摘要接口获取已换算后的展示余额、展示已用金额、请求数、可用模型数和近 7 天聚合展示用量。
- 价格页关闭或要求登录时，首页公共摘要能反映正确可见性。
- 文档入口仍可见，但不主导首屏。
- 自定义首页内容仍优先于默认首页。

### 安全验收

- 匿名首页摘要不返回任何个人数据。
- 登录首页摘要不返回 Token、密钥、邮箱、OAuth ID、用户组权限、请求明细。
- 接口不允许通过参数读取其他用户摘要。
- 接口遵循现有限流和鉴权中间件。

### 工程验收

- Go 测试通过。
- 前端构建通过。
- 未引入数据库迁移。
- 未引入新大型依赖。
- 未修改受保护项目和组织身份信息。
- 未出现直接 `json.Marshal` / `json.Unmarshal` 业务调用。

## 15. 风险与降级

| 风险 | 影响 | 降级方案 |
| --- | --- | --- |
| 首页聚合接口开发延期 | 影响真实摘要，不影响视觉改版 | 前端使用静态 dashboard preview 完成 P0。 |
| pricing 数据为空或计算失败 | 首页统计数字异常 | 返回 `0` 或隐藏具体数字，保留文案。 |
| 价格页权限配置与 CTA 不一致 | 用户点击后 403 | `pricing_visible` 复用后端导航模块访问规则。 |
| 个人摘要接口变慢 | 已登录首页首屏慢 | 个人摘要异步加载，默认展示静态预览。 |
| 自定义首页内容缓存过期 | 管理员配置更新延迟 | 保持现有行为，P1 公共摘要 TTL 不超过 60 秒。 |

## 16. 里程碑

| 里程碑 | 内容 | 预计产出 |
| --- | --- | --- |
| M1 | P0 联调确认 | 确认现有接口满足首页改版基础需求。 |
| M2 | P1 后端接口开发 | `/api/home/landing`、`/api/home/self_summary`、单元测试。 |
| M3 | 前后端联调 | 首页使用聚合接口，CTA 与权限状态一致。 |
| M4 | 回归验收 | 后端测试、前端构建、自定义首页覆盖、敏感字段检查。 |
