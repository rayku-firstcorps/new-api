# SSO 客户端对接 PRD

## 1. 背景

外部客户端需要让用户一键授权 new-api，并自动创建可用于模型调用的 API Key。客户端不能要求用户手动复制 API Key，也不能让 new-api 后端以明文 JSON 返回 API Key。

本 PRD 面向 Kudex 等客户端开发者，说明客户端如何接入 new-api SSO、如何换取授权凭证、如何创建加密 API Key、如何本地解密并保存，以及如何读取分组、模型等接入信息。

## 2. 目标

- 用户在客户端点击一次授权按钮即可完成 new-api 账号授权。
- 客户端拿到授权码后，换取用户授权凭证。
- 客户端生成一次性加密公私钥对。
- 客户端请求 new-api 创建 API Key。
- new-api 只返回加密后的 API Key。
- 客户端本地解密 API Key，并保存到本地安全存储。
- 客户端读取可用分组、模型列表，用于后续模型选择和请求配置。

## 3. 非目标

- 不要求客户端实现完整 OAuth 2.0 SDK。
- 不要求客户端保存用户级 `access_token` 作为长期调用凭证。
- 不允许客户端把 `Client Secret` 放在纯前端浏览器代码里。
- 不允许 API Key 以明文出现在 new-api 响应 JSON、服务端日志或 URL 参数中。

## 4. 参与方

| 参与方 | 说明 |
| --- | --- |
| 用户 | new-api 用户，决定是否授权客户端 |
| 客户端 | Kudex 或其他外部应用 |
| 客户端后端 | 保存 `Client Secret`，完成换 token 等服务端操作 |
| new-api | 授权服务端，负责生成授权码、创建 API Key、加密返回 |

## 5. 管理员前置配置

new-api 后台创建 SSO 应用：

```text
应用名称: Kudex Client
Client ID: Kudex666
Client Secret: 66666666
重定向 URI: http://localhost:3000
允许的作用域: profile access_token
```

生产环境建议：

- `Client Secret` 使用高强度随机字符串。
- `redirect_uri` 使用 HTTPS。
- `redirect_uri` 必须逐字符匹配客户端实际回调地址。

## 6. 客户端整体流程

```text
1. 用户点击“连接 new-api”
2. 客户端打开 new-api 授权 URL
3. 用户登录并确认授权
4. new-api 跳回客户端 redirect_uri，携带 code
5. 客户端后端用 code + client_secret 换取 USER_ACCESS_TOKEN
6. 客户端生成一次性 RSA-OAEP 密钥对
7. 客户端请求 /api/sso/api-key 创建 API Key，并提交公钥
8. new-api 创建 API Key，使用公钥加密 API Key 后返回
9. 客户端本地私钥解密得到 API Key
10. 客户端保存 API Key、分组、模型列表
11. 客户端使用 API Key 调用模型接口
```

## 7. 第一步：打开授权 URL

客户端打开：

```text
https://你的-new-api-域名/sso/authorize?client_id=Kudex666&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=profile%20access_token&state=random-state
```

参数说明：

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `client_id` | 是 | 后台配置的 Client ID |
| `redirect_uri` | 是 | 客户端回调地址，必须和后台配置完全一致 |
| `scope` | 否 | 默认 `profile access_token` |
| `state` | 建议 | 客户端生成的随机值，用于防 CSRF |

客户端要求：

- 每次授权生成新的 `state`。
- 本地保存 `state`，回调时校验。
- 授权 URL 不要携带 `Client Secret`。

## 8. 第二步：处理授权回调

用户同意授权后，new-api 跳转：

```text
http://localhost:3000?code=AUTH_CODE&state=random-state
```

用户拒绝授权后，new-api 跳转：

```text
http://localhost:3000?error=access_denied&state=random-state
```

客户端处理要求：

- 校验回调 `state` 是否与发起授权时一致。
- 如果存在 `error`，终止流程并提示用户。
- 如果存在 `code`，进入换 token 流程。

授权码规则：

- 5 分钟有效。
- 只能使用一次。
- 必须绑定同一个 `client_id` 和 `redirect_uri`。

## 9. 第三步：用 code 换 USER_ACCESS_TOKEN

