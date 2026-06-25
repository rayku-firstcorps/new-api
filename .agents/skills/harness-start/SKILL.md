# harness-start

会话启动 skill。每次新会话开始时调用，建立完整工作上下文。

## 触发时机

- 用户说"开始"、"继续"、"从上次停的地方继续"、"接着做"
- 用户说"看看进度"、"当前状态"
- 任何新会话的第一条消息涉及功能开发

## 启动步骤（必须按顺序执行）

### Step 1：读取上次进度

阅读 `claude-progress.md`，重点关注：
- "上次停在哪里"章节：找到具体的断点和下一步
- "已知问题 / 待决策"：记住未解决的问题
- "不做的事"：明确 out of scope 边界

### Step 2：读取功能范围

阅读 `.harness/feature_list.json`，确认：
- 哪些 feature 是 `pending`（待做）
- 哪些是 `in_progress`（进行中，优先继续）
- 哪些是 `done`（已完成，不需要再碰）
- `out_of_scope` 列表中的功能本 Stage 内绝对不实现

### Step 3：确认规则

确认已读 `AGENTS.md` 中的 7 条规则，特别是：
- Rule 1（JSON 必须用 common.*）
- Rule 2（数据库兼容性）
- Rule 6（DTO 指针字段）

### Step 4：向用户声明工作范围

用以下格式告知用户：

```
本次会话工作范围：
- 实现：[具体 feature 名称]
- 涉及文件：[列出 scope 中的文件]
- 不会触碰：[out_of_scope 中的关键项]

上次进度：[一句话描述]
下一步：[具体动作]
```

### Step 5：（可选）提示运行初始化脚本

如果是命令行环境，提示用户：

```
如需验证环境，可运行：bash .harness/init.sh
```

---

## 会话结束协议

**在每次会话结束前，必须完成以下操作，否则视为会话未正常关闭：**

### 1. 更新功能状态

如果某个 feature 已完成，将 `.harness/feature_list.json` 中对应的 `status` 从 `"pending"` 或 `"in_progress"` 改为 `"done"`。

如果功能正在进行中但未完成，改为 `"in_progress"`。

### 2. 运行验证（完成时）

```bash
bash .harness/verify.sh [feature-id]
# 例如：bash .harness/verify.sh promotion-backend-model
```

验证通过才能将 status 改为 `"done"`。

### 3. 更新进度文件

在 `claude-progress.md` 中更新：
- "功能进度"表格中对应行的状态
- "上次停在哪里"：精确描述当前断点和下一步动作
- "已知问题 / 待决策"：新增发现的问题，删除已解决的问题
- 文件末尾的"最后更新"时间戳

### 4. 最终检查

确认以下事项：
- [ ] `go build ./...` 编译通过（后端有改动时）
- [ ] `bun run typecheck` 类型检查通过（前端有改动时）
- [ ] 没有留下 TODO/FIXME 注释标记的未完成逻辑
- [ ] 没有调试用的 `fmt.Println` 或 `console.log`

---

## 单功能原则

每次会话只处理一个 feature。如果用户要求同时做多个 feature，建议：

1. 先完成当前 feature 并验证
2. 更新进度文件
3. 再开始下一个 feature

跨越范围前必须先更新 `feature_list.json` 并告知用户。
