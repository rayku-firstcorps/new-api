# new-api 会话进度

> 此文件由 AI 在每次会话结束时更新，用于下次会话快速恢复上下文。
> 请勿手动大幅修改，保持结构稳定以便脚本解析。

## 当前 Stage

**Stage 3** — 用户引导 First Setup 与注册赠送配置（stage3-user-onboarding，2026-11-27 用户决定开启）

目标：按 `docs/prd/user-onboarding-first-setup-plan.md` 与 `docs/prd/user-onboarding-first-setup-prompts.md`（P1–P9）实现；本 Stage 允许后端改动。out_of_scope 以 `.harness/feature_list.json` 为准。Stage 2 原 out_of_scope（后端任何改动；删除或精简原有功能；KuCode 原型独有功能；首页定价区）仍适用于未完成的 kucode-* 项，本 Stage 不收尾 kucode-* 项。

以下为 Stage 2 说明（保留）：

**Stage 2** — KuCode 前端换肤（stage2-kucode-skin）

目标：参考 KuCode 原型（`C:\Users\Administrator\Desktop\kucode-landing-page`，计划见其 `prompts/new-api-rebuild-plan.md`）只改布局和样式；new-api 功能不删减、不新增，后端零改动，变更只在 `web/`。旧 Stage 1 推广链接的待办已按用户要求移除。

## 功能进度

