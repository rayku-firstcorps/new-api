# 生图广场 PRD

## 1. 背景与目标

参考素材：

- 列表页封面：`C:\Users\Administrator\Desktop\aimz\screenshots\krill-ai\image-generation.jpg`
- 详情弹窗：`C:\Users\Administrator\Desktop\aimz\screenshots\krill-ai\image-gen-detail.png`
- 数据样例：`C:\Users\Administrator\Desktop\aimz\screenshots\krill-ai\table.xlsx`

目标是在默认前端中新增“生图”页面，提供一个可搜索、可筛选、可查看详情、可一键复用提示词的生图提示词广场。用户浏览优质模板后，可以把模板提示词带入右侧生成面板，登录后发起图片生成并查看本次生成结果。

MVP 优先保证：

- 未登录用户可浏览广场列表、搜索、筛选、查看详情。
- 登录用户可使用提示词并发起生图。
- 管理端或种子数据可维护广场模板。
- 前后端接口、数据结构、交互状态清晰，便于快速开发。

## 2. 范围

### 2.1 MVP 范围

- 生图广场公开列表页。
- 分类标签筛选、关键词搜索、分页加载。
- 模板卡片：封面图、标题、摘要、标签、提示词摘要、使用提示词、详情。
- 模板详情弹窗：多图预览、标题、描述、标签、完整提示词、使用提示词。
- 右侧生成面板：未登录引导登录，登录后显示提示词、模型、尺寸、数量、生成按钮、生成结果。
- 后端模板列表/详情接口。
- 后端模板数据模型与迁移。
- 可选后端生成代理接口：用于前端通过登录态发起图片生成。

### 2.2 非 MVP 范围

- 用户投稿与审核流。
- 点赞、收藏、评论、分享统计。
- 模板商业化售卖。
- 多工作流节点编排。
- 图片编辑、局部重绘、参考图上传。

## 3. 用户与场景

### 3.1 访客

- 浏览生图模板，学习优质 prompt。
- 通过搜索或分类快速找到想要的风格。
- 点击详情查看完整提示词。
- 点击使用提示词时，如果未登录，右侧面板提示登录。

### 3.2 登录用户

- 复用模板 prompt 到生成面板。
- 调整模型、尺寸、生成张数。
- 发起图片生成并查看结果。
- 对生成失败、余额不足、敏感词拦截等状态有明确反馈。

### 3.3 管理员

- 通过种子数据、后台脚本或后续管理页维护模板。
- 控制模板是否可见、排序、标签、封面图、提示词内容。

## 4. 页面信息架构

### 4.1 顶部导航

沿用现有公开站点导航风格。新增入口：

- 导航名称：`生图`
- 推荐路由：`/image-generation`
- 入口位置：公开顶部导航，与“主页、模型广场、定价、文档”等同级。

### 4.2 页面头部

视觉参考封面图：

- 页面居中标题：`生图`
- 副标题：`浏览精选生图提示词，快速复用模板内容，并基于已登录账户生成图片。`
- 顶部背景使用柔和浅色渐变，页面主体保持白底和高留白。

### 4.3 搜索与筛选

位置：标题下方，列表上方。

组件：

- 搜索框：placeholder `搜索提示词、分类或标题...`
- 搜索按钮：`搜索`
- 清空按钮：有搜索词或分类时显示。
- 标签筛选：横向 chip 列表。

默认标签：

- `全部`
- `摄影`
- `Raycast Friendly`
- `YouTube 缩略图`
- `个人资料 / 头像`
- `产品营销`
- `教程 / 教育`
- `插画 / 动漫`
- `电影主题`
- `社交媒体帖子`

筛选规则：

- 点击标签立即刷新列表。
- 搜索词匹配标题、描述、提示词、标签。
- 标签与搜索词为 AND 关系。
- `全部` 表示不限制标签。

### 4.4 主体布局

桌面端：

- 最大内容宽度建议 `1280px`。
- 左侧模板列表：3 列瀑布式/等宽卡片网格。
- 右侧生成面板：固定宽度约 `300-340px`，随页面顶部吸附。
- 列表与面板间距 `24px`。