此步骤建议由客户端后端执行，因为需要 `Client Secret`。

请求：

```http
POST https://你的-new-api-域名/api/sso/token
Content-Type: application/json

{
  "client_id": "Kudex666",
  "client_secret": "66666666",
  "code": "AUTH_CODE",
  "redirect_uri": "http://localhost:3000"
}
```

成功响应：

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

客户端后端返回给客户端前端：

```json
{
  "access_token": "USER_ACCESS_TOKEN",
  "user_id": 1,
  "username": "username"
}
```

注意：

- `USER_ACCESS_TOKEN` 仅用于后续创建加密 API Key。
- 不建议把 `USER_ACCESS_TOKEN` 作为客户端长期模型调用凭证。
- 完成 API Key 创建后，客户端可以丢弃该 token，或仅短期缓存。

## 10. 第四步：客户端生成加密密钥对

浏览器或 Electron 客户端推荐使用 WebCrypto `RSA-OAEP-SHA256`。

TypeScript 示例：

```ts
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256',
  },
  true,
  ['encrypt', 'decrypt']
)

const publicKeySpki = await crypto.subtle.exportKey('spki', keyPair.publicKey)
const clientPublicKey = base64UrlEncode(publicKeySpki)
```

`clientPublicKey` 发给 new-api；`privateKey` 只保存在客户端内存中，用完即丢弃。

## 11. 第五步：创建加密 API Key

请求：

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
    "alg": "RSA-OAEP-SHA256",
    "client_public_key": "base64url-encoded-spki-public-key"
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `client_id` | 是 | SSO 应用 Client ID |
| `name` | 是 | 创建的 API Key 名称 |
| `group` | 否 | API Key 绑定分组 |
| `models` | 否 | 限制可用模型；为空表示不限制 |
| `unlimited_quota` | 否 | 是否不限额度，受 new-api 后端策略限制 |
| `remain_quota` | 否 | 有限额度时使用 |
| `expired_time` | 否 | `-1` 表示不过期 |
| `key_encryption.alg` | 是 | 当前推荐 `RSA-OAEP-SHA256` |
| `key_encryption.client_public_key` | 是 | 客户端一次性公钥 |

## 12. 第六步：读取返回数据

成功响应：

```json
{
  "success": true,
  "data": {
    "encrypted_api_key": {
      "alg": "RSA-OAEP-SHA256",
      "ciphertext": "base64url-encoded-ciphertext",
      "aad": "sso-api-key:Kudex666:1:123"
    },
    "token": {
      "id": 123,
      "name": "Kudex Client",
      "group": "default",
      "model_limits_enabled": true,
      "model_limits": ["gpt-4o-mini", "gpt-4.1"],
      "expired_time": -1,
      "unlimited_quota": true,
      "remain_quota": 0
    },
    "user": {
      "id": 1,
      "username": "username",
      "group": "default"
    },
    "available_groups": {
      "default": {
        "desc": "默认分组",
        "ratio": 1
      }
    },
    "available_models": ["gpt-4o-mini", "gpt-4.1"]
  }
}
```

客户端需要读取：

- `encrypted_api_key.ciphertext`：加密后的 API Key。
- `encrypted_api_key.aad`：解密时必须传入的附加认证数据。
- `token.group`：API Key 当前绑定分组。
- `token.model_limits`：API Key 限制模型。
- `available_groups`：用户可选分组。
- `available_models`：用户可选模型。

响应中不得出现明文 API Key。

## 13. 第七步：客户端解密 API Key

TypeScript 示例：

```ts
const plaintext = await crypto.subtle.decrypt(
  {
    name: 'RSA-OAEP',
    label: new TextEncoder().encode(encryptedApiKey.aad),
  },
  keyPair.privateKey,
  base64UrlDecode(encryptedApiKey.ciphertext)
)

const apiKey = new TextDecoder().decode(plaintext)
```

解密结果示例：

