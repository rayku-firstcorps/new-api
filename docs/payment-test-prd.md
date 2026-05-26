# Payment Test PRD

## 1. Purpose

This document defines the acceptance and regression test plan for the payment module after the backend and frontend payment PRD implementation is delivered.

The primary goal is to verify that users can top up successfully across enabled providers, and that the system prevents the following high-risk failures:

- User paid but balance was not credited.
- The same order was credited more than once.
- A webhook from one provider completed an order created by another provider.
- Payment channels were exposed before payment compliance confirmation.
- Pending orders were expired before a paid status could be confirmed.
- Frontend polling continued after navigation or showed misleading payment states.

## 2. Scope

### 2.1 In Scope

Payment providers and flows:

| Area | Coverage |
| --- | --- |
| Epay | Traditional Alipay and WeChat Pay form flow, notify callback, configured pay methods |
| Stripe | Checkout creation, webhook verification, async success/failure, expired session |
| Creem | Product-based payment, webhook verification, one-time order completion |
| Waffo | SDK flow, webhook verification, sandbox/live configuration |
| Waffo Pancake | Checkout session flow, webhook verification, sandbox/live configuration |
| Airwallex | Payment link flow, webhook confirmation |
| Payssion | Multiple payment methods, amount and currency validation, webhook signature |
| Antom | CNY cashier payment, payment method type, webhook, inquiry polling, expiration compensation |
| Shared | Compliance, top-up info aggregation, amount calculation, order state, idempotency, Docker deployment |

### 2.2 Out of Scope

- Real card or wallet settlement reconciliation in provider dashboards.
- Provider-side KYC, contract approval, and payment method availability review.
- Full production monitoring design, except smoke checks listed in this document.

## 3. Test Environments

| Environment | Purpose | Required Services |
| --- | --- | --- |
| Local Docker Compose | Smoke and integration testing | new-api, PostgreSQL, Redis |
| Unit test environment | Go model/controller/middleware tests | SQLite or test DB |
| Frontend CI | Type check and build validation | Bun, TypeScript, Rsbuild |
| Provider sandbox | Manual E2E where provider credentials exist | Stripe, Antom, Payssion, Waffo, etc. |

Minimum local smoke baseline:

- `docker compose up -d`
- `GET http://localhost:3000/api/status` returns `success: true`
- PostgreSQL and Redis containers are running
- Admin user can log in
- `ServerAddress` is configured to a webhook-reachable address for provider callback tests

## 4. Test Data

| Data | Requirement |
| --- | --- |
| Admin user | Can update system settings and confirm payment compliance |
| Normal user A | Performs top-up actions |
| Normal user B | Used for ownership and unauthorized inquiry tests |
| User groups | At least default group and one group with custom top-up ratio |
| Amount discounts | At least one preset discount, for example `100 -> 0.9` |
| Antom config | Enabled, client id, merchant private key, Antom public key, currency `CNY`, unit price, min top-up |
| Payssion config | Enabled, API key, webhook secret, currency, payment methods JSON |
| Epay config | Pay address, merchant id, key, pay methods containing Alipay and WeChat Pay |

Recommended Antom payment methods for CNY:

```json
[
  {
    "name": "Alipay",
    "type": "ALIPAY_CN",
    "color": "#1677FF"
  }
]
```

Do not treat `WECHATPAY` as passing unless the Antom merchant account has that method enabled and the provider returns pay options.

## 5. Entry And Exit Criteria

### 5.1 Entry Criteria

- Backend implementation is merged or available in the test branch.
- Frontend build compiles.
- Docker image can be built.
- Required provider sandbox credentials are available for manual E2E tests.
- Payment compliance confirmation behavior is enabled, unless the test case explicitly uses `SKIP_PAYMENT_COMPLIANCE=true`.

### 5.2 Exit Criteria

- All P0 cases pass.
- All P1 automated cases pass, or each failure has an approved risk note.
- Docker deployment smoke passes.
- Any failed P2 cases are documented and do not block payment delivery.

## 6. Priority Definition

| Priority | Meaning |
| --- | --- |
| P0 | Blocks release. Covers funds safety, compliance, idempotency, provider security, and deployability |
| P1 | Must pass before broad rollout. Covers major channel behavior and frontend state correctness |
| P2 | Regression and user experience coverage |
| P3 | Long-term operational testing and observability |

## 7. Test Cases

