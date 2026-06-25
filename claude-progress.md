# new-api 会话进度

> 此文件由 AI 在每次会话结束时更新，用于下次会话快速恢复上下文。
> 请勿手动大幅修改，保持结构稳定以便脚本解析。

## 当前 Stage

**Stage 1** — 推广链接功能（promotion links）

目标：管理员可创建推广链接，用户通过推广链接注册后自动获得 10 块额度，系统记录渠道归因。

## 功能进度

| 功能 | 状态 | 说明 |
|---|---|---|
| promotion-backend-model | pending | 尚未开始 |
| promotion-backend-api | pending | 依赖 model |
| promotion-registration-flow | pending | 依赖 api |
| promotion-frontend-capture | pending | 尚未开始 |
| promotion-frontend-admin | pending | 依赖 capture + api |

## 上次停在哪里

首次会话，尚无进展。

**下一步：** 从 `promotion-backend-model` 开始，创建 `model/promotion.go`，实现 `PromotionLink` 和 `PromotionRegistration` 结构体，并接入 `model/main.go` AutoMigrate。

## 已知问题 / 待决策

- [ ] `users` 表新增 `promotion_code`、`promotion_channel_tag` 字段：优先通过 GORM AutoMigrate，如遇 SQLite ALTER COLUMN 问题需参考 `model/main.go` 现有模式手工补字段
- [ ] OAuth 注册（GitHub/Discord/OIDC）是否需要同步接入推广码逻辑？（建议：是，抽 finalize 函数复用）
- [ ] 推广码与用户 `aff_code` 冲突检测：创建推广链接时需校验 code 不与现有用户 aff_code 重名

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

*最后更新：Harness 初始化 + 文档整理（首次会话）*
