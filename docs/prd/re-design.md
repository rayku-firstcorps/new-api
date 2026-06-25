# 首页重塑设计方案：Docs-Nav 风格版

## 1. 结论

本次首页不再沿用 `homepage-user-friendly-redesign-prd.md` 中偏通用 SaaS 的“功能卡片 + 数据看板 + 多段落营销页”方向，而是以 `docs-nav/01-claude.png`、`docs-nav/02-openai.png`、`docs-nav/03-opencode.png`、`docs-nav/04-gemini.png` 为视觉基准，重塑为一个更轻、更稳、更像“AI 工具接入导航”的产品首页。

核心转向：

- 首页第一印象从“平台能力介绍”改为“我可以把哪些 AI 工具接进来，怎么开始”。
- 视觉从厚重仪表盘改为白底细网格、大留白、低饱和橙色符号、极简配置卡。
- 文案从“统一网关/基础设施/API 协议”改为“选择工具、复制配置、查看用量、控制成本”。
- 开发者能力仍保留，但作为接入路径的一部分出现，不抢占首屏叙事。

## 2. 参考图风格提炼

参考图共同特征：

1. 极简顶部导航
   页面顶部是 64px 左右的单行导航，左侧品牌标识，中间主导航，右侧登录与主题切换。整体克制，不做大面积背景色。

2. 白底细网格
   页面背景接近纯白，叠加非常轻的等距网格。网格是空间秩序，不是装饰主体。

3. 大留白首屏
   首屏内容没有铺满，主体集中在页面中下部，顶部保留明显呼吸感。用户进入后先感受到“干净、可信、文档化”。

4. 黑色大标题
   标题使用强对比黑色、粗字重、紧凑行高。标题短，不用复杂口号。

5. 低饱和暖橙品牌图形
   大型线性符号作为视觉锚点，颜色接近陶土橙/浅铜色。符号透明度低，带有多层线稿/描边回声，存在感强但不压文字。

6. 配置卡片真实但克制
   卡片是白底、1px 边框、8-18px 圆角、轻阴影或无阴影。内容像真实配置，但信息量被控制，强调“可复制、可接入”。

7. 左右交错布局
   不同页面在“图形”和“配置卡”的左右位置上切换，形成节奏。首页可以采用同一系统：首屏左文案右视觉，下面接入模块左右交错。

8. 右侧锚点指示
   参考图右侧有竖向圆点，暗示多段内容或分页导航。首页可以保留为桌面端的 section progress，不在移动端显示。

## 3. 设计目标

### 3.1 产品目标

- 让首次访问用户在 5 秒内理解：这是一个让常用 AI 工具统一接入多模型、统一管理额度和用量的平台。
- 让有明确工具需求的用户快速找到 Claude Code、OpenAI Codex CLI、OpenCode、Gemini CLI、Cherry Studio、Open WebUI 等接入入口。
- 让开发者相信平台具备 OpenAI 兼容、Claude/Gemini 接入、API Key、日志、用量统计等能力。
- 降低“网关、协议、上游、路由、负载均衡”等基础设施词汇在首屏的存在感。

### 3.2 视觉目标

- 稳：白底、网格、真实配置卡、低饱和品牌色。
- 轻：少装饰、少渐变、少厚重仪表盘。
- 准：每个模块都指向一个实际使用路径。
- 有技术可信感：保留命令、配置、复制按钮、模型名，但用文档站方式呈现。

## 4. 非目标

本方案不包含：

- 后端接口、登录、计费、模型管理、Token 管理逻辑变更。
- 新设计系统或大型 UI 依赖。
- 替换、删除或弱化项目受保护标识、组织信息、版权、许可证和归属信息。
- 直接照搬参考图中的品牌名、域名、Logo 或具体站点身份。
- 将首页改成纯文档页；首页仍需要承担注册、登录、定价、控制台入口转化。

## 5. 页面结构

推荐结构：

1. 顶部导航
2. Hero 首屏：产品定位 + 接入配置预览
3. 工具接入导航：按工具选择接入方式
4. 统一账户能力：余额、用量、模型、应用、日志
5. 模型与应用生态：常见模型和客户端
6. 开发者接入：兼容 API、Key、日志、定价
7. 最终 CTA

相比旧方案，`Stats` 不再独立做大数字区块，改成分散在工具接入和账户能力模块中。首页不需要堆叠过多营销指标。

## 6. Hero 首屏设计

### 6.1 布局

桌面端：

