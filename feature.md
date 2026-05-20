# External Balance API

## 功能说明

这组接口用于外部系统查询用户余额、扣减用户余额，以及按 `request_id` 反查扣减交易。

鉴权使用独立的服务级 API Key，不使用用户登录态。

请求头支持：

```text
Authorization: Bearer <ExternalBalanceApiKey>
```

兼容：

```text
X-External-Api-Key: <ExternalBalanceApiKey>
```

## 接口列表

### 1. 查询用户余额

`GET /api/external/balance/user`

查询参数任选其一：

- `user_id`
- `username`
- `email`

示例：

```bash
curl -H "Authorization: Bearer ebk_xxx" \
  "http://127.0.0.1:3000/api/external/balance/user?username=chenli"
```

返回字段：

- `quota`
- `used_quota`
- `quota_per_unit`
- `balance_units`

### 2. 扣减用户余额

`POST /api/external/balance/deduct`

请求体示例：

```json
{
  "request_id": "order_20260519_0001",
  "user_id": 1,
  "quota": 1,
  "reason": "external_order",
  "description": "外部订单扣费",
  "metadata": {
    "order_id": "202605190001"
  }
}
```

功能注释：

- `request_id` 是幂等键，同一个值不会重复扣减。
- `user_id`、`username`、`email` 三者至少传一个。
- `quota` 必须大于 0。
- 扣减前会检查余额是否足够。
- 成功后会记录交易明细，便于审计和追踪。

### 3. 按交易 ID 查询扣减记录

`GET /api/external/balance/transaction/{request_id}`

示例：

```bash
curl -H "Authorization: Bearer ebk_xxx" \
  "http://127.0.0.1:3000/api/external/balance/transaction/order_20260519_0001"
```

功能注释：

- 这里查的是 `request_id`，不是支付系统的 `order_id`。
- 返回扣减快照、用户信息和当前余额。
- 如果用户后续又充值或继续消费，交易快照和当前余额可能不同。

## 业务约束

- `ExternalBalanceApiEnabled` 必须开启。
- `ExternalBalanceApiAllowQuery` 控制是否允许查询余额和交易。
- `ExternalBalanceApiAllowDeduct` 控制是否允许扣减。
- `ExternalBalanceApiAllowedIPs` 开启后会限制来源 IP。
- `ExternalBalanceApiMaxDeductQuota` 可限制单次最大扣减额度，`0` 表示不限制。

