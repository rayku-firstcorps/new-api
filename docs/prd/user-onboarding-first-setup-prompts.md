# 用户引导（First Setup）与注册赠送 — 分阶段开发 Prompts

> 来源方案：[user-onboarding-first-setup-plan.md](user-onboarding-first-setup-plan.md)  
> 创建日期：2026-11-26  
> 用途：按 Harness「单功能原则」，每个 Prompt 对应一个 feature / 一次会话，依次交给 AI 编码代理执行。

---

## 使用说明

1. **严格按顺序执行**：P0 → P1 → … → P9。后一个 Prompt 依赖前一个的产出（后端字段 → 后台 UI → 向导 → Overview）。
2. **一次会话只粘贴一个 Prompt**。每个 Prompt 都是自包含的，开头已包含必读文件与 Harness 启动要求。
3. 每个 Prompt 结束时代理必须：更新 `.harness/feature_list.json` 状态、运行 `bash .harness/verify.sh <feature-id>`、更新 `claude-progress.md`。
4. 若某个 Prompt 执行中发现方案与代码现状冲突，代理应停下说明冲突并给出选项，而不是自行扩大范围。

### Feature 一览

| Prompt | feature id | 范围 | 依赖 |
|---|---|---|---|
| P0 | —（登记） | 将 P1–P8 登记到 `.harness/feature_list.json` | 无 |
| P1 | `onboarding-new-user-quota-switch` | 后端：注册赠送开关 / 邮箱前置 / 升级兼容 / 金额校验 | P0 |
| P2 | `onboarding-setting-and-state` | 后端：`onboarding_setting`、`/api/status` 字段、`UserSetting` 引导状态与更新接口 | P1 |
| P3 | `onboarding-admin-settings-ui` | 前端：额度设置开关 + `OnboardingSettingsSection` + 类型 + i18n | P2 |
| P4 | `onboarding-wizard-shell` | 前端：抽离 `<WizardShell>`，`/setup` 完成后跳 `/sign-in?from=setup` | P0 |
| P5 | `onboarding-user-wizard-core` | 前端：`/onboarding` 路由、Step 1/2、自动触发、跳过持久化、重开入口、注册页赠送提示 | P2, P3, P4 |
| P6 | `onboarding-user-wizard-connect` | 前端：Step 3 接入（CC Switch 内嵌、多语言代码、Playground、一键测试请求） | P5 |
| P7 | `onboarding-admin-first-setup` | 前端：管理员无渠道首启向导 | P6 |
| P8 | `onboarding-overview-refine` | 前端：Overview 兜底改造（降噪、RequestPreview、SummaryCards、按 user.id 隔离） | P5 |
| P9 | —（验收） | 全量回归与验收标准逐条核对 | P1–P8 |

---

## 通用前置块（已嵌入每个 Prompt，此处仅供参考）

```text
开始前必须按顺序完成：
1. 用 Read 工具完整阅读仓库根目录 AGENTS.md（不得用 grep/摘要代替）。
2. 阅读 claude-progress.md 与 .harness/feature_list.json，确认本 feature 的 scope、acceptance 与 out_of_scope。
3. 完整阅读 docs/prd/user-onboarding-first-setup-plan.md 中与本 feature 相关的章节。
4. 涉及 web/ 时完整阅读 web/AGENTS.md 与项目 shadcn-ui skill，并先搜索 web/src/components/ 与相关 feature 中可复用的组件。
5. 向我声明：本次只实现哪个 feature，明确不会触碰哪些范围。
结束前必须：
- 运行本 Prompt 列出的验证命令并如实报告结果（失败就贴输出，不得声称完成）。
- 运行 bash .harness/verify.sh <feature-id>，通过后才可把 feature 标记为 done，否则标记 in_progress。
- 更新 claude-progress.md：本次进展、遗留问题、下一步具体动作。
- 不提交 git commit，除非我明确要求。
```

---

## P0 — 登记 Feature 到 Harness