平板端：

- 列表 2 列。
- 生成面板可置于列表上方或折叠为底部抽屉。

移动端：

- 列表 1 列。
- 使用提示词后打开底部抽屉生成面板。
- 详情弹窗改为全屏 Dialog/Drawer。

## 5. 核心组件

### 5.1 模板卡片

卡片内容：

- 封面图：固定比例 `16:10` 或 `4:3`，圆角不超过 `8px`。
- 标题：最多 2 行。
- 描述：最多 2 行。
- 提示词摘要：最多 4 行，灰底区域展示。
- 标签：最多展示 2 个，超出可省略。
- 主按钮：`使用提示词`
- 次按钮：`详情`

交互：

- 点击封面或详情：打开详情弹窗。
- 点击使用提示词：把完整 prompt 写入右侧生成面板。
- 图片加载失败：显示灰色占位和 `图片不可用`。

### 5.2 详情弹窗

视觉参考 `image-gen-detail.png`。

内容：

- 标题。
- 描述。
- 图片预览区：支持 1-4 张，MVP 至少支持 1 张；2 张时并排显示。
- 标签。
- `提示词` 标题。
- 完整 prompt 文本块。
- 底部固定操作区：`使用提示词`。

交互：

- 点击遮罩或右上角关闭按钮关闭。
- 使用提示词后关闭弹窗，并把 prompt 填入生成面板。
- 长 prompt 文本块可滚动或自动撑高，最大高度建议 `360px`。

### 5.3 生成面板

未登录状态：

- 标题：`生成图片`
- 说明：`登录后可使用模板提示词生成图片。`
- 按钮：`登录`
- 点击跳转登录页，登录成功后回到当前页面。

登录但未选择 prompt：

- 标题：`生成图片`
- 空态：`从左侧选择一个提示词开始。`
- 生成按钮禁用。

登录且已选择 prompt：

- Prompt 输入框：支持编辑，默认填入模板 prompt。
- 模型选择：默认使用系统配置的图片生成模型。
- 尺寸选择：`1024x1024`、`1024x1536`、`1536x1024`。
- 数量选择：`1-4`，MVP 默认 `1`。
- 生成按钮：`生成`

生成结果区域：

- 未生成：显示空态 `暂无图片`。
- 生成中：骨架屏或进度状态。
- 成功：展示本次生成图片，可点击放大、复制图片链接、下载。
- 失败：展示失败原因和重试按钮。

## 6. 数据模型

`table.xlsx` 样例字段：

| 字段 | 样例 | 说明 |
| --- | --- | --- |
| `id` | `1` | 模板 ID |
| `imageurl` | `https://dummy-image.src/media/0001.jpge` | 封面图 URL |
| `tags` | `["美学", "摄影架构"]` | 标签 JSON |
| `title` | `Ecommerce Picture Demo` | 标题 |
| `description` | `this is a good picture` | 描述 |
| `create_at` | Excel 日期数值 | 创建时间 |
| `update_at` | Excel 日期数值 | 更新时间 |
| `visiable` | `1` | 是否可见，原字段拼写错误 |

建议后端模型使用语义化字段，并在导入脚本中兼容 `imageurl`、`visiable`：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | int | 是 | 主键 |
| `title` | string | 是 | 模板标题 |
| `description` | string | 否 | 模板描述 |
| `prompt` | text | 是 | 完整提示词 |
| `image_url` | string | 是 | 主封面图 |
| `image_urls` | text/json string | 否 | 多图 URL JSON 数组 |
| `tags` | text/json string | 否 | 标签 JSON 数组 |
| `sort` | int | 否 | 排序，越大越靠前 |
| `visible` | bool | 是 | 是否公开展示 |
| `created_at` | timestamp | 是 | 创建时间 |
| `updated_at` | timestamp | 是 | 更新时间 |

后端注意：