| 功能 | 状态 | 说明 |
|---|---|---|
| homepage-linuxdo-offers | done | 首页 Telegram、WhatsApp 旁增加 LinuxDo 优惠入口；通过后台官方社区配置 HTTPS 链接、排序和启停，支持七语言 |
| homepage-regional-base-url | done | 站点系统信息新增大陆直连优化地址；首页额外展示并独立复制，支持裸域名补 HTTPS、空配置隐藏、七语言与窄屏 |
| homepage-light-theme-fix | done | 首屏 CTA 与接入面板改为跟随全站主题；修复浅色模式的固定深色背景和白色 OpenAI 图标 |
| homepage-cta-model-cards | done | 首页 CTA 参考 sample 截图，展示近 24 小时调用量前三的模型卡片（供应商、排名、标签、输入/输出价格、上下文/最大输出）；字段缺失不展示，不公开调用次数 |
| homepage-client-brand-icons | done | 首页两处 Codex/Codex CLI、Claude Code、Cherry Studio 改用新增原色 SVG，复用统一品牌图标组件 |
| homepage-model-brand-icons | done | 首页接入示意和工具展示区的四个模型改用指定目录品牌图标；原色 SVG + OpenAI 深色背景白色素材 |
| homepage-community-actions | done | 首页主操作区以 Telegram、WhatsApp 社群按钮替代开发者文档；沿用后台配置与安全过滤，其他社交链接和全站文档导航不变 |
| homepage-popular-model-cta | done | 底部 CTA 展示近 24 小时调用量最高且仍在模型广场展示的模型；保持具体次数不公开，无数据时使用原 CTA |
| homepage-layout-motion | done | 默认首页改为深色双栏首屏、接入示意、工具生态、步骤与 CTA；增加入场、连接流光和悬停动效，完成响应式与减少动态效果验证 |
| utf8-file-reading | done | 项目文本文件读取统一显式使用 UTF-8 编码 |
| upstream-merge-preserve-custom-ui | done | 2026-11-23 合并 upstream/main（51a1ceeae，40 个提交），版本 rc.51；Go、前端、浏览器及三库验证通过 |
| antom-safari-popup-plan | done | 已输出 Safari 下 Antom 支付弹窗优化实施计划，未修改支付业务代码 |
| antom-safari-popup-fix | done | 已实现 Antom 支付窗口同步预开、失败清理和同页降级；待部署环境 Safari 真机验收 |
| seo-technical-optimization | done | 已补齐站点分享元数据、路由级 canonical/noindex、robots.txt 与 sitemap.xml；保留受保护项目标识 |
| kucode-design-tokens | in_progress | KuCode 配色映射到 shadcn token，默认深色，图表跟随主题；待浏览器视觉验收 |
| kucode-remove-theme-presets | done | 删除 10 个主题预设及字体/圆角/缩放/布局选项，只保留深/浅/跟随系统；旧存储值清理 |
| kucode-color-cleanup | done | 硬编码 Tailwind 调色板类清零；剩余十六进制为 token、画布配色、品牌/二维码白名单 |
| kucode-provider-icons | in_progress | 品牌图标全站单色，撤销 homepage-client-brand-icons / homepage-model-brand-icons 的彩色图标；上传图片图标的中性底色待办 |
| kucode-ui-primitives | in_progress | components/ui 改为 KuCode 风格，props 与行为不变；待视觉验收 |
| kucode-console-shell | in_progress | 控制台侧栏/顶栏换肤，配置与角色控制不变；待视觉验收 |
| kucode-public-shell | in_progress | 公共导航/页脚换肤，受保护链接保留；待视觉验收 |
| kucode-brand-defaults | in_progress | 新增 web/public/kucode-mark*.svg；运营需在后台设置 SystemName/Logo/页脚并清空自定义首页 |
| kucode-home | in_progress | 按用户要求首页严格照 KuCode：首屏 → 供应商 → 功能 → 使用步骤示意图 → 代码示例 → FAQ（后台 faq 数据，空则隐藏）→ CTA；区块标题不显示（保留 sr-only）；无定价区；首页不再展示工具网格、接入示意、社群按钮、大陆直连地址、热门模型卡片（对应功能与后台配置保留）；点阵球体为共享组件 components/dot-sphere；浏览器测试已重写未跑 |
| kucode-model-square | in_progress | 模型广场 KuCode 布局，筛选/排序/分组定价全部保留；2026-11-26 补完页头（标签/两段色标题/统计条/球体弧）、卡片、表格固定列、抽屉（手机底部弹出）、详情页容器；待浏览器视觉验收 |
| kucode-auth-pages | in_progress | 登录注册页 KuCode 布局，认证逻辑零改动；2026-11-26 补齐两段色标题+副标题、44px 表单控件（`styles/auth.css` 限定 `.auth-form`）、前景色主按钮、OAuth 置顶+分隔线、底部切换链接、右栏按页标题/浮动供应商标签/统计/注册 base_url 卡片、页脚法律链接；待真机键盘与浅色主题验收 |
| kucode-console-overview | in_progress | 总览 KPI/面板布局，原数据保留；页头副标题待 SectionPageLayout 支持 |
| kucode-api-keys | in_progress | Key 页换肤，表单与查看/复制不变 |
| kucode-usage-logs | in_progress | 使用日志 KuCode 布局，筛选/列/导出保留 |
| kucode-audit-log | in_progress | 审计 KuCode 布局；未做按天分组与 Sheet 详情 |
| kucode-billing | in_progress | 钱包 KuCode 布局，所有支付流程不变（含 Antom Safari 预开窗口）；需沙箱验证 |
| kucode-docs | in_progress | /docs 按用户决定（D17）只保留 CC Switch 指南（模型 claude-opus-5-5），单页正文 + 本页目录；深/浅插画随主题；深浅主题 1440/1920/768/390 已截图核对，键盘待人工验收 |
| kucode-restyle-t4 | in_progress | 其余页面仅换样式（继承 token/基础组件）；渠道/系统设置区块框架等细化待办 |
| onboarding-new-user-quota-switch | done | 2026-11-27 新增 quota_setting.new_user_quota_enabled（默认 false）/ new_user_quota_require_email（默认 true），operation_setting.IsNewUserQuotaEnabled()/IsNewUserQuotaRequireEmail()；TryGrantNewUserQuota 按开关与邮箱前置判定，改用 lockForUpdate + NewUserQuotaRewarded 幂等；触发点 Register、FinalizeOAuthUserCreation、WeChat 新建、EmailBind；model.InitNewUserQuotaSwitchOption 启动时 OnConflict DoNothing 持久化一次（QuotaForNewUser>0 则启用，管理员关闭不被覆盖）；QuotaForNewUser 保存校验 0..MaxWalletQuota；七语言 2 个 key；SQLite / MySQL 5.7.44 / PostgreSQL 9.6.24 测试通过，verify.sh 7/7。未做“最新发布版数据库升级”实测 |
| onboarding-setting-and-state | done | 2026-11-27 新增 onboarding_setting（enabled/auto_open_on_first_login/allow_inline_test_request/show_cc_switch/admin_guide_enabled，默认 true，GetOnboardingSetting()）；/api/status 增加 onboarding_* 与 new_user_quota_enabled/amount/require_email（auto_open 未与 enabled 预先合并，前端需同时判断）；UserSetting 增加 onboarding_completed/dismissed/use_case；新增 PUT /api/user/onboarding（UserAuth，部分更新白名单字段）；/api/user/self 返回 new_user_quota_rewarded（setting 为 JSON 字符串需前端解析）；SQLite/MySQL 5.7/PostgreSQL 9.6 通过，verify.sh 9/9 |
| onboarding-admin-settings-ui | done | 2026-11-27 额度设置新增注册赠送总开关（关闭时金额置灰保留）与仅邮箱后发放开关（关闭需 ConfirmDialog 并持续显示风险 Alert）；新增 /system-settings/operations/onboarding（OnboardingSettingsSection，总开关 + 4 子开关）；类型 OnboardingStatusFields/UserOnboardingSetting/UpdateOnboardingRequest/SelfResponseOnboardingFields 在 features/auth/types.ts；七语言 19 key；system-settings 26 文件/303 测试、typecheck、verify.sh 6/6 通过。编排者修正：P2 的 "Invalid onboarding use case" 误放在 locale 顶层，已移入 translation，i18n:sync missing/extras 0 |
| onboarding-wizard-shell | done | 2026-11-27 抽离 `web/src/components/wizard/`（WizardShell + StepNavigation，新增 submitLabel/submittingLabel）；/setup 改用壳且行为不变，初始化后跳 /sign-in?from=setup（sign-in search schema 增加 from）；新增 WizardShell 4 例、SetupWizard 2 例测试；typecheck、全量 vitest 264 文件/3084 例、build:check、verify.sh 7/7 通过。UsageModeStep 绑定 SetupFormValues 未移动，P5 需自建卡片单选 |
| onboarding-user-wizard-core | done | 2026-11-27 新增 features/onboarding/ 与 /onboarding 路由：Step 1 自建场景卡片单选；Step 2 额度区块（自用模式/余额/绑邮箱领取（内联 EmailBindDialog）/0 余额）+ 原地建 Key 或预选已启用 Key（完整 Key 仅内存）；Step 3 占位（components/connect-step.tsx，props useCase/selectedKey）；自动触发在 Overview 首屏 useOnboardingAutoOpen（判定集中于 lib/availability.ts，管理员一律不进入）；跳过/完成写 PUT /api/user/onboarding 与 onboarding_progress:u_<id>；Overview 顶栏 Quick start 入口；注册页赠送提示；七语言 37 key；全量 vitest 267 文件/3111 例、typecheck、build:check、verify.sh 7/7 通过。未在登录态下人工点测 |
| onboarding-user-wizard-connect | done | 2026-11-27 Step 3 按场景：coding 内嵌 CCSwitchPanel（features/keys/components/cc-switch-panel.tsx，CCSwitchDialog 改为外壳）+ 手动配置；api 为 CodeSnippetTabs（components/code-snippet-tabs.tsx）+ buildConnectSnippets（lib/connect-snippets.ts）四语言，展示脱敏 Key、复制完整 Key，inline_test 开启时同源 fetch /v1/chat/completions（Bearer 用户 Key、credentials omit、max_tokens 16）并映射 401/402/404/429/网络错误；playground 带 ?model= 跳转（范围扩展至 playground 路由，只接受模型名）；完整 Key 仅内存；七语言 32 key；全量 vitest 269 文件/3127 例、typecheck、build:check、verify.sh 5/5 通过 |
| onboarding-admin-first-setup | done | 2026-11-27 管理员向导（admin-onboarding-wizard.tsx）：总开关+auto_open+admin_guide 开启、role>=ADMIN、未完成/跳过且渠道数为 0（getChannels total，失败不阻塞）时 Overview 自动进入；三步：厂商卡片跳 /channels?onboarding=channel（ChannelsReturnBanner 打开新建抽屉并可返回 /onboarding?step=1）→ 渠道/模型数与修复指引 → 复用 ApiKeyBlock/ModelField/TestRequestBlock；完成记 use_case=api；范围扩展 channels 路由与 features/channels/index.tsx；provider 参数仅透传（抽屉无预设 API）；七语言 36 key；verify.sh 5/5 |
| onboarding-overview-refine | done | 2026-11-27 引导未完成隐藏 Recommended actions、首个未完成步骤高亮+CTA、弹窗内复用 ApiKeyBlock 建 Key；自用模式去掉 Add credits；RequestPreview 改 CC Switch/curl/Python Tab、不截断、Playground 与 /docs 入口；SummaryCards 新用户显示 Not topped up yet；折叠状态 dashboard_overview_setup_guide_expanded:u_<id>（旧全局 key 首个账号一次性迁移）；挂载/聚焦刷新 /api/user/self；AuthUser 增加 new_user_quota_rewarded；12 例新测试。编排者全量复核：verify.sh 全部 onboarding 检查 41/41 通过（4 个失败为 Stage 1 promotion 旧检查指向已移除的 web/default）、build:check 通过、改动文件 oxlint 无 error、i18n:sync missing/extras 0 |
| playground-responses-image | done | 2026-11-27 用户明确批准的 Stage 3 外独立需求。后端：新增 POST /pg/responses（controller.Playground 增加 relayFormat 参数，临时 token/分组校验/计费与 /pg/chat/completions 一致），distributor 两处 /pg/chat/completions 判断放宽为 /pg/，Path2RelayMode 把 /pg/responses 映射为 RelayModeResponses，access token 规则补 POST /pg/responses。前端：/api/pricing 中 supported_endpoint_types 含 image-generation 的模型自动走 /pg/responses 流式（总是流式、不发采样参数），解析 output_text/reasoning delta、output_item.done(image_generation_call.result)、partial_image、completed/failed/error；sse.js 按 event 名分发，故逐个监听 Responses 事件；图片存 Message.images 用 ai-elements Image 渲染（Image 的 uint8Array 改为可选），保存 localStorage 时丢弃 base64，刷新后显示占位；七语言 1 key。真实上游探测 1 次确认事件格式；假上游 + 工作区构建 + 无头 Chrome 走查通过（图片显示、计费日志 playground-default、越权分组 403、刷新占位）；全量 vitest 3163 例、typecheck、改动文件 oxlint/oxfmt、i18n:sync missing/extras 0、verify.sh 10/10 |
| playground-claude-messages | done | 2026-11-27 用户明确批准的 Stage 3 内独立需求，解决透传渠道收到 OpenAI 格式 Playground 请求失败。后端：新增 POST /pg/messages（controller.Playground(c, RelayFormatClaude)），access token 规则补 POST /pg/messages；controller.Playground 在转发前从请求体移除 group（Distribute 已用完；DTO 无该字段，只影响透传，修复所有 /pg/* 在透传渠道上把 group 发往上游）。前端：getPlaygroundRequestFormat —— 端点含 image-generation 走 responses，含 anthropic 且模型名含 claude（不区分大小写）走 messages，其余 chat；buildMessagesPayload（system 合并为顶层 system、max_tokens 必发、temperature 优先于 top_p 只发其一、不发 penalty/seed）；解析 content_block_delta 的 text_delta/thinking_delta 与 message_stop；非流式 sendMessages + getMessagesResponseChoice；非流式错误补读 error.message。无新增文案。controller/playground_test.go 假 Anthropic 透传上游端到端验证上游 body 不含 group（去掉修复时失败）；Playground vitest 6 文件/53 例、typecheck、playground oxlint/oxfmt、verify.sh 11/11 |

## 上次停在哪里

2026-11-27 追加 playground-claude-messages（用户明确批准），已 done、未提交：
- Claude 模型挂在开启透传的 OpenAI 类型渠道上时，Messages 格式依然会失败；需要时再加「/pg/* 选渠道跳过透传渠道」过滤。
- 未在真实 Anthropic 上游与浏览器中实测；SystemPerformanceCheck 对 /pg/messages 仍返回 OpenAI 错误格式（前端两种格式都能解析）。
- 遗留（与本 feature 无关，仍未修）：router TestAccessTokenRouteRulesCoverEveryDashboardRoute 因 PUT /api/user/onboarding 缺 access token 规则失败。

2026-11-27 追加 playground-responses-image（用户明确批准，作为 Stage 3 内独立 feature，不改 out_of_scope 其他约束），已 done、未提交：
- 生图模型判断依赖 /api/pricing 的 supported_endpoint_types（common.IsImageGenerationModel 名称规则：dall-e、gpt-image-、qwen-image、wan* 等）；只支持 /images/generations 的上游（如 dall-e-3、wan、qwen-image）在 Playground 里也会被发到 /responses 而失败，需要时再加例外或改为可切换。
- 定价页模块被关闭时 /api/pricing 不可用，所有模型回退 chat/completions（不报错）。
- 多轮只回传文本，不回传历史图片；不支持图片编辑。
- 遗留（与本 feature 无关）：router TestAccessTokenRouteRulesCoverEveryDashboardRoute 失败，PUT /api/user/onboarding 缺 access token 规则（来自 onboarding-setting-and-state 未提交改动）；relay/channel TestUpstreamGetBody_HTTP2RetryAfterGracefulGoAway_PassThrough 偶发失败，重跑通过。
- 本次重写 .harness/feature_list.json 时 JSON 重新序列化，部分数组格式变化（内容不变）。

2026-11-27 Stage 3 用户引导 First Setup（stage3-user-onboarding）由编排者按 `docs/prd/user-onboarding-first-setup-prompts.md` P0–P9 分派子代理完成，8 个 onboarding-* feature 均为 done，全部未提交：
- 后端：注册赠送开关/邮箱前置/升级兼容（P1）、onboarding_setting + /api/status + PUT /api/user/onboarding（P2）；三库（SQLite / MySQL 5.7.44 / PostgreSQL 9.6.24）测试通过。
- 前端：后台设置（P3）、WizardShell（P4）、/onboarding 用户向导（P5/P6）、管理员向导（P7）、Overview 兜底（P8）。
- P9 验收：真实应用（工作区构建 + 临时 SQLite）无头 Chrome 走查全部通过；rc.51 源码建库 → 工作区构建启动两次的升级测试通过（开关只启用一次、数据完好、管理员关闭后不被覆盖、新库为 false）。修复 1 个缺陷：自用模式下测试请求额度不足仍提示充值（TestRequestBlock 新增 selfUseMode，补测试）。截图在 D:	mpp9shots。
- 验证：verify.sh 全部 onboarding 检查通过（4 个 Stage 1 promotion 旧检查仍指向已移除的 web/default）；全量 vitest 271 文件/3155 例、typecheck、build:check、i18n:sync missing/extras 0。
- 遗留：未在浏览器复测 P9 修复后的构建；Step 3 测试请求成功路径未端到端实测（上游为假渠道）；升级测试只在 SQLite 上做；TestManageUserQuotaMiddlewareKeepsOneOperationPerRequest 在 -run 过滤下顺序相关失败（HEAD 已存在，与本次无关）；渠道抽屉无厂商预设，provider 参数仅透传；关闭邮箱前置的风险提示为 UI 提示，不强制 Turnstile。
- 下一步：用户确认后提交（建议从 main 切分支并按 AGENTS.md PR 规则准备 PR）；视需要清理 verify.sh 中 Stage 1 promotion 旧检查。

以下为 Stage 2 最后记录：

2026-11-26 登录注册页对齐 KuCode（`kucode-auth-pages`，用户要求「newapi 登录注册页与本项目设计不一致, 需要修正」）。与 KuCode `/login/` `/register/` 截图逐项对比后只改样式与布局，认证逻辑（提交、Turnstile、Passkey、OAuth、微信、法律同意、2FA、重置）零改动：
- 标题：新增 `features/auth/components/auth-page-heading.tsx`（`AuthPageHeading` 两段色 h1 + 副标题，`AuthSwitchPrompt`/`AuthInlineLink`）；登录「Sign in to {systemName}」、注册「Create your account」、忘记密码「Reset your password」，OTP/重置确认同样式。「没有账号？注册」等切换链接移到表单下方居中（显示条件不变）。`MixedHeading` 的 `as` 增加 `p`。
- 表单：新增 `styles/auth.css`（由 `auth-layout.tsx` 引入，只作用于 `.auth-form` 内）：输入框 44px/背景色/琥珀焦点环（注意 `FormControl` 会把 input 的 `data-slot` 改成 `form-control`，选择器两者都覆盖）、标签 13px、错误 12px、密码显隐按钮；`.auth-primary` 为 KuCode 前景色主按钮（登录/注册/发送重置邮件/重置确认）。弹窗被 portal 到外面，不受影响。
- OAuth：`OAuthProviders` 分隔线移到按钮下方（新增 `divider` 属性与导出 `AuthDivider`），注册页 OAuth 移到表单顶部；登录页在 Passkey/OAuth 之后、账号密码之前显示分隔线（仅两者都有时）。按钮 44px、`border-input` 透明底。法律同意去掉方框底色，链接改前景色下划线。
- 外框：顶栏统一 72px；页脚新增 `components/auth-footer.tsx`（版权 + 已启用的用户协议/隐私政策链接）；右栏 `auth-visual.tsx` 按页面显示 KuCode 标题（Welcome back / One key / Locked out?）、三个浮动供应商标签（悬停吸引球体光点，减少动态效果时不浮动，放不下自动隐藏）、目录统计（复用 `useHomeCatalog`，与首页同一查询）、注册页 base_url 卡片（`useGatewayBaseUrl`）。`AuthLayout` 新增 `mode` 属性。
- i18n：新增 13 个键（七语言），复用 `Change one line.`、`Or continue with`、`{{models}} models from {{providers}} providers`；`i18n:sync` missing/extras 0。
- OWASP：仅视觉改动，未触碰凭据传输、会话、Turnstile、Passkey、OAuth state 等控制（ASVS 4.0.3 V2/V3 相关控制不变）；无新增客户端存储。
- 验证：typecheck、改动文件 oxlint/oxfmt、版权头通过（`lib/validation.ts` 两个 lint error 为存量，未改）；全量 262 文件 / 3078 测试通过；`build:check` 通过；`verify.sh kucode-auth-pages` 2 项通过。dev 服务（`VITE_REACT_APP_SERVER_URL=http://127.0.0.1:3000`，本机 localhost 走代理会导致 /api 代理失败）+ 无头 Chrome `--virtual-time-budget` 截图核对 /sign-in、/sign-up、/forgot-password 1440 中/英、390。浅色主题与键盘操作未在浏览器中核对。
- 续（用户要求重建容器）：`docker compose build new-api` + `docker compose up -d --no-deps new-api`（postgres/redis 未动）。容器 healthy，/api/status、/sign-in、/sign-up 均 200；无头 Chrome 确认 http://127.0.0.1:3000/sign-in 与 /sign-up 已是新登录注册页。镜像包含全部未提交工作区改动。

2026-11-26 公共页顶栏遮挡（`kucode-restyle-t4`，用户要求「/about 服务条款 title 被 topnav 覆盖」）：公共页顶栏为 `fixed` 72px（换肤前也是 fixed），`PublicLayout showMainContainer={false}` 的分支没有顶部留白，后台配置的 HTML/URL 内容被顶栏盖住。修改：`features/about` 的 HTML 分支与 `features/legal/legal-document.tsx`（用户协议/隐私政策）的 HTML 分支包一层 `<main className='px-4 pt-[calc(72px+2rem)] md:px-6 lg:pt-[calc(72px+2.5rem)]'>`；about 的 URL iframe 改为 `pt-[72px]` + `h-[calc(100svh-72px)]`（原 `100vh-3.5rem` 按旧 56px 顶栏算）；首页后台自定义内容同类问题一并修：iframe 同上、HTML 分支加同样顶部留白（不加左右边距，整页内容）、Markdown 分支 `main` 加 `pt-[72px]`。只改 class，无逻辑改动。验证：typecheck、oxlint、oxfmt 通过；全量 262 文件 / 3078 测试通过；重建容器后无头 Chrome：/about 与 /user-agreement 在 1440 / 390 下 h1 顶部 120 / 112px（顶栏底 72px），无横向滚动。

2026-11-26 首页标题与图标行补位（`kucode-home`，用户要求「可以 mock 多几个，参考本项目的设计；homepage 的部分 cta 没有标题，需要补全」，用户选择前端补位；KuCode 计划 D18/D19）：
- 区块标题：`SectionShell` 恢复可见标题（KuCode 样式：居中 `MixedHeading`，下方 mb-14/16；可选 `subtitle`；`heading='custom'` 时由区块自己放标题）。Providers 加副标题（新 key `Use each provider through its own native protocol, or call any model through any SDK.`），代码区标题放在左栏正文上方。`layout.browser.mjs` 的断言改为“标题可见”（未运行，无 Playwright）。
- CTA 标题：原来 lead `Start routing in` + rest 复用通用 key `minutes`，中文显示成“只需几分钟， 分钟”。改用新 key `Start routing` / `in minutes`（七语言，如 zh“开始路由，/只需几分钟”），删除旧 key `Start routing in`；`minutes` 其它地方在用，未动。
- Hero 图标行：`buildHeroProviders` = 目录全部供应商 + `HERO_FALLBACK_PROVIDERS`（KuCode 的 10 家：OpenAI、Anthropic、Google Gemini、DeepSeek、Qwen、Mistral、Meta Llama、xAI Grok、Moonshot Kimi、Zhipu GLM）中未出现者，补足到 `HERO_MIN_LOGOS = 10`；补位标识无模型数，旁边总数仍只来自目录。去重用名称、图标和别名表 `PROVIDER_ALIASES`（如 xai/grok、moonshot/kimi、zhipu/智谱），滚动条 `buildMarqueeProviders` 也改用它（线上原先会同时出现 xAI 与 Grok、Moonshot 与 Kimi）。<640px 图标改 size-7、间距 0.5、隐藏分隔线，10 个一行放下。
- 验证：home 测试 34/34；全量 262 文件 / 3078 测试通过；typecheck、oxlint、oxfmt、版权头、i18n sync（七语言 missing/extras 0）通过。重建容器后无头 Chrome：1440/390 十个图标、各区块标题可见、CTA“开始路由， 只需几分钟”，scrollWidth = clientWidth。

2026-11-26 首页 Hero 供应商图标行（`kucode-home`，用户要求「home-logos 需要显示所有模型」）：`hero-logo-row.tsx` 去掉 `MAX_LOGOS = 6` 上限，有公开目录时显示目录里全部供应商（按模型数排序，自动换行）；无目录时仍为 4 个备用标识。线上目录有 7 个有模型的供应商，原先第 7 个（Moonshot）被截掉。新增 `features/home/__tests__/hero-logo-row.test.tsx`（2 例）；home 测试 28/28、typecheck、oxlint、oxfmt、版权头通过。本地目录无供应商，未重建容器、未截图。
- 续（用户反馈「newapi 上目前没有显示」）：本地 3000 的目录只有 `gpt-6-astra` 且无 vendor，图标行为空、文案为“来自 0 家提供商的 1 个模型”。`summarizeCatalog` 现在把无 vendor（或 vendor 不在列表中）的模型用 `lib/model-provider.ts#resolveModelProvider` 按模型名归属：与目录已有 vendor 同名或同图标（去掉 `.Color` 后缀）则并入该 vendor，否则生成推断供应商（id 从 -800000 起）；无法识别的模型只计入总数。Hero 图标行、供应商区和路由图都随之受益。catalog-summary 新增 2 例；home 测试 30/30，typecheck、oxlint、oxfmt、版权头通过。重建 new-api 容器后无头 Chrome 确认 1440/390 首页显示 OpenAI 图标与“来自 1 家提供商的 1 个模型”。已登录用户首页不请求目录（`use-home-catalog.ts` 的 `!isAuthenticated`），仍显示 4 个备用图标，未改。

2026-11-26 `kucode-docs` 精简（用户要求「doc 只需要 cc-switch，其余去掉，模型说明换成 claude-opus-5-5」，KuCode 计划记为 D17；只改 `web/src/features/docs/`）：
- 去掉 Codex、Cursor、Claude Code、OpenCode、Cherry Studio 五个指南、FAQ 页、Route selection 三张卡片与 Route rule 提示；只有一页后左侧分组导航与 <1024px 的 Sheet 也一并去掉（删除 `docs-nav.tsx`、`faq-article.tsx`）。保留：CC Switch 的 6 个步骤、复制与提示、插画、指向 /keys 的 Tip，Before publishing 警告移到 Tip 下方。
- 模型：`GUIDE_MODEL = 'claude-opus-5-5'`，用于 h1、Model 徽章、配置中的 `Model:` 与 `ANTHROPIC_MODEL`。`lib/guides.ts` 改为 `createCcSwitchGuide()`；`lib/toc.ts` 只剩步骤锚点；`DocsArticleHeader` 去掉 headingRef（不再切换页面）。
- i18n 未改：`Docs navigation`、`Open docs navigation`、FAQ 与其余指南的 key 现在不再被文档页使用，留在七语言文件中（sync 只比对 en.json，missing/extras 仍为 0）。
- 备份：改动前的 `features/docs/`（未跟踪）和路由文件复制到 `D:\Projects\ai-project\new-api-docs-backup-20261126\`。
- 验证：docs 测试 5/5；全量 261 文件 / 3070 测试通过；typecheck、build:check、oxlint、oxfmt --check、版权头检查通过。随后按用户同意 `docker compose build new-api` + `up -d --no-deps new-api` 重建容器（postgres/redis 未动），无头 Chrome 截图 http://127.0.0.1:3000/docs：深色 1440/1920/768/390、浅色 1440/768/390 均正常，scrollWidth = clientWidth，插画随主题切换，h1 为 “CC Switch · claude-opus-5-5”，≥1280px 显示本页目录。发现：zh 步骤译文有误（“安装或更新该设备”“启动节目并发送一条短信”），属原有翻译问题，未改。

2026-11-26 本地 Docker 重新部署（用户要求）：用当前未提交工作区 `docker compose build new-api` 重建 `new-api:local`，`docker compose up -d --no-deps new-api` 只重建该容器（postgres/redis 未动，数据卷保留）。容器 healthy，/api/status 与 /docs 200；截图确认 http://127.0.0.1:3000/docs 已是新文档页（含 CC Switch 指南与插画）。注意：镜像包含全部未提交的 stage2 换肤改动及 Go 侧删除 /image-generation 的未确认改动。未推送、未部署线上。

2026-11-26 `kucode-docs` 续（用户决定加入 CC Switch 指南与插画，KuCode 计划记为 D16；仍只改 `web/`）：
- 指南：`lib/guides.ts` 新增 `cc-switch`（Claude compatible 组，位于 OpenCode 之后，图标 `ArrowRightLeft` 与 API 密钥页的 CC Switch 菜单项一致）。内容依据官方 README（`brew install --cask cc-switch`，Windows/Linux 从 GitHub Releases 下载）和用户手册 2.1（Add Provider → Custom Configuration；Name / API Key / Endpoint URL / Model；Config JSON 为 `env` 中的 `ANTHROPIC_BASE_URL` / `ANTHROPIC_AUTH_TOKEN` / `ANTHROPIC_MODEL`；Claude Code 切换后无需重启）。请求地址用网关根地址（与 `features/keys/components/dialogs/cc-switch-dialog.tsx` 对 claude 的处理一致）。
- 提示框：指南新增 Tip，指向 API 密钥页已有的「CC Switch」行操作（导入对话框生成 `ccswitch://v1/import` 深链），用 TanStack `Link` 到 `/keys`；`ClientGuide` 增加可选 `consoleTip`、`illustration` 字段。
- 插画：深色原图 + 新生成的浅色版（KuCode 仓库 `prompts/assets/docs-illustrations/`，含提示词），裁掉顶部 224px 空白并缩到 1520×792，用无头 Chrome canvas 编码为 WebP（深 40 KB / 浅 33 KB）放在 `web/src/assets/docs/`。两张 `<img>` 分别 `dark:hidden` / `hidden dark:block`，跟随站点主题（`.dark` 类）而非系统设置，`loading="lazy"` 使隐藏的一张不下载；纯装饰，`alt=""`。
- i18n：新增 2 个 key（指南摘要、Tip 正文），七语言；ja/vi 的“API 密钥”用语与现有翻译对齐。missing/extras 为 0。
- 验证：docs 测试 9/9（新增 CC Switch 用例：两张主题图、根地址、/keys 链接）；全量 261 文件 / 3074 测试通过；typecheck、build:check、oxlint、oxfmt、版权头通过。临时后端截图：深色/浅色 1440 与浅色 390 正常，无横向滚动；临时文件已删。
- 发现：文档页原有译文质量差（如 vi 把 “Anthropic Messages” 译成 “Thông điệp Nhân loại”，zh-TW 多条未翻译），不在本次范围，建议单列修复。

2026-11-26 `kucode-docs`（单功能会话，未提交，只改 `web/`，后端零改动；计划见 KuCode 仓库 `prompts/new-api-rebuild-plan.md` §4.1 / D15）：
- `/docs` 由 T4 改为 T3，参考 Claude Docs 的布局与阅读模式（不用其品牌、文案、橙色），颜色全走 KuCode token。`routes/docs/index.tsx` 只剩路由接线；页面拆到 fork 自有的 `features/docs/`：`lib/guides.ts`（原数据原样搬移）、`lib/toc.ts`（锚点与目录，纯函数）、`hooks/use-active-heading.ts`（IntersectionObserver 滚动高亮）、`components/`（docs-page 三栏、docs-nav、docs-toc、docs-article-header、guide-article、faq-article、docs-steps、docs-code-block、docs-callout）。
- 映射：协议标签 + 客户端按钮 → 左侧分组导航（Button，`aria-current="page"`，琥珀竖条）；<1024px 改为吸顶条 + 左侧 Sheet（选中后关闭，焦点回到写有当前页名的菜单按钮）；侧栏切换页面后滚到顶部并把焦点移到 h1。原“Model”按钮无处理函数 → 不可交互 Badge。右栏“Route selection”与两条提示 → 正文“Route selection”区（卡片保留原 button 语义，激活态琥珀描边）+ Note / Warning 提示框；第 6 步 → 绿色状态提示框（带图标）。代码块去掉装饰性窗口圆点，`pre` 可聚焦以便键盘横向滚动。FAQ 保持原生 details。
- 复用说明：提示框用 `components/ui/alert`（改 `role="note"`，静态内容不应作为 live 通知）；导航与复制按钮用 `Button`；复制直接用 `useCopyToClipboard` 而非 `CopyButton`，因为 `CopyButton` 固定 `notify: false`，会丢掉原有“Configuration copied”提示；移动端导航用 `components/ui/sheet`。
- i18n：新增 `Docs navigation`、`Open docs navigation`（七语言）；`On this page` 原先 fr/vi/zh-TW 未翻译、zh 为“在此页面上”，改为 Sur cette page / Trên trang này / 本頁內容 / 本页内容，ja 改为 このページの内容（该 key 只被新目录使用）。`bun run i18n:sync` 七语言 missing/extras 为 0。
- 验证：`features/docs/__tests__/{toc,docs-page}.test.*` 8/8；全量 `vitest run --maxWorkers=4` 261 文件 / 3073 测试通过；`bun run typecheck`、`bun run build:check` 通过；改动文件 oxlint 0 error/0 warning、oxfmt --check 通过；`add-copyright.mjs --check` 未列出 docs 文件（注意：版权头后不能有空行）。视觉：临时目录构建 Go 二进制（内嵌新 dist）+ 临时 SQLite，经 /api/setup 初始化后用 Chrome DevTools 截图，深色 1440/1100/390 正常、scrollWidth = clientWidth，滚动高亮与移动端 Sheet 正常；临时文件已删除。截图中修了两处：路由卡片内容垂直居中（改 flex-col 顶对齐）、Alert 描述的 text-balance 在窄屏过窄（改 text-pretty）；网格宽度改为与页头一致的 max-w-7xl。
- 未做：浅色主题、768/1920、纯键盘操作的人工验收；cc-switch 指南与插画（KuCode 仓库 `prompts/assets/docs-illustrations/cc-switch-conductor.png`，仅深色）待用户决定是否加入（属新增内容，需另立决定）。
- 发现（非本功能改动，未处理）：工作区已有 `controller/seo.go`、`pkg/jsplugin/routing.go` 删除 `/image-generation` 的未提交改动，与“后端零改动”规则冲突，需确认来源。

2026-11-26 首页供应商滚动条（`kucode-home`，用户要求）：滚动条原先只列精选卡片之外的供应商，本地目录只有 1 个供应商时不显示。现改为始终显示：目录里的其余供应商在前，再用 `MARQUEE_FALLBACK_PROVIDERS`（16 个知名供应商单色标识，无模型数据，按名称/图标去重，最多 24 个）补足；没有公开目录时也显示滚动条，只是不显示精选卡片。`buildMarqueeProviders` 在 `features/home/lib/catalog-summary.ts`，测试在 `catalog-summary.test.ts`；`layout.browser.mjs` 中「无目录时隐藏供应商区」的断言改为「无目录时只有滚动条」（未运行，无 Playwright）。home 测试 26/26、typecheck、lint 通过。

2026-11-26 `kucode-model-square` 补完（单功能会话，未提交，只改 `web/`，后端零改动）：
- 页头：新增 `features/pricing/components/pricing-page-header.tsx`，复用首页 `MixedHeading`、`HomeSphere`（不可交互、intensity 0.5）；统计条只有模型数、供应商数（由 `/api/pricing` 数据计算），不加 SLA/可用率。原「本站已启用 N 个模型」句由统计条取代。新增 3 个 i18n key（七语言）。
- 工具栏高度改为 ResizeObserver 实测写入 `--toolbar-h`（`index.tsx`），保留原写死值作首帧兜底；页面容器类移到 `constants.ts` 与详情页共享。
- 卡片：外层换 `SpotlightCard`/`SpotlightGroup`（琥珀光晕）；标签改胶囊（保留 `group` 名 Tags 与 `+n` 的 title）；按 token / 按次价格改为 11px 大写标签 + 18px 等宽数字；筛选结果变化时 150ms 淡入（reduced-motion 关闭）。其余价格分支、分组/端点、性能条、Details 按钮不变。
- 表格：用 `DataTableView` 既有 `pinnedColumns` 固定 Model 列。**未做**：页面级吸顶表头（表格容器 `overflow-auto`，横滚与页面吸顶不可兼得，保留容器内吸顶）；价格列右对齐（价格单元格是多行带标签的块，右对齐需重写单元格）。
- 抽屉：手机（<768px）改底部弹出 90dvh；可见模型名改为 `SheetTitle`（h2，同时作为对话框名称），页面上不再有两个 h1；宽度与内容不变。卡片右上角状态点**未加**：卡片底部性能条已有同一状态点和成功率，避免重复。
- 详情页 `/pricing/$modelId`：改用共享容器、返回按钮显示「模型广场」，「Model not found」改为 h1；数据、Tab、图表不变。
- 修复：`model-details-apps.tsx` 前三名奖杯徽章第 1、3 名同色（`--primary` 与 `--warning` 同值）→ 第 3 名改描边，并为奖杯加 sr-only 名次；顺带把该文件既有嵌套三元改为查表/if-else（lint 要求）。
- 新增测试：`__tests__/page-header.test.tsx`、`model-details-drawer.test.tsx`、`table-layout.test.tsx`；`model-cards.test.tsx` 的标签断言按新结构更新。

验证：本机经 `npm i -g bun` 装 Bun 1.4.5，`bun install --frozen-lockfile` 无变更；`bun run typecheck` 通过；`bun run test` 259 文件 / 3062 测试全部通过；`bun run build:check` 通过；改动文件 `oxlint` 0 error、`bun x --no-install oxfmt -c .oxfmtrc.json --check <改动文件>` 通过（注意：`scripts/format-with-protected-headers.mjs` 忽略路径参数、遍历整个 `web/`，且直接用 node 运行时 PATH 上没有 `oxfmt`，会静默不格式化；本次误跑一次 `--write`，只重写了文件头，内容未变，本次未改动的文件 git 状态仍为干净）；`add-copyright.mjs --check` 未列出任何 pricing 文件；`node scripts/sync-i18n.mjs` 七语言 missing/extras 为 0；`bash .harness/verify.sh kucode-model-square` 2/2。未完成：本机无 Playwright 与后端，375/768/1024/1280/1920、深浅主题、键盘焦点的浏览器验收待人工完成。

2026-11-25 KuCode 换肤：按用户要求用多 agent 并行完成第一轮（两次 workflow：地基 6 个 agent、页面 9 个 agent），偏离“一会话一功能”规则系用户明确要求。全部改动未提交，只在 `web/`（约 246 个已跟踪文件 + 60 个新文件）；后端零改动。工具：本机无 Bun，使用 `web/node_modules/.bin` 下的 tsgo/vitest/oxlint/oxfmt/rsbuild，未新增依赖（Inter/Inter Tight/JetBrains Mono 未安装，字体栈回退到 Public Sans）。

验证：`tsgo -b` 通过；`vitest run --maxWorkers=4` 250 文件 / 3013 测试全部通过（基线 2927）；`rsbuild build` 通过，主包 5869.9 kB 与 HEAD 基线 5868.8 kB 持平、总量 68.5 MB（基线 68.8 MB）；`sync-i18n` 七语言 missing/extras 为 0；新文件 AGPL 头检查通过；硬编码调色板类为 0；diff 中无空格被压缩的行。未完成：无 Playwright/浏览器，未做 375/768/1280/1920 与深浅主题视觉验收，`features/home/__tests__/layout.browser.mjs` 已更新但未运行；支付方式需沙箱回归。

下一步：本地启动前后端做视觉验收；后台设置 SystemName=KuCode、Logo=/kucode-mark.svg、页脚，清空自定义首页；补充 SectionPageLayout 描述插槽（页头副标题）、渠道/系统设置区块框架与保存栏、上传图片图标中性底色、dashboard/lib/flow.ts 默认色；安装 Bun 1.4.4 后补装 KuCode 字体并移除未用的 @fontsource-variable/lora 与 assets/custom/icon-layout-*/icon-sidebar-*/icon-theme-*。