### 7.1 Compliance And Channel Availability

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-COMP-001 | P0 | Payment compliance is not confirmed | Disable compliance confirmation and call `GET /api/user/topup/info` | Online payment methods requiring compliance are not exposed |
| PAY-COMP-002 | P0 | Compliance confirmation is valid | Confirm compliance from dashboard session | Confirmation stores `confirmed=true`, current terms version, timestamp, admin id, and IP |
| PAY-COMP-003 | P0 | Compliance terms version changes | Set stored terms version to an old value | Payment availability behaves as unconfirmed |
| PAY-COMP-004 | P0 | API token cannot confirm compliance | Attempt compliance confirmation through API token auth | Request is rejected |
| PAY-COMP-005 | P1 | Dev bypass works only when configured | Start with `SKIP_PAYMENT_COMPLIANCE=true` | Payment availability ignores compliance only in that process |

### 7.2 Top-Up Info Aggregation

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-INFO-001 | P0 | Enabled channels appear | Configure valid Epay, Stripe, Payssion, Antom, Waffo settings and call top-up info | Response contains only fully enabled channels |
| PAY-INFO-002 | P0 | Disabled or incomplete channels hidden | Remove required secret or payment method from each channel | Corresponding channel disappears |
| PAY-INFO-003 | P1 | Payssion methods are prefixed | Configure `gcash_ph` and `promptpay_th` | Frontend receives `payssion:gcash_ph` and `payssion:promptpay_th` |
| PAY-INFO-004 | P1 | Antom methods are prefixed | Configure `ALIPAY_CN` | Frontend receives `antom:ALIPAY_CN` |
| PAY-INFO-005 | P1 | Empty Antom methods use default cashier | Set `AntomPaymentMethods=[]` | Frontend receives generic `antom` method and backend sends no specific `paymentMethodType` |

### 7.3 Amount Calculation

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-AMT-001 | P0 | Minimum amount rejected | Call each amount endpoint below provider min top-up | Response is error and no order is created |
| PAY-AMT-002 | P0 | Group ratio applied | Set user group ratio and request amount calculation | Returned amount equals base amount times provider unit price times group ratio |
| PAY-AMT-003 | P0 | Discount applied | Configure amount discount and request exact preset amount | Returned amount includes discount |
| PAY-AMT-004 | P0 | Antom CNY minor unit conversion | Calculate Antom payment with currency `CNY` and money `10.25` | Antom request amount value is `1025` |
| PAY-AMT-005 | P1 | Zero-decimal currency conversion | Set Antom currency `JPY` and money `10.25` in unit test | Antom amount value is rounded to `10` |
| PAY-AMT-006 | P1 | Token display mode conversion | Enable token display mode and request amount | Min top-up and submitted amount are converted by `QuotaPerUnit` |
| PAY-AMT-007 | P1 | Invalid amounts | Submit `0`, negative value, too small payable amount, and very large amount | System rejects safely and does not create payable orders |

### 7.4 Order Creation

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-ORD-001 | P0 | Create pending order | Create payment for each enabled provider | `TopUp` is `pending` with correct user, amount, money, trade no, provider, method, and create time |
| PAY-ORD-002 | P0 | Trade number uniqueness | Attempt duplicate `TradeNo` insert in model test | Unique index prevents duplicate order |
| PAY-ORD-003 | P0 | Provider create failure | Mock provider creation error | Local order is failed or no payable order remains |
| PAY-ORD-004 | P0 | Empty payment URL | Mock provider response without payment URL | Order is marked failed and frontend receives error |
| PAY-ORD-005 | P1 | Pay endpoint rate limit | Repeatedly call pay creation endpoint beyond limit | Critical rate limit blocks excess requests |

