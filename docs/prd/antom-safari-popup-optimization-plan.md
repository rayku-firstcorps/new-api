# Antom Safari 支付弹窗优化实施计划

## 1. 背景与目标

Safari 会将不在用户点击同步调用栈内执行的 `window.open()` 视为脚本弹窗并拦截。当前 Antom 支付流程在用户点击“确认支付”后，先异步请求 `/api/user/antom/pay`，收到 `payment_url` 后才调用 `window.open(paymentUrl, '_blank')`。此时浏览器的瞬时用户激活已经失效，因此 Safari（尤其是 iOS Safari）可能阻止支付页打开。

本计划的目标是：

- Antom 支付页在 Safari、iOS Safari、Chrome 和 Edge 中都能可靠打开。
- 保持“确认支付”按钮作为唯一触发点，不提前创建 Antom 订单。
- 请求失败、响应缺少支付地址或弹窗被拦截时，用户仍能明确恢复或继续支付。
- 不改变 Antom 后端下单、Webhook、Inquiry 轮询和入账逻辑。
- 不改变其他支付渠道的既有跳转行为，避免扩大回归范围。

## 2. 当前调用链与根因

当前调用链：

```text
PaymentConfirmDialog 确认按钮
  -> wallet/index.tsx: handlePaymentConfirm()
  -> use-payment.ts: processPayment()
  -> await requestAntomPayment()
  -> window.open(paymentUrl, '_blank')
```

问题发生在 `await requestAntomPayment()` 之后。Safari 不再认为随后的 `window.open()` 由用户手势直接触发，即使整个流程最初来自按钮点击，也可能返回 `null` 并拦截新窗口。

现有代码还存在两个体验缺口：

- 没有检查 `window.open()` 的返回值，弹窗被拦截后仍提示“正在跳转到支付页面”。
- 创建订单失败或响应缺少 `payment_url` 时，没有需要清理的窗口状态；改造为预开窗口后必须补齐清理逻辑。

## 3. 推荐方案

### 3.1 核心策略

仅对 Antom 使用“同步预开窗口 + 异步导航”：

1. `processPayment()` 判断当前支付方式为 Antom 后，在任何 `await` 之前同步执行 `window.open('', '_blank')`。
2. 如果成功获得窗口句柄，立即设置 `popup.opener = null`，阻断支付页通过 `window.opener` 访问原页面。
3. 调用 `/api/user/antom/pay` 创建订单。
4. 收到有效 `payment_url` 后，使用 `popup.location.replace(paymentUrl)` 导航预开的窗口。
5. 接口失败、业务响应失败或缺少支付链接时关闭预开的空白窗口。
6. 如果同步预开仍返回 `null`，说明浏览器或用户策略明确禁止弹窗；拿到链接后降级到当前页 `window.location.assign(paymentUrl)`。
7. 只有实际开始导航后才显示“正在跳转到支付页面”，避免误报成功。

不建议在 `window.open()` 的 features 参数中直接传 `noopener,noreferrer` 并依赖其返回句柄。部分浏览器在启用 `noopener` 时可能返回 `null`，即使窗口已经打开，这会让“弹窗被拦截”和“窗口已打开但不可控”无法区分。推荐先取得句柄，再将 `opener` 置空。

### 3.2 目标伪代码

```typescript
const isAntom = isAntomPayment(paymentType)
const paymentWindow = isAntom ? window.open('', '_blank') : null

if (paymentWindow) {
  paymentWindow.opener = null
}

try {
  const response = await requestAntomPayment(payload)

  if (!isApiSuccess(response)) {
    paymentWindow?.close()
    toast.error(response.message || i18next.t('Payment request failed'))
    return false
  }

  const paymentUrl = getStringField(response.data, 'payment_url')
  if (!paymentUrl) {
    paymentWindow?.close()
    toast.error(i18next.t('Payment link is unavailable'))
    return false
  }

  if (paymentWindow) {
    paymentWindow.location.replace(paymentUrl)
  } else {
    window.location.assign(paymentUrl)
  }

  startAntomPaymentConfirmation(orderId)
  toast.success(i18next.t('Redirecting to payment page...'))
  return true
} catch (error) {
  paymentWindow?.close()
  // 保留项目现有的统一错误处理行为。
  return false
}
```

伪代码只表达控制流。实施时应复用现有响应解析、Toast 和 API 错误处理约定，不新增仅有一个调用者的机械式 helper。

## 4. 实施步骤

### 步骤一：在用户手势内预开窗口