2026-11-23：本地 main 合并 upstream/main `51a1ceeae`（40 个提交），VERSION 同步至最新发布标签 `v1.0.0-rc.51`（标签后另有 27 个提交）。保留首页、文档、生图、footer 和自定义支付。支付设置同时支持上游 Epay RSA 和 fork 原有渠道，定期更新继续清理过期订单。上游测试发现插件路由遗漏 fork 页面，已保留 /promotions、/docs、/image-generation 和 /sso。保留本地旧 rc.15 标签及原有未提交改动。Git 未配置提交者，单次提交使用 Codex <codex@localhost>。

验证：`go test -p 6 ./...`、relaykit 内 `GOWORK=off go build ./...` 和 `GOWORK=off go test ./...`、`bash .harness/verify.sh upstream-merge-preserve-custom-ui`（2/2）通过；构建后 --version 输出 v1.0.0-rc.51。Bun 1.4.4 冻结锁安装、i18n:sync、typecheck、build:check、改动文件 oxlint（0 error、1 warning）、`bun run test --maxWorkers=4`（2927/2927）、生产构建首页浏览器回归（41/41）通过。七语言 missing/extras 为 0。账户验证包含已删除用户的 API key、密码反馈和现有账户安全测试；参考 OWASP Authentication、Session Management、Password Storage Cheat Sheets。

