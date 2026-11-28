# 用户行为埋点与跨设备分析 — 分阶段开发 Prompts

> 来源方案：[behavior-analytics-design.md](behavior-analytics-design.md)
> 创建日期：2026-11-27
> 用途：按 Harness「单功能原则」，每个 Prompt 对应一个 feature / 一次会话，依次交给 AI 编码代理执行。

---

## 使用说明

1. **严格按顺序执行**：P0 → P1 → … → P8。后一个 Prompt 依赖前一个的产出（配置与表 → 上报管线 → 前端 SDK → 聚合接口 → 后台 UI）。
2. **一次会话只粘贴一个 Prompt**。每个 Prompt 自包含，开头已包含必读文件与 Harness 启动要求。
3. 每个 Prompt 结束时代理必须：更新 `.harness/feature_list.json` 状态、运行 `bash .harness/verify.sh <feature-id>`、更新 `claude-progress.md`。
4. 若执行中发现方案与代码现状冲突，代理应停下说明冲突并给出选项，而不是自行扩大范围。
5. 方案 §9 的 3 个 Phase 在这里拆成 7 个 feature：Phase 1 → P1、P2；Phase 2 → P3、P4；Phase 3 → P5、P6、P7。

### Feature 一览

| Prompt | feature id | 范围 | 依赖 |
|---|---|---|---|
| P0 | —（开 Stage + 登记） | 开启 Stage 4、确认方案 §10 待定决策、登记 P1–P7 | 无 |
| P1 | `analytics-setting-and-model` | 后端：`analytics_setting`、哈希盐、`/api/status` 字段、`behavior_events` 表（四库）、留存清理任务 | P0 |
| P2 | `analytics-ingest-pipeline` | 后端：`POST /api/analytics/events`、白名单脱敏、`actor_hash`、限流与体积限制、异步批量写入 | P1 |
| P3 | `analytics-sdk-core` | 前端：`web/src/lib/analytics/` SDK（标识、环境探测、脱敏、批量传输、采样、DNT）与单元测试 | P2 |
| P4 | `analytics-sdk-integration` | 前端：`__root.tsx` 路由追踪、`http-client.ts` 异常钩子、性能与运行时异常、各模块 `trackFeature()` | P3 |
| P5 | `analytics-query-api` | 后端：`/api/analytics/*` 聚合查询、盐轮换、手动清理、权限 | P2 |
| P6 | `analytics-admin-settings-ui` | 前端：系统设置「行为埋点」配置卡片 | P5 |
| P7 | `analytics-dashboard-ui` | 前端：`/analytics` 四 Tab 管理看板 | P5, P6 |
| P8 | —（验收） | 全量回归、隐私红线核对、验收逐条确认 | P1–P7 |

---

## 方案与代码现状的已知冲突（P0 前已核对，各 Prompt 已嵌入处理要求）

| # | 方案写法 | 代码现状 | 处理要求 |
|---|---|---|---|
| C1 | 盐键名 `analytics_setting.hash_salt` | `controller/option.go` 约 93 行只按后缀 `Token` / `Secret` / `Key` / `secret` / `api_key` / `private_key` 把选项判为敏感；`hash_salt` 不匹配，会通过 `GET /api/option` 返回给管理员 | 改用会被过滤的键名（如 `analytics_setting.hash_secret`），或扩展敏感判定，并用测试证明选项列表接口不返回它；`PUT /api/option` 必须拒绝写入该键 |
| C2 | 上报接口用 `AnonymousRequestBodyLimit()` 限 32KB | 该中间件读取全局 `common.GetAnonymousRequestBodyLimitBytes()`，不是专用 32KB | 上报接口单独强制 32KB 与 50 条上限，不修改全局匿名体积配置 |
| C3 | 前端用 `sendBeacon` 离页补发，后端靠 `TryUserAuth()` 识别登录态 | `sendBeacon` 不能带自定义请求头；仪表盘会话识别（`middleware/auth.go` 的 `classifyDashboardCredential`）若依赖请求头，beacon 请求会被当成匿名 | P2 核实会话识别所需凭据；P3 优先用带凭据与必要请求头的 `fetch(..., { keepalive: true })`，`sendBeacon` 只做兜底，并说明兜底请求的 `actor_hash` 行为 |
| C4 | `event_id` 唯一索引 + `CreateInBatches` | 同批任一重复会让整批失败 | 用 `clause.OnConflict{DoNothing: true}` 并三库实测；ClickHouse 无唯一约束，需说明去重取舍 |
| C5 | 健康页 P50 / P95 | SQLite 与 MySQL 5.7 没有百分位函数 | 在 Go 中用有界数据或固定直方图分桶计算；ClickHouse 可用 `quantile`，但需与其他库结果口径一致 |
| C6 | 按 `tz_offset` 还原本地小时 | MySQL 的 `/` 返回小数、负数取模结果因库而异 | 按（小时桶, `tz_offset`）分组后在 Go 中换算，不写方言相关的算术 SQL |
| C7 | 写操作经 `AdminAuth` / `RootAuth` | 鉴权链路会自动给管理员写操作记审计（`beginAdminAudit`） | 盐轮换与选项保存的请求和响应中不得出现盐值 |
| C8 | 「首次开启时生成盐」 | 多节点部署靠 options 表同步配置 | 只允许主节点（`common.IsMasterNode`）生成并持久化盐，从节点只读，防止各节点各生成一份 |

