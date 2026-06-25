# 首页用户友好化改版前端开发 PRD

## 1. 文档背景

参考产品文档：[homepage-user-friendly-redesign-prd.md](homepage-user-friendly-redesign-prd.md)。

当前默认首页的表达重心偏向开发者和基础设施：首屏展示 API Gateway、终端请求示例、协议兼容、上游路由、JSON、curl 等内容。该表达对开发者有效，但普通用户第一次访问时很难立即理解“这个产品能帮我统一使用和管理多个 AI 模型与应用”。

本前端开发 PRD 的目标是把产品需求转化为可执行的前端任务：在不改动后端核心逻辑、不引入新设计系统、不破坏自定义首页覆盖能力的前提下，将默认首页调整为普通用户优先、开发者入口保留的产品首页。

## 2. 产品理解

首页改版不是削弱 API 能力，而是调整信息层级：

1. 首屏先讲普通用户能理解的结果：一个账号管理模型、余额、额度、账单、用量和常用 AI 工具连接。
2. 技术能力后置：文档、兼容接口、API Key、请求日志、成本统计、速率限制等内容保留在开发者区块。
3. 视觉从“终端代码演示”改为“产品控制台预览”，用余额、用量、模型、应用、连接状态、请求成本等概念降低理解成本。
4. CTA 根据登录态和站点配置保持一致：未登录优先注册，已登录进入控制台，价格和文档入口保留但不主导首屏。

## 3. 当前前端现状

默认首页入口：

- `web/default/src/features/home/index.tsx`

当前首页渲染顺序：

1. `Hero`
2. `Stats`
3. `Features`
4. `HowItWorks`
5. `CTA`
6. `Footer`

关键组件：

- `web/default/src/features/home/components/sections/hero.tsx`
- `web/default/src/features/home/components/hero-terminal-demo.tsx`
- `web/default/src/features/home/components/sections/stats.tsx`
- `web/default/src/features/home/components/sections/features.tsx`
- `web/default/src/features/home/components/sections/how-it-works.tsx`
- `web/default/src/features/home/components/sections/cta.tsx`
- `web/default/src/features/home/hooks/use-home-page-content.ts`
- `web/default/src/features/home/api.ts`

当前已具备能力：

- `HomePageContent` 自定义首页内容存在时，会覆盖默认首页。
- `useAuthStore` 可判断登录态。
- `useStatus` 可读取 `/api/status`，包含 `docs_link`、注册开关、OAuth 开关、导航模块配置等公共状态。
- `getFreshModuleAccess('pricing')` 已用于价格页访问控制。
- i18n 使用 `t('English source key')` 和 `web/default/src/i18n/locales/{lang}.json`。

当前主要问题：

- Hero 标题、徽标和说明仍以 Gateway、Infrastructure、API protocol 为核心。
- Hero 右侧默认展示 `HeroTerminalDemo`，首屏会出现代码、请求路径和 JSON 语义。
- Stats 中有 `upstream services integrated`、`compatible API routes`、`scheduling controls` 等系统视角文案。
- Features 第一层仍以 `Lightning Fast`、`Developer Friendly` 等开发者或系统能力为主。
- HowItWorks 步骤从配置 API Key、Channel、compatible API routes 切入，对普通用户不友好。
- CTA 文案仍强调 gateway、upstream services。

## 4. 目标

### 4.1 P0 目标

- 将默认首页改为普通用户优先的产品叙事。
- 首屏不展示 curl、完整 API endpoint、JSON request body。
- 新增产品控制台预览组件，替换首屏终端演示。
- 保留价格页、文档、控制台、注册入口。
- 保留自定义首页覆盖行为。
- 保持 React 19、TypeScript、Tailwind、现有组件库和 i18n 规范。
- 不新增大型依赖，不新增后端依赖。

### 4.2 P1 目标