```text
任务：只做 Harness 登记，不写任何业务代码。

1. 用 Read 工具完整阅读 AGENTS.md、claude-progress.md、.harness/feature_list.json、
   docs/prd/user-onboarding-first-setup-plan.md、docs/prd/user-onboarding-first-setup-prompts.md。
2. 在 .harness/feature_list.json 的 features 数组中，按现有条目的字段格式（id / title / status / scope / acceptance）
   追加以下 8 个 feature，status 全部为 "pending"：
   - onboarding-new-user-quota-switch
   - onboarding-setting-and-state
   - onboarding-admin-settings-ui
   - onboarding-wizard-shell
   - onboarding-user-wizard-core
   - onboarding-user-wizard-connect
   - onboarding-admin-first-setup
   - onboarding-overview-refine
   每个 feature 的 title、scope（目录/文件列表）与 acceptance（3–6 条可验证条目）
   从 prompts 文档中对应 Prompt 的「范围」与「验收」部分提炼，不要发明方案里没有的需求。
3. 检查 out_of_scope 是否与本方案冲突（例如是否列出了“新手引导”“注册赠送”相关条目）；如有冲突，停下并告诉我，不要自行删改。
4. 检查 .harness/verify.sh 是否需要为这些 feature id 增加对应的验证分支；如需要，按现有分支风格补充
   （后端 feature 跑 go test 对应包，前端 feature 跑 bun run typecheck / bun run test 对应文件），只改验证脚本，不改业务代码。
5. 校验 JSON 合法（例如 node -e "JSON.parse(require('fs').readFileSync('.harness/feature_list.json','utf8'))"）。
6. 更新 claude-progress.md，写明下一步执行 P1。
```

---

## P1 — 后端：注册赠送开关与发放逻辑

**feature id**：`onboarding-new-user-quota-switch`

```text
本次 feature：onboarding-new-user-quota-switch（后端注册赠送开关体系）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、claude-progress.md、.harness/feature_list.json。
- 阅读 docs/prd/user-onboarding-first-setup-plan.md 的 §3.1-A、§4 Phase 1 第 1 点、§5.1、§6.1。
- 阅读现有实现：setting/operation_setting/quota_setting.go、setting/operation_setting/checkin_setting.go（注册模式参考）、
  setting/config/ 下 GlobalConfig.Register、common/constants.go 中 QuotaForNewUser、model/option.go、
  model/user.go 的 TryGrantNewUserQuota、controller/user.go（Register，约 359 行调用点）、controller/email_binding.go（约 111 行调用点）、
  OAuth 新建用户路径（搜索 controller/ 下创建用户的 OAuth 回调）、controller/option.go（选项保存校验）。
- 本 feature 涉及注册与邮箱绑定流程，必须遵守 AGENTS.md「Authentication Security (OWASP Mandatory)」：
  先阅读 OWASP Authentication Cheat Sheet，确认防账号枚举、防刷相关控制不被削弱。
- 判断是否触发 AGENTS.md 的 Billing 读取门槛：若需要改动 common/quota_math.go 或其他列表内文件，必须先完整阅读 .agents/rules/billing.md。
- 向我声明本次范围与不触碰的范围（不碰前端、不碰 onboarding_setting、不碰 /api/status 的 onboarding_* 字段）。

【要做的事】
1. setting/operation_setting/quota_setting.go：新增
   - quota_setting.new_user_quota_enabled（bool，默认 false）
   - quota_setting.new_user_quota_require_email（bool，默认 true）
   及读取函数（如 IsNewUserQuotaEnabled()、IsNewUserQuotaRequireEmail()），沿用现有 GlobalConfig.Register 模式。
2. 升级兼容：启动加载配置时，若数据库 options 中不存在 new_user_quota_enabled 键且 QuotaForNewUser > 0，
   自动将开关初始化为 true（并持久化或在内存中生效——选择与现有配置加载机制一致的方式，说明理由）。
   必须保证重复启动幂等，且管理员之后显式关闭不会被下次启动覆盖回 true。
3. model/user.go TryGrantNewUserQuota：
   - 入口改为 !IsNewUserQuotaEnabled() || common.QuotaForNewUser <= 0 时直接返回；
   - require_email == true：保持现有“Email 非空才发放”逻辑；
   - require_email == false：不再要求 Email 非空；
   - 严格保留 lockForUpdate(tx) + NewUserQuotaRewarded 行锁幂等与缓存同步，不改变锁语义。
4. controller/user.go Register 与 OAuth 新建用户路径：require_email == false 时注册完成即调用 TryGrantNewUserQuota；
   require_email == true 时维持现有触发点（邮箱验证注册、OAuth 补绑邮箱、用户中心绑定邮箱）。
5. controller/option.go：保存 QuotaForNewUser 时校验 >= 0 且不超过合理上限（复用现有上限常量，例如 common.MaxWalletQuota，若不存在则说明并选一个已有常量），
   错误消息使用 common.ApiErrorT 英文源文本，并把新 key 加入前端全部 7 个 locale 文件。
6. 测试：优先扩展已有测试文件（如 model/ 或 controller/ 下已有 user / option 测试），最多新增 1 个测试文件，使用 testify require/assert，
   覆盖方案 §5.1 前 5 行场景：开关关闭不发放且金额保留；require_email=true 邮箱注册发放一次；OAuth 无邮箱→补绑后发放一次且重复不再发；
   require_email=false 注册即发且重复调用只发一次；升级兼容自动启用且显式关闭后不被覆盖。

【约束】
- JSON 一律用 common.Marshal/Unmarshal；Go 代码遵循 AGENTS.md Modern Go 约定并 gofmt。
- 不新增数据库表/列。若改动影响数据库行为（锁、事务、options 写入），按 AGENTS.md 在 SQLite、MySQL、PostgreSQL 三库真实验证并记录版本与命令；
  无法运行则明确报告阻塞，不得声称完成。

【验证】
- go build ./...
- go test ./model/... ./controller/... ./setting/...
- bash .harness/verify.sh onboarding-new-user-quota-switch

【结束】按通用前置块完成状态更新与 claude-progress.md；在总结中列出 OWASP 参考与未解决缺口。
```