---

## 通用前置块（已嵌入每个 Prompt，此处仅供参考）

```text
开始前必须按顺序完成：
1. 用 Read 工具完整阅读仓库根目录 AGENTS.md（不得用 grep/摘要代替）。
2. 阅读 claude-progress.md 与 .harness/feature_list.json，确认本 feature 的 scope、acceptance 与 out_of_scope。
3. 完整阅读 docs/prd/behavior-analytics-design.md 中与本 feature 相关的章节，以及 docs/prd/behavior-analytics-prompts.md 的「已知冲突」表。
4. 涉及 web/ 时完整阅读 web/AGENTS.md 与项目 shadcn-ui skill，并先搜索 web/src/components/ 与相关 feature 中可复用的组件。
5. 向我声明：本次只实现哪个 feature，明确不会触碰哪些范围。
全程遵守零上下文红线（方案 §1）：任何事件、日志、测试夹具都不得包含用户输入、Prompt、Token、金额、明文 user_id / 用户名 / 邮箱 / IP、完整 URL query/hash、error.message 原文。
本方案不触及计费：不读写 PriceData / OtherRatios / 额度结算；钱包类事件只记录枚举与结果。如发现必须触碰 AGENTS.md 计费门槛列出的文件，停下告诉我。
结束前必须：
- 运行本 Prompt 列出的验证命令并如实报告结果（失败就贴输出，不得声称完成）。
- 运行 bash .harness/verify.sh <feature-id>，通过后才可把 feature 标记为 done，否则标记 in_progress。
- 更新 claude-progress.md：本次进展、遗留问题、下一步具体动作。
- 不提交 git commit，除非我明确要求。
```

---

## P0 — 开启 Stage 4、确认决策、登记 Feature

```text
任务：只做 Harness 登记与决策确认，不写任何业务代码。

1. 用 Read 工具完整阅读 AGENTS.md、claude-progress.md、.harness/feature_list.json、
   docs/prd/behavior-analytics-design.md、docs/prd/behavior-analytics-prompts.md。
2. 冲突检查：当前 out_of_scope 含「新增数据库表或列」与「方案 user-onboarding-first-setup-plan.md 以外的新需求」，
   与本方案（新增 behavior_events 表）直接冲突。把冲突条目列给我，并提议新的 Stage 4（stage4-behavior-analytics）的 out_of_scope 草案，例如：
   - 采集任何用户输入、业务内容、明文身份或明文 IP（方案 §1 红线）
   - 第三方分析 SDK 或外部上报服务
   - 硬件 / Canvas / 字体等设备指纹
   - 计费、额度与结算逻辑的任何改动
   - 删除或精简 new-api 原有功能；修改受保护的项目标识
   - 方案 behavior-analytics-design.md 以外的新需求
   等我确认后再改 current_stage 与 out_of_scope。未确认前不得修改。
3. 向我确认方案 §10 的 3 个待定决策，并给出方案倾向的默认值：
   (a) 默认开关：enabled=false，由管理员手动开启；
   (b) 存储与留存：复用 LOG_DB，默认保留 90 天并自动清理；
   (c) 权限：看板 Admin/Root 可见；盐轮换与手动清理仅 Root。
   同时确认：看板查询接口是否接入 Casbin 权限点（参考 service/authz/resources_audit.go），还是只用 AdminAuth。
   把确认结果写进 claude-progress.md，后续 Prompt 以此为准。
4. 在 .harness/feature_list.json 的 features 数组中，按现有条目的字段格式（id / title / status / scope / acceptance）追加 7 个 feature，status 全部为 "pending"：
   analytics-setting-and-model、analytics-ingest-pipeline、analytics-sdk-core、analytics-sdk-integration、
   analytics-query-api、analytics-admin-settings-ui、analytics-dashboard-ui。
   每个 feature 的 title、scope 与 acceptance（3–6 条可验证条目）从本 prompts 文档对应 Prompt 的「要做的事」与「验证」提炼，不要发明方案里没有的需求。
5. 检查 .harness/verify.sh 是否需要为这些 feature id 增加验证分支；如需要，按现有分支风格补充
   （后端 feature 跑对应包的 go test 与关键文件存在性检查，前端 feature 跑 bun run typecheck / 对应测试文件）。只改验证脚本，不改业务代码。
6. 校验 JSON 合法：node -e "JSON.parse(require('fs').readFileSync('.harness/feature_list.json','utf8'))"。
7. 更新 claude-progress.md：当前 Stage、已确认决策、下一步执行 P1。
```

---

## P1 — 后端：埋点配置、哈希盐、事件表与留存清理

**feature id**：`analytics-setting-and-model`

