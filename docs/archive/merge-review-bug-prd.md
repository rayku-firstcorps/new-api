# Merge 后明显 Bug 修复 PRD

## 背景

本 PRD 记录 `53408027 Merge remote-tracking branch 'upstream/main'` 后的快速代码审查结果，目标是修复合并后暴露的明显回归，恢复后端测试稳定性，并降低 Claude 文件转换、模型列表和测试全局状态污染带来的线上风险。

已执行验证：

```bash
git diff --check
go test ./...
cd web/default && bun run build
cd web/classic && bun run build
```

验证结果：

- `git diff --check` 通过。
- `web/default` 构建通过。
- `web/classic` 构建通过。
- `go test ./...` 失败，失败集中在 controller 和 Claude relay 测试。

## 优先级定义

- P0：阻断编译、启动、构建或基础发布。
- P1：高概率线上业务回归，影响核心 API 行为或核心用户流程。
- P2：测试稳定性、兼容性或维护性风险，可能掩盖真实回归。
- P3：非阻断优化项，影响性能、体验或长期维护成本。

## P0

未发现会直接导致项目无法编译、前端无法构建或仓库存在冲突标记的问题。

## P1

### 1. Claude 文件内容转换回归

相关文件：

- `relay/channel/claude/relay-claude.go`
- `relay/channel/claude/relay_claude_test.go`

问题描述：

`RequestOpenAI2ClaudeMessage` 对非 text 内容统一调用 `ToFileSource()` 后，只按 `application/pdf` 判断 document，否则全部当 image。当前测试显示：

- 未知文件 `blob.bin` 被错误转成 image，没有被忽略。
- PDF 被错误转成 image。
- 文本文件 `notes.txt` 被错误转成 image，没有转为 Claude text。

失败测试：

- `TestRequestOpenAI2ClaudeMessage_IgnoresUnsupportedFileContent`
- `TestRequestOpenAI2ClaudeMessage_SupportsPDFFileContent`
- `TestRequestOpenAI2ClaudeMessage_ConvertsTextFileContentToText`

业务影响：

- Claude 文档输入可能无法按 document 正确提交。
- 文本附件会被误发为 image，导致上游拒绝或语义错误。
- 未支持的附件会被错误包装，增加 4xx 风险。

修复要求：

- 按 MIME 类型显式分流：
  - `application/pdf` -> Claude `document`
  - 图片 MIME -> Claude `image`
  - 文本 MIME 或可识别文本文件 -> 解码为 Claude `text`
  - 不支持类型 -> 跳过或返回明确错误，不能默认作为 image
- 保持现有图片输入兼容。
- 补充或修正覆盖 PDF、text、image、unsupported file 的测试。

### 2. `/v1/models` token model limit 场景错误依赖用户组/DB

相关文件：

- `controller/model.go`
- `controller/model_list_test.go`

问题描述：

`ListModels` 在判断 `ContextKeyTokenModelLimitEnabled` 前，先调用 `getModelListGroups()`。当 token-limit 场景只需要按 token 限制返回模型时，仍会走 `model.GetUserGroup(c.GetInt("id"), false)`；测试中 `id=0` 且 DB 已关闭，接口返回 `"get user group failed"`。

失败测试：

- `TestListModelsTokenLimitIncludesTieredBillingModel`

业务影响：

- 使用 token 模型限制时，模型列表可能因为无关的用户组查询失败而不可用。
- 有效 tiered billing 模型可能无法出现在 token 限制模型列表中。

修复要求：

- token model limit 分支应优先处理，不应强依赖用户组查询。
- 只有需要 owner 信息或非 token-limit 路径时再查 group。
- tiered billing 模型只要配置了有效 `billing_expr`，应通过 `HasModelBillingConfig`。

## P2

### 1. controller 测试存在全局 DB 生命周期污染

相关文件：

- `controller/model_list_test.go`

问题描述：

测试直接替换 `model.DB` / `model.LOG_DB`，cleanup 只关闭当前 DB，没有恢复原始全局 DB。后续同包测试可能命中已关闭连接，日志中已有多处 `sql: database is closed`。

影响：

- 测试顺序敏感。
- 真实业务回归可能被全局状态污染掩盖。
- CI 上可能出现随机失败。

修复要求：

- 测试 helper 保存并恢复原 `model.DB` / `model.LOG_DB`。
- 避免 `initModelListColumnNames()` 调用 `model.InitDB()` 后关闭仍挂在全局变量上的 DB。
- controller 包测试应隔离全局 config、DB、cache。

### 2. 业务代码直接调用 `encoding/json` 进行 Unmarshal

相关文件：

- `relay/channel/claude/relay-claude.go`

问题描述：

项目规范要求业务代码 JSON 编解码走 `common.Marshal` / `common.Unmarshal`。当前 Claude relay 中存在直接 `json.Unmarshal` 调用。

影响：

- 绕过统一 JSON 层，后续替换 JSON 实现或统一行为时容易遗漏。
- 增加风格不一致和维护成本。

修复要求：

- `json.RawMessage` 等类型引用可保留。
- 实际 marshal/unmarshal 调用替换为 `common.Marshal` / `common.Unmarshal`。

## P3

### 1. 默认前端构建产物存在超大 chunk

相关目录：

- `web/default`

问题描述：

`web/default` 构建成功，但输出中存在多个 MB 级 async chunk，最大约 `4.85 MB`，主入口约 `2.89 MB`。

影响：

- 首屏加载、缓存更新和弱网体验可能受影响。
- 非本次 merge 阻断问题。

优化建议：

- 后续单独做 bundle analyze。
- 优先拆分编辑器、图表、设置页、价格页等重组件。

## 验收标准

- `go test ./...` 全部通过。
- `web/default` 的 `bun run build` 通过。
- `web/classic` 的 `bun run build` 通过。
- Claude 转换测试覆盖 PDF、text、image、unsupported file 四类。
- token model limit 场景不依赖无关 DB 查询。
- controller 测试多次连续运行不再出现 `sql: database is closed`。
