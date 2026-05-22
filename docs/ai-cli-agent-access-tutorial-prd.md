# AI CLI Agent 接入教程 PRD

## 1. 背景

Claude Code、Gemini CLI、Codex CLI 已成为开发者高频使用的终端 AI Agent。企业或团队在统一接入这些工具时，通常会遇到四类问题：

- 每个 CLI 的鉴权 Header、Base URL 拼接规则、模型参数不一致。
- 开发者在多个供应商、多个模型、多个 API Key 之间切换成本高。
- 直接暴露上游 Key 不利于配额、计费、审计和风控。
- CLI Agent 通常是长会话、多轮工具调用，请求需要稳定落到同一组可用渠道。

本 PRD 目标是设计一套面向管理员和开发者的接入教程，使用户可以通过本系统统一代理 Claude Code、Gemini CLI、Codex CLI，并可结合 CC Switch 类配置切换工具完成多 Provider 快速切换。

## 2. 产品目标

### 2.1 业务目标

- 让开发者 10 分钟内完成任一主流 CLI Agent 的首次可用接入。
- 让团队管理员可以基于同一套网关 API Key 管理模型权限、用量、计费、倍率、限速和审计。
- 降低用户从官方服务、第三方模型服务、本地模型代理迁移到统一网关的配置成本。
- 建立可复制的教程模板，后续可扩展到 Qwen Code、Cursor、Continue、Roo Code 等客户端。

### 2.2 用户目标

- 开发者：复制配置后即可在本地运行 `claude`、`gemini`、`codex`。
- 团队管理员：能清楚知道应该创建哪些渠道、模型、分组、令牌和粘性路由规则。
- 售前/运营：能用一页教程完成演示和排障，不需要解释底层路由细节。

## 3. 范围

### 3.1 本期范围

- Claude Code 接入教程。
- Gemini CLI 接入教程。
- OpenAI Codex CLI 接入教程。
- CC Switch 类工具的配置切换教程。
- 网关侧前置配置、健康检查、验收用例、常见错误排查。
- 面向复制的 macOS/Linux Bash 与 Windows PowerShell 示例。

### 3.2 非本期范围

- 不开发新的网关接口。
- 不重构现有渠道、计费、令牌或模型配置页面。
- 不内置或分发第三方 CLI。
- 不承诺所有 CC Switch 分支或同名工具的字段完全一致，教程以配置目标和变量映射为准。

## 4. 目标用户与场景

| 用户 | 核心诉求 | 关键路径 |
| --- | --- | --- |
| 个人开发者 | 快速把本地 CLI 指向统一网关 | 获取 API Key -> 设置 Base URL 和模型 -> 运行 CLI |
| 团队管理员 | 控制成本、权限和稳定性 | 配渠道 -> 配模型 -> 发 Key -> 配限速/分组/日志 |
| 企业平台团队 | 统一多个 Agent 的入口 | 输出标准配置模板 -> 接入 CC Switch -> 统一审计 |
| 售前/运营 | 快速演示多模型切换 | 一键配置 Claude/Gemini/Codex -> 展示用量日志 |

## 5. 现有能力依赖

### 5.1 网关接口

本教程依赖现有 Relay 路由能力：

- OpenAI Chat Completions：`POST /v1/chat/completions`
- OpenAI Responses：`POST /v1/responses`
- OpenAI Responses Compaction：`POST /v1/responses/compact`
- Claude Messages：`POST /v1/messages`
- Gemini：`POST /v1beta/models/{model}:generateContent`
- 模型列表：`GET /v1/models`、`GET /v1beta/models`

### 5.2 鉴权兼容

教程需说明以下兼容方式：

- OpenAI/Codex 类：`Authorization: Bearer sk-xxx`
- Claude 类：`Authorization: Bearer sk-xxx` 或 `x-api-key: sk-xxx`
- Gemini 类：`x-goog-api-key: sk-xxx` 或 `?key=sk-xxx`