```text
本次 feature：analytics-setting-and-model（analytics_setting 配置、哈希盐、/api/status 字段、behavior_events 表、留存清理任务）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、claude-progress.md（含 P0 确认的决策）、.harness/feature_list.json。
- 阅读方案 §3（匿名化盐管理）、§4 全部、§7.1、§9 Phase 1，以及本文「已知冲突」C1、C4、C7、C8。
- 阅读现有实现：setting/operation_setting/log_setting.go（GlobalConfig.Register 模式与校验函数）、setting/config/、
  model/option.go（选项加载与同步）、controller/option.go（约 93 行敏感键过滤、选项保存校验）、controller/misc.go（GetStatus）、
  model/audit_log.go 与 model/main.go 的 migrateLOGDB / migrateClickHouseLogDB / syncClickHouseLogTTL / clickHouseLogCreateTableSQL、
  service/auth_cleanup.go（仅主节点的定时清理模式）、main.go（启动与关闭流程）。
- 声明范围：只做后端配置、模型、迁移、清理；不做上报接口、聚合查询、前端。

【要做的事】
1. 新增 setting/operation_setting/analytics_setting.go，命名空间 analytics_setting，沿用 log_setting.go 模式：
   enabled（默认 false）、sample_rate（1–100，默认 100）、retention_days（7–365，默认 90）、respect_dnt（默认 true）。
   布尔默认值在变量初始化中设置，不用 gorm 布尔 default tag。为 sample_rate、retention_days 提供校验函数，并在 controller/option.go 保存时调用；
   错误消息用 common.ApiErrorT 英文源文本，新 key 加入前端全部 7 个 locale 文件。
2. 哈希盐（冲突 C1、C7、C8）：
   - 键名必须被 controller/option.go 的敏感过滤命中（如 analytics_setting.hash_secret），或扩展过滤规则；说明选择理由。
   - 32 字节 crypto/rand，hex 编码存入 options。只在 common.IsMasterNode 上、enabled 且盐为空时生成并持久化，重复启动幂等；从节点只读同步值。
   - PUT /api/option 拒绝直接写入该键；/api/status、GET /api/option、审计日志、系统日志都不得出现盐值。
3. controller/misc.go GetStatus 只新增：analytics_enabled、analytics_sample_rate、analytics_respect_dnt。
4. 新增 model/behavior_event.go：BehaviorEvent 字段、类型、索引严格按方案 §4.1（event_id 唯一索引仅非 ClickHouse；props 用 text，不用 JSON 列类型）。
   - SQLite/MySQL/PostgreSQL：在 migrateLOGDB 中 LOG_DB.AutoMigrate(&BehaviorEvent{})，注意不要破坏现有 Log / AuditLog 迁移顺序。
   - ClickHouse：参照 clickHouseLogCreateTableSQL 写独立建表语句，MergeTree() PARTITION BY toYYYYMM(toDateTime(created_at)) ORDER BY (event_type, created_at, device_id)，
     TTL 取 retention_days；retention_days 变化时参照 syncClickHouseLogTTL 同步 TTL。说明 ClickHouse 下重复 event_id 的取舍（冲突 C4）。
   - 提供模型层批量写入函数（使用 clause.OnConflict{DoNothing: true} 跳过重复 event_id）与按 created_at 删除过期数据的函数，供 P2/P5 复用。
5. 留存清理：参照 service/auth_cleanup.go 新增仅主节点运行的定时任务，按 retention_days 分批删除过期行（避免一次大事务锁表）；
   ClickHouse 依赖 TTL，不执行 DELETE。在 main.go 现有启动流程中挂载。
6. 测试（扩展已有测试文件优先，最多新增 1 个，testify require/assert）：
   - sample_rate / retention_days 越界被拒绝；
   - 盐首次生成后重复初始化不变；GET /api/option 与 /api/status 都不返回盐；PUT /api/option 写盐被拒绝；
   - 重复 event_id 的批量写入不报错且只存一行；
   - 过期清理只删 retention 之前的行。

【数据库验证（强制）】
- 在真实 SQLite、MySQL（≥5.7.8）、PostgreSQL（≥9.6）上分别：全新库启动迁移；用最新发布版本建的库升级；连续启动两次证明幂等（不重复 ALTER TABLE）；
  批量写入（含重复 event_id）与过期清理。ClickHouse 环境可用时同样验证建表、TTL 同步与写入；不可用则明确记录为阻塞。
- 记录每个库的确切版本、命令与结果。任一必需库无法验证时不得标记 done。

【验证】
- go build ./...
- go test ./model/... ./setting/... ./controller/... ./service/...
- bash .harness/verify.sh analytics-setting-and-model

【结束】按通用前置块完成；总结中列出最终的配置键名、/api/status 字段、模型函数签名，供 P2/P5/P6 使用。
```

---

## P2 — 后端：事件上报管线

**feature id**：`analytics-ingest-pipeline`