- 背景：全屏白底细网格，网格尺寸建议 32px 或 40px。
- 容器：最大宽度 1280px，左右留白 80px 内外。
- 首屏高度：`min-height: calc(100vh - headerHeight)`，但内容垂直位置略低于中心。
- 左侧：标签、标题、说明、CTA、工具快捷 chips。
- 右侧：大型暖橙符号 + 2-3 张配置卡片。
- 右侧边缘：section progress dots，仅桌面显示。

移动端：

- 首屏不强制撑满 100vh，避免内容过散。
- 标题在上，配置卡在下，品牌符号作为淡背景或置于卡片后方。
- 不显示右侧 progress dots。
- CTA 两个以内同排困难时纵向堆叠。

### 6.2 首屏文案

英文源 key 建议：

```text
Connect your AI tools to every leading model
```

中文建议：

```text
把常用 AI 工具接入主流模型
```

说明文案英文源 key：

```text
Use one account to connect Claude Code, Codex CLI, Gemini CLI, Cherry Studio, Open WebUI, and more. Manage keys, models, balance, and usage records from one console.
```

中文建议：

```text
用一个账号连接 Claude Code、Codex CLI、Gemini CLI、Cherry Studio、Open WebUI 等工具，并统一管理密钥、模型、余额与用量记录。
```

CTA：

- 主按钮：`Get Started`，未登录跳注册，已登录跳控制台。
- 次按钮：`View Pricing`，跳定价。
- 文档入口：`Integration Docs` 或 `Developer Docs`，做成低权重文字/描边按钮。

首屏标签：

```text
AI tool access hub
```

中文：

```text
AI 工具接入中心
```

### 6.3 首屏视觉

不要再使用完整 dashboard preview 作为首屏主视觉。首屏主视觉应更接近参考图的“品牌符号 + 配置卡”：

- 大型符号：抽象节点、模型轨道、代码括号或连接放射图形。使用暖橙描边和低透明填充。
- 安装卡：展示一行命令，例如 `npm install -g @openai/codex` 或 `pnpm add ...`，但不要让终端成为唯一主题。
- 配置卡：展示 `base_url`、`api_key`、`model` 三类关键字段，密钥必须是占位符。
- 状态卡：展示 `Balance`、`Usage today`、`Models`，用小型 pill 或行项目表达。
- 每张卡右侧可以有复制图标，强化“复制配置即可使用”。

注意：代码/配置可以出现，但必须是“接入卡片”，不是大块 JSON、curl 或协议展示。

### 6.4 首屏禁用项

- 不使用紫蓝渐变大背景。
- 不使用大面积玻璃拟态 dashboard。
- 不使用 `curl` 作为首屏主要内容。
- 不展示完整 JSON request body。
- 不把 `API Gateway`、`Infrastructure`、`Protocol` 作为首屏主标题。
- 不做圆形渐变光斑、漂浮球、bokeh 装饰。

## 7. 工具接入导航

这一段是新首页的核心。它应承接 docs-nav 参考图的页面气质，把用户引向具体工具。

### 7.1 模块标题

英文源 key：

```text
Choose a tool and copy the right setup
```

中文：

```text
选择工具，复制对应接入配置
```

说明：

```text
Start from the client you already use. Each guide keeps the required URL, key, model, and verification steps in one place.
```

中文：

```text
从你已经在用的客户端开始。每个接入指南都把地址、密钥、模型和验证步骤放在同一处。
```

### 7.2 内容形式

使用 2x2 或横向 tabs + 内容面板：

- Claude Code
- OpenAI Codex CLI
- OpenCode CLI
- Gemini CLI
- Cherry Studio
- Open WebUI

桌面端优先做大卡片：

- 左侧是工具名、简短说明、适用人群。
- 右侧是一张配置卡或步骤卡。
- 卡片可用参考图的白底圆角边框样式。

移动端改为纵向卡片列表，不做复杂横向滚动。

### 7.3 每个工具卡片字段

- 工具名
- 标签：`IDE integration`、`Command line tool`、`OpenAI compatible`、`Multi-modal AI`
- 一句话说明
- 配置摘要：`Base URL`、`API Key`、`Model`
- 主动作：`View Guide`
- 次动作：`Copy Base URL` 或 `Copy Config`

## 8. 统一账户能力

此模块承接旧 PRD 的“用户友好”方向，但视觉上不能做厚重控制台大图。

### 8.1 模块标题

```text
One account keeps usage visible
```

中文：

```text
一个账号，看清模型、余额和用量
```

### 8.2 展示内容

采用横向信息条或三列轻卡：

- `Balance`：当前余额、充值入口。
- `Usage`：今日请求、月度消耗、最近记录。
- `Models`：可用模型、常用模型、计费倍率。
- `Apps`：已连接工具、最近使用来源。
- `Keys`：密钥状态、权限范围。

