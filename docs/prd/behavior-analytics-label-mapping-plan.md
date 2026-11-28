# 埋点事件中文映射表实施计划

## 目标

将行为埋点看板中直接暴露的技术标识（`event_name`、`module` 等）映射为易读的中文文案，同时保持与项目 7 语言国际化体系（`en` / `zh` / `zh-TW` / `fr` / `ja` / `ru` / `vi`）一致，并通过 TypeScript 类型约束防止后续白名单与映射表脱节。

---

## 一、方案设计

### 1. 映射架构（遵循项目 i18n 规范）

不直接在组件里硬编码纯中文静态字典（否则切换英文等其他语言时仍显示中文），而是沿用 `web/src/features/analytics/lib/labels.ts` 现有的 `clientTypeLabel(t, key)` 模式：

1. **统一映射入口**：在 `web/src/features/analytics/lib/labels.ts` 中新增：
   - `eventNameLabel(t, eventName)`：覆盖白名单全部 26 个 `event_name`（含 17 个 `feature_use`、4 个 `perf_vital`、2 个页面事件、3 个异常事件）。
   - `featureModuleLabel(t, module)`：覆盖后端 `GetBehaviorFeatures` 按 `.` 前缀聚合出的 10 个模块名。
   - `eventTypeLabel(t, eventType)`：覆盖 6 类 `event_type`（供后续筛选/明细或文档复用）。
   - 可选：`deviceDimensionLabel(t, dimension, key)`，顺带把「设备」Tab 中 `theme`（`light`/`dark`/`system`）、`other`/`unknown` 等英文枚举本地化。
2. **白名单穷尽约束（防漂移）**：
   - 从 `web/src/lib/analytics/whitelist.ts` 导出全量事件名类型 `AnalyticsEventName` 和模块名类型 `AnalyticsFeatureModule`。
   - 在 `labels.ts` 中使用 `switch` + 字面量 `t('...')` + `never` 穷尽检查，既便于 i18n 静态扫描直接提取 key，又能在白名单增删事件时于编译期报错提醒补全映射。
   - 未知事件名或历史遗留 key 安全降级返回原始字符串；空字符串返回 `t('Unknown')`。
3. **多语言同步**：
   - 按 `i18n-translate` 规范，使用临时脚本 `web/scripts/add-missing-keys.mjs` 一次性写入全部 7 个语言包（`en`、`zh`、`zh-TW`、`fr`、`ja`、`ru`、`vi`），再执行 `bun run i18n:sync` 规范排序并删除临时脚本。

---

## 二、中文映射草案表（待审校）

### 2.1 功能使用事件（`feature_use`，17 个）

直接展示在「行为」Tab 的**功能使用**和**按客户端类型的功能使用**面板：

| `event_name` | 英文 i18n Key | 建议中文映射（`zh`） |
| :--- | :--- | :--- |
| `playground.request_submit` | `Playground request submit` | 演练场发送请求 |
| `pricing.filter_change` | `Pricing filter change` | 模型价格筛选切换 |
| `models.view_detail` | `View model details` | 查看模型详情 |
| `token.create` | `Create API token` | 创建令牌 |
| `token.copy` | `Copy API token` | 复制令牌 |
| `token.toggle` | `Toggle API token status` | 切换令牌状态 |
| `usage_log.filter` | `Filter usage logs` | 筛选使用日志 |
| `usage_log.export` | `Export usage logs` | 导出使用日志 |
| `wallet.topup_open` | `Open wallet top-up` | 打开充值入口 |
| `wallet.redeem_submit` | `Submit redemption code` | 提交兑换码 |
| `subscription.view` | `View subscription plans` | 查看订阅方案 |
| `preference.theme_change` | `Change theme` | 切换主题 |
| `preference.lang_change` | `Change language` | 切换语言 |
| `preference.sidebar_toggle` | `Toggle sidebar` | 切换侧边栏 |
| `auth.login_method_select` | `Select login method` | 选择登录方式 |
| `onboarding.step_complete` | `Complete onboarding step` | 完成引导步骤 |
| `onboarding.skip` | `Skip onboarding` | 跳过引导 |

### 2.2 功能模块（`module`，10 个）

直接展示在「行为」Tab 的**功能模块**面板（由后端 `model/behavior_event_query.go` 按 `event_name` 的 `.` 前缀自动切分）：

| `module` | 英文 i18n Key | 建议中文映射（`zh`） |
| :--- | :--- | :--- |
| `playground` | `Playground` | 演练场 |
| `pricing` | `Pricing` | 模型价格 |
| `models` | `Models` | 模型 |
| `token` | `API Tokens` | 令牌 |
| `usage_log` | `Usage Logs` | 使用日志 |
| `wallet` | `Wallet` | 钱包 |
| `subscription` | `Subscription` | 订阅 |
| `preference` | `Preferences` | 偏好设置 |
| `auth` | `Authentication` | 认证登录 |
| `onboarding` | `Onboarding` | 新手引导 |

> 注：以上部分英文 key（如 `Playground`、`Wallet`、`Models`、`Pricing` 等）可能已存在于现有 `zh.json` 中，实施时会先查重并尽量复用已有译法，避免同词异译。

### 2.3 其余白名单事件（9 个，保证全量 26 个事件均有映射）