```text
本次 feature：analytics-ingest-pipeline（POST /api/analytics/events、白名单脱敏、actor_hash、限流、异步批量写入）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、claude-progress.md、.harness/feature_list.json。
- 阅读方案 §1、§3、§5 全部（事件目录与 props 白名单）、§7.2 上报接口部分、§7.3，以及「已知冲突」C2、C3、C4。
- 阅读：router/api-router.go（路由分组与中间件写法）、middleware/auth.go（TryUserAuth / classifyDashboardCredential，确认会话识别依赖哪些 Cookie 与请求头）、
  middleware/rate-limit.go（Redis + 内存限流模式）、middleware/request_body_limit.go、P1 产出的 analytics_setting 与 BehaviorEvent 模型函数、
  main.go 的退出信号处理（约 256 行 signal.Notify）。
- 本 feature 读取登录态但不改变认证流程；仍需确认 TryUserAuth 的使用不会把无效凭据升级为已登录，也不新增凭据通道。
- 声明范围：只做上报与写入；不做聚合查询、盐轮换接口、前端。

【要做的事】
1. 路由：apiRouter 下注册 POST /api/analytics/events，中间件顺序：专用限流 → 专用体积限制 → middleware.TryUserAuth()。
   为 P5 的管理员路由组 /api/analytics/* 预留结构，确保公开的 events 路由不会被管理员组的中间件拦截，反之亦然。
2. 限流：按 rate-limit.go 现有模式新增 AnalyticsRateLimit（按 IP，每分钟上限取一个合理常量并注释理由），超限返回 429，不记录 IP 明文到业务日志。
3. 体积（冲突 C2）：请求体最大 32KB、events 数组最多 50 条；超限返回 413 / 400，不修改全局匿名体积配置。
4. 请求 DTO：公共上下文（device_id、session_id、client_type、os_family、browser_family、viewport_bucket、lang、theme、tz_offset）+ events 数组
   （event_id、event_type、event_name、route_path、from_route、referrer_host、duration_ms、status_code、props）。JSON 用 common.DecodeJson / common.Unmarshal。
5. 服务端脱敏（service/analytics_sanitize.go 或同类命名，按 AGENTS.md 不拆单调用辅助函数）：
   - event_type / event_name / props 键与值类型严格按方案 §5 白名单；未知事件整条丢弃，未知 props 键丢弃，字符串超长丢弃；props 序列化后上限 512 字节。
   - client_type / os_family / browser_family / viewport_bucket / theme 只接受方案列出的枚举，其他归为 other 或丢弃；lang 只接受前端支持的 7 种语言代码。
   - route_path / from_route / api_route：剥离 query 与 hash，纯数字、UUID、长随机段替换为 :id，长度上限 128；referrer_host 只留 host 且与本站同源时清空。
   - duration_ms 限制在 [0, 3600000]；status_code 仅 api_error 保留；tz_offset 限制在 [-840, 840]；device_id / session_id 只接受 nanoid 字符集与长度。
   - created_at 一律用服务端接收时间。
   - 白名单定义为单一数据源（一个表驱动结构），P3 前端镜像同一份清单。
6. actor_hash：从 TryUserAuth 设置的上下文取 user_id，计算 HMAC-SHA256(salt, "u:" + user_id) 取前 32 位 hex；未登录为空串。
   盐为空或 enabled=false 时不写入。核实 sendBeacon 式请求（无自定义头）在当前会话识别下是否被当作匿名（冲突 C3），把结论写进总结，供 P3 选择传输方式。
7. 异步写入（service/analytics_writer.go）：有界通道容量 4096；后台 worker 满 100 条或每 2 秒调用 P1 的批量写入函数；
   通道满时立即丢弃并输出限频告警（common.LogText 英文文本）；绝不阻塞 HTTP goroutine。进程退出时在现有关闭流程中 flush 剩余数据，带超时。
8. 响应：始终返回 202 Accepted（含 enabled=false、全部被丢弃的情况），不回显任何事件内容；格式错误的 JSON 返回 400。
9. 测试（最多新增 1 个测试文件，表驱动，testify require/assert）：
   - 白名单：未知事件、未知 props 键、超长字符串、超大 props 被丢弃；带 query/hash 与数字 ID 的路由被模板化；
   - actor_hash：同一 user_id 在不同 device_id / client_type 下哈希一致；不同盐结果不同；输出中不含 user_id 原值；匿名为空；
   - 背压：通道满时请求仍立即返回 202 且新事件被丢弃；
   - 体积与条数上限；enabled=false 时 202 且不入库。

【数据库验证（强制）】
- 在真实 SQLite、MySQL、PostgreSQL 上走通「HTTP 上报 → 批量写入 → 查询行数」，含重复 event_id 重试；ClickHouse 可用时同样验证。记录版本、命令与结果。

【验证】
- go build ./...
- go test ./service/... ./controller/... ./middleware/... ./model/...
- bash .harness/verify.sh analytics-ingest-pipeline

【结束】按通用前置块完成；总结中给出最终请求体 JSON 示例、白名单清单位置与冲突 C3 的结论。
```

---

## P3 — 前端：埋点 SDK 核心

**feature id**：`analytics-sdk-core`