修改 `web/default/src/features/wallet/hooks/use-payment.ts`：

- 在 `processPayment()` 完成 `isAntom` 判定后、首个支付 API `await` 之前预开窗口。
- 仅 Antom 预开，Stripe、Airwallex、Payssion 和表单提交渠道保持现状。
- 不把预开动作移到支付方式选择阶段；真正的用户确认发生在确认弹窗按钮，过早打开会造成取消支付时出现无意义空白页。

### 步骤二：集中处理窗口生命周期

在 `processPayment()` 当前作用域保存窗口句柄：

- 成功：用返回的支付链接替换空白页。
- API 抛错：关闭窗口。
- `isApiSuccess(response) === false`：关闭窗口。
- Antom 响应无 `payment_url`：关闭窗口并显示错误。
- 非 Antom 分支：不创建也不清理该窗口。

避免新增模块级单次调用 helper；窗口生命周期与支付请求属于同一控制流，留在 `processPayment()` 内更清晰。

### 步骤三：增加弹窗拦截降级

当 `window.open()` 返回 `null` 时：

- 不立即报错，因为仍需创建订单并取得支付链接。
- 取得链接后使用当前页导航，保证支付流程可以继续。
- 当前页跳转前先启动现有 Antom 订单确认状态。返回充值页后，现有回跳参数和订单查询机制继续工作。

这里选择同页跳转作为默认降级，不要求用户进入 Safari 设置关闭弹窗拦截。浏览器设置提示只能作为支持文档，不应成为支付成功的前置条件。

### 步骤四：补齐文案与 i18n

如新增“支付链接不可用”或“无法打开新窗口，正在当前页面继续”等用户文案：

- React 组件使用 `useTranslation()`；Hook 中沿用现有 `i18next.t()`。
- 按 `i18n-translate` skill 的流程同步 `en`、`zh`、`fr`、`ja`、`ru`、`vi`。
- 从 `web/default/` 运行 `bun run i18n:sync`。

若复用现有文案即可完整表达状态，则不新增翻译键。

### 步骤五：验证轮询与页面返回

确认窗口改造不改变以下行为：

- 后端仍返回 `order_id` 和 `payment_url`。
- 获取 `order_id` 后仍调用 `startAntomPaymentConfirmation(orderId)`。
- 轮询仍由 Hook 卸载清理，成功、失败和超时状态保持现有语义。
- 支付成功后的 Webhook 与 Inquiry 幂等入账逻辑不变。

## 5. 自动化测试计划

优先为 `usePayment()` 增加面向行为的 Vitest 测试；若当前模块测试基础设施不适合直接渲染 Hook，可将测试放在钱包 feature 的既有测试组织中，但不要为了测试抽取生产 helper。

需要覆盖：

| 场景 | 模拟条件 | 预期行为 |
|------|----------|----------|
| Antom 正常支付 | `window.open` 返回窗口，API 返回 URL 和订单号 | `window.open` 在 API Promise resolve 前调用；窗口导航到 URL；开始轮询；返回 `true` |
| Antom 弹窗被拦截 | `window.open` 返回 `null` | API 成功后调用当前页导航；不显示虚假的拦截失败；返回 `true` |
| Antom API 业务失败 | API 返回 `success: false` | 关闭预开窗口；显示失败提示；返回 `false` |
| Antom API 网络失败 | API reject | 关闭预开窗口；保持统一错误处理；返回 `false` |
| Antom 缺少支付链接 | API 成功但无 `payment_url` | 关闭预开窗口；显示明确错误；不启动轮询；返回 `false` |
| Antom 缺少订单号 | API 有 URL 但无 `order_id` | 支付页仍打开；不启动轮询；行为需与当前 API 契约核对并记录异常 |
| 非 Antom 支付 | Stripe/Airwallex/Payssion 等 | 不预开空白窗口；保持原有跳转和提交行为 |
| 重复点击 | `processing` 为 `true` | 确认按钮禁用，只产生一个订单和一个窗口 |

测试应断言用户可观察行为和跨模块契约，不断言无关的内部变量或具体代码布局。

## 6. 手工浏览器测试矩阵