实库验证：SQLite 3.50.4、MySQL 8.0.46、PostgreSQL 16.16 全部通过。设置 TEST_MYSQL_DSN / TEST_POSTGRES_DSN 后运行 `go test -p 1 ./model ./controller -run 'Test(.*DatabaseMatrix|JSONColumnDatabaseRoundTrip|ChannelAffinityRetryPriorities)$' -count=1 -v`，逐库设置 TEST_TASK_DB_DIALECT 运行 `go test ./model -run '^TestScheduledChannel' -count=1 -v`，配置 AUDIT_MYSQL_DSN / AUDIT_POSTGRES_DSN 后运行 `go test ./controller -run 'Test(AuditDatabaseMatrix|APITokenAuditDatabaseMatrix|IndependentAuditLogStores|LogExportDatabaseMatrix)/(mysql|postgres)' -count=1 -v`。ClickHouse 未运行。运行 `python %TEMP%/newapi-merge-1123-tools/checkmatrix.py`，三库各覆盖新建和从最新发布版 c9c6da278 升级（6/6）；三次启动确认敏感词转换幂等，用户、token、配额、审计、索引及唯一约束保留，MySQL/PG 使用独立日志库。临时容器已清理。2026-11-23 已按用户要求推送合并提交 242426ea0 至 origin/main，并用 git ls-remote 核对远端提交一致。