```text
本次 feature：analytics-sdk-core（web/src/lib/analytics/ 零外部依赖 SDK 与单元测试）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json。
- 阅读方案 §3（device_id / session_id）、§5.3、§5.4 脱敏规则、§6 全部，以及「已知冲突」C3 与 P2 总结中的结论。
- 阅读：P2 的服务端白名单清单（前端要镜像它）、web/src/lib/http-client.ts（了解基础 URL、凭据与请求头约定）、
  electron/preload.js（window.electron.isElectron）、web/src/i18n/languages（语言代码）、现有主题状态的来源（搜索 theme store / provider）、
  web/package.json 中已有的 nanoid 依赖、现有 Vitest 测试写法。
- 声明范围：只新增 web/src/lib/analytics/ 下的文件与测试；不挂载到 __root.tsx、不改 http-client.ts、不接入业务模块（这些属于 P4）。

【要做的事】
1. 按方案 §6 的目录结构新增 index.ts / context.ts / sanitize.ts / transport.ts / vitals.ts / analytics.test.ts（vitals.ts 本次只实现采集函数，不挂载）。
2. context.ts：
   - device_id：nanoid(21) 存 localStorage；session_id：nanoid(21) 存 sessionStorage，30 分钟无操作轮换。所有存储读写 try/catch，不可用时退化为内存值。
   - client_type：window.electron?.isElectron === true → electron_desktop，否则结合 UA、触摸与视口判定 web_mobile / web_tablet / web_desktop。
   - os_family、browser_family、viewport_bucket（按 §4.1 分桶）、lang、theme、tz_offset（new Date().getTimezoneOffset()）。不读取也不发送原始 UA 字符串，不做任何指纹。
3. sanitize.ts：路由模板化（与 P2 服务端规则一致）、剥离 query/hash、props 按镜像白名单过滤；api_route 同样做 ID 归一化。
   白名单写成一个常量表，并在注释中标明对应的服务端文件，便于 P8 比对。
4. transport.ts：内存队列上限 100 条，满 20 条或每 5 秒 flush；离页时 flush。
   传输方式依据 P2 对冲突 C3 的结论：优先 fetch(url, { method: 'POST', keepalive: true, credentials, headers }) 带上与 http-client 一致的认证头，
   sendBeacon 仅在 keepalive 不可用时兜底。发送失败静默丢弃，不重试风暴，不在控制台打印事件内容。
   每条事件带 event_id（nanoid 或 crypto.randomUUID，长度不超过 36）。
5. 采样与开关：读取 /api/status 的 analytics_enabled / analytics_sample_rate / analytics_respect_dnt；
   采样基于 device_id 做确定性哈希（同一设备要么全采要么全不采）；respect_dnt 且 navigator.doNotTrack === '1'（可同时兼容 globalPrivacyControl，说明取舍）时完全不采集、不写存储。
   未启用时 SDK 为空操作，不生成 device_id。
6. index.ts 导出 initAnalytics / trackPageView / trackFeature / trackApiError / trackClientError，类型严格（事件名与 props 用 TypeScript 联合类型约束）。
   /api/analytics/ 路径的请求错误必须被 trackApiError 忽略（防递归）。
7. analytics.test.ts 覆盖方案 §9 Phase 2 列出的场景：路由模板化、query/hash 剥离、未知 props 丢弃、Electron 识别、视口分桶、
   批量阈值与定时 flush、离页 flush、确定性采样、DNT 关闭采集、存储不可用时不抛错、/api/analytics/ 防递归。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test（或定向运行 analytics.test.ts）
- bun run lint（或定向 lint）
- bash .harness/verify.sh analytics-sdk-core

【结束】按通用前置块完成；总结中列出导出 API 签名与事件名联合类型，供 P4 使用。
```

---

## P4 — 前端：SDK 挂载与业务埋点接入

**feature id**：`analytics-sdk-integration`

