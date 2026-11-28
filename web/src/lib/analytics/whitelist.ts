/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

/**
 * Event whitelist for the behavior analytics SDK.
 *
 * MIRROR of the server table in service/analytics_whitelist.go. Both files
 * must contain exactly the same event types, names, props and enums; change
 * them together.
 */

export const CLIENT_TYPES = [
  'web_desktop',
  'web_mobile',
  'web_tablet',
  'electron_desktop',
] as const
export const OS_FAMILIES = [
  'windows',
  'macos',
  'ios',
  'android',
  'linux',
  'other',
] as const
export const BROWSER_FAMILIES = [
  'chrome',
  'safari',
  'edge',
  'firefox',
  'electron',
  'other',
] as const
export const VIEWPORT_BUCKETS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const
export const THEMES = ['light', 'dark', 'system'] as const
export const LANGS = ['zh', 'en', 'zh-TW', 'fr', 'ru', 'ja', 'vi'] as const
export const API_ERROR_KINDS = [
  'http_4xx',
  'http_5xx',
  'network',
  'timeout',
] as const
export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export const PROVIDER_FAMILIES = [
  'openai',
  'claude',
  'gemini',
  'deepseek',
  'qwen',
  'grok',
  'mistral',
  'llama',
  'glm',
  'moonshot',
  'doubao',
  'other',
] as const
export const PAY_METHODS = [
  'stripe',
  'creem',
  'epay',
  'alipay',
  'wxpay',
  'waffo',
  'airwallex',
  'payssion',
  'antom',
  'balance',
  'other',
] as const
export const RANGE_BUCKETS = ['24h', '7d', '30d', 'custom'] as const
export const EXPORT_FORMATS = ['csv', 'xlsx', 'json', 'other'] as const
export const MODEL_TABS = [
  'details',
  'api',
  'apps',
  'charts',
  'performance',
  'other',
] as const
export const FILTER_TYPES = [
  'vendor',
  'group',
  'endpoint_type',
  'billing_type',
  'tag',
  'sort',
  'view_mode',
  'other',
] as const
export const LOGIN_METHODS = ['password', 'passkey', 'oauth', 'wechat'] as const
export const LEAVE_REASONS = ['navigate', 'hide', 'unload'] as const
export const NAV_TYPES = ['navigate', 'reload', 'back_forward'] as const
export const ERROR_SOURCES = ['window', 'promise', 'react_boundary'] as const
export const RESULTS = ['ok', 'fail'] as const
export const SIDEBAR_VALUES = ['expanded', 'collapsed'] as const

export type ClientType = (typeof CLIENT_TYPES)[number]
export type OsFamily = (typeof OS_FAMILIES)[number]
export type BrowserFamily = (typeof BROWSER_FAMILIES)[number]
export type ViewportBucket = (typeof VIEWPORT_BUCKETS)[number]
export type AnalyticsTheme = (typeof THEMES)[number]
export type AnalyticsLang = (typeof LANGS)[number]
export type ApiErrorKind = (typeof API_ERROR_KINDS)[number]
export type ProviderFamily = (typeof PROVIDER_FAMILIES)[number]
export type PayMethod = (typeof PAY_METHODS)[number]
export type RangeBucket = (typeof RANGE_BUCKETS)[number]
export type ExportFormat = (typeof EXPORT_FORMATS)[number]
export type ModelTab = (typeof MODEL_TABS)[number]
export type FilterType = (typeof FILTER_TYPES)[number]
export type LoginMethod = (typeof LOGIN_METHODS)[number]
export type LeaveReason = (typeof LEAVE_REASONS)[number]
export type NavType = (typeof NAV_TYPES)[number]
export type ClientErrorSource = (typeof ERROR_SOURCES)[number]

export type PropRule =
  | { type: 'bool' }
  | { type: 'int'; min: number; max: number }
  | { type: 'enum'; values: readonly string[] }
  // Templated path starting with /api/; the event is dropped for /api/analytics/.
  | { type: 'apiRoute' }
  // ^[A-Za-z][A-Za-z0-9_]{0,31}$, anything else becomes "Unknown".
  | { type: 'errorName' }

export interface EventSpec {
  /** route_path is required (event dropped when it cannot be templated). */
  routeRequired: boolean
  /** Only page_view carries from_route and referrer_host. */
  navFields?: boolean
  /** Upper bound for duration_ms; absent means the event stores no duration. */
  durationMax?: number
  /** api_error keeps status_code in 0..599. */
  status?: boolean
  props: Record<string, PropRule>
}