2026-11-09 GIF 限制只读核查：用户询问 `gpt-image-2.6.*` 是否受 GIF 限制。仓库搜索未发现 `GIF output is not enabled for this request.` 文案或针对该模型的 GIF 禁用分支；OpenAI 图像 DTO 保留 `output_format`、`frame_count`、`frame_duration_ms`，标准适配器直接转发 JSON 请求并复制 multipart 普通字段。`relaykit/` 中设置 `GOWORK=off` 后运行 `go test ./dto -run TestImageRequestPreserveGPTImage26Fields -count=1` 通过。仅更新本进度记录，无功能实现或 feature 状态变更；未检查线上渠道参数覆盖和上游配置，错误来源仍需请求日志确认。下一步：如继续排查，核对实际渠道、脱敏请求和上游原始错误。

2026-11-09 版本标识同步：用户指出上游发布版为 v1.0.0-rc.49 并要求「同步」。本轮将 VERSION 从 `v1.0.0-rc.10-debug-01` 更新为 `v1.0.0-rc.49`，作为 upstream-merge-preserve-custom-ui 的补充，提交并推送 origin/main。Dockerfile 已从 VERSION 注入前端构建变量及后端 ldflags，无需修改业务代码。`go build -ldflags "-X github.com/QuantumNous/new-api/common.Version=v1.0.0-rc.49" -o <temp>/newapi-version-rc49.exe .` 成功，运行 `--version` 输出 `v1.0.0-rc.49`；Harness 2/2 通过。原有 docs/sample 未提交改动保留。本轮未部署，线上需重新构建并重启应用后显示新版本；若部署环境设置 VERSION，需同步其覆盖值。下一步：部署 origin/main 并检查 `/api/status` 的 version。

2026-11-09 推送授权：用户要求「推送到origin」。本轮将已验证的合并提交 `0c8d176cb`（upstream/main `bd6bb5301`）及本条进度记录推送到 `origin/main`；沿用下方完整验证结果，未修改产品代码。`upstream-merge-preserve-custom-ui` 保持 done，原有 `docs/prd/INDEX.md`、支付安全计划和 `sample/` 未提交改动保留。下一步为部署前后端，构建使用 Bun 1.4.4；本轮不部署。

2026-11-09：按用户「merge latest version」合并 upstream/main `bd6bb53019fb7e21804b31ab7365c9b2097f4b6c`（74 个提交，完成前再次查询远端一致）。备份分支 `backup/pre-upstream-merge-20261109` 指向 `34093820f`。本轮创建本地合并提交，未推送或部署。首页、生图、文档、公共 footer、社群配置及大陆直连功能保留；原有 `docs/prd/INDEX.md`、支付安全计划与 `sample/` 未提交改动未纳入合并。未实现推广待办或扩大 Stage 范围。

解决七语言与三个 Go 文件冲突：翻译按 merge base/ours/theirs 逐键合并，保留 fork 文案；Vertex 保留 common JSON wrapper 和上游 token lifetime；Volcengine 保留 common wrapper 并采用上游 base64 包；affinity 测试采用上游唯一键方案。编译回归移除 AWS 不再使用的 JSON 类型导入，并将新增 OAuth 测试适配 fork 的 oauthFlowPayload。定价测试显式清空 fixture 的旧倍率默认值，保留生产环境 fork 的 gpt-image-2 旧价格；日志轮转测试通过子进程保证 Windows 文件句柄在临时目录删除前关闭，不改生产日志行为。

验证：Go 1.26.10 `go test ./...` 全部通过（日志 `%TEMP%/newapi-merge-20261109-go-verified.log`）；relaykit 中 `GOWORK=off go build ./...`、`go test ./...` 通过；tokenkit 无变化。`bash .harness/verify.sh upstream-merge-preserve-custom-ui` 2/2 通过；`git diff --check` 与 staged 检查通过。Bun 1.3.14 不支持上游新增的 `bun check`，改用 `%TEMP%/newapi-bun-1.4.4/bun-windows-x64/bun.exe`，未替换全局安装。`bun install --frozen-lockfile`、`bun run i18n:sync`、`bun run typecheck`、`bun run build:check` 完成；`bun run test --maxWorkers=4` 208 files / 2532 tests 全通过，64 个涉及 JS/TS 文件定向 oxlint 退出 0。`HOME_TEST_URL=http://localhost:5175 node --test web/src/features/home/__tests__/layout.browser.mjs` 41/41 通过，沿用既有 PLAYWRIGHT_MODULE/EXECUTABLE 路径和 API fixture。日志 `%TEMP%/newapi-merge-20261109-{web-test-final,web-build-final,browser}.log`。

数据库版本：SQLite 3.50.4、MySQL 8.0.46、PostgreSQL 16.14。隔离容器命令：`docker run -d --name newapi-merge-20261109-mysql --label codex.task=merge-20261109 -p 127.0.0.1:33326:3306 -e MYSQL_ROOT_PASSWORD=merge-test-only -e MYSQL_DATABASE=merge_test mysql:8.0`；Postgres 对应名称 `newapi-merge-20261109-postgres`、端口 `35452:5432`、`POSTGRES_PASSWORD=merge-test-only`、`POSTGRES_DB=merge_test`、镜像 `pgvector/pgvector:pg16`。设置 `TEST_MYSQL_DSN=root:merge-test-only@tcp(127.0.0.1:33326)/merge_test?charset=utf8mb4&parseTime=True&loc=Local`、`TEST_POSTGRES_DSN=postgres://postgres:merge-test-only@127.0.0.1:35452/merge_test?sslmode=disable`，运行 `go test ./model ./controller -run 'Test(AuthCacheIntegrityDatabaseMatrix|ChannelAffinityRetryPriorities|RequestPolicyRoutingDatabaseMatrix|SharedModelPluginPricingDatabaseMatrix|ModelManagementDatabaseMatrix|ChannelPriorityDatabaseMatrix)$' -count=1 -v`，三库全部通过。首次 PostgreSQL 使用 key/value DSN 被测试的 loopback guard 拒绝，改为上述 URI 后通过。

复用 `.git/merge-20261024/dbcheck.go`，在当前树与独立 release worktree（v1.0.0-rc.49 / 48a6c87f9）分别 `go build -o <temp>/newapi-merge-20261109-{dbcheck,seed}.exe <dbcheck.go>`。对每库分别以新版本或发布版执行 `seed <snapshot.json>`，然后新版本执行 `verify <snapshot.json>`，fresh/upgrade 共 6/6 通过；每次 verify 重启迁移三次，验证数据、索引、唯一约束、配额统计保留，MySQL/PG 使用独立 log 数据库。日志 `%TEMP%/newapi-20261109-{sqlite,mysql,postgres}-{fresh,upgrade}-{seed,verify}.log`。无 schema 或 ORM 驱动版本变化。