```text
本次 feature：analytics-sdk-integration（路由追踪、接口异常钩子、性能与运行时异常、关键功能 trackFeature 接入）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json。
- 阅读方案 §5.1、§5.2、§5.4、§6「集成挂载点」。
- 阅读：web/src/routes/__root.tsx、web/src/lib/http-client.ts（axios 拦截器与 401 刷新重试逻辑，确认「重试成功」的判定点）、
  现有 React Error Boundary（搜索 ErrorBoundary / errorComponent）、P3 产出的 SDK API。
  按方案 §5.2 逐个定位埋点位置：Playground / Chat 发送、Pricing 与模型详情、Keys 创建/复制/启停、Usage Logs 筛选/导出、
  Wallet 充值弹窗/兑换提交、Subscription、主题/语言/侧边栏切换、登录方式选择、Onboarding 步骤完成/跳过。
- 声明范围：只做挂载与调用点接入；不改 SDK 内部规则（如需改，停下说明）；不改业务逻辑与 UI。

【要做的事】
1. __root.tsx 挂载 useAnalyticsTracker()（放在 web/src/lib/analytics/ 或 hooks 目录，遵循 web/AGENTS.md）：
   - 依据 /api/status 初始化 SDK；
   - 监听 location.pathname 变化：先发上个页面的 route.leave（duration_ms、active_ms、reason=navigate），再发新页面的 route.enter（from_route、referrer_host、is_auth）；
   - visibilitychange 累计活跃可见时长；pagehide 发 reason=unload，切后台发 reason=hide；停留时长上限 3600000。
2. http-client.ts：非 2xx 与网络错误/超时调用 trackApiError（api_route 模板、method、status_code、kind、耗时）；
   401 自动刷新后重试成功的请求不上报；/api/analytics/ 路径一律跳过。
3. vitals：挂载 P3 的 FCP / LCP / TTFB 采集（每次加载各报一次，nav_type）与路由切换耗时 vital.route_change。
4. 运行时异常：window error → runtime.error（source=window），unhandledrejection → runtime.unhandled_rejection（source=promise），
   React 错误边界 → source=react_boundary。只取错误构造名（如 TypeError、ChunkLoadError），不取 message 与堆栈。
5. 在 §5.2 各调用点接入 trackFeature，props 只用枚举 / 布尔 / 计数：
   - playground.request_submit：stream、has_image、provider_family（枚举，不是具体模型名或自定义参数值）；
   - token.*：has_expiry、has_quota_limit，不含 Token 名称、明文与额度数字；
   - wallet.* / subscription.view：pay_method、result，不含金额、兑换码、订单号；
   - usage_log.*：range_bucket、format，不含搜索词；
   - pricing / models：tab、filter_type，不含搜索词；
   - auth.login_method_select：method；onboarding.*：step。
   每个调用点只加一行调用，不改变原有交互与渲染。
6. 测试：扩展 P3 的 analytics.test.ts 或相关组件已有测试，覆盖：路由切换产生 leave→enter 顺序与 from_route；
   401 重试成功不上报；/api/analytics/ 失败不上报；错误事件不含 message；至少 2 个业务调用点的 props 只含白名单键。

【本地联调（强制）】
- 用 run skill 启动后端与前端，管理员开启埋点后在浏览器 Network 面板检查实际上报体：逐个触发 §5.2 事件，
  确认没有 Prompt、搜索词、Token、金额、用户名、query/hash、error.message；把检查过的事件清单写进总结。无法启动则说明原因，不得声称完成。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test
- bun run lint（或定向 lint）
- bun run build:check
- bash .harness/verify.sh analytics-sdk-integration

【结束】按通用前置块完成；总结中列出每个 event_name 对应的文件与行号。
```

---

## P5 — 后端：聚合查询接口、盐轮换与手动清理

**feature id**：`analytics-query-api`

```text
本次 feature：analytics-query-api（/api/analytics/* 管理员聚合接口、盐轮换、手动清理）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、claude-progress.md（含 P0 确认的权限决策）、.harness/feature_list.json。
- 阅读方案 §3「跨设备分析能力说明」、§7.2 管理接口部分、§8.1（看板需要哪些数据）、§9 Phase 3，以及「已知冲突」C5、C6、C7。
- 阅读：router/api-router.go 约 411 行的 handlePermissionRoute + authz 写法、service/authz/resources_audit.go、controller/ 中现有统计类接口（搜索 data / dashboard 统计 handler）的参数与返回格式、
  model/main.go 的 commonGroupCol 等方言辅助、P1/P2 的模型与写入函数。
- 声明范围：只做查询与管理接口；不改上报管线；不做前端。

【要做的事】
1. 路由组 /api/analytics/*：middleware.DisableCache() + middleware.AdminAuth()；若 P0 决定接入 Casbin，参照 resources_audit.go 新增资源与读权限，
   标签与描述用英文源文本并加入前端 7 个 locale。注意不能拦截 P2 的公开 POST /api/analytics/events。
2. 查询接口（参数 start_ts、end_ts 必填，校验 start<end 且跨度不超过 retention_days；client_type 可选且只接受枚举）：
   - GET overview：PV、设备 UV、Actor UV、多设备用户占比、平均活跃停留、接口错误率（api_error 数 / 页面与接口请求基数，口径写进注释）；
   - GET trends：granularity=hour|day 的 PV/UV 趋势 + 24 小时本地活跃时段分布（冲突 C6：按小时桶与 tz_offset 分组后在 Go 中换算）；
   - GET devices：client_type / os_family / browser_family / viewport_bucket / lang / theme 分布，跨设备组合（单端、PC+移动、Web+Electron 等，在 Go 中按 actor_hash 汇总后归类）；
   - GET pages：路由模板排行（PV、UV、平均停留、平均活跃停留），limit 有上限；
   - GET features：功能事件频次、按模块（event_name 前缀）分布、按 client_type 对比；
   - GET health：vital.* 的 P50/P95（冲突 C5：Go 中用有界样本或固定直方图计算，说明误差与内存上限；ClickHouse 结果口径一致）、
     api_error 按 api_route + status_code 的 Top 列表（次数、平均耗时）、client_error 按 error_name 排行。
   所有聚合优先用 GORM 构造的标准 SQL（COUNT / COUNT(DISTINCT) / SUM / AVG / GROUP BY），不使用 JSON 提取函数，不依赖方言特性；
   必须写原生 SQL 时按 AGENTS.md 处理引号与方言分支，并用 common.UsingLogDatabase(...) 区分 ClickHouse。
3. POST /api/analytics/salt/rotate（RootAuth）：生成新盐并持久化（主节点语义与 P1 一致），响应与审计记录都不含盐值（冲突 C7）；
   返回轮换时间即可。成功消息用 common.ApiSuccessT。
4. DELETE /api/analytics/expired（RootAuth）：立即按 retention_days 执行一次 P1 的分批清理，返回删除行数；ClickHouse 返回「由 TTL 处理」的提示。
5. 返回格式与现有管理接口一致（success / message / data），消息走 common.ApiErrorT / ApiSuccessT，新 key 加入 7 个 locale。
6. 测试（最多新增 1 个测试文件，表驱动，夹具显式写入事件数据）：
   - 权限：未登录 401、普通用户 403、Admin 可查、Admin 调用 rotate / expired 被拒、Root 可调用；
   - 跨设备统计：同一 actor_hash 在 web_desktop + web_mobile 两个 device_id 下计为 1 个多设备用户，匿名事件不计入 Actor UV；
   - 时间窗口边界：start_ts / end_ts 边界上的事件归属正确；跨度超限被拒；
   - 本地小时换算：tz_offset=-480 与 0 的同一 UTC 时刻落在不同本地小时；
   - P50/P95 对已知数据集结果准确；
   - 盐轮换后新事件的 actor_hash 变化，响应中无盐值。

【数据库验证（强制）】
- 在真实 SQLite、MySQL、PostgreSQL 上用同一份夹具运行全部聚合接口，结果必须一致；ClickHouse 可用时同样比对。记录版本、命令与结果。

【验证】
- go build ./...
- go test ./controller/... ./service/... ./model/... ./service/authz/...
- bash .harness/verify.sh analytics-query-api

【结束】按通用前置块完成；总结中给出每个接口的请求参数与返回 JSON 示例，供 P7 定义前端类型。
```