- 若后端提供 `GET /api/home/landing` 和 `GET /api/home/self_summary`，前端可逐步接入聚合接口。
- 聚合接口不可用时，首页仍使用静态产品预览和 `/api/status` 正常渲染。
- 为后续真实指标、登录用户摘要和 CTA 可见性联动预留类型与 hook 边界。

### 4.3 P2 目标

- 为 CTA 点击事件预留轻量埋点函数，但本期不引入新分析 SDK。
- 可在后续复用已有事件接口或后端新增事件接口。

## 5. 非目标

- 不修改登录、注册、计费、充值、模型管理、Token 管理、渠道管理业务逻辑。
- 不修改或删除受保护的项目身份、组织身份、版权、许可证、归属信息。
- 不新增后端表结构或迁移。
- 不引入新的设计系统。
- 不新增第三方分析平台。
- 不把普通用户首页改成纯营销落地页；首页第一屏必须仍是可理解的产品入口。

## 6. 信息架构

默认首页建议顺序：

1. Hero：普通用户价值主张 + CTA + 支持应用入口 + 产品控制台预览。
2. Stats：普通用户可理解的模型、计费模型、应用集成、用量记录指标。
3. Product Preview / Benefits：模型、余额、用量、成本、应用连接、团队权限等核心收益。
4. Supported Apps and Models：展示常用 AI 工具和主流模型服务。
5. Steps to Start：创建账号、获取连接设置、粘贴到 AI 工具、查看用量成本。
6. Developer Access：保留 API 兼容、文档、Key、日志、限速等能力入口。
7. Final CTA：未登录用户注册或查看价格；已登录用户可隐藏或进入控制台。

P0 可以不新增独立 `Supported Apps and Models` section，但 Hero 和 Benefits 中必须覆盖支持应用、模型、用量、余额、成本概念。

## 7. 组件设计与开发任务

### 7.1 首页入口

文件：

- `web/default/src/features/home/index.tsx`

开发要求：

- 保持 `useHomePageContent()` 逻辑不变。
- 当 `content` 非空时，继续完全覆盖默认首页。
- 默认首页继续使用 `PublicLayout showMainContainer={false}`。
- 默认首页外层需要避免横向滚动，保持现有 `overflow-x-hidden` 或在 section 内处理溢出。
- 将新增或调整后的 section 按信息架构重新组合。

验收标准：

- 自定义 Markdown 首页和 iframe 首页行为不变。
- 未配置自定义首页时才展示新版默认首页。

### 7.2 Hero 改造

文件：

- `web/default/src/features/home/components/sections/hero.tsx`
- 新增 `web/default/src/features/home/components/home-dashboard-preview.tsx`

文案要求：

- Hero 主标题使用：`One account for leading AI models`
- Hero 描述使用：`Manage models, quota, billing, and usage records in one place. Connect ChatGPT, Claude, Gemini, DeepSeek, and other services to the AI tools you already use.`
- 主 CTA：未登录为 `Get Started`，已登录为 `Go to Dashboard`。
- 次 CTA：`View Pricing`。
- 开发者入口：`Developer Docs`。

视觉要求：

- 移除首屏 `HeroTerminalDemo`。
- 用 `HomeDashboardPreview` 替换终端演示。
- 首屏不得出现 curl、完整 API endpoint、JSON request body。
- 背景避免大面积紫蓝渐变主导，可使用克制的中性色、边框、浅色背景层、少量品牌色强调。
- 移动端布局为单列，产品预览必须在 360px 宽度下不横向溢出。

CTA 规则：

- 已登录：主 CTA 跳转 `/dashboard`。
- 未登录且注册可用：主 CTA 跳转 `/sign-up`。
- 未登录但注册不可用：主 CTA 建议显示 `Sign In` 并跳转 `/sign-in`，避免把用户带到不可用注册页。
- `View Pricing` 仅在价格模块启用时展示；若价格模块要求登录且当前未登录，允许跳转 `/pricing`，由路由带 redirect 登录，也可直接跳转 `/sign-in?redirect=/pricing`，但项目内应保持一种一致策略。
- `Developer Docs` 使用 `status.docs_link`；外链必须 `target="_blank"` 且 `rel="noopener noreferrer"`。