认证回归参考 OWASP [ASVS 5.0.0 V7](https://github.com/OWASP/ASVS/blob/v5.0.0/5.0/en/0x16-V7-Session-Management.md)（7.2.1 服务端验证、7.3.1 过期、7.4.1/7.4.2 失效）及 [Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)、[Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[MFA](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)。上游缓存完整性/过期/伪造防护、MFA 锁定及 OAuth 归因测试随全量测试与三库矩阵通过；不是全面 ASVS 合规审计。插件新增数值字段说明已核对为计费主体 + 单价，单位独立。远端旧 tag v1.0.0-rc.15 与本地不同，保留本地 tag；使用 `git fetch upstream main --no-tags` 完成分支更新。

**下一步：** 如需发布，推送本地 main 并部署；开发/CI 使用 Bun 1.4.4。Stage 1 后续仍从既有 promotion-backend-model 待办开始。

2026-10-27 提交授权：用户要求「提交到origin」。本轮将 `homepage-linuxdo-offers` 的实现、翻译、测试和 Harness 进度记录提交并推送到 `origin/main`；沿用下方已通过的验证，提交前再次检查差异及 `git diff --check`。保留原有 `docs/prd/INDEX.md`、支付安全计划和 `sample/` 的未提交改动。下一步为部署前后端并在官方社区中填写实际优惠链接；本轮未部署。

2026-10-27：首页 LinuxDo 优惠入口已完成。复用 `OfficialSocialLinks` 配置，在「系统设置 → 内容设置 → 官方社区 → 添加社区链接」中新增 LinuxDo 优惠入口平台；管理员填写 HTTPS 地址、启用并保存后，默认首页在 Telegram、WhatsApp 按钮旁展示。未配置、停用或不安全的链接不展示，保留新标签页 `noopener noreferrer`、原有排序和自定义名称能力。默认名称随界面语言切换，后台保存英文默认标识，避免配置被管理员当前语言固定；七语言已补齐。

复用现有 OfficialSocialLinks、OfficialSocialLinksSection、Button、Select、Input、Switch、Tooltip 和 IconLinuxDo，没有新增生产组件或依赖。后端仅扩展社媒平台校验及默认文案映射，不修改配置存储、数据库 schema/SQL/驱动、认证、计费或推广奖励。修复所改文件既有的非空断言 lint 错误，补充表单可访问名称。保留原有 docs/sample 改动，未提交或部署；本地 `http://localhost:5173/` 前端保留运行，浏览器使用 API fixture 验证，未写入真实站点配置。

**本功能下一步：** 部署前后端，在官方社区中添加 LinuxDo 优惠入口、填写实际优惠链接并保存。用户尚未提供实际目标地址，不预填示例链接；停用或删除可隐藏入口。Stage 1 推广相关待办仍从 `promotion-backend-model` 开始。

2026-10-24 推送授权：用户要求「submit to origin」。本轮将已验证的合并提交 `485269d4f`（upstream/main `33c61a242`）及本条进度记录推送到 `origin/main`；沿用上轮已通过的完整验证，未修改产品代码。保留 `docs/prd/INDEX.md`、支付安全计划和 `sample/` 的未提交改动。feature `upstream-merge-preserve-custom-ui` 保持 done；Stage 1 其他功能与部署不在本轮范围。

2026-10-24：按用户「merge latest version」合并最新 `upstream/main`（`33c61a24234aa20cb10e8a644304322c476361de`，最后重新查询远端确认未变化）。创建本地合并提交；本轮未推送或部署。合并前备份分支为 `backup/pre-upstream-merge-20261024`（`12cd4cc6c`）。解决 12 个文件的冲突：合并双方配置、保留 fork 的 300 秒流式超时、保留 xlsx 依赖，并按三方语义合并七语言（每语言 101 项上游变化，fork 翻译保留）。自动合并遗漏 AWS `json.RawMessage` 类型导入，已补齐；编码仍使用 `common.*`。

首页、生图、文档页、顶栏导航和 footer 与合并前逐文件比较无变化；大陆直连设置、支付和其他 fork 定制保留。原有 `docs/prd/INDEX.md`、未跟踪支付安全计划与 `sample/` 未纳入提交。没有实现任何新的 Stage 1 推广功能。为完成实际回归，修复既有 SQLite 测试连接未关闭导致 Windows 清理失败的问题，并将上游代理失败测试改用已关闭的 loopback 监听端口，避免本机 DNS 对 `.invalid` 的解析造成不确定失败；不改变生产认证行为。另修正两个受影响前端文件的 lint 和一个上游测试文件的格式。

**下一步：** 部署前后端后确认线上配置。全仓 lint/format 仍有原有问题，涉及文件 lint 与本轮修正文件格式检查已通过。Stage 1 待办仍从 `promotion-backend-model` 开始。

2026-10-20 提交授权：用户要求「提交到origin」，本轮将 `homepage-regional-base-url` 的实现、翻译、测试与 Harness 记录提交并推送到 `origin/main`；保留原有 `docs/prd/INDEX.md`、支付安全计划和 `sample/` 的未提交改动。提交前 `git diff --check` 通过，功能验证沿用下方已通过结果。下一步为部署前后端并在后台填写域名。

2026-10-20 大陆直连优化：新增 `general_setting.mainland_base_url`，复用配置注册、Option 持久化与公开 `/api/status`，后台入口为「系统设置 → 站点设置 → 系统信息 → 大陆直连优化」。支持裸域名或 HTTPS URL，去除首尾空白和末尾斜杠；前后端拒绝凭据、查询参数、片段、不合法域名与端口。首页保留原 Base URL 和配置复制，新增地址独立复制完整 HTTPS Base URL，自动补 `/v1` 且不重复追加；空值或无效状态值隐藏。默认留空，示例 `cn.kucodeapi.com` 仅作为输入提示，不会自动启用。保存后刷新 status 缓存。

复用现有 CopyButton、Input、Form、SettingsForm、SettingsPageFormActions 和 useSettingsForm，无新通用 UI 实现或依赖。失败回归发现系统信息保存异常会成为未处理 Promise，已在该表单的提交事件边界处理，错误提示仍由现有 mutation 负责，保留输入供重试。未修改转发、认证、支付、数据库 schema/SQL/驱动、自定义首页或用户原有 docs/sample 改动；未提交或部署。

**本功能下一步：** 部署前后端后，在后台填写 `cn.kucodeapi.com` 并保存，首页将展示「大陆直连优化」及 `https://cn.kucodeapi.com/v1`；清空即可隐藏。域名实际 DNS、TLS 和网关路由未由本次代码配置。本地前端 `http://localhost:5173/` 保留运行；浏览器验证采用 API fixture，不代表线上配置已修改。

2026-10-15 CTA 模型卡片：新增 `use-popular-models`（取前 3，沿用服务端顺序，并与定价页一致地合并供应商和分组倍率）与 `popular-model-card`，CTA 标题与说明沿用原文案，仅新增复数徽标一个七语言键，并移除两个不再使用的单数键。动态/插件计费模型不展示价格，仅给出详情入口。`parseTags` 按空白拆分标签，因此 "Coding Expert" 会显示为两个标签，属既有行为未改。浏览器回归 35/35、vitest 2260/2260、typecheck/lint/format/build:check/i18n:sync 通过。

**CTA 卡片下一步：** 连接真实后端后确认实际前三名与价格；用户确认视觉后再决定提交/部署。

2026-10-15 浅色主题修复：根因为 `.home-hero` 写死深色背景/文字，接入面板、节点、配置栏、眉题和网关标记也使用固定深色。改为首页局部语义变量的浅色默认值与 `.dark .home-hero` 覆盖，深色模式视觉保留；没有调整布局或交互。移除 HomeBrandIcon 的首屏强制 onDark，OpenAI 标志在两处均跟随 resolvedTheme。其余品牌原色、CTA 推荐、社群入口、全站导航、页脚、后台与自定义首页不变。

**主题修复下一步：** 刷新 `http://localhost:5173/` 切换浅色/深色检查效果；用户确认后再决定提交/部署。

2026-10-15 客户端品牌图标：从用户指定目录导入 codex/color.svg、claudecode/color.svg、cherrystudio/color.svg 到 `web/src/assets/brand-icons/clients/`，替换接入示意和工具展示区的对应客户端图标。将上一轮 HomeModelIcon 兼容扩展并更名为 HomeBrandIcon，继续复用固定 24px、object-contain、装饰语义和原有 OpenAI 主题适配。Codex CLI 与 Codex 共用专用 Codex 素材，Claude Code 不再使用普通代码符号。三个 SVG 与源文件内容一致，没有改色、改绘、修改源目录或新增依赖；OpenCode、Open WebUI、模型图标、站点 Logo 及业务行为保持不变。

**客户端图标下一步：** 刷新 `http://localhost:5173/` 查看本地效果；用户确认后再决定提交/部署。

2026-10-15 模型图标：从 `C:/Users/Administrator/ai-brand-icons` 导入 OpenAI、Claude、Gemini、DeepSeek 原色 SVG 与 OpenAI 白色 PNG 到 `web/src/assets/brand-icons/models/`，两处首页模型展示共享 HomeModelIcon。首屏恒定深色背景使用白色 OpenAI；工具区随真实主题切换深浅版本，其他三种保留原色。固定 24px、object-contain，图标作为相邻模型名称的装饰不重复朗读。已检索 HeaderLogo / SystemBrand / ProviderBadge：前两者绑定站点品牌与加载状态，后者强制标签/徽章结构，均不能直接承担独立的指定本地图标与背景适配，故增加小型首页专用图标组件复用两处。保留客户端通用图标和站点 Logo；无文案、模型数据、后端或依赖变更，源素材目录未修改。

**模型图标下一步：** 刷新 `http://localhost:5173/` 查看实际图标（静态素材不依赖后端）；用户确认后再决定提交/部署。未引入目录中当前首页未展示的其他品牌。

2026-10-15 社群入口调整：Hero 移除开发者文档按钮，将已配置的 Telegram、WhatsApp 移入同一主操作行，并从下方社交入口中排除这两类，避免重复。复用 OfficialSocialLinks，新增兼容的 hero 外观（48px 最小高度、长标签换行、原有平台图标），保留其他社交平台的紧凑外观；沿用状态配置的 enabled/HTTPS URL 过滤及新窗口 noopener/noreferrer。未新增翻译键或硬编码社群地址，使用已有社群标签与平台名称。没有改全站导航、后端或前几轮功能；本地 5173 服务继续运行。未接通后端或未配置有效社群 URL 时，不显示对应社群按钮。

**社群入口下一步：** 连接后端并确认后台已启用 Telegram、WhatsApp 的真实社群地址；当前测试外链为拦截的 fixture，不代表实际社群。用户确认后再提交/部署。

2026-10-15 热门模型 CTA：复用 `/api/pricing`、`/api/perf-metrics/summary?hours=24` 及 React Query 缓存，按后端已提供的 request-count 降序选择首个目录内模型。后端 `ModelSummary.RequestCount` 明确使用 `json:"-"` 且已有隐私回归测试，因此未开放或编造调用次数，只显示「近 24 小时调用量最高」、模型名称、目录描述与详情入口。复用 ModelLink、Badge、Button、AnimateInView；未直接复用 ModelCard，因为其必须展示完整价格、分组和性能信息，无法仅组合为不涉及定价的 CTA 推荐。注册入口逻辑和原有已登录时隐藏 CTA 的行为保持不变。仅在公开模型广场且状态加载成功时请求推荐；加载、接口失败、空数据及无匹配模型均回退，推荐查询不弹错误 toast。无后端或数据库改动、无新增依赖；本地 5173 前端保持运行，缺少真实后端时不显示虚构推荐。

**热门模型 CTA 下一步：** 连接真实本地后端后确认实际第一名；测试截图使用明确的虚拟模型 fixture，不代表线上排行。待用户确认后决定提交/部署。

2026-10-15 本地预览：已用 `cd web; bun run dev --port 5173` 启动前端，`http://localhost:5173/` 返回 HTTP 200，服务保留运行供用户查看。本机 3000 端口无后端服务，Docker 引擎未运行；本次未启动后端、修改数据或接入远端，接口可能显示连接失败，登录等业务功能暂不可用。`homepage-layout-motion` 保持 done，未变更实现代码。

2026-10-15：首页布局与动效优化已完成，参考 https://weimeta.ai/ 的深色网格及绿色强调色，但沿用本站品牌与内容。仅修改默认首页组件、独立作用域样式及相关翻译；自定义首页、公共导航、页脚和后端业务未改动。复用现有 AnimateInView、Button、Badge、CopyButton（移除首页重复的复制实现），无新增依赖。首屏动效与连接流光有限次播放，支持 prefers-reduced-motion；修复首页中文乱码及不自然文案，补齐一个七语言翻译键。既有未提交的 SEO、支付计划等改动均保留，未提交或部署。

**首页下一步：** 用户确认视觉后再决定是否提交或部署；如继续 Stage 1，仍从 `promotion-backend-model` 开始。本轮没有扩大到推广功能。

2026-10-14 commit/push: committed only controller/seo.go and controller/seo_test.go as 16f709201 (fix: include missing SEO route handlers), then successfully pushed main to origin (233ff8c58..16f709201), including the upstream merge. Unrelated local changes remain uncommitted. The focused tests, clean staged-source build, and Harness checks recorded below passed before commit. Next: review remaining local changes separately before committing them.

2026-10-14 release-blocker fix: staged the existing controller/seo.go and controller/seo_test.go so the router handlers are included in the next commit. No production logic changed and no commit was created. A clean archive of staged tree 005b33381285a3d4815fe3d1304e143d5481253a passed go build ./router and both focused SEO tests. Working-tree focused SEO tests and bash .harness/verify.sh upstream-merge-preserve-custom-ui passed (2 checks). Next: commit the two staged files when authorized; ae5361ced alone still lacks them. Unrelated local edits remain untouched. Full controller and three-database validation remains outstanding from review.

本次将 `upstream/main` 最新提交 `7fd063819` 合入当前 fork，生成合并提交 `233ff8c58`。合并保留了 fork 的定制功能与受保护名称、品牌及归属信息。

**下一步：** 从 `promotion-backend-model` 开始，创建 `model/promotion.go`，实现 `PromotionLink` 和 `PromotionRegistration` 结构体，并接入 `model/main.go` AutoMigrate。后续前端路径统一使用 `web/`。

## 已知问题 / 待决策

- [ ] `users` 表新增 `promotion_code`、`promotion_channel_tag` 字段：优先通过 GORM AutoMigrate，如遇 SQLite ALTER COLUMN 问题需参考 `model/main.go` 现有模式手工补字段
- [ ] OAuth 注册（GitHub/Discord/OIDC）是否需要同步接入推广码逻辑？（建议：是，抽 finalize 函数复用）
- [ ] 推广码与用户 `aff_code` 冲突检测：创建推广链接时需校验 code 不与现有用户 aff_code 重名

## 最近完成

- 新增 `docs/prd/antom-payment-security-hardening-plan.md`，记录 Antom 支付回调验签、金额/币种/订单归属校验、统一额度结算、上限保护及测试验收计划；本次未修改支付业务代码。

## 本次验证

### 2026-10-27 LinuxDo 优惠入口

- `go test ./model -run 'Test(LinuxDoOfficialSocialLinks|NormalizeOfficialSocialLinks|PublicOfficialSocialLinks)' -count=1` 通过。扩展现有测试文件，覆盖新平台配置规范化及公开输出、默认/自定义名称、查询参数和片段保留、停用空地址，以及空地址、HTTP、脚本和带凭据地址拒绝；修改 Go 文件已 gofmt。
- `cd web; bun run test src/features/official-social-links/lib.test.ts src/features/system-settings/content/__tests__/official-social-links.test.tsx`：10/10 通过。验证后台新建/选择、修改、停用清空、七语言默认名称机制中的中文切换、输入校验、保存失败重试及首页 status 缓存刷新。
- 使用既有 `PLAYWRIGHT_MODULE` / `PLAYWRIGHT_EXECUTABLE` 路径和 5173 开发服务，运行 `node --test src/features/home/__tests__/layout.browser.mjs`：41/41 通过。新增 LinuxDo 按钮位置与去重、键盘新标签跳转及 opener 隔离、无效配置隐藏、七语言 320px 深浅主题无溢出；原有首页回归全部保留。已目视检查 `%TEMP%/home-linuxdo-desktop.png`、`home-linuxdo-mobile-light.png` 和 `home-linuxdo-mobile-dark.png`。
- `bun run typecheck`、`bun run build:check`、七个涉及 JS/TS 文件的 `bunx --no-install oxlint -c .oxlintrc.json <paths>` 与 `bunx --no-install oxfmt --check <paths>` 通过；最终构建日志 `%TEMP%/newapi-linuxdo-build.log`。`git diff --check` 通过。
- 新文案通过 `scripts/add-missing-keys.mjs` 写入七语言后删除临时脚本，`bun run i18n:sync` 通过；各语言仅新增 `LinuxDo Offers` 一项，missing/extras 为 0，保留既有术语 untranslated 提示（zh=3、ja=4、ru=5）。shadcn CLI 查询 registry 超时，使用本地 components.json 及组件源码完成复用，无依赖变更。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-linuxdo-offers`：Go 编译、JSON 使用规则 2/2 通过；验收项确认后标记 done。后端变更为纯配置值校验，持久化机制与数据库行为未变更。

### 2026-10-24 最新上游合并

- `go test ./...` 最终通过（Go **1.26.10**）。最初模块下载超时通过本次进程 `GOPROXY=https://goproxy.cn,direct go mod download github.com/klauspost/compress github.com/Calcium-Ion/moejs` 解决，没有修改全局 Go 配置。测试初次发现 AWS 缺失类型导入、SQLite 测试连接泄漏和依赖外部 DNS 的代理用例；修复后定向回归及完整测试均通过。日志：`%TEMP%/newapi-merge-20261024-go-test-final.log`。
- `cd relaykit; GOWORK=off go build ./...` 与 `GOWORK=off go test ./...` 通过；`tokenkit/` 无变更。
- `cd web; bun install --frozen-lockfile`、`bun run i18n:sync`、`bun run typecheck`、`bun run build:check` 通过；七语言 missing/extras 为 0（保留术语 untranslated 提示 zh=3、ja=4、ru=5）。`bun run test`：203 files / **2455 tests** 全部通过；两处无行为变化的 lint 修正后 pricing 子集 161 tests 通过，格式修正后 pricing-sync 21 tests 通过。
- `node --test src/features/home/__tests__/layout.browser.mjs`：**38/38** 通过。使用生产预览 `HOME_TEST_URL=http://localhost:5175` 和上文记录的 Playwright 路径；覆盖七语言、四种视口、深浅主题、社群与复制、CTA 模型数据边界、大陆直连地址。API 使用确定性 fixture。
- 所有合并涉及 JS/TS 文件执行 `bunx --no-install oxlint -c .oxlintrc.json <changed paths>` 通过，仅有三个非阻断 warning；手工修正文件 `oxfmt --check` 通过。全仓 `bun run lint` 和 `bun run format:check` 仍被其他已有文件阻断，未扩大合并范围清理。`git diff --check` 与 `git diff --cached --check` 通过，没有未解决冲突。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh upstream-merge-preserve-custom-ui`：Go 编译、JSON 使用规则 **2/2 通过**。
- 数据库真实版本：SQLite **3.50.4**、MySQL **8.0.46**、PostgreSQL **16.14**。使用独立临时容器，未接触已有业务数据库：`docker run -d --name newapi-merge-20261024-mysql --label codex.task=upstream-merge-20261024 -p 127.0.0.1:33326:3306 -e MYSQL_ROOT_PASSWORD=merge-test-only -e MYSQL_DATABASE=merge_test mysql:8.0`；`docker run -d --name newapi-merge-20261024-postgres --label codex.task=upstream-merge-20261024 -p 127.0.0.1:35452:5432 -e POSTGRES_PASSWORD=merge-test-only -e POSTGRES_DB=merge_test pgvector/pgvector:pg16`。
- 设置 `TEST_MYSQL_DSN=root:merge-test-only@tcp(127.0.0.1:33326)/merge_test?charset=utf8mb4&parseTime=True&loc=Local`、`TEST_POSTGRES_DSN=host=127.0.0.1 port=35452 user=postgres password=merge-test-only dbname=merge_test sslmode=disable`，运行 `go test ./model -run 'Test(AuditLogSortIndexDatabaseMatrix|ChannelPriorityDatabaseMatrix)$' -count=1 -v`：三个数据库全部通过，含审计索引新建/升级/幂等、排序和渠道并发重排/回滚。
- `AUDIT_MYSQL_DSN` 同上 MySQL；`AUDIT_POSTGRES_DSN=postgres://postgres:merge-test-only@127.0.0.1:35452/merge_test?sslmode=disable`。`go test ./controller -run 'TestAuditDatabaseMatrix/(mysql|postgres)' -count=1 -v` 与 `go test ./controller -run 'TestIndependentAuditLogStores/(mysql|postgres)' -count=1 -v` 均通过，覆盖 fresh/upgrade、共享与独立日志库、历史审计数据、权限及唯一性。SQLite 对应矩阵在完整测试与定向回归中通过。
- 新增缓存用量列另使用临时验证程序 `.git/merge-20261024/dbcheck.go`：`go build -o <tmp>/newapi-merge-20261024-dbcheck.exe ./.git/merge-20261024/dbcheck.go`；分别从最新发布版 **v1.0.0-rc.46（7d8b91268）**、合并前 fork **12cd4cc6c** 编译 seed 程序，以 `seed <snapshot.json>` 建库并写入代表性 user/token/option/audit/usage 数据，再运行新版本 `verify <snapshot.json>`。对 SQLite/MySQL/PostgreSQL 各覆盖全新、发布版升级、fork 升级，合计 **9/9 通过**。每次验证重复启动迁移三次，确认原有数据、索引和唯一约束保留，旧 usage 的缓存列为 0，内存合并及 SQL 累加后新缓存计数准确，MySQL/PG 使用独立 log 数据库。命令和输出保留在 `%TEMP%/newapi-merge-{sqlite,mysql,postgres}-{fresh,upgrade,fork}.log`；临时程序不纳入产品提交。
- 大陆直连配置持久化：分别设置 `TEST_MAINLAND_DB=mysql` / `postgres` 与上述 DSN，运行 `go test ./controller -run TestMainlandBaseURLPersistenceAndStatus -count=1 -v`，两库通过；SQLite 随完整测试通过。
- 认证参考：OWASP [ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0)、[Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)、[Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)。合并保持服务端重认证、挑战单次/过期、会话失效与非秘密审计约束；上游邮件语言/投递改动及相关成功、失败、重放、过期和绕过回归随 controller/service 全量测试通过。此次为合并回归，不宣称完整 ASVS 认证审计。
- 已人工核对受影响任务插件的数值字段说明采用计费主体 + 单价，单位独立；API v1 文档、声明与 schema 的兼容性随插件测试验证。

### 2026-10-20 大陆直连优化

- `go test ./controller -run TestMainlandBaseURL -count=1 -v`：通过。覆盖服务端校验及无效输入 API 拒绝、配置新增/更新/清空、数据库读取重载、公开 status；SQLite **3.50.4**。
- MySQL **8.0.46**：独立临时容器 `mysql:8.0`，命令 `docker run -d --name newapi-mainland-mysql --label codex.task=homepage-regional-base-url -p 127.0.0.1:33316:3306 -e MYSQL_ROOT_PASSWORD=mainland-test-only -e MYSQL_DATABASE=mainland_test mysql:8.0`。PowerShell 设置 `$env:TEST_MAINLAND_DB='mysql'` 与 `$env:TEST_MYSQL_DSN='root:mainland-test-only@tcp(127.0.0.1:33316)/mainland_test?charset=utf8mb4&parseTime=True&loc=Local'`，执行 `go test ./controller -run TestMainlandBaseURLPersistenceAndStatus -count=1 -v`：通过。
- PostgreSQL **16.14**：独立临时容器 `pgvector/pgvector:pg16`，命令 `docker run -d --name newapi-mainland-postgres --label codex.task=homepage-regional-base-url -p 127.0.0.1:35442:5432 -e POSTGRES_PASSWORD=mainland-test-only -e POSTGRES_DB=mainland_test pgvector/pgvector:pg16`。PowerShell 设置 `$env:TEST_MAINLAND_DB='postgres'` 与 `$env:TEST_POSTGRES_DSN='host=127.0.0.1 port=35442 user=postgres password=mainland-test-only dbname=mainland_test sslmode=disable'`，执行同一持久化测试命令：通过。两个本次创建的测试容器及临时卷已停止并删除；未使用或修改既有业务数据库。
- `cd web; bun run test src/features/system-settings/__tests__/mainland-base-url.test.tsx`：24/24 通过，覆盖保存、清空、错误提示、失败保留输入、状态刷新及地址规范化。
- `node --test src/features/home/__tests__/layout.browser.mjs`：38/38 通过，使用既有 Playwright 路径环境变量及 5173 开发服务。新增覆盖独立键盘复制、原地址保留、空/无效配置隐藏、已有 `/v1` 不重复、七语言 320px 长地址无溢出。已目视检查临时目录 `home-mainland-desktop.png` 和 `home-mainland-mobile.png`。
- `bun run typecheck`、`bun run build:check`、9 个涉及 JS/TS 文件的 `bunx --no-install oxlint -c .oxlintrc.json ...` 与 `bunx --no-install oxfmt --check ...`、`git diff --check` 均通过；Go 文件已 gofmt。
- 新增 4 个文案键通过 `scripts/add-missing-keys.mjs` 写入全部七语言，临时脚本已移除；`bun run i18n:sync` 通过，missing/extras 均为 0，保留原有术语 untranslated 提示（zh=3、ja=4、ru=4）。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-regional-base-url`：2 项通过（全项目 Go 编译、JSON 使用规则）。feature 验收逐项通过后标记 done。

### 2026-10-15 浅色主题修复

- 先运行 `node --test --test-name-pattern 'homepage CTA surfaces' src/features/home/__tests__/layout.browser.mjs`，稳定复现 light 模式 `.home-hero` 背景亮度仅 0.071895，失败退出；修复后同一测试通过。
- 完整 `node --test src/features/home/__tests__/layout.browser.mjs`：26/26 通过（沿用下方 Playwright 环境变量及 5173 服务）。覆盖浅→深→浅切换、七种表面背景、首屏/底部 CTA 共七组文字背景对比度至少 4.5:1，以及模型 Logo 在两种背景正确切换；既有响应式、社群、复制和热门模型回归均保留。
- `cd web; bun run typecheck`、`bun run build:check` 通过；涉及 TSX/浏览器测试的定向 oxlint、四文件 oxfmt --check 与 `git diff --check` 通过。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-light-theme-fix` 通过（2 项）。
- 已目视检查 `C:/Users/Administrator/AppData/Local/Temp/home-theme-light.png` 与 `home-theme-dark.png`；按项目 UI 技能使用局部主题变量，未新增依赖或全局主题实现。

### 2026-10-15 客户端品牌图标

- `cd web; bun run typecheck`、`bun run build:check` 通过。
- `node --test src/features/home/__tests__/layout.browser.mjs`：25/25 通过（沿用下方 Playwright 环境变量及 5173 服务）。扩展已有品牌回归，覆盖七品牌两处 14 个图标的实际加载、素材与标签对应、Codex/Codex CLI 映射、固定尺寸、不拉伸、不重复朗读、OpenAI 主题切换及四档视口。
- 三个 TSX 与现有浏览器测试定向 oxlint、oxfmt --check 通过；`git diff --check` 通过。旧 HomeModelIcon 导入检索为空。
- 三个客户端 SVG 与源素材内容（忽略末尾换行）完全一致；已目视检查更新后的 hero/light/dark 品牌截图。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-client-brand-icons` 通过（2 项）。

### 2026-10-15 模型品牌图标

- `cd web; bun run typecheck`、`bun run build:check` 通过。
- `node --test src/features/home/__tests__/layout.browser.mjs`：25/25 通过，沿用下方 Playwright 缓存环境变量及 5173 服务。新增验证四品牌两处实际素材加载、24px 固定尺寸/不拉伸、模型图形与名称对应、装饰图标隐藏语义、恒定深色首屏与主题切换后的 OpenAI 版本、320/375/768/1440px 无溢出。
- 新增组件及两处修改 TSX、浏览器测试的定向 oxlint 与 oxfmt --check 通过；`git diff --check` 通过。
- 四个 SVG 与原始文件内容（忽略末尾换行）完全一致，OpenAI 白色 PNG SHA256 与原文件完全相同。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-model-brand-icons` 通过（2 项）。
- 已目视检查 `C:/Users/Administrator/AppData/Local/Temp/home-brand-icons-hero.png`、`home-brand-icons-light.png`、`home-brand-icons-dark.png`；品牌技能要求落实为原始形状/配色保留及使用提供的白色版本，没有改绘 Logo。

### 2026-10-15 社群入口

- `cd web; bun run typecheck`、`bun run build:check` 通过。
- `bun run test src/features/official-social-links/lib.test.ts`：2/2 通过。
- `node --test src/features/home/__tests__/layout.browser.mjs`：24/24 通过（沿用下方 Playwright 环境变量，5173 服务）。新增覆盖社群入口位置/去重、保留全站文档、键盘切换及新标签打开、opener 隔离、空配置/停用/不安全 URL、单社群和 320/375/768/1440px 长标签。修正既有热门模型异步断言，先等待明确的模型链接而非仅依赖 networkidle。
- 对 hero.tsx、official-social-links.tsx、layout.browser.mjs 的定向 oxlint、oxfmt --check 通过；`git diff --check` 通过。
- `bun run i18n:sync` 通过；本次未新增或修改 locale 文案。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-community-actions` 通过（2 项）。
- 已目视检查 `C:/Users/Administrator/AppData/Local/Temp/home-community-desktop.png`、`home-community-mobile.png`。按项目 UI 技能兼容扩展现有社群组件，无新增依赖。

### 2026-10-15 热门模型 CTA

- `cd web; bun run typecheck`、`bun run build:check` 通过。
- 对 `src/features/home/components/sections/cta.tsx`、`src/features/home/hooks/use-popular-model.ts`、`src/features/home/__tests__/layout.browser.mjs` 执行 `bunx --no-install oxfmt --check ...` 与 `bunx --no-install oxlint -c .oxlintrc.json ...` 通过；`git diff --check` 通过。
- `node --test src/features/home/__tests__/layout.browser.mjs` 21/21 通过，沿用下方 Playwright 缓存环境变量及 5173 开发服务。新增测试覆盖服务端调用量顺序（不依赖隐藏的次数）、排除未上架模型、详情键盘跳转、等待期间可用的原 CTA、空/无匹配/缺失统计、业务及网络错误回退、关闭/私有广场不发请求、七语言 320px 超长模型名；测试仅拦截 API，不访问真实业务数据。
- `bun run i18n:sync` 通过，两个新键均补齐七语言；保留既有术语 untranslated 提示，不扩展清理范围。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-popular-model-cta` 通过（2 项）。
- 已检查测试数据截图 `C:/Users/Administrator/AppData/Local/Temp/home-popular-model-desktop.png` 与 `home-popular-model-mobile.png`；本地 shadcn CLI 查询目录超时，按已读取的 components.json 和本地组件源码实现，无 registry 安装。

### 2026-10-15 首页布局与动效

- `cd web; bun run typecheck`、`bun run build:check` 通过。
- `bun run test` 通过：189 files / 2260 tests（jsdom 有既存 scrollTo 未实现提示，退出码 0）。
- 对本次 6 个 TSX 文件、`src/styles/home.css` 和 `src/features/home/__tests__/layout.browser.mjs` 的 `oxfmt --check` 与 `oxlint -c .oxlintrc.json` 定向检查通过。
- `bun run i18n:sync` 通过：七语言 missing/extras 为 0；保留存量术语未翻译提示 zh=3、ja=4、ru=4（Doubao、Responses WebSocket、SGLang、Zhipu GLM），本次新键已全量翻译。脚本排序产生 locale 行移动，语义比较确认仅新增七语言一个键及优化简繁中文各 11 条现有首页文案，无删除键。
- `node --test src/features/home/__tests__/layout.browser.mjs` 在开发服务 5173 和生产预览 5174 均为 9/9 通过。用 Playwright 拦截 API 返回确定性数据，未连接真实业务接口。覆盖 320/375/768/1440px、七种语言、深浅主题、长站名/端点、键盘复制、关闭注册/私有定价入口、有限次动效与减少动态效果、Markdown 自定义首页隔离。已目视检查桌面与手机截图。
- 浏览器复跑：先在 `web/` 执行 `bun run dev --port 5173`（生产使用 `bun run preview --port 5174`），设置 `PLAYWRIGHT_MODULE=C:/Users/Administrator/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright`、`PLAYWRIGHT_EXECUTABLE=C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe`；生产另设 `HOME_TEST_URL=http://localhost:5174`，再执行上述 node 测试命令。也可使用本机安装的 Playwright 和对应浏览器，不设置前两个覆盖变量。
- `C:/Program Files/Git/bin/bash.exe .harness/verify.sh homepage-layout-motion` 通过：Go 编译与 JSON 规则 2 项；`git diff --check` 通过。
- 截图：`C:/Users/Administrator/AppData/Local/Temp/home-1440-light.png`、`home-375-light.png`、`home-375-dark.png`。UI/UX 技能的 React 动效专项检索无匹配，采用项目既有 CSS 动效与已匹配的减少动态效果指导。

### 之前会话验证记录

- `go test ./...` 通过
- `bun run i18n:sync` 通过（web；七语言 missing/extras/untranslated 全为 0，placeholder mismatch 为 0）
- `bun run typecheck`、`bun run build:check`、`bun test` 通过（web；114 tests）
- `bun run lint` 未通过：上游新 oxlint 规则扫描出大量存量 lint 问题，本次单功能合并未扩展处理
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh upstream-merge-preserve-custom-ui` 通过
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh antom-safari-popup-plan` 通过（Go 编译、全局 JSON 规则）
- `bun run typecheck`、目标文件 oxlint/oxfmt、`bun run build:check` 通过（web/default）
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh antom-safari-popup-fix` 通过（Go 编译、全局 JSON 规则）
- `go test ./...` 通过（含 SEO controller/router 回归测试）
- `bun test src/lib/__tests__/seo.test.ts` 通过（2 tests）
- `bun run typecheck`、涉及文件 oxlint/oxfmt、`bun run build:check` 通过（web）
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh seo-technical-optimization` 通过
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh antom-payment-security-hardening-plan` 通过
- `go test ./...` 通过（首次 HTTP/2 socket 测试瞬态失败，单独重试及完整重跑均通过）
- `cd relaykit && GOWORK=off go build ./...` 通过
- `bun run i18n:sync` 通过（七语言 missing/extras/untranslated 全为 0）
- `bun run typecheck`、`bun run test`（32 files / 158 tests）、`bun run build:check` 通过（web）
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh upstream-merge-preserve-custom-ui` 通过
- `bun run format:check` 仍被存量文件 `web/scripts/fix-docs-zh-translations.cjs` 阻断；本次涉及文件定向格式检查通过
- `git diff --name-only --diff-filter=U` 为空
- 受保护 UI 路径 `git diff` / `git diff --cached` 均为空

## 关键约束（每次会话必读）

1. **JSON**：所有 marshal/unmarshal 使用 `common.*`，禁止直接用 `encoding/json`（Rule 1）
2. **数据库**：GORM API 优先，禁止 MySQL/PG 专用语法，bool 字面量用变量（Rule 2）
3. **布尔字段**：用 `commonTrueVal`/`commonFalseVal`，不写死 `1`/`0` 或 `true`/`false`
4. **DTO**：可选标量字段用指针 + `omitempty`（Rule 6）
5. **前端包管理**：用 `bun`，不用 npm/yarn（Rule 3）

## 不做的事（out of scope for Stage 1）

- 分佣结算
- 多级推广
- 复杂 ROI 看板
- 设备指纹
- A/B 实验
- 临时邮箱黑名单
- 首次调用 API / 首次充值后再发奖励

---

## 参考文档

- 需求详情：`docs/prd/prd-promotion-stage1.md`
- 所有 PRD 索引：`docs/prd/INDEX.md`

---

*最后更新：2026-11-27 Stage 3 用户引导 First Setup 8 个 feature 完成并通过 P9 验收，待用户确认提交。*