---

## P6 — 前端：系统设置「行为埋点」配置

**feature id**：`analytics-admin-settings-ui`

```text
本次 feature：analytics-admin-settings-ui（系统设置中的行为埋点配置卡片）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §7.1、§8.2。
- 阅读：web/src/features/system-settings/maintenance/log-settings-section.tsx 与 history-log-cleanup.tsx（日志配置与清理的现有写法）、
  web/src/features/system-settings/operations/section-registry.tsx 及 onboarding-settings-section.tsx（section 注册模式）、
  web/src/features/system-settings/api.ts 与 types.ts、__tests__/ 中现有测试；搜索 ConfirmDialog、Switch、Slider 等共享组件。
- 确认 P1 / P5 已完成，配置键名与接口以其实际实现为准。
- 声明范围：只改 system-settings 相关文件、类型与 i18n；不做看板。

【要做的事】
1. 在日志 / 运营配置区（选择与现有分组最贴近的位置，说明理由）新增「行为埋点」section：
   - 启用开关，旁边明确说明「不采集对话内容、请求体及用户明文身份」；
   - 采样率 1–100%（复用现有数字输入或滑块组件，前端校验与后端校验一致）；
   - 数据保留天数 7–365；
   - 遵循浏览器 DNT 开关；
   - 「轮换匿名哈希盐」按钮：仅 Root 可见，使用 ConfirmDialog 二次确认，说明轮换后跨设备关联重新开始；调用 P5 的 rotate 接口；
   - 「立即清理过期数据」按钮：仅 Root 可见，ConfirmDialog 确认，显示返回的删除行数（数字用 @/lib/format）。
   盐值在前端任何地方都不出现、不读取。
2. 保存走现有选项保存流程；后端返回的英文消息直接走 i18n 翻译。
3. 所有文案加入 7 个 locale（bun run i18n:sync），使用语义化颜色 token，保持键盘与 ARIA 可用性。
4. 测试：扩展 system-settings 现有测试：开关与数值保存的请求体正确；越界数值被拦截；非 Root 不渲染轮换与清理按钮；确认对话框取消时不发请求。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test
- bun run lint（或定向 lint）
- bun run build:check
- bun run i18n:sync
- bash .harness/verify.sh analytics-admin-settings-ui

【结束】按通用前置块完成；在总结中列出复用的共享组件，以及新写组件的能力缺口说明（如有）。
```

---

## P7 — 前端：行为分析管理看板

**feature id**：`analytics-dashboard-ui`