- 数据库需要兼容 SQLite、MySQL、PostgreSQL。
- `tags`、`image_urls` 使用 `TEXT` 存 JSON 字符串，避免数据库特有 JSON 类型。
- Go 业务代码 JSON 序列化/反序列化必须使用 `common.Marshal`、`common.Unmarshal`。
- 原表字段 `visiable` 仅作为导入兼容，不建议作为正式字段。

## 7. 后端接口

统一响应沿用现有业务格式：

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

### 7.1 获取标签

`GET /api/image-generation/tags`

响应：

```json
{
  "success": true,
  "data": {
    "tags": [
      { "name": "摄影", "count": 18 },
      { "name": "Raycast Friendly", "count": 12 }
    ]
  }
}
```

### 7.2 获取模板列表

`GET /api/image-generation/templates`

Query：

| 参数 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `keyword` | string | 否 | 空 | 搜索标题、描述、prompt、标签 |
| `tag` | string | 否 | 空 | 标签筛选 |
| `page` | int | 否 | `1` | 页码 |
| `page_size` | int | 否 | `24` | 每页数量，最大 `60` |

响应：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "深夜奢华镜面自拍",
        "description": "一张带有 Y2K 闪光灯摄影氛围的深夜情绪镜面自拍。",
        "prompt_excerpt": "一张深夜情绪镜面自拍，拍摄于...",
        "image_url": "https://example.com/cover.jpg",
        "image_urls": ["https://example.com/cover.jpg"],
        "tags": ["个人资料 / 头像", "Raycast Friendly"],
        "created_at": 1782115200,
        "updated_at": 1782115200
      }
    ],
    "page": 1,
    "page_size": 24,
    "total": 126
  }
}
```

### 7.3 获取模板详情

`GET /api/image-generation/templates/:id`

响应：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "深夜奢华镜面自拍",
    "description": "一张带有 Y2K 闪光灯摄影氛围的深夜情绪镜面自拍。",
    "prompt": "一张深夜情绪镜面自拍，拍摄于...",
    "image_url": "https://example.com/cover.jpg",
    "image_urls": [
      "https://example.com/cover.jpg",
      "https://example.com/sample-2.jpg"
    ],
    "tags": ["个人资料 / 头像", "Raycast Friendly"],
    "created_at": 1782115200,
    "updated_at": 1782115200
  }
}
```

### 7.4 使用模板埋点，可选

`POST /api/image-generation/templates/:id/use`

用途：统计模板使用次数。MVP 可不做；如果做，失败不影响填入 prompt。

请求：

```json
{
  "source": "list"
}
```

### 7.5 发起图片生成，可选代理接口

如果前端不能直接通过登录态调用现有 OpenAI-compatible 图片生成接口，则新增：

`POST /api/image-generation/generate`

鉴权：需要登录。

请求：

```json
{
  "template_id": 1,
  "model": "gpt-image-1",
  "prompt": "一张深夜情绪镜面自拍，拍摄于...",
  "size": "1024x1024",
  "n": 1
}
```

响应：

```json
{
  "success": true,
  "data": {
    "images": [
      {
        "url": "https://example.com/result.png",
        "revised_prompt": ""
      }
    ],
    "request_id": "img_20260622_0001"
  }
}
```

生成代理规则：

- 后端复用现有图片生成 relay、计费、日志与敏感词检查能力。
- `prompt` 必填。
- `n` 范围 `1-4`。
- `size` 只允许白名单值。
- 余额不足返回明确错误文案。
- 上游错误透传为用户可读消息。

## 8. 前端开发建议

推荐新增文件：

```text
web/default/src/routes/image-generation/index.tsx
web/default/src/features/image-generation/api.ts
web/default/src/features/image-generation/types.ts
web/default/src/features/image-generation/components/template-card.tsx
web/default/src/features/image-generation/components/template-detail-dialog.tsx
web/default/src/features/image-generation/components/template-filters.tsx
web/default/src/features/image-generation/components/generation-panel.tsx
web/default/src/features/image-generation/components/generated-image-dialog.tsx
```