### 7.5 Antom

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-ANTOM-001 | P0 | Antom pay request succeeds | Configure Antom CNY and call `/api/user/antom/pay` | Response contains `payment_url` and `order_id` |
| PAY-ANTOM-002 | P0 | Antom trade number entropy | Create multiple Antom orders | Format is `ANTOM-{timestamp}-{16 random}` and does not contain user id |
| PAY-ANTOM-003 | P0 | Invalid payment method unavailable | Configure unsupported method such as `WECHATPAY` without provider support | Provider returns no pay options, local order is failed, no balance added |
| PAY-ANTOM-004 | P0 | Webhook signature rejected | Send webhook with invalid signature | Response failure, order remains pending, quota unchanged |
| PAY-ANTOM-005 | P0 | Webhook success credits once | Send valid success webhook | Order becomes success, `CompleteTime` set, quota increases once, log is written |
| PAY-ANTOM-006 | P0 | Webhook replay idempotent | Send the same success webhook 10 times concurrently | Quota increases once only |
| PAY-ANTOM-007 | P0 | Inquiry owner check | User B queries User A order | Response is error or order not found |
| PAY-ANTOM-008 | P0 | Inquiry paid compensation | Mock Antom query `SUCCESS` for pending order | Order becomes success and quota is credited |
| PAY-ANTOM-009 | P0 | Inquiry failed status | Mock Antom query failed result | Pending order becomes failed |
| PAY-ANTOM-010 | P1 | Inquiry rate limit | Call `/api/user/antom/inquiry` more than 10 times per minute as same user | Rate limit blocks excess calls |
| PAY-ANTOM-011 | P1 | Frontend polling success | Complete Antom payment and return to wallet | UI shows waiting, then paid, then refreshes |
| PAY-ANTOM-012 | P1 | Frontend polling cleanup | Start Antom payment and navigate away before completion | Interval is cleared and inquiry calls stop |
| PAY-ANTOM-013 | P1 | Frontend polling timeout | Mock 15 pending responses at 6 second interval | UI shows timeout and stops polling |

### 7.6 Payssion

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-PAYSSION-001 | P0 | Missing config disables channel | Remove API key, webhook secret, or payment methods | Payssion is not available |
| PAY-PAYSSION-002 | P0 | Payment method whitelist | Submit method not configured in `PayssionPaymentMethods` | Request is rejected |
| PAY-PAYSSION-003 | P1 | Payment method normalization | Submit `payssion:gcash_ph` and `gcash_ph` | Both normalize to `gcash_ph` |
| PAY-PAYSSION-004 | P0 | Webhook signature validation | Send valid and invalid HMAC signatures | Only valid signature can process event |
| PAY-PAYSSION-005 | P0 | Amount mismatch rejected | Send successful webhook with amount different from local order | Order remains pending and quota unchanged |
| PAY-PAYSSION-006 | P0 | Currency mismatch rejected | Send successful webhook with currency different from configured currency | Order remains pending and quota unchanged |
| PAY-PAYSSION-007 | P0 | Provider mismatch rejected | Send Payssion webhook for non-Payssion order | Error is returned and order remains pending |
| PAY-PAYSSION-008 | P0 | Duplicate success idempotent | Send same successful webhook multiple times | Quota increases once |
| PAY-PAYSSION-009 | P1 | Failed event marks pending failed | Send failure/cancel/expired event for pending order | Order becomes failed, success orders are unchanged |

### 7.7 Epay

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-EPAY-001 | P0 | Pay methods empty | Clear Epay `PayMethods` | Epay is not available |
| PAY-EPAY-002 | P0 | Alipay and WeChat methods | Configure `alipay` and `wxpay` | Frontend displays both methods and submits selected type |
| PAY-EPAY-003 | P0 | Notify signature validation | Send valid and invalid notify callback | Only valid callback can complete order |
| PAY-EPAY-004 | P0 | Actual payment method update | Provider returns actual payment type different from order type | Order payment method is updated only after valid verification |
| PAY-EPAY-005 | P0 | Notify replay idempotent | Replay notify multiple times | Quota increases once |
| PAY-EPAY-006 | P1 | Manual completion | Admin manually completes pending Epay order | Balance increases once and order becomes success |

### 7.8 Stripe, Creem, Waffo, Waffo Pancake, Airwallex

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-OTH-001 | P0 | Stripe webhook signature | Send Stripe webhook with invalid signature | Request is rejected and no order changes |
| PAY-OTH-002 | P0 | Stripe async success/failure | Send async success and failure events | Success credits order, failure marks pending failed |
| PAY-OTH-003 | P1 | Stripe session expired | Send checkout expired event | Pending order becomes expired |
| PAY-OTH-004 | P0 | Creem paid one-time order | Send valid `checkout.completed` paid one-time event | Order becomes success and quota is credited |
| PAY-OTH-005 | P1 | Creem ignores unsupported event | Send unpaid, subscription, or unsupported event | No top-up is credited |
| PAY-OTH-006 | P0 | Waffo live/sandbox config | Toggle sandbox mode and remove corresponding key | Availability follows mode-specific required fields |
| PAY-OTH-007 | P0 | Waffo webhook idempotency | Replay valid Waffo webhook | Quota increases once |
| PAY-OTH-008 | P0 | Airwallex success callback | Send valid successful Airwallex webhook | Order becomes success and quota is credited |
| PAY-OTH-009 | P0 | Provider mismatch guard | Call each provider recharge function on an order from another provider | Function returns mismatch error and order remains pending |