状态依赖：

- 使用 `useAuthStore` 判断登录态。
- 使用 `useStatus` 读取 `docs_link`、`register_enabled`、`password_register_enabled`、`oauth_register_enabled`、`HeaderNavModules`。
- 使用 `parseHeaderNavModulesFromStatus` 或现有 nav helper 判断 pricing 是否启用，避免 CTA 与价格路由访问控制不一致。

验收标准：

- 首屏标题不使用 Gateway、Infrastructure、Protocol 作为核心概念。
- 首屏至少展示 3 个普通用户概念：models、balance、quota、billing、usage、apps、connection status、cost。
- 文档入口存在但不是首个 CTA。

### 7.3 产品控制台预览组件

新增文件：

- `web/default/src/features/home/components/home-dashboard-preview.tsx`

组件目标：

- 用静态产品预览表达真实用户能理解的控制台能力。
- P0 不依赖登录接口，不展示真实用户敏感数据。
- P1 后可接入 `/api/home/self_summary`，但必须确保只展示后端聚合后的展示值。

建议内容：

- Current Balance：例如 `$2.40`。
- Monthly Usage：例如 `$0.69` 或 `1,284 requests`。
- Frequently Used Models：ChatGPT、Claude、Gemini、DeepSeek。
- Connected Applications：Cherry Studio、Open WebUI、LobeChat、ChatBox。
- Recent Request Status：Succeeded、Queued、Stable。
- Example Request Cost：例如 `$0.0021`。
- Connection Config：展示“Copy config”概念，但不得展示真实 token、完整 endpoint 或密钥。

实现要求：

- 使用已有 Tailwind 样式和 `lucide-react` 图标。
- 不新增 UI 依赖。
- 所有展示文案进入 i18n。
- 数值为静态演示值时，命名和注释应明确为 demo preview，避免误认为真实账户数据。
- 不使用 nested cards；组件内部可以是一个产品预览面板，面板内用列表、行、徽标、进度条等组织信息。
- 所有尺寸使用稳定布局，避免 hover 或翻译文案导致布局跳动。

验收标准：

- 组件在 light/dark mode 都可读。
- 组件在 360px、768px、1440px 宽度下不溢出。
- 不包含真实 token、用户邮箱、用户组、权限、请求明细。

### 7.4 Stats 改造

文件：

- `web/default/src/features/home/components/sections/stats.tsx`

替换指标：

- `50+` / `leading model services`
- `100+` / `billable models`
- `4+` / `AI app integrations`
- `Real-time` / `usage and cost records`

实现要求：

- `Counter` 目前只支持 number，可为 `Real-time` 增加静态文本支持，或把第四项改为数值型但文案必须普通用户可理解。
- 删除或不再使用 `upstream services integrated`、`compatible API routes`、`scheduling controls`。
- 保持 reduced motion 逻辑。

验收标准：

- Stats 文案无需技术背景即可理解。
- 不出现 `upstream services`、`API routes`。

### 7.5 Benefits / Features 改造

文件：

- `web/default/src/features/home/components/sections/features.tsx`

推荐卡片：

1. `Unified model access`
   `Use multiple model providers through one account and one control surface.`
2. `Clear usage and cost`
   `See balance, request records, and per-use costs in real time.`
3. `Works with common AI tools`
   `Connect to Cherry Studio, Open WebUI, LobeChat, ChatBox, and similar clients.`
4. `Team sharing and permissions`
   `Manage members, quota, permissions, and records in one place.`
5. `Reliable availability`
   `Reduce interruptions and repeated configuration through managed service routing.`
6. `Developer-ready access`
   `Keep compatible APIs and documentation available for advanced integrations.`

实现要求：

