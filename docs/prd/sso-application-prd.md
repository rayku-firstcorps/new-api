# SSO 应用授权流程 PRD

## 1. 背景

new-api 需要支持外部应用通过用户授权获取访问令牌。管理员在后台创建 SSO 应用，外部应用跳转到 new-api 授权页，用户确认后，外部应用使用一次性授权码换取该用户的访问令牌。

本 PRD 记录 SSO 应用配置、授权流程、接口参数、返回结果和验收标准，便于外部客户端接入。

## 2. 目标

- 管理员可以创建、编辑、启用或禁用 SSO 应用。
- 外部应用可以发起用户授权请求。
- 用户登录 new-api 后可以确认或拒绝授权。
- 授权成功后，外部应用可以使用授权码换取 `access_token`。
- 授权码具备短时有效、一次性使用的安全约束。

## 3. 非目标

- 不实现完整标准 OAuth 2.0 兼容层。
- 不提供 refresh token。
- 不支持动态注册客户端。
- 不支持任意通配 redirect URI。

## 4. 角色

| 角色 | 说明 |
| --- | --- |
| 管理员 | 在 new-api 后台配置 SSO 应用 |
| 用户 | 登录 new-api，并决定是否授权外部应用 |
| 外部应用 | 例如 Kudex，发起授权并接收 token |
| new-api | 授权服务端，负责校验客户端、生成授权码、签发用户访问令牌 |

## 5. SSO 应用配置

后台入口：系统设置 -> 认证设置 -> SSO 应用。

### 5.1 字段说明

| 字段 | 示例 | 说明 |
| --- | --- | --- |
| 启用 | 开启 | 关闭后该应用不能再发起授权 |
| 应用名称 | `Kudex Client` | 展示给用户看的应用名称 |
| Client ID | `Kudex666` | 外部应用发起授权和换 token 时使用，必须唯一 |
| Client Secret | `66666666` | 外部应用换 token 时使用，生产环境应使用高强度随机字符串 |
| 重定向 URI | `http://localhost:3000` | 外部应用接收授权码的回调地址，必须逐字符匹配 |
| 允许的作用域 | `profile access_token` | 外部应用可请求的 scope，使用空格分隔 |

### 5.2 当前测试配置

```text
应用名称: Kudex Client
Client ID: Kudex666
Client Secret: 66666666
重定向 URI: http://localhost:3000
允许的作用域: profile access_token
```

生产环境建议：

- `Client Secret` 至少 32 位随机字符串。
- `redirect_uri` 使用 HTTPS。
- 本地开发可以使用 `http://localhost:3000`。

## 6. 授权流程

### 6.1 流程总览

```text
外部应用 -> new-api 授权页 -> 用户确认授权 -> 跳回外部应用 redirect_uri -> 外部应用用 code 换 access_token
```

### 6.2 步骤 1：外部应用发起授权

外部应用将用户跳转到：

```text
https://你的-new-api-域名/sso/authorize?client_id=Kudex666&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=profile%20access_token&state=random-state
```

参数说明：

| 参数 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `client_id` | 是 | `Kudex666` | 后台配置的 Client ID |
| `redirect_uri` | 是 | `http://localhost:3000` | 必须与后台配置完全一致 |
| `scope` | 否 | `profile access_token` | 不传时默认使用 `profile access_token` |
| `state` | 否 | `random-state` | 外部应用生成，用于防 CSRF 和回调状态恢复 |

### 6.3 步骤 2：用户确认授权

如果用户未登录，new-api 会先引导用户登录。

登录后授权页展示：

- 应用名称
- Client ID
- 当前登录用户
- 请求的 scope
- 授权说明

用户可以选择：

- 授权：生成一次性授权码并跳回 `redirect_uri`。
- 拒绝：跳回 `redirect_uri` 并携带错误信息。

### 6.4 步骤 3：授权成功回调

用户点击授权后，new-api 跳转到外部应用回调地址：

```text
http://localhost:3000?code=一次性授权码&state=random-state
```

如果请求没有携带 `state`，回调中也不会携带 `state`。

授权码规则：

- 5 分钟有效。
- 只能使用一次。
- 必须与发起授权时的 `client_id` 和 `redirect_uri` 匹配。

### 6.5 步骤 4：用户拒绝授权回调

用户点击拒绝后，new-api 跳转到：

```text
http://localhost:3000?error=access_denied&state=random-state
```

外部应用应展示授权失败或用户取消提示。

### 6.6 步骤 5：外部应用使用 code 换 token

外部应用服务端请求：

```http
POST https://你的-new-api-域名/api/sso/token
Content-Type: application/json

{
  "client_id": "Kudex666",
  "client_secret": "66666666",
  "code": "回调中拿到的一次性授权码",
  "redirect_uri": "http://localhost:3000"
}
```