```text
本次 feature：analytics-dashboard-ui（/analytics 四 Tab 管理看板）。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json，以及项目 shadcn-ui skill。
- 阅读方案 §8.1 全部与 P5 总结中的接口示例。
- 阅读：web/src/routes/_authenticated/ 下管理员页面的路由写法与权限守卫、侧边栏导航与 sidebar-modules-section.tsx（管理员入口如何注册与开关）、
  现有使用 recharts / @visactor/react-vchart 的看板（搜索 dashboard 与 charts 目录），优先复用其卡片、图表封装、时间范围选择器、表格组件；
  @/lib/format、@/lib/currency、@/i18n/languages 的 toIntlLocale。
- 确认 P5、P6 已完成；/analytics 路由名与现有路由无冲突（冲突则停下说明）。
- 声明范围：只新增 web/src/routes/_authenticated/analytics/ 与 web/src/features/analytics/，以及导航注册与 i18n；不改后端。

【要做的事】
1. 路由 /analytics：仅 Admin / Root 可访问（与 P0 决策一致，若接入 Casbin 则按权限点判断），侧边栏增加入口并遵循现有侧边栏模块开关。
   页面顶部：时间范围（今日 / 近 7 天 / 近 30 天 / 自定义）与端类型（全部 / Web 桌面 / Web 移动 / Web 平板 / Electron）全局筛选，筛选状态写入 URL search 参数。
2. 数据层：TanStack Query 封装 P5 的 6 个接口，类型与 P5 返回严格对应；埋点未启用时显示引导到系统设置的空状态。
3. 四个 Tab（按方案 §8.1）：
   - Overview：6 个 KPI 卡片、PV/UV 折线、本地活跃时段柱状图或热力图；
   - Devices：客户端类型环形图、OS / 浏览器 / 视口 / 语言 / 主题横向柱状图、跨设备组合占比；
   - Behavior：热门页面表（路由模板、PV、UV、平均停留、活跃停留）、功能频次排行与按端对比；
   - Health：FCP / LCP / TTFB / 路由切换 P50 & P95 卡片与趋势、接口失败 Top 路由表、前端异常类型分布。
   图表配色使用语义化 token，深浅色主题都可读；数字、百分比、时长统一用 @/lib/format；传给 Intl 的语言先经 toIntlLocale。
4. 加载、空数据、错误状态都要有；窄屏下图表与表格不出现页面级横向滚动。
5. 所有文案加入 7 个 locale（bun run i18n:sync）。
6. 测试：Tab 切换与筛选变化触发对应查询参数；空数据与未启用状态渲染；非管理员无法访问；格式化函数使用正确的 Intl 语言。

【验证】（在 web/ 下）
- bun run typecheck
- bun run test
- bun run lint（或定向 lint）
- bun run build:check
- bun run i18n:sync
- bash .harness/verify.sh analytics-dashboard-ui

【结束】按通用前置块完成；在总结中列出复用组件与新写组件的能力缺口说明（如有）。
```

---

## P8 — 全量回归与验收

```text
任务：对 analytics-* 全部 feature 做全量回归、隐私红线与验收核对，只修复验收中发现的缺陷，不新增需求。

【开始前】
- 用 Read 工具完整阅读 AGENTS.md、web/AGENTS.md、claude-progress.md、.harness/feature_list.json。
- 完整阅读 docs/prd/behavior-analytics-design.md 与本 prompts 文档的「已知冲突」表。
- 确认 P1–P7 均为 done；若有未完成项，停下告诉我。

【要做的事】
1. 运行全量验证并贴出结果摘要：
   - 根目录：go build ./...；go test ./model/... ./controller/... ./service/... ./setting/... ./middleware/...
   - web/：bun run typecheck；bun run test；bun run lint；bun run build:check；bun run i18n:sync
   - bash .harness/verify.sh（不带参数全量）
2. 数据库：确认 P1、P2、P5 的三库（SQLite / MySQL / PostgreSQL）真实验证记录齐全（版本、命令、结果、两次启动幂等、升级路径）；ClickHouse 记录或阻塞说明。缺失则补跑或明确报告阻塞。
3. 隐私红线核对（方案 §1 逐条），输出表格：红线 | 前端拦截位置 | 后端拦截位置 | 测试或检查证据。
   另外核对：前端白名单与后端白名单逐项一致；盐值不出现在 /api/status、GET /api/option、审计日志、系统日志、任何接口响应中；
   日志表无 user_id / username / email / ip 列；DNT 与采样生效。
4. 逐条核对「已知冲突」C1–C8 的处理结果与证据。
5. 逐条核对 .harness/feature_list.json 中每个 analytics-* feature 的 acceptance 与方案 §9 验证矩阵，输出表格：条目 | 验证方式 | 结果 | 证据。
6. 用 run skill 启动应用走一遍：管理员开启埋点 → 匿名访问几页 → 登录后在桌面视口与移动视口（不同 device_id）各操作若干功能 → 看板四个 Tab 数据合理、
   多设备用户计为 1 → 轮换盐后新事件不再与旧 actor_hash 关联 → 关闭埋点后不再有上报请求。无法启动则说明原因。
7. 背压：在测试或本地压测中让写入通道写满，确认业务接口不受影响、事件被丢弃且告警日志限频。
8. 发现的缺陷：属于某 feature 的回到该 feature 修复并重新验证；超出方案范围的问题只记录到 claude-progress.md 遗留问题，不实现。
9. 汇总：数据库验证记录、隐私核对表、复用组件说明，作为后续 PR 描述素材。

【结束】更新 claude-progress.md；所有验收通过时在 docs/prd/INDEX.md 中把本方案标注为已完成待归档（不移动文件，除非我要求）。
```