---

## P2 — 后端：引导开关、`/api/status` 字段与用户引导状态

**feature id**：`onboarding-setting-and-state`

```text
本次 feature：onboarding-setting-and-state（onboarding_setting 配置、/api/status 公开字段、UserSetting 引导状态）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、claude-progress.md、.harness/feature_list.json。
- 阅读方案 §3.1-B、§3.1-C、§3.4、§5.1 最后两行。
- 阅读：setting/operation_setting/checkin_setting.go（注册模式）、setting/console_setting/config.go、controller/misc.go（GetStatus）、
  relaykit/dto/user_settings.go（UserSetting）、controller/user.go 中用户更新自身设置的现有接口（搜索 UpdateSelf / setting 相关 handler）、router/ 中对应路由。
- 确认 P1 已完成（IsNewUserQuotaEnabled 等函数存在）。
- 声明范围：只做后端；不碰前端；不改 TryGrantNewUserQuota。

【要做的事】
1. 新增 setting/operation_setting/onboarding_setting.go，命名空间 onboarding_setting，字段与默认值：
   enabled=true、auto_open_on_first_login=true、allow_inline_test_request=true、show_cc_switch=true、admin_guide_enabled=true。
   避免使用 gorm:"default:true" 之类布尔默认 tag，默认值在注册/构造时设置。
2. controller/misc.go /api/status 新增只读字段：
   onboarding_enabled、onboarding_auto_open、onboarding_inline_test_enabled、onboarding_cc_switch_enabled、onboarding_admin_guide_enabled、
   new_user_quota_enabled、new_user_quota_amount、new_user_quota_require_email。
   new_user_quota_amount 仅在 enabled && QuotaForNewUser > 0 时返回正数，否则返回 0。不暴露任何其他敏感配置。
3. relaykit/dto/user_settings.go：UserSetting 新增 OnboardingCompleted bool、OnboardingDismissed bool、OnboardingUseCase string（均 omitempty）。
   relaykit 模块不得引入根模块依赖；改动后在 relaykit/ 内运行 GOWORK=off go build ./...。
4. 用户自身更新引导状态：优先复用现有用户自身设置更新接口；若现有接口会整体覆盖 UserSetting，则新增最小接口 PUT /api/user/onboarding，
   只接受白名单字段（completed / dismissed / use_case，use_case 只允许 coding / api / playground），读-改-写合并，绝不覆盖 SidebarModules、Language 等其他字段。
   需要登录鉴权（复用现有 UserAuth 中间件），返回消息用 common.ApiSuccessT/ApiErrorT，新增英文 key 同步到前端 7 个 locale 文件。
   说明你选择复用还是新增接口的理由。
5. 确认 /api/user/self（或前端获取当前用户的接口）返回中包含 setting 里的 onboarding_* 字段，以及 new_user_quota_rewarded，供前端判定使用；缺失则补充。
6. 测试（扩展已有测试文件优先，最多新增 1 个）：
   - 修改 onboarding_setting.* 后 /api/status 返回对应布尔值；
   - new_user_quota_amount 在开关关闭或金额为 0 时为 0；
   - 更新引导状态只改白名单字段，其他 UserSetting 字段保持不变；非法 use_case 被拒绝。

【验证】
- go build ./... ；cd relaykit && GOWORK=off go build ./...
- go test ./controller/... ./setting/... ./model/...
- bash .harness/verify.sh onboarding-setting-and-state

【结束】按通用前置块完成状态更新；总结中列出新增的 /api/status 字段与接口签名，供 P3/P5 使用。
```