### 7.9 Webhook Security And Idempotency

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-WH-001 | P0 | Webhook disabled | Disable each provider and call its webhook | Returns forbidden or provider failure response, no order changes |
| PAY-WH-002 | P0 | Missing order number | Send webhook without trade no/reference | No order is credited |
| PAY-WH-003 | P0 | Unknown order | Send valid webhook for unknown order | Returns provider-compatible OK or controlled error, no quota changes |
| PAY-WH-004 | P0 | Concurrent callbacks | Send 10 valid callbacks for one order concurrently | `LockOrder` prevents double credit |
| PAY-WH-005 | P1 | Sensitive logging | Trigger signature failure and provider failure | Logs contain provider, trade no, client ip, reason, and do not expose secret values |

### 7.10 Order State Machine

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-STATE-001 | P0 | Pending to success | Complete pending order through valid provider confirmation | Status becomes success and complete time is set |
| PAY-STATE-002 | P0 | Pending to failed | Provider returns failed state | Status becomes failed and complete time is not set |
| PAY-STATE-003 | P0 | Pending to expired | Run expiration for old pending order | Status becomes expired and complete time is not set |
| PAY-STATE-004 | P0 | Success cannot be failed or expired | Attempt to update success order to failed/expired | Status remains success |
| PAY-STATE-005 | P0 | Failed or expired cannot auto-credit | Send normal success webhook after failed/expired | Recharge rejects unless an explicit manual compensation flow is used |
| PAY-STATE-006 | P1 | History display | Open user and admin top-up history | Status, method, amount, trade no, and time are correct |

### 7.11 Expiration Compensation

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-EXP-001 | P0 | Only old pending expires | Run `ExpirePendingTopUps(5)` with recent and old pending orders | Only old pending orders are candidates |
| PAY-EXP-002 | P0 | Antom paid before expiration | Mock Antom remote paid during expiration verification | Order is credited and not expired |
| PAY-EXP-003 | P0 | Antom unknown is skipped | Mock Antom query unknown or query error | Antom order remains pending and is not expired |
| PAY-EXP-004 | P1 | Antom failed before expiration | Mock Antom remote failed | Pending order becomes failed |
| PAY-EXP-005 | P1 | Non-Antom old pending expires | Create old pending Stripe/Payssion order without remote verification | Order becomes expired |
| PAY-EXP-006 | P1 | Expiration task cadence | Set sync frequency and observe expiration delay | Effective expiration equals five minutes plus task scheduling delay |

### 7.12 Frontend Wallet

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-FE-001 | P1 | Wallet loads payment methods | Open wallet page with multiple providers enabled | Methods, amount options, discounts, and min top-up hints render correctly |
| PAY-FE-002 | P1 | Amount endpoint selection | Select each provider and change amount | Frontend calls the matching provider amount endpoint |
| PAY-FE-003 | P1 | Payment request selection | Confirm payment for each provider | Stripe opens `pay_link`, Antom/Payssion/Airwallex open `payment_url`, Epay submits form |
| PAY-FE-004 | P1 | Antom confirmation alert | Start Antom payment | Waiting alert displays order id and dismiss action |
| PAY-FE-005 | P1 | Antom paid UI | Mock inquiry paid | Shows success toast and refreshes |
| PAY-FE-006 | P1 | Antom failed UI | Mock inquiry failed | Shows failed state and stops polling |
| PAY-FE-007 | P1 | Antom timeout UI | Inquiry remains pending for max attempts | Shows timeout message and stops polling |
| PAY-FE-008 | P2 | Network error handling | Simulate amount/pay API failure | User sees toast and no invalid redirect occurs |
| PAY-FE-009 | P2 | Recharge history refresh | Complete order and open history | New status is visible |