```text
sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

解密失败时，客户端必须丢弃本次结果，并提示用户重新授权或重试创建。

## 14. 第八步：保存客户端配置

客户端应保存：

```json
{
  "newApiBaseUrl": "https://你的-new-api-域名",
  "apiKey": "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "user": {
    "id": 1,
    "username": "username",
    "group": "default"
  },
  "token": {
    "id": 123,
    "name": "Kudex Client",
    "group": "default",
    "modelLimitsEnabled": true,
    "modelLimits": ["gpt-4o-mini", "gpt-4.1"],
    "expiredTime": -1
  },
  "availableGroups": {
    "default": {
      "desc": "默认分组",
      "ratio": 1
    }
  },
  "availableModels": ["gpt-4o-mini", "gpt-4.1"]
}
```

安全存储建议：

- 浏览器：优先使用用户确认后的本地加密存储方案；避免写入普通日志。
- Electron：使用系统 Keychain / Credential Manager / Secret Service。
- 桌面原生客户端：使用系统凭据管理器。
- 服务端客户端：使用服务端 Secret Manager。

## 15. 第九步：调用模型接口

OpenAI 兼容请求：

```http
POST https://你的-new-api-域名/v1/chat/completions
Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json

{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "user",
      "content": "Hello"
    }
  ]
}
```

Gemini 兼容请求可以使用：

```http
x-goog-api-key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Claude 兼容请求可以使用：

```http
x-api-key: sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 16. 客户端封装建议

建议客户端封装一个方法：

```ts
type ConnectNewApiResult = {
  apiKey: string
  user: {
    id: number
    username: string
    group: string
  }
  token: {
    id: number
    group: string
    modelLimitsEnabled: boolean
    modelLimits: string[]
  }
  availableGroups: Record<string, { desc: string; ratio: number | string }>
  availableModels: string[]
}

async function connectNewApi(): Promise<ConnectNewApiResult> {
  // 1. open authorization URL
  // 2. handle callback code
  // 3. exchange code for USER_ACCESS_TOKEN
  // 4. generate RSA-OAEP key pair
  // 5. create encrypted API Key
  // 6. decrypt API Key locally
  // 7. save and return config
}
```

new-api 前端已有可参考封装：

```ts
createAndDecryptSSOApiKey({
  accessToken,
  userId,
  client_id: 'Kudex666',
  name: 'Kudex Client',
  group: 'default',
  models: ['gpt-4o-mini'],
  unlimited_quota: true,
  expired_time: -1,
})
```

## 17. 异常处理

| 场景 | 客户端处理 |
| --- | --- |
| 用户拒绝授权 | 提示用户已取消授权 |
| `state` 不一致 | 终止流程，提示安全校验失败 |
| `code` 过期 | 重新发起授权 |
| 换 token 失败 | 提示授权失败，允许重试 |
| 创建 API Key 失败 | 提示创建失败，允许重试 |
| 分组不可用 | 使用默认分组或引导用户重新选择 |
| 模型不可用 | 从 `available_models` 中重新选择 |
| 解密失败 | 丢弃响应，重新创建 API Key |
| API Key 调用失败 | 检查 key 是否过期、额度是否耗尽、模型是否受限 |

## 18. 验收标准

- 客户端可以打开授权页并收到 `code` 回调。
- 客户端能用 `code` 换取 `USER_ACCESS_TOKEN`。
- 客户端能生成 RSA-OAEP 一次性密钥对。
- 客户端能调用 `/api/sso/api-key` 创建 API Key。
- new-api 响应中不出现明文 API Key。
- 客户端能使用私钥解密 `encrypted_api_key.ciphertext`。
- 解密得到的 API Key 可以成功调用 `/v1/chat/completions`。
- 客户端可以读取并展示 `available_groups`。
- 客户端可以读取并展示 `available_models`。
- 篡改 `ciphertext` 或 `aad` 后解密失败。
- 客户端日志不记录明文 API Key。

## 19. 最小联调清单

1. 在 new-api 后台创建 SSO 应用。
2. 客户端配置 `client_id`、授权地址、回调地址。
3. 点击连接 new-api。
4. 用户登录并授权。
5. 客户端收到 `code`。
6. 客户端后端换取 `USER_ACCESS_TOKEN`。
7. 客户端生成 RSA-OAEP 公私钥。
8. 客户端请求创建加密 API Key。
9. 客户端解密 API Key。
10. 客户端保存 API Key、分组、模型。
11. 客户端使用 API Key 发起一次模型请求。