- 前 5 张卡片标题不能使用开发者专用术语。
- `Developer-ready access` 可以保留，但不得排在第一位。
- 每个说明必须讲用户结果，不只讲系统能力。
- 可保留现有 bento grid，但需要避免视觉过重和单一紫蓝色。
- 可使用 `Boxes`、`WalletCards`、`PlugZap`、`Users`、`ShieldCheck`、`Code2` 等 lucide 图标。

验收标准：

- `Developer Friendly` 不作为第一层主卖点。
- `Load Balancing`、`Rate Limiting` 等术语不出现在普通用户 benefit 标题中。

### 7.6 Steps to Start 改造

文件：

- `web/default/src/features/home/components/sections/how-it-works.tsx`

步骤文案：

1. `Create an account`
   `Sign up and enter the console.`
2. `Get connection settings`
   `Create a token and choose available models or plans.`
3. `Paste into your AI tool`
   `Use the configuration in Cherry Studio, Open WebUI, LobeChat, or another supported client.`
4. `Track usage and cost`
   `Check balance, request records, and cost details anytime.`

实现要求：

- 从 3 步扩展为 4 步。
- 至少一个步骤显式提及常用 AI 工具。
- 至少一个步骤显式提及 usage、cost、balance 或 quota。
- 移除以 Channel、API route、upstream 为核心的说明。

验收标准：

- 普通用户能按步骤理解如何开始使用。
- 移动端步骤纵向排列，桌面端可 4 列或 2x2。

### 7.7 Developer Access Section

建议新增文件：

- `web/default/src/features/home/components/sections/developer-access.tsx`

目标：

- 保留开发者入口，但放在普通用户 onboarding 内容之后、最终 CTA 之前。

推荐标题：

- `Full access for developers too`

推荐内容：

- OpenAI, Claude, and Gemini-compatible interfaces.
- API key management.
- Request logs.
- Cost statistics.
- Rate limits.
- Documentation entry.

实现要求：

- 文档按钮读取与 Hero 相同的 docs URL。
- 不展示完整 curl、JSON request body 或真实 endpoint。
- 可以使用抽象的能力列表、图标和简短文案。
- 技术内容不得回到首屏主导位置。

验收标准：

- 文档入口可见。
- API 能力有表达。
- Developer section 位于 Hero、Stats、Benefits、Steps 之后。

### 7.8 Final CTA 改造

文件：

- `web/default/src/features/home/components/sections/cta.tsx`

文案建议：

- 标题：`Start using leading AI models with one account`
- 描述：`Connect your favorite AI tools, manage quota and cost, and keep every request visible from one console.`
- CTA：未登录显示 `Get Started` 和 `View Pricing`；已登录可显示 `Go to Dashboard` 或保持隐藏，二选一需与产品确认。P0 建议已登录隐藏，减少重复入口。

实现要求：

- 不再使用 `Deploy your own gateway`、`upstream services` 等文案。
- CTA 的注册和价格可见性规则与 Hero 保持一致。

验收标准：

- 末屏文案仍面向普通用户。
- 已登录用户不会看到错误的注册入口。

## 8. i18n 要求

所有新增和修改的前端展示文本必须使用：

```tsx
t('English source key')
```

涉及文件：

- `web/default/src/i18n/locales/en.json`
- `web/default/src/i18n/locales/zh.json`
- `web/default/src/i18n/locales/fr.json`
- `web/default/src/i18n/locales/ru.json`
- `web/default/src/i18n/locales/ja.json`
- `web/default/src/i18n/locales/vi.json`

开发要求：

- 不在组件中硬编码中文、法语、日语、俄语、越南语等本地化展示文本。
- 英文源字符串作为 flat JSON key。
- 新增 key 后执行：

```bash
cd web/default
bun run i18n:sync
```