注意：当前接口接收 JSON，不是 `application/x-www-form-urlencoded`。

### 6.7 步骤 6：换 token 成功结果

成功响应：

```json
{
  "success": true,
  "data": {
    "token_type": "Bearer",
    "access_token": "用户的 new-api 访问令牌",
    "user": {
      "id": 1,
      "username": "username",
      "display_name": "display name",
      "role": 1,
      "group": "default"
    }
  }
}
```

外部应用最终使用 `data.access_token` 作为用户访问令牌。

## 7. 接口设计

### 7.1 获取授权页信息

```http
GET /api/sso/authorize?client_id=Kudex666&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=profile%20access_token
```

说明：

- 需要用户登录。
- 校验 SSO 应用是否存在、是否启用、`redirect_uri` 是否允许、`scope` 是否允许。

### 7.2 确认授权

```http
POST /api/sso/authorize
Content-Type: application/json

{
  "client_id": "Kudex666",
  "redirect_uri": "http://localhost:3000",
  "scope": "profile access_token",
  "state": "random-state"
}
```

成功后返回 `redirect_url`，前端跳转到该地址。

### 7.3 拒绝授权

```http
POST /api/sso/deny
Content-Type: application/json

{
  "client_id": "Kudex666",
  "redirect_uri": "http://localhost:3000",
  "scope": "profile access_token",
  "state": "random-state"
}
```

成功后返回带 `error=access_denied` 的 `redirect_url`。

### 7.4 换取 token

```http
POST /api/sso/token
Content-Type: application/json

{
  "client_id": "Kudex666",
  "client_secret": "66666666",
  "code": "一次性授权码",
  "redirect_uri": "http://localhost:3000"
}
```

校验规则：

- `client_id` 必须存在。
- `client_secret` 必须正确。
- SSO 应用必须启用。
- `code` 必须存在、未过期、未使用。
- `redirect_uri` 必须与授权码创建时一致。

## 8. 异常场景

| 场景 | 结果 |
| --- | --- |
| `client_id` 不存在 | 授权失败，提示 client 不存在 |
| SSO 应用被禁用 | 授权失败 |
| `redirect_uri` 不匹配 | 授权失败 |
| 请求了未允许的 scope | 授权失败 |
| 用户拒绝授权 | 回调 `error=access_denied` |
| 授权码过期 | 换 token 失败 |
| 授权码重复使用 | 换 token 失败 |
| `client_secret` 错误 | 换 token 失败 |
| 用户已被禁用 | 换 token 失败 |

## 9. 安全要求

- 授权码有效期为 300 秒。
- 授权码只能消费一次。
- `redirect_uri` 必须精确匹配，不支持通配。
- 生产环境必须使用 HTTPS redirect URI。
- 生产环境必须使用高强度 `Client Secret`。
- 外部应用应校验回调中的 `state` 是否与发起授权时一致。
- `Client Secret` 只能保存在服务端，不应放入浏览器前端代码。
- SSO 一键创建 API Key 时，接口不得在响应 JSON 中直接返回明文 API Key。
- 外部应用客户端必须为本次请求生成临时公钥，并将公钥传给 new-api 后端。
- new-api 后端创建 API Key 后，只返回使用客户端公钥加密后的密文。
- 外部应用客户端在本地使用私钥解密，得到 API Key 后自行保存。
- 加密建议使用 `X25519 + HKDF-SHA256 + AES-256-GCM`，或兼容性更高的 `RSA-OAEP-SHA256`。
- 每次创建 API Key 应使用一次性客户端公私钥对，避免长期复用解密私钥。

## 10. 验收标准

- 管理员可以使用测试配置创建 SSO 应用。
- 外部应用访问授权 URL 后，已登录用户可以看到授权确认页。
- 用户点击授权后，浏览器跳转到 `http://localhost:3000?code=...`。
- 外部应用使用该 `code` 调用 `/api/sso/token` 能获得 `access_token`。
- 同一个 `code` 第二次调用 `/api/sso/token` 会失败。
- 超过 5 分钟后使用 `code` 会失败。
- `redirect_uri` 与后台配置不一致时授权失败。
- 用户拒绝授权时，回调地址携带 `error=access_denied`。

## 11. Kudex 接入示例

### 11.1 后台配置

```text
应用名称: Kudex Client
Client ID: Kudex666
Client Secret: 66666666
重定向 URI: http://localhost:3000
允许的作用域: profile access_token
```

### 11.2 授权 URL

```text
https://你的-new-api-域名/sso/authorize?client_id=Kudex666&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=profile%20access_token&state=kudex-test
```

### 11.3 成功回调

```text
http://localhost:3000?code=AUTH_CODE&state=kudex-test
```

### 11.4 换 token 请求