---

## P3 — 前端：后台注册赠送开关与新手引导设置页

**feature id**：`onboarding-admin-settings-ui`

```text
本次 feature：onboarding-admin-settings-ui（系统设置中的注册赠送开关与 OnboardingSettingsSection）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §3.1-A/B、§3.5-4（后台界面示意图）、§4 Phase 1 第 2 点、§6.1。
- 阅读：web/src/features/system-settings/general/quota-settings-section.tsx、
  web/src/features/system-settings/operations/section-registry.tsx 及同目录现有 section（promotion-reward-section.tsx、splash-ad-section.tsx）、
  前端 status / system-config 类型定义与 useStatus（自行搜索）、现有 system-settings 测试 web/src/features/system-settings/__tests__/。
- 确认 P2 已完成，后端 option key 与 /api/status 字段名以 P2 实际实现为准。
- 声明范围：只改 system-settings 与类型/i18n；不做向导、不改 Overview。

【要做的事】
1. quota-settings-section.tsx「新用户注册赠送」区块：
   - 新增「启用新用户注册赠送」开关（quota_setting.new_user_quota_enabled）；关闭时金额输入置灰禁用但不清空原值；
   - 金额输入继续用 quotaUnitsToDollars / parseQuotaFromDollars 按当前货币展示；
   - 新增「仅验证/绑定邮箱后发放（推荐，防薅）」开关（quota_setting.new_user_quota_require_email）；
     关闭该开关时给出明确风险提示（建议配合 Turnstile 人机验证或邀请制），优先复用现有 ConfirmDialog / Alert 类共享组件。
2. 新增 web/src/features/system-settings/operations/onboarding-settings-section.tsx（OnboardingSettingsSection），注册到 section-registry.tsx，
   路由 /system-settings/operations/onboarding。5 个开关按示意图呈现：总开关 + 4 个子开关；总开关关闭时子开关禁用但保留值。
   复用现有 settings section 的表单、保存与 Switch 组件模式，不自建表单基础设施。
3. 更新前端 status / system-config 类型，加入 P2 新增的 /api/status 字段（保持可选以兼容旧后端）。
4. 所有新文案用 t('English key')，加入 7 个 locale 文件，运行 bun run i18n:sync。
5. 测试：扩展 system-settings 已有测试文件，覆盖：总开关关闭时金额输入禁用且值保留；保存提交正确的 option key；onboarding 总开关禁用子开关。
6. 样式只使用 KuCode 主题语义化 token，不写硬编码色值；深浅色与移动端可用，开关有可访问标签。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test -- system-settings
- bun run lint（或对改动文件的定向 lint）
- bun run i18n:sync 后无未同步 key
- bash .harness/verify.sh onboarding-admin-settings-ui

【结束】按通用前置块完成；总结中说明复用了哪些共享组件，若有新建 UI 行为须写明能力缺口。
```

---

## P4 — 前端：抽离 `<WizardShell>` 并调整 `/setup` 跳转

**feature id**：`onboarding-wizard-shell`