### 5.3 粘性路由能力

系统设置中已有 Channel Affinity 模板：

- Codex CLI 模板：匹配 `/v1/responses`，基于 `prompt_cache_key` 保持会话粘性。
- Claude CLI 模板：匹配 `/v1/messages`，基于 `metadata.user_id` 保持会话粘性。

教程中应建议管理员在生产环境启用相应模板，减少长任务中途切换渠道导致的缓存、会话或上游状态不一致。

## 6. 教程信息架构

教程页面建议按以下结构组织：

1. 快速开始：3 分钟完成一个 CLI 接入。
2. 管理员前置配置：渠道、模型、Key、限速、粘性路由。
3. Claude Code 接入。
4. Gemini CLI 接入。
5. Codex CLI 接入。
6. 使用 CC Switch 管理多套配置。
7. 验收与排障。
8. 安全与最佳实践。
9. FAQ。

## 7. 管理员前置配置

### 7.1 创建上游渠道

管理员在后台创建对应上游渠道，并确保至少启用以下一种模型能力：

| 客户端 | 推荐接口格式 | 推荐模型类型 | 说明 |
| --- | --- | --- | --- |
| Claude Code | Claude Messages | `claude-*` | 原生 Claude Code 最契合 |
| Gemini CLI | Gemini API | `gemini-*` | 使用 Gemini 原生格式 |
| Codex CLI | OpenAI Responses | `gpt-*` / `*-codex` | Codex CLI 重点依赖 Responses |

如上游只支持 OpenAI 兼容格式，可通过系统已有格式转换能力转发，但教程需提示：Claude Code 与 Gemini CLI 的原生功能可能受上游兼容程度影响。

### 7.2 创建模型映射

教程中应给出一组示例模型名，便于用户复制：

| 场景 | 示例模型名 |
| --- | --- |
| Claude Code 默认 | `claude-3-7-sonnet-20250219-thinking` |
| Claude Code 高质量 | `claude-opus-4.5` 或平台实际启用的 Opus 模型 |
| Gemini CLI 默认 | `gemini-2.5-flash` |
| Gemini CLI 高上下文 | `gemini-2.5-pro` |
| Codex CLI 默认 | `gpt-5-codex` |
| Codex CLI 通用 | `gpt-5` |

实际教程必须提示：模型名以后台“模型”页面和渠道支持为准。

### 7.3 创建开发者 API Key

建议创建独立分组和独立 Key：

- 分组：`cli-agent`
- 令牌名称：`dev-cli-agent-{username}`
- 限速：按用户或团队设置 RPM/TPM。
- 额度：按团队预算设置月度配额。
- 权限：仅开放 CLI 所需模型，避免同一 Key 被滥用到高成本模型。

### 7.4 启用粘性路由

后台路径：系统设置 -> Channel Affinity。

建议：

- 开启 Channel Affinity。
- 点击 Fill Templates，追加 Codex CLI / Claude CLI 模板。
- 保存后清空旧缓存并做一次测试请求。
- 生产环境设置合理缓存容量，避免大量用户长会话挤占内存。

## 8. 开发者快速检查

在接入 CLI 前，开发者应先用 `curl` 验证 API Key 与 Base URL。

### 8.1 OpenAI Responses 检查

```bash
export NEW_API_BASE_URL="https://api.example.com"
export NEW_API_KEY="sk-xxx"

curl "$NEW_API_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5-codex",
    "input": "Reply with OK."
  }'
```

### 8.2 Claude Messages 检查

```bash
curl "$NEW_API_BASE_URL/v1/messages" \
  -H "x-api-key: $NEW_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-7-sonnet-20250219-thinking",
    "max_tokens": 64,
    "messages": [{"role": "user", "content": "Reply with OK."}]
  }'
```

### 8.3 Gemini 检查