```bash
curl -X POST "https://你的-new-api-域名/api/sso/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "Kudex666",
    "client_secret": "66666666",
    "code": "AUTH_CODE",
    "redirect_uri": "http://localhost:3000"
  }'
```

### 11.5 预期结果

```json
{
  "success": true,
  "data": {
    "token_type": "Bearer",
    "access_token": "USER_ACCESS_TOKEN",
    "user": {
      "id": 1,
      "username": "username",
      "display_name": "display name",
      "role": 1,
      "group": "default"
    }
  }
}
```

## 12. 一键创建加密 API Key

### 12.1 目标

用户完成 SSO 授权后，Kudex 可以一键为该用户创建受限 API Key，并获取用户可用分组、模型等接入信息。

API Key 不允许以明文返回。new-api 后端必须使用 Kudex 客户端提供的临时公钥加密 API Key，Kudex 客户端本地解密后使用。

### 12.2 推荐流程

```text
Kudex 客户端生成一次性密钥对
  -> Kudex 调用 new-api 创建 API Key，并提交 public_key
  -> new-api 创建 API Key
  -> new-api 使用 public_key 加密 API Key
  -> new-api 返回 encrypted_api_key、nonce、算法信息、分组、模型
  -> Kudex 客户端本地解密得到 API Key
```

### 12.3 创建加密 API Key 请求

```http
POST https://你的-new-api-域名/api/sso/api-key
Authorization: Bearer USER_ACCESS_TOKEN
New-Api-User: 1
Content-Type: application/json

{
  "client_id": "Kudex666",
  "name": "Kudex Client",
  "group": "default",
  "models": ["gpt-4o-mini", "gpt-4.1"],
  "unlimited_quota": true,
  "expired_time": -1,
  "key_encryption": {
    "alg": "X25519-HKDF-SHA256-AES-256-GCM",
    "client_public_key": "base64url-encoded-ephemeral-public-key"
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `client_id` | 是 | SSO 应用 Client ID |
| `name` | 是 | 创建的 API Key 名称 |
| `group` | 否 | API Key 绑定分组，必须是用户可用分组 |
| `models` | 否 | 允许使用的模型列表；为空表示不启用模型限制 |
| `unlimited_quota` | 否 | 是否不限额度，应受后端策略限制 |
| `expired_time` | 否 | API Key 过期时间，`-1` 表示不过期 |
| `key_encryption.alg` | 是 | API Key 返回加密算法 |
| `key_encryption.client_public_key` | 是 | Kudex 客户端为本次请求生成的临时公钥 |

### 12.4 成功响应

```json
{
  "success": true,
  "data": {
    "encrypted_api_key": {
      "alg": "X25519-HKDF-SHA256-AES-256-GCM",
      "server_public_key": "base64url-encoded-server-ephemeral-public-key",
      "nonce": "base64url-encoded-gcm-nonce",
      "ciphertext": "base64url-encoded-ciphertext",
      "aad": "sso-api-key:Kudex666:123"
    },
    "token": {
      "id": 123,
      "name": "Kudex Client",
      "group": "default",
      "model_limits_enabled": true,
      "model_limits": ["gpt-4o-mini", "gpt-4.1"],
      "expired_time": -1,
      "unlimited_quota": true
    },
    "user": {
      "id": 1,
      "username": "username",
      "group": "default"
    },
    "available_groups": ["default", "vip"],
    "available_models": ["gpt-4o-mini", "gpt-4.1"]
  }
}
```

响应中不得出现 `api_key`、`key`、`plain_key` 等明文字段。

### 12.5 加密细节

推荐算法：`X25519-HKDF-SHA256-AES-256-GCM`。

后端处理：

1. 校验用户授权和 SSO 应用状态。
2. 校验 `client_public_key` 格式。
3. 创建 API Key。
4. 生成服务端临时 X25519 密钥对。
5. 使用服务端私钥和客户端公钥计算 shared secret。
6. 使用 HKDF-SHA256 派生 AES-256-GCM key。
7. 使用 AES-256-GCM 加密 API Key 明文。
8. 返回 `server_public_key`、`nonce`、`ciphertext`、`aad`。

客户端处理：

1. 使用客户端私钥和 `server_public_key` 计算 shared secret。
2. 使用相同 HKDF 参数派生 AES-256-GCM key。
3. 使用 `nonce`、`ciphertext`、`aad` 解密。
4. 得到 API Key 后写入本地安全存储。

### 12.6 验收标准

- 创建 API Key 接口响应中不出现明文 API Key。
- Kudex 客户端可以使用本地私钥解密得到 API Key。
- 篡改 `ciphertext`、`nonce` 或 `aad` 后解密失败。
- 重复使用同一个请求不会返回新的明文 API Key。
- 后端日志不得记录 API Key 明文或解密材料。
- 未提供 `key_encryption.client_public_key` 时，接口拒绝创建。