### 7.13 Admin Payment Settings

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-ADMIN-001 | P1 | General payment settings save | Update amount options, discounts, and min top-up | Values persist and affect wallet page |
| PAY-ADMIN-002 | P1 | Antom settings save | Save enabled, client id, keys, `CNY`, unit price, min top-up, payment methods | Values persist and reload correctly |
| PAY-ADMIN-003 | P1 | Antom methods JSON validation | Save invalid JSON | Save is blocked or backend stores safe previous value |
| PAY-ADMIN-004 | P1 | Payssion settings save | Save enabled, API key, secret, currency, method JSON | Values persist and top-up info reflects methods |
| PAY-ADMIN-005 | P1 | Epay visual editor | Add Alipay and WeChat Pay methods | Stored JSON has `alipay` and `wxpay` types |
| PAY-ADMIN-006 | P2 | Save failure handling | Simulate option save failure | UI shows failure and does not display false success |

### 7.14 Docker Deployment

| ID | Priority | Scenario | Steps | Expected Result |
| --- | --- | --- | --- | --- |
| PAY-DOCKER-001 | P0 | Build image | Run `docker compose build` | Image builds successfully |
| PAY-DOCKER-002 | P0 | Start stack | Run `docker compose up -d` | `new-api`, PostgreSQL, and Redis start |
| PAY-DOCKER-003 | P0 | Health check | Run `docker compose ps` and call `/api/status` | App is healthy and status returns success |
| PAY-DOCKER-004 | P0 | Database persistence | Update payment settings, restart container | Settings remain unchanged |
| PAY-DOCKER-005 | P0 | Callback address | Configure `ServerAddress` and create payment | Provider callback and return URLs use the configured public address |
| PAY-DOCKER-006 | P1 | Redis lock fallback awareness | Run with Redis enabled and then unavailable in controlled test | Distributed lock is used when Redis works; local lock path remains functional |
| PAY-DOCKER-007 | P1 | Cross-database compatibility | Run targeted payment tests on SQLite, MySQL, PostgreSQL | GORM queries and migrations pass on all supported databases |

## 8. Automation Plan

### 8.1 Required Automated Tests

Backend:

- `go test ./controller ./model ./middleware ./router`
- Add or maintain focused tests for:
  - Antom amount conversion and CNY default.
  - Antom payment method parsing and unsupported method failure behavior.
  - Antom inquiry owner check and rate limit.
  - Antom expiration compensation paid, failed, unknown, and error paths.
  - Payment compliance version and env bypass.
  - Provider mismatch guards for every recharge path.
  - Webhook enabled checks for all providers.

Frontend:

- `bun run typecheck`
- `bun run build`
- `bun run i18n:sync`
- Add tests where frontend test infrastructure is available:
  - `usePayment` Antom polling cleanup.
  - paid, failed, timeout confirmation states.
  - provider-specific amount and pay API selection.

Deployment:

- `docker compose build`
- `docker compose up -d`
- `docker compose ps`
- `curl http://localhost:3000/api/status`

### 8.2 Manual Or Sandbox Tests

Provider sandbox tests are required for:

- Real Antom payment URL generation with `CNY`.
- Real Antom `ALIPAY_CN` payment option availability.
- Any Antom `WECHATPAY` test, because support depends on merchant-side enablement.
- Stripe webhook delivery from Stripe CLI or dashboard.
- Payssion webhook with provider-generated signature.
- Waffo and Airwallex provider callback formats.

## 9. Known Risk Register

| Risk | Impact | Required Test Evidence |
| --- | --- | --- |
| Antom WeChat Pay unavailable | User cannot use WeChat Pay through Antom | Provider returns pay options in sandbox or production; otherwise remove from methods |
| Webhook not publicly reachable | Paid orders may stay pending or expire | Docker callback URL smoke and provider webhook delivery log |
| Provider amount mismatch | Financial reconciliation error | Amount and currency validation tests |
| Duplicate callbacks | Double credit | Concurrent replay idempotency test |
| Expiration too aggressive | Paid order becomes expired | Antom expiration compensation tests |
| Compliance bypass in production | Legal or operational risk | Compliance enabled/disabled regression tests |

## 10. Release Gate

Payment delivery can be accepted only when:

1. All P0 tests pass.
2. All automated checks in section 8.1 pass.
3. Docker deployment smoke passes.
4. At least one successful sandbox payment is verified for the primary production provider.
5. Any unavailable payment method, such as Antom `WECHATPAY`, is removed from production `PaymentMethods` or documented as disabled.