状态管理：

- `keyword`
- `selectedTag`
- `page`
- `templates`
- `selectedTemplate`
- `detailOpen`
- `activePrompt`
- `generationOptions`
- `generationStatus`
- `generatedImages`

接口调用：

- 使用现有 `web/default/src/lib/api.ts` axios 实例。
- GET 列表请求需要处理并发去重；现有 `api.get` 已支持。
- 生成接口需跳过重复提交，按钮进入 loading 后禁用。

i18n：

- 页面文案使用 `useTranslation()` 和 `t('English key')`。
- 新增英文 key 后同步维护 `en/zh/fr/ja/ru/vi`。

视觉实现：

- 使用现有 `components/ui` 基础组件。
- 按钮优先使用 icon + 文案，图标可用 lucide。
- 卡片圆角不超过 `8px`。
- 页面应保持工具型布局，不做营销落地页。
- 移动端不能出现按钮文字溢出或弹窗内容遮挡。

## 9. 管理与导入

MVP 可先不做管理后台，用种子数据或导入脚本初始化模板。

导入 `table.xlsx` 时的字段映射：

| Excel 字段 | 后端字段 | 处理 |
| --- | --- | --- |
| `imageurl` | `image_url` | 原样导入；同时作为 `image_urls[0]` |
| `tags` | `tags` | 校验为 JSON 数组 |
| `title` | `title` | 必填 |
| `description` | `description` | 可空 |
| `create_at` | `created_at` | Excel 日期转换为 Unix 时间或 `time.Time` |
| `update_at` | `updated_at` | Excel 日期转换为 Unix 时间或 `time.Time` |
| `visiable` | `visible` | `1=true`，其他为 `false` |

由于样例表缺少 `prompt` 字段，导入策略：

- 如果 `prompt` 缺失，先使用 `description` 兜底，但该模板不建议上线展示。
- 正式上线数据必须补齐 `prompt`。

## 10. 权限与风控

- 模板列表与详情：公开可访问，只返回 `visible=true` 数据。
- 生成图片：必须登录。
- 管理维护：仅管理员。
- Prompt 生成前走现有敏感词检查配置。
- 图片 URL 仅允许 HTTP/HTTPS。
- 如果后端代理下载或转发图片，需要复用现有 SSRF 防护配置。

## 11. 空态与错误态

列表空态：

- 搜索无结果：`没有找到相关提示词`
- 首屏无数据：`暂无提示词模板`

详情错误：

- 模板不存在或不可见：关闭弹窗并提示 `模板不存在或已下架`

生成错误：

- 未登录：跳转登录。
- 余额不足：提示 `余额不足，请充值后再试`
- Prompt 为空：提示 `请输入提示词`
- 上游失败：展示后端返回 message，保留重试按钮。

## 12. 验收标准

- 访问 `/image-generation` 可以看到页面标题、搜索筛选、模板列表、右侧生成面板。
- 未登录用户可以搜索、筛选、打开详情，但点击生成会被引导登录。
- 点击卡片 `详情` 打开弹窗，弹窗内容与卡片对应。
- 点击 `使用提示词` 后，prompt 被写入生成面板。
- 登录用户可发起生成；生成中按钮禁用；成功后展示图片。
- 列表接口支持分页、关键词、标签筛选。
- 不可见模板不出现在公开列表和详情中。
- 图片加载失败有占位，不影响页面布局。
- 桌面、平板、移动端布局不重叠、不溢出。

## 13. 推荐迭代拆分

### Phase 1：广场浏览

- 后端模型、迁移、种子数据。
- 列表接口、详情接口、标签接口。
- 前端页面、筛选、卡片、详情弹窗。

### Phase 2：提示词复用与生成面板

- 使用提示词写入生成面板。
- 登录态判断。
- 生成参数表单。
- 接入现有图片生成能力或新增生成代理接口。

### Phase 3：运营能力

- 管理端模板 CRUD。
- 使用次数统计。
- 排序、上下架、批量导入。
- 收藏、分享、热门模板。