```text
本次 feature：onboarding-wizard-shell（从 SetupWizard 抽离公共向导壳）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §3.2-1、§3.2-2「与现有 /setup 衔接」、§5.2 第 1 行。
- 完整阅读 web/src/features/setup/ 下全部文件（setup-wizard.tsx、StepNavigation、UsageModeStep 等）及其测试。
- 先搜索 web/src/components/ 中是否已有 stepper / wizard / steps 类组件；如已有，优先扩展而不是新建。
- 声明范围：只重构 /setup 与新增 web/src/components/wizard/；不实现 /onboarding 业务。

【要做的事】
1. 新增 web/src/components/wizard/wizard-shell.tsx：纯展示组件，包含品牌头、顶部步骤条（当前 ol.grid 结构）、内容卡片容器、
   底部导航插槽（StepNavigation）、可选右上角「跳过」按钮插槽、可选语言切换插槽。
   通过 props 接收 steps、currentStep、children、footer、onSkip 等，不包含任何 setup 业务逻辑。
2. setup-wizard.tsx 改用 <WizardShell>，保证 4 步校验、提交、视觉、无障碍（键盘焦点、ARIA 当前步骤）行为 100% 不变。
   若 StepNavigation / UsageModeStep 需要被 onboarding 复用，评估是否移入 components/wizard/ 并保持原导入路径兼容或同步更新调用点。
3. /setup 初始化提交成功后的跳转从 / 改为 /sign-in?from=setup。
4. 测试：现有 /setup 测试全部通过；补充/调整断言：完成后跳 /sign-in?from=setup。为 WizardShell 增加最小测试仅当它有独立可观察行为（如跳过按钮回调、当前步骤 aria-current）。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test -- setup
- bun run build:check
- bash .harness/verify.sh onboarding-wizard-shell

【结束】按通用前置块完成；总结中给出 WizardShell 的 props 说明，供 P5/P7 使用。
```

---

## P5 — 前端：用户 First Setup 核心（路由、Step 1/2、触发与跳过）

**feature id**：`onboarding-user-wizard-core`

```text
本次 feature：onboarding-user-wizard-core（/onboarding 路由、Step 1 场景选择、Step 2 额度与一键建 Key、自动触发、跳过持久化、重开入口、注册页赠送提示）。
Step 3 只放占位（显示“下一步将接入”并允许完成），真正的接入能力在 P6 实现。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §3.2-2、§3.2-3（Step 1、Step 2）、§3.4、§3.5-1 流程图、§3.5-2 Step1/Step2 示意图、§4 Phase 2 第 2、3 点、§5.2、§6.3、§6.4。
- 阅读：P4 产出的 web/src/components/wizard/、web/src/features/setup/（UsageModeStep）、
  web/src/features/keys/api.ts（createApiKey、fetchTokenKey）、web/src/features/dashboard/lib/setup-guide.ts（preferredKey 等现有判定）、
  登录后重定向逻辑（搜索 sign-in 成功后的 navigate / redirect）、web/src/routes/_authenticated/ 现有路由写法、注册页组件、侧边栏组件、
  用户绑定邮箱流程的前端入口。
- 涉及注册页与邮箱绑定入口，遵守 AGENTS.md OWASP 规则：前端提示不得替代服务端控制，不得引入账号枚举信息。
- 确认 P2/P3/P4 已完成。声明范围：不实现 Step 3 接入、不改 Overview（入口按钮除外）、不做管理员向导。

【要做的事】
1. 新建 web/src/features/onboarding/ 与受保护路由 web/src/routes/_authenticated/onboarding/index.tsx，使用 <WizardShell>，视觉与 KuCode 主题一致。
2. Step 1「选择使用方式」：复用 UsageModeStep 的大卡片单选，三项 coding / api / playground；
   status.onboarding_cc_switch_enabled 为 false 时卡片 1 文案改为通用客户端接入描述。选择结果写入 OnboardingUseCase。
3. Step 2 区块 A「额度就绪态」：
   - SelfUseModeEnabled 时隐藏整个区块；
   - quota > 0：显示可用余额（用 @/lib/currency 格式化），new_user_quota_rewarded 为真时附「含注册赠送额度」徽章；
   - quota === 0 且注册赠送开启、require_email 为真、用户未绑邮箱：高亮「绑定邮箱立领 $X」，跳转或内联触发现有绑定邮箱流程，绑定成功后刷新用户信息；
   - 其他情况：提示余额为 0，提供 /wallet 与兑换码入口，并明确允许先创建 Key。
   - 任何情况下都不得出现阻塞式「请先充值」。
4. Step 2 区块 B「一键创建 API Key（不跳页）」：
   - 已有可用 Key（复用 preferredKey 判定）时默认选中，展示脱敏 Key，支持「复制完整 Key」（调用 fetchTokenKey，复用 CopyButton）与「另建新 Key」；
   - 无 Key 时只显示名称输入框（按场景预填 Claude Code / Default Key），调用 createApiKey（无限额、不过期、默认分组），成功后原地回显并可复制；
   - 完整明文 Key 只保存在组件内存状态，绝不写入 localStorage、URL 或路由 state。
5. 自动触发：仅当 status.onboarding_enabled && status.onboarding_auto_open 时，普通用户（role < ADMIN）未完成/未跳过、无 API Key 且 request_count === 0，
   登录后进入 /onboarding；管理员分支留给 P7（此处保证管理员不会被误导入普通向导）。判定放在登录重定向或 Overview 首屏，选择一处并说明理由，避免重定向循环与页面闪烁。
6. 跳过与完成：右上角「跳过，直接进入控制台」→ 写 onboarding_dismissed（调用 P2 接口）→ 跳 /dashboard/overview；完成 → 写 onboarding_completed。
   同时写按 user.id 隔离的 localStorage 乐观缓存（key 含 user.id），读写包裹 try/catch。刷新后不得再自动跳回。
7. 重开入口：在侧边栏或 Overview 顶栏增加「快速开始」入口，onboarding_enabled 为 false 时隐藏；手动打开不受 auto_open 影响。
8. 注册页：new_user_quota_enabled && new_user_quota_amount > 0 时展示温和提示，按 require_email 区分「注册即赠 $X」/「验证邮箱即赠 $X」，金额用 @/lib/currency。
9. i18n：所有文案 t('English key') 并同步 7 个 locale；数字/货币格式化遵守 AGENTS.md（toIntlLocale）。
10. 测试（优先放在一个 onboarding 测试文件）：onboarding_enabled 关闭不自动跳转且无入口；auto_open 关闭不自动跳但可手动打开；
    开关全开新用户自动进入，跳过后刷新不再跳回；Step 2 一键建 Key 原地展示且已有 Key 自动预选；自用模式隐藏额度区块；
    不同 user.id 的本地缓存互不影响。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test
- bun run lint（或定向 lint）
- bun run build:check
- bun run i18n:sync
- bash .harness/verify.sh onboarding-user-wizard-core

【结束】按通用前置块完成；总结中说明复用的共享组件与触发判定落点。
```