| `event_type` | `event_name` | 英文 i18n Key | 建议中文映射（`zh`） | 备注 |
| :--- | :--- | :--- | :--- | :--- |
| `page_view` | `route.enter` | `Page view` | 页面进入 | — |
| `page_leave` | `route.leave` | `Page leave` | 页面离开 | — |
| `perf_vital` | `vital.fcp` | `First contentful paint` | 首次内容绘制 | 已有 key，从 `health-tab.tsx` 统一迁入 `labels.ts` |
| `perf_vital` | `vital.lcp` | `Largest contentful paint` | 最大内容绘制 | 同上 |
| `perf_vital` | `vital.ttfb` | `Time to first byte` | 首字节时间 | 同上 |
| `perf_vital` | `vital.route_change` | `Route change` | 路由切换 | 同上 |
| `api_error` | `api.request_failed` | `API request failed` | 接口请求失败 | — |
| `client_error` | `runtime.error` | `Runtime error` | 运行时错误 | — |
| `client_error` | `runtime.unhandled_rejection` | `Unhandled promise rejection` | 未处理的 Promise 异常 | — |

### 2.4 事件大类（`event_type`，6 个）

| `event_type` | 英文 i18n Key | 建议中文映射（`zh`） |
| :--- | :--- | :--- |
| `page_view` | `Page view` | 页面访问 |
| `page_leave` | `Page leave` | 页面离开 |
| `feature_use` | `Feature usage` | 功能使用（已有 key） |
| `perf_vital` | `Web vitals` | 性能指标 |
| `api_error` | `API error` | 接口异常 |
| `client_error` | `Client error` | 客户端异常 |

### 2.5 可选扩展：设备维度枚举（`DevicesTab`）

当前 `web/src/features/analytics/components/devices-tab.tsx` 直接渲染 `os_families` / `browsers` / `viewports` / `langs` / `themes` 的原始 key：

- `theme`：`light`（浅色）、`dark`（深色）、`system`（跟随系统）
- `os_family` / `browser_family`：规范大小写（如 `macOS`、`iOS`、`Windows`、`Chrome`），并将 `other` / `unknown` 映射为 `其他` / `未知`
- `lang`：`zh`（简体中文）、`en`（English / 英语）、`zh-TW`（繁體中文 / 繁体中文）等

---

## 三、涉及改动文件

| 文件 | 变更内容 |
| :--- | :--- |
| `web/src/lib/analytics/whitelist.ts` | 导出 `AnalyticsEventType`、`AnalyticsEventName`、`AnalyticsFeatureModule` 类型（不改变运行时白名单行为） |
| `web/src/features/analytics/lib/labels.ts` | 新增 `eventNameLabel`、`featureModuleLabel`、`eventTypeLabel`、`vitalLabel`（以及可选的设备维度 label 函数），使用 TypeScript 穷尽检查确保全覆盖 |
| `web/src/features/analytics/components/bar-list.tsx` | （可选）支持 `title` 属性（原生 tooltip）或副标题，用于在显示中文名的同时悬停查看原始 `event_name` |
| `web/src/features/analytics/components/behavior-tab.tsx` | 「功能使用」「功能模块」「按客户端类型的功能使用」三处改用 `eventNameLabel` / `featureModuleLabel` |
| `web/src/features/analytics/components/health-tab.tsx` | 复用 `labels.ts` 中的 `vitalLabel`，移除组件内重复 `switch` |
| `web/src/features/analytics/components/devices-tab.tsx` | （若确认纳入范围）对 `theme`、`os_family`、`browser_family`、`lang` 应用可读标签映射 |
| `web/src/i18n/locales/*.json` | 通过 `add-missing-keys.mjs` + `bun run i18n:sync` 写入 7 种语言翻译 |
| `web/src/features/analytics/__tests__/lib-and-access.test.ts` | 补充映射完整性测试（校验 `EVENT_WHITELIST` 全部 26 个事件与 10 个模块均有映射、未知值安全回退） |
| `web/src/features/analytics/__tests__/analytics-page.test.tsx` | 补充 `BehaviorTab` 渲染映射名称及中英文切换测试 |

---

## 四、验证计划

1. **国际化完整性**：
   - `node scripts/add-missing-keys.mjs`
   - `node scripts/find-missing-keys.mjs`（确认无缺失 key）
   - `bun run i18n:sync`（规范 7 份 locale 排序）
   - 清理临时脚本
2. **类型与代码规范**：
   - `cd web && bun check -b`
   - `cd web && bun run lint`
3. **单元与组件测试**：
   - `cd web && bunx vitest run src/features/analytics/__tests__/`

---

## 五、需要确认的问题

1. **原始事件 ID 展示方式**：界面上显示中文名后，是否需要**同时保留原始 `event_name`**（例如：方案 A 仅悬停 tooltip 显示；方案 B 表格中主行中文 + 次行灰字显示 `event_name`；方案 C 仅显示中文）？
2. **覆盖范围**：是否只做**埋点事件 + 功能模块**映射，还是顺带把**「设备」Tab 的维度枚举**（主题、系统、浏览器、语言）也一起映射？
3. **文案审校**：上方 26 个事件与 10 个模块的中文译名是否有需要调整的术语（例如 `playground` 用「演练场」还是「操练场」，`token` 用「令牌」还是「API 密钥」）？