const bool: PropRule = { type: 'bool' }
const en = (values: readonly string[]): PropRule => ({ type: 'enum', values })
const int = (min: number, max: number): PropRule => ({
  type: 'int',
  min,
  max,
})

const TOKEN_FLAGS = { has_expiry: bool, has_quota_limit: bool }
const VITAL: EventSpec = {
  routeRequired: true,
  durationMax: 600000,
  props: { nav_type: en(NAV_TYPES) },
}
const RUNTIME_ERROR: EventSpec = {
  routeRequired: false,
  props: {
    error_name: { type: 'errorName' },
    source: en(ERROR_SOURCES),
  },
}
const feature = (props: Record<string, PropRule>): EventSpec => ({
  routeRequired: false,
  props,
})

const EVENT_SPECS = {
  'page_view|route.enter': {
    routeRequired: true,
    navFields: true,
    props: { is_auth: bool },
  },
  'page_leave|route.leave': {
    routeRequired: true,
    durationMax: 3600000,
    props: {
      active_ms: int(0, 3600000),
      reason: en(LEAVE_REASONS),
    },
  },
  'feature_use|playground.request_submit': feature({
    stream: bool,
    has_image: bool,
    provider_family: en(PROVIDER_FAMILIES),
  }),
  'feature_use|pricing.filter_change': feature({
    filter_type: en(FILTER_TYPES),
  }),
  'feature_use|models.view_detail': feature({ tab: en(MODEL_TABS) }),
  'feature_use|token.create': feature(TOKEN_FLAGS),
  'feature_use|token.copy': feature(TOKEN_FLAGS),
  'feature_use|token.toggle': feature(TOKEN_FLAGS),
  'feature_use|usage_log.filter': feature({ range_bucket: en(RANGE_BUCKETS) }),
  'feature_use|usage_log.export': feature({
    range_bucket: en(RANGE_BUCKETS),
    format: en(EXPORT_FORMATS),
  }),
  'feature_use|wallet.topup_open': feature({ pay_method: en(PAY_METHODS) }),
  'feature_use|wallet.redeem_submit': feature({ result: en(RESULTS) }),
  'feature_use|subscription.view': feature({}),
  'feature_use|preference.theme_change': feature({ value: en(THEMES) }),
  'feature_use|preference.lang_change': feature({ value: en(LANGS) }),
  'feature_use|preference.sidebar_toggle': feature({
    value: en(SIDEBAR_VALUES),
  }),
  'feature_use|auth.login_method_select': feature({
    method: en(LOGIN_METHODS),
  }),
  'feature_use|onboarding.step_complete': feature({ step: int(0, 20) }),
  'feature_use|onboarding.skip': feature({ step: int(0, 20) }),
  'perf_vital|vital.fcp': VITAL,
  'perf_vital|vital.lcp': VITAL,
  'perf_vital|vital.ttfb': VITAL,
  'perf_vital|vital.route_change': VITAL,
  'api_error|api.request_failed': {
    routeRequired: false,
    durationMax: 3600000,
    status: true,
    props: {
      api_route: { type: 'apiRoute' },
      method: en(HTTP_METHODS),
      kind: en(API_ERROR_KINDS),
    },
  },
  'client_error|runtime.error': RUNTIME_ERROR,
  'client_error|runtime.unhandled_rejection': RUNTIME_ERROR,
} satisfies Record<string, EventSpec>

/** Keyed by `event_type|event_name`. */
export const EVENT_WHITELIST: Readonly<Record<string, EventSpec>> = EVENT_SPECS

type EventKey = keyof typeof EVENT_SPECS
type EventTypeOf<K> = K extends `${infer T}|${string}` ? T : never
type EventNameOf<K> = K extends `${string}|${infer N}` ? N : never
type ModuleOf<N> = N extends `${infer M}.${string}` ? M : never

export type AnalyticsEventType = EventTypeOf<EventKey>
export type AnalyticsEventName = EventNameOf<EventKey>
/** The part of a feature_use event name before the first ".", as grouped by the server. */
export type AnalyticsFeatureModule = ModuleOf<
  EventNameOf<Extract<EventKey, `feature_use|${string}`>>
>