---

## P6 — 前端：用户 First Setup Step 3（接入与首次调用）

**feature id**：`onboarding-user-wizard-connect`

```text
本次 feature：onboarding-user-wizard-connect（Step 3：按场景接入并完成首次调用）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §3.2-3 Step 3、§3.5-2 Step 3 两个分支示意图、§4 Phase 3 第 1 点、§6.3。
- 阅读：web/src/features/keys/components/dialogs/cc-switch-dialog.tsx 及 createCcSwitchGuide、
  web/src/features/dashboard/components/overview/request-preview.tsx、Playground 路由与其接受的参数、/docs 页面路由、
  获取可用模型的接口（/api/user/models）与网关地址来源（搜索 server address / base url 相关 hook）、项目中已有的代码块/Tabs 组件。
- Billing 门槛判断：一键测试请求必须走现有 /v1/chat/completions 正常中继与计费链路（前端使用用户自己的 Key 直接发起），
  不新增后端代理测试接口。若你认为必须新增后端接口，先停下说明理由；一旦新增则必须完整阅读 .agents/rules/billing.md。
- 确认 P5 已完成。声明范围：只实现 Step 3；不改 Overview、不做管理员向导。

【要做的事】
1. 将 CCSwitchDialog 的核心配置区抽成可内嵌组件（例如 CCSwitchPanel），Dialog 改为复用它，/keys 原有行为不变。
2. 场景 coding：内嵌 CCSwitchPanel（Claude / Codex / Gemini + 模型 + 配置名 → 一键唤起 ccswitch://v1/import），
   下方折叠展示手动配置 JSON（复用 createCcSwitchGuide）与 /docs 链接。onboarding_cc_switch_enabled 为 false 时只展示手动配置与文档。
3. 场景 api：curl / Python (OpenAI) / Anthropic SDK / Node.js 多 Tab 代码块，自动注入真实网关地址、P5 中选定/新建的 Key 与可用模型；
   代码横向滚动不截断；一键复制（复用 CopyButton）。代码块中默认显示脱敏 Key，复制时才注入完整 Key。
4. 一键测试请求：仅当 status.onboarding_inline_test_enabled 为 true 时显示。用当前 Key 发起最小 chat completion
   （单条 user 消息、较小 max_tokens），展示成功/失败、耗时、回复摘要；失败时显示可读错误（余额不足、无可用模型等）并给出下一步建议。
   成功后点亮完成态并写 onboarding_completed。防止重复点击并发请求。
5. 场景 playground：展示推荐模型与已选 Key，主按钮跳 /playground 并带默认模型参数（只传模型，不传 Key）。
6. 「完成，进入控制台」：写 onboarding_completed 与 OnboardingUseCase，跳 /dashboard/overview。
7. i18n 7 语言同步；样式用语义化 token。
8. 测试：场景切换渲染正确面板；cc_switch 关闭时不显示一键导入；inline_test 关闭时不显示测试按钮；
   测试请求成功/失败两态；复制得到完整 Key 而界面仅显示脱敏 Key；/keys 中 CCSwitchDialog 回归正常。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test
- bun run lint（或定向 lint）
- bun run build:check
- bun run i18n:sync
- bash .harness/verify.sh onboarding-user-wizard-connect

【结束】按通用前置块完成；总结中写明测试请求走的是哪条计费链路，以及完整 Key 的生命周期。
```