```bash
curl "$NEW_API_BASE_URL/v1beta/models/gemini-2.5-flash:generateContent" \
  -H "x-goog-api-key: $NEW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Reply with OK."}]}]
  }'
```

## 9. Claude Code 接入教程

### 9.1 安装

以官方安装说明为准。常见 npm 安装方式：

```bash
npm install -g @anthropic-ai/claude-code
```

### 9.2 Bash 配置

Claude Code 会在 Base URL 后追加 `/v1/messages`，因此 `ANTHROPIC_BASE_URL` 应填写网关根地址，不要带 `/v1`。

```bash
export ANTHROPIC_BASE_URL="https://api.example.com"
export ANTHROPIC_AUTH_TOKEN="sk-xxx"
export ANTHROPIC_MODEL="claude-3-7-sonnet-20250219-thinking"

claude
```

### 9.3 PowerShell 配置

```powershell
$env:ANTHROPIC_BASE_URL="https://api.example.com"
$env:ANTHROPIC_AUTH_TOKEN="sk-xxx"
$env:ANTHROPIC_MODEL="claude-3-7-sonnet-20250219-thinking"

claude
```

### 9.4 持久化配置

写入 `~/.claude/settings.json`：

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.example.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "ANTHROPIC_MODEL": "claude-3-7-sonnet-20250219-thinking"
  }
}
```

### 9.5 验收

- 执行 `claude` 后能进入交互界面。
- 输入“总结当前项目结构”，能收到模型回复。
- 后台用量日志出现 `/v1/messages`。
- 如启用 Channel Affinity，连续多轮请求命中同一可用渠道。

## 10. Gemini CLI 接入教程

### 10.1 安装

```bash
npm install -g @google/gemini-cli
```

也可使用：

```bash
npx https://github.com/google-gemini/gemini-cli
```

### 10.2 Bash 配置

Gemini CLI 使用 `GEMINI_API_KEY` 作为 API Key。使用自定义网关时，设置 `GOOGLE_GEMINI_BASE_URL` 为网关根地址，不要带 `/v1beta`。

```bash
export GEMINI_API_KEY="sk-xxx"
export GOOGLE_GEMINI_BASE_URL="https://api.example.com"
export GEMINI_MODEL="gemini-2.5-flash"

gemini
```

指定模型运行：

```bash
gemini -m gemini-2.5-flash
```

非交互模式：

```bash
gemini -p "Summarize this repository architecture."
```

### 10.3 PowerShell 配置

```powershell
$env:GEMINI_API_KEY="sk-xxx"
$env:GOOGLE_GEMINI_BASE_URL="https://api.example.com"
$env:GEMINI_MODEL="gemini-2.5-flash"

gemini
```

### 10.4 持久化配置

推荐写入 `~/.gemini/.env`：

```dotenv
GEMINI_API_KEY=sk-xxx
GOOGLE_GEMINI_BASE_URL=https://api.example.com
GEMINI_MODEL=gemini-2.5-flash
```

### 10.5 验收

- 执行 `gemini` 后能进入交互界面。
- `gemini -p "Reply with OK"` 返回正常结果。
- 后台用量日志出现 `/v1beta/models/{model}:generateContent`。
- 模型名与后台配置一致。

## 11. Codex CLI 接入教程

### 11.1 安装

以 OpenAI 官方文档为准：

```bash
npm i -g @openai/codex
```

### 11.2 推荐配置

Codex CLI 应优先走 OpenAI Responses 格式。配置 `~/.codex/config.toml`：

```toml
model = "gpt-5-codex"
model_provider = "newapi"

[model_providers.newapi]
name = "New API Gateway"
base_url = "https://api.example.com/v1"
wire_api = "responses"
env_key = "NEW_API_KEY"

