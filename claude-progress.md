# new-api 会话进度

> 此文件由 AI 在每次会话结束时更新，用于下次会话快速恢复上下文。
> 请勿手动大幅修改，保持结构稳定以便脚本解析。

## 当前 Stage

**Stage 1** — 推广链接功能（promotion links）

目标：管理员可创建推广链接，用户通过推广链接注册后自动获得 10 块额度，系统记录渠道归因。

## 功能进度

| 功能 | 状态 | 说明 |
|---|---|---|
| utf8-file-reading | done | 项目文本文件读取统一显式使用 UTF-8 编码 |
| upstream-merge-preserve-custom-ui | done | 已合并 upstream/main（66ee6b8f9）；前端迁移至 web/，首页、导航栏-生图、导航栏-文档、footer 及 fork 定制功能均保留 |
| antom-safari-popup-plan | done | 已输出 Safari 下 Antom 支付弹窗优化实施计划，未修改支付业务代码 |
| antom-safari-popup-fix | done | 已实现 Antom 支付窗口同步预开、失败清理和同页降级；待部署环境 Safari 真机验收 |
| promotion-backend-model | pending | 尚未开始 |
| promotion-backend-api | pending | 依赖 model |
| promotion-registration-flow | pending | 依赖 api |
| promotion-frontend-capture | pending | 尚未开始 |
| promotion-frontend-admin | pending | 依赖 capture + api |

## 上次停在哪里

本次将 `upstream/main@66ee6b8f9` 合并到 fork。跟随上游完成前端 `web/default/` 到 `web/` 的目录迁移，并保留首页、文档、生图、footer、推广、支付、官方社交链接、Splash 广告、SSO 客户端和外部余额等定制功能。合并同时接入上游认证会话、OAuth POST flow、relaykit DTO 迁移等变更。七个前端 locale 已补齐翻译，i18n 报告的 missing、extras、untranslated 均为 0，插值占位符全量校验一致。

**下一步：** 从 `promotion-backend-model` 开始，创建 `model/promotion.go`，实现 `PromotionLink` 和 `PromotionRegistration` 结构体，并接入 `model/main.go` AutoMigrate。后续前端路径统一使用 `web/`。

## 已知问题 / 待决策

- [ ] `users` 表新增 `promotion_code`、`promotion_channel_tag` 字段：优先通过 GORM AutoMigrate，如遇 SQLite ALTER COLUMN 问题需参考 `model/main.go` 现有模式手工补字段
- [ ] OAuth 注册（GitHub/Discord/OIDC）是否需要同步接入推广码逻辑？（建议：是，抽 finalize 函数复用）
- [ ] 推广码与用户 `aff_code` 冲突检测：创建推广链接时需校验 code 不与现有用户 aff_code 重名

## 本次验证

- `go test ./...` 通过
- `bun run i18n:sync` 通过（web；七语言 missing/extras/untranslated 全为 0，placeholder mismatch 为 0）
- `bun run typecheck`、`bun run build:check`、`bun test` 通过（web；114 tests）
- `bun run lint` 未通过：上游新 oxlint 规则扫描出大量存量 lint 问题，本次单功能合并未扩展处理
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh upstream-merge-preserve-custom-ui` 通过
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh antom-safari-popup-plan` 通过（Go 编译、全局 JSON 规则）
- `bun run typecheck`、目标文件 oxlint/oxfmt、`bun run build:check` 通过（web/default）
- `C:\Program Files\Git\bin\bash.exe .harness/verify.sh antom-safari-popup-fix` 通过（Go 编译、全局 JSON 规则）
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

*最后更新：合并 upstream/main@66ee6b8f9 并补齐七语言 i18n（2026-07-30）；下一步继续 `promotion-backend-model`。*