设计要求：

- 卡片高度控制在 120-180px，不做复杂 dashboard。
- 允许使用小型柱状条、状态点、进度条。
- 信息真实可信，但所有示例数据标注为 demo，不得伪装成真实平台承诺。

## 9. 模型与应用生态

### 9.1 模块目的

让普通用户知道“我能接哪些模型/工具”，让开发者知道“兼容范围足够广”。

### 9.2 内容建议

模型分组：

- ChatGPT / OpenAI compatible
- Claude
- Gemini
- DeepSeek
- Qwen
- Llama
- 其他由实例配置决定的模型

应用分组：

- Claude Code
- Codex CLI
- OpenCode CLI
- Gemini CLI
- Cherry Studio
- Open WebUI
- LobeChat
- ChatBox

视觉形式：

- 不使用大量彩色 logo 墙堆砌。
- 使用轻量 pill、描边卡、分组标题。
- 重要工具可以有小图标，其他用文字即可。

## 10. 开发者接入区

开发者区保留，但必须低于普通工具接入与账户能力。

标题：

```text
Developer access when you need it
```

中文：

```text
需要开发接入时，也已经准备好
```

展示点：

- OpenAI-compatible endpoints
- Claude and Gemini routing
- API key management
- Request logs
- Usage and cost records
- Rate limits and access control

视觉：

- 使用 2-3 张配置卡片。
- 可以出现 endpoint、headers、model 字段。
- 不要出现大段 curl 和完整 JSON body。
- 文档 CTA 权重高于营销按钮，但低于注册主 CTA。

## 11. 顶部导航

参考图顶部导航应转化为项目现有 `PublicLayout` 风格，不新建完全独立 header，除非现有布局无法满足。

建议导航项：

- 首页
- Claude
- OpenAI
- OpenCode
- Gemini
- 定价
- 文档

右侧：

- 未登录：登录、开始使用。
- 已登录：控制台。
- 主题切换保留。

设计要求：

- 高度 64px 左右。
- 背景白色/暗色背景，不做高饱和色块。
- 底部 1px 分割线。
- 登录按钮可使用黑底白字胶囊按钮，贴近参考图。

## 12. 视觉规范

### 12.1 色彩

主背景：

- Light：`#fbfaf8` 或当前主题 `background` 接近白色。
- Dark：当前暗色主题背景，网格透明度降低。

主文字：

- Light：接近 `#171717`。
- Muted：`#666666` 到 `#737373`。

强调色：

- 暖橙/陶土色作为品牌辅助色，例如 `#d99a78`、`#dd8f68`、`#c97955`。
- 绿色只用于成功状态。
- 紫蓝不作为主视觉背景。

边框：

- Light：`rgba(20, 20, 20, 0.10)` 左右。
- Dark：使用现有 `border` 变量，透明度降低。

### 12.2 字体与排版

- H1：`clamp(2.75rem, 6vw, 5rem)`，桌面端可以更大，但标题必须短。
- H2：`clamp(2rem, 3vw, 3rem)`。
- 正文：15-18px，行高 1.65。
- 配置卡代码：12-13px，等宽字体，行高 1.7。
- 字距保持 0，不使用负字距。

### 12.3 卡片

- 圆角：主配置卡 16-18px，内部 pill 999px，小卡 10-12px。
- 边框：1px。
- 阴影：轻微或无阴影，不使用厚重浮层。
- 卡片之间保持 16-24px 间距。
- 不做卡片嵌套卡片；配置卡内部可以有 header、body 分区。

### 12.4 背景网格

实现方式建议：

```css
background-image:
  linear-gradient(to right, color-mix(in oklch, var(--border) 45%, transparent) 1px, transparent 1px),
  linear-gradient(to bottom, color-mix(in oklch, var(--border) 45%, transparent) 1px, transparent 1px);
background-size: 40px 40px;
```

桌面端可以加 mask，让网格在边缘更淡；移动端不要过度 mask，避免出现脏灰块。

## 13. 动效规范

- 首屏内容可以轻微 fade-up，时长 300-500ms。
- 配置卡 hover 只做边框加深或轻微上移，不做夸张缩放。
- 右侧大型符号可以有极慢的透明度/位置漂移，但默认静态更稳。
- 禁止大范围粒子、光斑、循环旋转背景。

## 14. 技术落点

优先改造现有文件：