[profiles.newapi]
model_provider = "newapi"
model = "gpt-5-codex"
```

设置 Key 并启动：

```bash
export NEW_API_KEY="sk-xxx"
codex --profile newapi
```

PowerShell：

```powershell
$env:NEW_API_KEY="sk-xxx"
codex --profile newapi
```

### 11.3 Responses 能力要求

当前 Codex CLI 自定义 Provider 配置以 Responses 协议为准，`wire_api = "responses"` 是推荐且应验收的配置。若某个上游模型只支持 Chat Completions，不应在本教程中作为 Codex CLI 标准接入方案发布；管理员应改用支持 `/v1/responses` 的渠道或在网关侧完成 Responses 兼容适配后再开放给 Codex CLI。

### 11.4 验收

- 执行 `codex --profile newapi` 后能进入 TUI。
- 执行 `codex exec --profile newapi "Reply with OK"` 返回正常结果。
- 后台用量日志出现 `/v1/responses`。
- 长任务中未出现上游 404、401、stream disconnected。

## 12. CC Switch 接入教程

### 12.1 定位

CC Switch 类工具用于管理多个 AI CLI 的本地配置。教程中不强绑定具体实现，应围绕三类配置目标说明：

- Claude Code：写入 `~/.claude/settings.json` 或环境变量。
- Gemini CLI：写入 `~/.gemini/.env`、`~/.gemini/settings.json` 或环境变量。
- Codex CLI：写入 `~/.codex/config.toml` 或对应 profile。

### 12.2 Provider 字段映射

| CC Switch Provider 字段 | Claude Code | Gemini CLI | Codex CLI |
| --- | --- | --- | --- |
| Name | `Gateway Claude` | `Gateway Gemini` | `Gateway Codex` |
| Base URL | `https://api.example.com` | `https://api.example.com` | `https://api.example.com/v1` |
| API Key | `sk-xxx` | `sk-xxx` | `sk-xxx` |
| Model | `claude-*` | `gemini-*` | `gpt-*-codex` |
| Config target | `~/.claude/settings.json` | `~/.gemini/.env` | `~/.codex/config.toml` |

### 12.3 直接写配置模式

当 CC Switch 直接改写各 CLI 配置时：

- 切换 Claude Provider 后，重启当前 `claude` 会话。
- 切换 Gemini Provider 后，重启当前 `gemini` 会话。
- 切换 Codex Provider 后，重启当前 `codex` 会话或指定新的 `--profile`。

### 12.4 本地路由模式

当 CC Switch 启动本地路由服务时：

- CLI Base URL 指向 `http://127.0.0.1:{port}`。
- CC Switch Provider 的上游地址指向 `https://api.example.com` 或 `https://api.example.com/v1`。
- 本地路由只做切换与转发，最终鉴权、计费、审计仍由网关完成。

示例：

| 应用 | CLI 侧 Base URL | CC Switch 上游 Base URL |
| --- | --- | --- |
| Claude Code | `http://127.0.0.1:15721` | `https://api.example.com` |
| Gemini CLI | `http://127.0.0.1:15722` | `https://api.example.com` |
| Codex CLI | `http://127.0.0.1:15723/v1` | `https://api.example.com/v1` |

### 12.5 验收

- 切换 Provider 后，对应 CLI 的请求进入后台日志。
- 切换不同模型后，后台日志中的模型名同步变化。
- 关闭 CC Switch 本地路由后，CLI 应出现连接失败，避免误连官方地址。

## 13. 常见错误与排查