- 如果 `i18n:sync` 只补齐英文源 key，需人工补齐 zh/fr/ru/ja/vi 翻译。
- 参考项目翻译术语表：
  - `docs/translation-glossary.md`
  - `docs/translation-glossary.fr.md`
  - `docs/translation-glossary.ru.md`

验收标准：

- 构建时无缺失 key 报错。
- 新首页主要文案在六种语言文件中都有对应翻译。

## 9. 数据与接口策略

### 9.1 P0 数据策略

P0 首页改版不依赖新增后端接口。

可使用现有数据：

- `/api/home_page_content`：继续处理自定义首页覆盖。
- `/api/status`：读取 docs、注册开关、OAuth 注册、导航模块配置、站点配置。
- auth store：判断当前用户是否登录。

产品预览、指标和应用列表使用静态展示数据，但必须是通用演示数据，不得模拟真实用户身份。

### 9.2 P1 聚合接口预留

如后端完成聚合接口，可新增：

- `getHomeLandingSummary()` -> `GET /api/home/landing`
- `getHomeSelfSummary()` -> `GET /api/home/self_summary`

建议新增类型：

- `HomeLandingSummary`
- `HomeSelfSummary`
- `HomeDisplayAmount`

建议新增 hook：

- `web/default/src/features/home/hooks/use-home-landing-summary.ts`
- `web/default/src/features/home/hooks/use-home-self-summary.ts`

降级策略：

- 聚合接口失败时，不阻塞首页渲染。
- 公共指标降级为静态文案。
- 登录用户摘要失败时，产品预览继续展示 demo 状态。

安全要求：

- 前端不得从首页接口读取或展示 token、API key、邮箱、OAuth ID、用户组权限、请求明细。
- 若后端返回原始 quota 单位，前端不得直接显示为余额；必须等待后端提供展示值或使用现有货币格式化工具明确转换。

## 10. 视觉与响应式要求

整体方向：

- 专业、清晰、可信、普通用户友好，同时保留开发者可信度。
- 避免首屏终端代码视觉。
- 避免大面积紫蓝渐变统治页面。
- 使用真实产品语义的预览面板：models、apps、balance、usage、cost、status。

响应式要求：

- 360px 宽度无横向滚动。
- 768px 宽度布局自然折行。
- 1440px 宽度信息密度合理，不出现首屏空洞。
- 按钮文案在 zh/fr/ru/ja/vi 下不溢出。
- 卡片和面板内文本不得重叠。
- 图标按钮或外链需要可访问名称或清晰文本。

暗色模式：

- 所有文本对比度足够。
- 边框、背景层、状态色在 dark mode 下可读。
- 产品预览里的状态徽标不能只靠颜色表达。

## 11. 开发拆分

### Task 1：Hero 信息层级和 CTA

- 替换 Hero 标题、描述、徽标文案。
- 根据登录态和注册配置确定主 CTA。
- 根据 pricing 模块配置控制 `View Pricing`。
- 将 `Docs` 文案调整为 `Developer Docs`。
- 移除首屏 `HeroTerminalDemo` 引用。

### Task 2：新增 `HomeDashboardPreview`

- 新增产品预览组件。
- 放入 Hero 右侧。
- 覆盖余额、用量、模型、应用、连接状态、成本、复制配置概念。
- 保证响应式和暗色模式。

### Task 3：Stats 普通用户化

- 替换指标文案。
- 支持静态文本指标或调整 Counter。
- 保留 reduced motion。

### Task 4：Features 普通用户化

- 替换主 benefit 数据。
- 调整排序和图标。
- 保留开发者卡片但后置。

### Task 5：HowItWorks 四步化

- 改为 4 步。
- 增加 AI 工具、余额、用量、成本表达。
- 调整桌面和移动端布局。

### Task 6：Developer Access Section

- 新增开发者入口 section。
- 首页入口中插入到 HowItWorks 后、CTA 前。
- 复用 docs URL 逻辑。

### Task 7：Final CTA 改造

- 替换 CTA 文案。
- CTA 可见性规则与 Hero 对齐。