| 平台 | 浏览器 | 弹窗设置 | 验证重点 |
|------|--------|----------|----------|
| macOS | Safari 当前稳定版 | 默认拦截策略 | 点击确认后立即创建窗口，随后进入 Antom 收银台 |
| iPhone/iPad | iOS/iPadOS Safari 当前稳定版 | 默认拦截策略 | 无静默失败；新窗口或同页降级可完成支付 |
| macOS | Safari | 明确禁止弹窗 | `window.open` 返回空时能够同页继续 |
| Windows/macOS | Chrome 当前稳定版 | 默认设置 | 原有新标签支付体验无回归 |
| Windows | Edge 当前稳定版 | 默认设置 | 原有新标签支付体验无回归 |
| iPhone/Android | 应用内 WebView（可用时） | 宿主默认策略 | 新窗口能力缺失时同页降级可用 |

每个平台至少验证以下结果：成功创建订单、支付页可达、取消支付、API 失败、支付成功返回、订单状态轮询、余额刷新，以及浏览器控制台无未处理异常。

## 7. 验收标准

- Safari 默认设置下，点击 Antom“确认支付”不会因异步 `window.open()` 被静默拦截。
- `window.open()` 在 Antom 下单请求发出前同步执行。
- 弹窗被禁止时自动使用当前页打开支付链接，用户无需修改浏览器设置。
- API 失败或链接缺失时预开窗口被关闭，不遗留空白页。
- 只有成功导航时才显示跳转成功提示。
- `window.opener` 被清空，支付页不能访问原页面上下文。
- Antom 的订单轮询、Webhook、Inquiry 和入账行为无回归。
- 其他支付渠道不预开窗口且行为无回归。
- `bun run typecheck`、涉及文件 lint、相关 Vitest、`bun run i18n:sync`（若涉及文案）及 `bun run build:check` 全部通过。
- macOS Safari 与至少一台 iOS/iPadOS Safari 真机验证通过；自动化浏览器不能完全替代 Safari 的用户激活策略验证。

## 8. 风险与回滚

### 风险

- 支付 API 响应较慢时，用户会短暂看到空白标签页。可以接受，因为这是规避 Safari 拦截所需的浏览器交互代价；原页面必须持续显示处理中状态。
- 某些内嵌 WebView 完全禁止新窗口。当前页降级负责覆盖此场景。
- 当前页跳转会暂停前端轮询。支付完成返回充值页后应以订单历史和后端状态为准；Webhook 仍是主确认路径。
- 如果 Antom 返回的 URL 非法或非预期协议，浏览器导航可能失败。后端应继续负责支付链接来源可信性，前端不拼接第三方 URL。

### 回滚

改动应限制在前端 Antom 分支。若上线后出现兼容问题，可回滚预开窗口和同页降级逻辑，恢复收到 `payment_url` 后直接 `window.open()`；后端订单、Webhook 和结算数据不需要迁移或回滚。

## 9. 范围边界

本计划只处理 Safari 对 Antom 支付弹窗的拦截问题，不包含：

- 重构所有支付渠道的统一跳转抽象。
- 修改 Antom 后端下单、签名、Webhook 或金额计算。
- 修改订单过期、主动查询补偿或对账机制。
- 新增支付漏斗埋点。
- 修改推广链接、分佣或奖励逻辑。

## 10. 实施记录

实施日期：2026-07-22

已完成：

- 在 `usePayment().processPayment()` 的 Antom 分支首个 `await` 之前同步预开支付窗口。
- 预开成功后立即将 `window.opener` 置空。
- Antom 下单业务失败、网络异常或响应缺少 `payment_url` 时关闭预开窗口。
- 预开窗口不可用或已关闭时，使用当前页面导航到 Antom 支付链接。
- 其他支付渠道的跳转分支保持不变。
- 清理目标文件已有的 lint error：移除未使用的 `catch` 绑定，并使用 `Number.parseFloat()`。

验证结果：

- `bun run typecheck` 通过。
- `bunx oxlint -c .oxlintrc.json src/features/wallet/hooks/use-payment.ts` 通过。
- `bunx oxfmt --check src/features/wallet/hooks/use-payment.ts` 通过。
- `bun run build:check` 通过。
- `.harness/verify.sh antom-safari-popup-fix` 通过。

本次未新增 Hook 自动化测试。当前前端测试使用 Node 内置 runner，项目未配置 DOM/Hook 测试环境；为本次单点修复引入新测试依赖或抽取只供单一调用者使用的生产 helper，成本和维护负担高于收益。Safari 的瞬时用户激活策略也不能由 Node DOM 模拟可靠覆盖。

仍需在部署环境完成 macOS Safari 和 iOS/iPadOS Safari 真机验收，重点确认默认弹窗策略、明确禁止弹窗时的同页降级、支付返回和订单到账。该项属于发布验收，不影响代码与构建验证结果。