| 错误 | 常见原因 | 处理 |
| --- | --- | --- |
| 401 / token invalid | API Key 错误、Key 被禁用、环境变量未生效 | 重新复制 Key，执行 `echo $NEW_API_KEY` 或 PowerShell `$env:NEW_API_KEY` 检查 |
| 404 `/v1/v1/...` | Base URL 多写了 `/v1` | Claude/Gemini 填根地址；Codex 填 `/v1` |
| Claude Code 404 `/v1/messages` | `ANTHROPIC_BASE_URL` 填到 OpenAI 专用路径 | 改成网关根地址 |
| Gemini 请求仍打到 Google 官方 | `GOOGLE_GEMINI_BASE_URL` 未设置或被旧 `.env` 覆盖 | 检查 `~/.gemini/.env` 与当前 shell 环境 |
| Codex 进入后无回复 | `wire_api` 与模型/上游能力不匹配 | 优先使用 `wire_api = "responses"`，确认 `/v1/responses` 可用 |
| stream disconnected | 上游流式不稳定或中途切换渠道 | 启用 Channel Affinity，检查渠道健康状态 |
| 模型不存在 | 后台模型名未启用或渠道不支持 | 在后台模型页面确认模型映射 |
| 费用异常 | 一个 Key 开放过多高价模型 | 使用独立分组、模型白名单和额度限制 |

## 14. 安全与合规要求

- 不在教程中展示真实 API Key。
- API Key 示例统一使用 `sk-xxx`。
- 推荐开发者使用用户级配置文件，避免把 Key 写入项目仓库。
- 团队统一发放最小权限 Key，不复用管理员 Key。
- 建议开启用量日志、异常告警和用户级额度。
- CC Switch 本地路由端口只监听 `127.0.0.1`，不要暴露到公网。

## 15. 数据与监控指标

上线后应观察：

- 教程页访问量。
- 复制配置按钮点击量。
- `/v1/messages`、`/v1beta/models/*`、`/v1/responses` 请求量。
- 401、404、429、5xx 错误率。
- 首次接入成功率：用户创建 Key 后 30 分钟内是否出现成功请求。
- CLI Agent 用户留存：7 日内是否持续产生请求。

## 16. 验收标准

### 16.1 文档验收

- 每个 CLI 至少包含安装、环境变量、持久化配置、运行、验收、排障。
- 所有示例明确区分 Bash 与 PowerShell。
- 所有 Base URL 示例不产生重复路径。
- 所有 Key 示例均为占位符。
- 引用官方文档链接。

### 16.2 功能验收

- Claude Code 能通过 `/v1/messages` 完成一次交互。
- Gemini CLI 能通过 `/v1beta/models/{model}:generateContent` 完成一次交互。
- Codex CLI 能通过 `/v1/responses` 完成一次交互。
- 后台日志能按用户 Key 记录模型、渠道、用量和状态。
- 启用 Channel Affinity 后，连续同一会话请求可复用成功渠道。

## 17. 发布计划

| 阶段 | 内容 | 负责人 |
| --- | --- | --- |
| P0 | 输出 Markdown 教程与内部验证 | 产品/技术文档 |
| P1 | 增加后台“复制 CLI 配置”片段 | 前端/后端 |
| P2 | 增加一键生成 CC Switch Provider JSON/TOML | 前端 |
| P3 | 增加接入诊断页，自动检查 Base URL、Key、模型、接口 | 后端/前端 |

## 18. 后续产品化建议

- 在 API Key 详情页增加“接入 Claude Code / Gemini CLI / Codex CLI”按钮。
- 自动根据用户 Key、当前域名、可用模型生成配置片段。
- 对 Claude/Gemini/Codex 分别提供复制按钮。
- 对 Codex 提供 `config.toml` profile 生成器。
- 对 CC Switch 提供 Provider 导入文件或 Deep Link。
- 在日志页面按 Client 类型聚合：Claude Code、Gemini CLI、Codex CLI、Other。

## 19. 参考资料

- Anthropic Claude Code Settings: https://docs.anthropic.com/en/docs/claude-code/settings
- Anthropic Claude Code Setup: https://docs.anthropic.com/en/docs/claude-code/setup
- Gemini CLI: https://google-gemini.github.io/gemini-cli/
- Gemini CLI Authentication: https://google-gemini.github.io/gemini-cli/docs/get-started/authentication.html
- Gemini CLI Configuration: https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html
- OpenAI Codex CLI: https://developers.openai.com/codex/cli
- OpenAI Codex Sample Config: https://developers.openai.com/codex/config-sample
