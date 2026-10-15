# new-api 会话进度

> 此文件由 AI 在每次会话结束时更新，用于下次会话快速恢复上下文。
> 请勿手动大幅修改，保持结构稳定以便脚本解析。

## 当前 Stage

**Stage 1** — 推广链接功能（promotion links）

目标：管理员可创建推广链接，用户通过推广链接注册后自动获得 10 块额度，系统记录渠道归因。

## 功能进度

| 功能 | 状态 | 说明 |
|---|---|---|
| homepage-light-theme-fix | done | 首屏 CTA 与接入面板改为跟随全站主题；修复浅色模式的固定深色背景和白色 OpenAI 图标 |
| homepage-cta-model-cards | done | 首页 CTA 参考 sample 截图，展示近 24 小时调用量前三的模型卡片（供应商、排名、标签、输入/输出价格、上下文/最大输出）；字段缺失不展示，不公开调用次数 |
| homepage-client-brand-icons | done | 首页两处 Codex/Codex CLI、Claude Code、Cherry Studio 改用新增原色 SVG，复用统一品牌图标组件 |
| homepage-model-brand-icons | done | 首页接入示意和工具展示区的四个模型改用指定目录品牌图标；原色 SVG + OpenAI 深色背景白色素材 |
| homepage-community-actions | done | 首页主操作区以 Telegram、WhatsApp 社群按钮替代开发者文档；沿用后台配置与安全过滤，其他社交链接和全站文档导航不变 |
| homepage-popular-model-cta | done | 底部 CTA 展示近 24 小时调用量最高且仍在模型广场展示的模型；保持具体次数不公开，无数据时使用原 CTA |
| homepage-layout-motion | done | 默认首页改为深色双栏首屏、接入示意、工具生态、步骤与 CTA；增加入场、连接流光和悬停动效，完成响应式与减少动态效果验证 |
| utf8-file-reading | done | 项目文本文件读取统一显式使用 UTF-8 编码 |
| upstream-merge-preserve-custom-ui | done | 已合并 upstream/main（e2c7aa7b1），生成合并提交 78e676e42；前端迁移至 web/，首页、导航栏-生图、导航栏-文档、footer 及 fork 定制功能均保留 |
| antom-safari-popup-plan | done | 已输出 Safari 下 Antom 支付弹窗优化实施计划，未修改支付业务代码 |
| antom-safari-popup-fix | done | 已实现 Antom 支付窗口同步预开、失败清理和同页降级；待部署环境 Safari 真机验收 |
| seo-technical-optimization | done | 已补齐站点分享元数据、路由级 canonical/noindex、robots.txt 与 sitemap.xml；保留受保护项目标识 |
| promotion-backend-model | pending | 尚未开始 |
| promotion-backend-api | pending | 依赖 model |
| promotion-registration-flow | pending | 依赖 api |
| promotion-frontend-capture | pending | 尚未开始 |
| promotion-frontend-admin | pending | 依赖 capture + api |

## 上次停在哪里

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

*最后更新：完成首页布局与动效优化（2026-10-15）；待用户确认视觉后决定提交或部署。Stage 1 后续仍从 `promotion-backend-model` 开始。*