- `web/default/src/features/home/index.tsx`
- `web/default/src/features/home/components/sections/hero.tsx`
- `web/default/src/features/home/components/home-dashboard-preview.tsx`
- `web/default/src/features/home/components/sections/features.tsx`
- `web/default/src/features/home/components/sections/how-it-works.tsx`
- `web/default/src/features/home/components/sections/developer-access.tsx`
- `web/default/src/features/home/components/sections/cta.tsx`
- `web/default/src/features/home/components/sections/stats.tsx`
- `web/default/src/i18n/locales/*.json`

推荐新增或重命名组件：

- `home-integration-preview.tsx`：首屏接入配置预览，替代首屏 dashboard。
- `integration-tool-grid.tsx`：工具接入导航。
- `account-usage-strip.tsx`：轻量账户能力展示，可替代独立 stats。
- `brand-orbit-mark.tsx`：暖橙大型线性符号，建议用 CSS/SVG 组件实现，不引入图片依赖。
- `section-progress-dots.tsx`：桌面端右侧圆点导航。

不建议：

- 新增大型动画库。
- 新增复杂图表库。
- 把 `docs-nav` PNG 直接作为首页图片使用。
- 用硬编码中文写入 React 组件。

## 15. i18n 要求

所有新文案必须使用现有模式：

```tsx
t('English source key')
```

翻译文件：

```text
web/default/src/i18n/locales/{lang}.json
```

支持语言：

- `en`
- `zh`
- `fr`
- `ru`
- `ja`
- `vi`

实施后运行：

```bash
cd web/default
bun run i18n:sync
```

注意：组件中不得直接硬编码中文展示文案。

## 16. 响应式验收

桌面端：

- 首屏在 1440px 宽度下接近参考图节奏：顶部留白充足，主体不贴顶，左右区域平衡。
- 配置卡不超过首屏可视高度，避免首屏出现半截大卡。
- 右侧 progress dots 不遮挡内容。

平板：

- 左右布局可以保持两列，但卡片宽度不得挤压文字。
- CTA 不换行到难以识别的状态。

移动端：

- 单列布局。
- H1 不超过 3 行。
- 配置卡代码可横向隐藏溢出或换行，但页面整体不得横向滚动。
- 顶部导航折叠后仍保留登录/控制台入口。

## 17. 内容验收

必须满足：

- 首屏表达“工具接入 + 多模型 + 账户管理”。
- 首屏至少出现 3 个普通用户能理解的概念：工具、模型、余额、用量、密钥、配置、成本。
- 首页能直接看到 Claude Code、Codex CLI、OpenCode、Gemini CLI 中至少 4 个接入方向。
- 文档入口可见，但不压过主 CTA。
- 开发者 API 能力保留，但不主导首屏。

不得出现：

- 首屏主标题使用 `Gateway`、`Infrastructure`、`Protocol`。
- 首屏大面积展示 curl。
- 首屏展示完整 JSON request body。
- 页面主视觉变成紫蓝渐变 SaaS。
- 使用参考图中的外部品牌身份替换项目自身身份。

## 18. 工程验收

必须满足：

- TypeScript 编译通过。
- 前端构建通过。
- i18n 同步完成或手动补齐所有语言 key。
- 自定义首页内容 `HomePageContent` 的覆盖逻辑不受影响。
- 未登录、已登录 CTA 路由正确。
- 暗色模式可读。
- 移动端无横向滚动。
- 受保护的项目和组织标识保持不变。

推荐验证：

```bash
cd web/default
bun run build
bun run i18n:sync
```

视觉验证：

- 1440x1200 桌面截图。
- 390x844 移动截图。
- 暗色模式桌面截图。
- 检查首屏是否接近 docs-nav 的白底网格、大留白、暖橙符号、配置卡风格。

## 19. 实施优先级

P0：

- 重做 Hero 布局与视觉。
- 新增工具接入导航。
- 移除首屏厚重 dashboard 感。
- 完成 i18n key。

P1：

- 改造账户能力展示。
- 改造开发者接入区。
- 增加 section progress dots。
- 优化暗色模式。

P2：

- 增加轻微动效。
- 为工具卡增加复制配置交互。
- 根据真实配置补充更多接入工具。

## 20. 最终判断标准

新版首页打开后应像一个可信的 AI 工具接入入口，而不是一个泛化的 AI SaaS 营销页。

用户应能自然完成三件事：

1. 知道这个产品能把常用 AI 工具接入主流模型。
2. 找到自己使用的工具，并理解需要复制哪些配置。
3. 相信平台能统一管理模型、密钥、余额、用量和成本。

只要首屏仍然主要在讲网关、协议、基础设施或大段 API 示例，就视为本次重塑失败。