---

## P7 — 前端：管理员无渠道首启向导

**feature id**：`onboarding-admin-first-setup`

```text
本次 feature：onboarding-admin-first-setup（管理员登录且渠道数为 0 时的首启引导）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §3.2-2 管理员触发条件、§3.2-4、§3.5-1 流程图管理员分支、§4 Phase 3 第 2 点、§7 第 4 条。
- 阅读：web/src/features/onboarding/（P5/P6 产出）、/channels 页面与新增渠道表单、渠道列表/计数接口、/api/user/models、登录页对 from=setup 的处理。
- 确认 P6 已完成。声明范围：只做管理员向导；不改渠道后端逻辑；不改普通用户向导行为。

【要做的事】
1. 触发：status.onboarding_enabled && status.onboarding_auto_open && status.onboarding_admin_guide_enabled，
   role >= ADMIN，未完成/未跳过，且系统渠道总数为 0 时进入管理员 First Setup。从 /sign-in?from=setup 登录的管理员应自然衔接到此向导。
   渠道计数获取失败时不得阻塞进入控制台。
2. Step 1「添加首个上游渠道」：OpenAI / Anthropic / Gemini / OpenRouter / 自定义兼容的快捷卡片；默认实现为跳往 /channels 的新增渠道并支持返回继续
   （通过路由参数回到 /onboarding 当前步骤，不在 URL 中携带任何密钥）。只有在现有渠道表单能以组件形式直接复用时才内嵌，否则不内嵌，并说明判断。
3. Step 2「检查可用模型与连通性」：拉取渠道列表与 /api/user/models，展示渠道数、模型数；为 0 时给出修复指引。可复用现有渠道测试能力（如有）。
4. Step 3「创建首个 Key 并测试转发」：复用 P5 的建 Key 区块与 P6 的测试请求组件，不复制代码。
5. 跳过/完成状态复用 P5 的持久化逻辑。
6. i18n 7 语言；测试：满足条件进入管理员向导；admin_guide_enabled 关闭或渠道数 > 0 时不进入；普通用户不会进入管理员向导；从 /channels 返回后步骤可继续。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test
- bun run lint（或定向 lint）
- bun run build:check
- bun run i18n:sync
- bash .harness/verify.sh onboarding-admin-first-setup

【结束】按通用前置块完成。
```

---

## P8 — 前端：Overview 总览页兜底改造

**feature id**：`onboarding-overview-refine`