### Task 8：i18n 同步与翻译

- 执行 `bun run i18n:sync`。
- 补齐 zh/fr/ru/ja/vi。
- 检查无硬编码本地化文本。

### Task 9：构建与视觉验收

- 执行 typecheck/build。
- 本地启动开发服务器并截图验证桌面和移动端。
- 检查首屏无 curl、endpoint、JSON request body。

## 12. 验收标准

### 12.1 功能验收

- 未登录用户访问默认首页时，首屏展示普通用户价值主张。
- 已登录用户首屏主 CTA 跳转 `/dashboard`。
- 未登录且注册可用时，`Get Started` 跳转 `/sign-up`。
- 注册关闭时，首页不应把主 CTA 指向不可用注册页。
- `View Pricing` 与价格模块配置一致。
- `Developer Docs` 使用配置的文档链接。
- 自定义首页内容存在时，默认新版首页不渲染。
- 移动端无横向滚动。
- 暗色模式渲染正确。

### 12.2 内容验收

- Hero 不展示 curl。
- Hero 不展示完整 API endpoint。
- Hero 不展示 JSON request body。
- Hero 不以 Gateway、Infrastructure、Protocol 作为核心标题概念。
- 首页保留开发者文档入口。
- 首页保留支持应用信息。
- 首页解释 models、usage、quota 或 balance、cost。
- Stats 不使用 `upstream services`、`API routes`。
- 前 5 个 benefit 标题不使用开发者专用术语。

### 12.3 工程验收

- TypeScript 检查通过。
- 前端构建通过。
- i18n key 已同步并补齐。
- 未引入大型新依赖。
- 未修改受保护项目身份、组织身份、版权、许可证、归属信息。
- 未包含无关重构。

推荐命令：

```bash
cd web/default
bun run typecheck
bun run build
bun run i18n:sync
```

如改动后需要完整检查：

```bash
cd web/default
bun run build:check
```

## 13. 截图验收

需要输出截图：

- Desktop light：1440px 宽。
- Desktop dark：1440px 宽。
- Mobile light：390px 宽。
- Mobile dark：390px 宽。

截图重点：

- 首屏标题、CTA、产品预览是否完整。
- 产品预览内文本是否溢出。
- Steps 和 Benefits 在移动端是否纵向清晰。
- 文档和价格入口是否可见但不抢主 CTA。

## 14. 风险与降级

| 风险 | 影响 | 降级方案 |
| --- | --- | --- |
| 注册关闭但 CTA 仍指向 `/sign-up` | 用户点击后无法完成转化 | Hero/CTA 根据 `register_enabled`、`password_register_enabled`、`oauth_register_enabled` 切换到登录入口 |
| 价格模块关闭但首页仍展示 `View Pricing` | 点击后被重定向，体验不一致 | 复用 `HeaderNavModules.pricing` 判断可见性 |
| 翻译文案过长 | 移动端按钮或卡片溢出 | 按钮允许换行或收窄文案，卡片设置稳定宽度和换行 |
| 产品预览被误解为真实数据 | 用户误认为余额和用量是真实账户信息 | 使用通用示例数据，避免个人化措辞，P1 接真实摘要前不展示“Your real balance”等语义 |
| 后端聚合接口延期 | 无法展示真实指标 | P0 使用静态预览和现有 `/api/status` 完成上线 |
| 视觉过度营销化 | 失去开发者可信度 | Developer Access section 保留 API、文档、日志、成本统计等能力 |

## 15. 交付物

前端实现完成后应交付：

1. 更新后的默认首页代码。
2. 新增 `HomeDashboardPreview` 组件。
3. 普通用户优先的新首页文案。
4. 更新后的 i18n keys 和六语言翻译。
5. 构建和类型检查结果。
6. 桌面和移动端截图。
7. 简短实现说明：本次如何从开发者优先改为普通用户优先，以及保留了哪些开发者入口。