```text
本次 feature：onboarding-overview-refine（跳过向导后的 Overview 兜底体验）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §1 背景第 1、3 点、§3.3 全部、§3.5-3 Overview 示意图、§4 Phase 3 第 3 点、§5.2 Overview 行、§6.2。
- 完整阅读：web/src/features/dashboard/components/overview/ 下 overview-dashboard.tsx、setup-guide-parts.tsx、request-preview.tsx、summary-cards.tsx，
  web/src/features/dashboard/lib/setup-guide.ts，以及 __tests__/setup-guide.test.tsx。
- 确认 P5（P6 的 CCSwitchPanel / 代码 Tab 若已完成则复用）已完成。声明范围：只改 Overview 相关文件与其测试；不改向导。

【要做的事】
1. 视觉降噪：新手引导未完成时隐藏重复的 Recommended actions 卡片；第一个未完成步骤为 activeStep，高亮边框 + 主 CTA。
   「创建 API Key」支持原地打开极简建 Key 弹窗（复用 P5 的建 Key 组件），成功后刷新 apiKeysQuery。
2. SelfUseModeEnabled 时从 startSteps 移除 Add credits，进度变为 2 步。
3. onboarding_enabled 为 false 时隐藏「打开 First Setup 向导」入口。
4. RequestPreview：去掉 truncate，改 overflow-x-auto；新增 CC Switch / curl / Python Tab（复用 P6 组件，show_cc_switch 关闭时隐藏 CC Switch Tab）；
   增加 /docs 入口与「在 Playground 中测试」按钮。
5. SummaryCards：getHealthLevel 区分新用户与余额耗尽——remainQuota <= 0 && usedQuota === 0 && requestCount === 0 时显示中性 Not topped up yet，
   而非红色 Balance depleted；注册赠送开启且待绑邮箱时可附简短提示。
6. 状态隔离：SETUP_GUIDE_VISIBILITY_STORAGE_KEY 与跳过状态按 user.id 拼接（如 dashboard_overview_setup_guide_expanded:u_${userId}），
   旧的全局 key 做一次性兼容读取或忽略（说明选择）；localStorage 读写 try/catch。
7. Overview 挂载时刷新用户 quota / request_count / new_user_quota_rewarded；完成测试调用后进度实时推进。
8. i18n 7 语言；语义化 token；保持键盘焦点与 ARIA 行为。
9. 测试：扩展 __tests__/setup-guide.test.tsx：自用模式隐藏添加额度；切换 user.id 折叠态互不干扰；0 用量新用户不显示 Balance depleted；
   老用户余额耗尽仍显示 Balance depleted；引导未完成时不渲染 Recommended actions；RequestPreview 不再截断。保留现有无障碍断言。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test
- bun run lint（或定向 lint）
- bun run build:check
- bun run i18n:sync
- bash .harness/verify.sh onboarding-overview-refine

【结束】按通用前置块完成。
```

---

## P9 — 全量回归与验收

```text
任务：对 onboarding-* 全部 feature 做全量回归与验收核对，只修复验收中发现的缺陷，不新增需求。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json。
- 完整阅读 docs/prd/user-onboarding-first-setup-plan.md 的 §5、§6、§7。
- 确认 P1–P8 均为 done；若有未完成项，停下告诉我。

【要做的事】
1. 运行全量验证并贴出结果摘要：
   - 根目录：go build ./...；go test ./model/... ./controller/... ./setting/...
   - relaykit/：GOWORK=off go build ./...
   - web/：bun run typecheck；bun run test；bun run lint；bun run build:check；bun run i18n:sync
   - bash .harness/verify.sh（不带参数全量）
2. 若 P1/P2 改动影响数据库行为，确认三库（SQLite / MySQL / PostgreSQL）真实验证记录齐全；缺失则补跑或明确报告阻塞。
3. 逐条核对方案 §7 验收标准与 §5.1、§5.2 每个场景，输出表格：场景 | 验证方式（测试名或手工步骤）| 结果 | 证据。
4. 核对 §6 风险项：require_email 关闭的风险提示存在；无硬编码色值；完整 Key 未写入 localStorage/URL；自用模式无“请先充值”阻塞。
5. 使用 run skill 启动应用，按 §3.5-1 流程走一遍新用户与管理员路径（开关全开 / 总开关关闭 / auto_open 关闭三种配置），记录观察结果；无法启动则说明原因。
6. 发现的缺陷：属于某 feature 的回到该 feature 修复并重新验证；超出方案范围的问题只记录到 claude-progress.md 遗留问题，不实现。
7. 汇总：OWASP 参考与未解决缺口、数据库验证记录、复用组件说明，作为后续 PR 描述素材。

【结束】更新 claude-progress.md；所有验收通过时在 docs/prd/INDEX.md 中把本方案标注为已完成待归档（不移动文件，除非我要求）。
```
