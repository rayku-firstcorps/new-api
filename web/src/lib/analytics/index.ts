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
 * Behavior analytics SDK (privacy-first, zero third parties).
 *
 * Every function is a no-op while analytics is inactive: disabled by the
 * server, Do Not Track / Global Privacy Control honored, or the device is not
 * sampled in. In those cases no device_id is created and no storage is written.
 */
import {
  __resetContextForTests,
  loadDeviceId,
  generateId,
  persistDeviceId,
  sampleBucket,
  touchSession,
} from './context'
import {
  buildEvent,
  errorNameOf,
  templateApiRoute,
  templateRoute,
  type RawAnalyticsEvent,
} from './sanitize'
import {
  clearQueue,
  enqueueEvent,
  flushQueue,
  setTransportDevice,
} from './transport'
import { __resetVitalsForTests, observeWebVitals } from './vitals'
import type {
  ApiErrorKind,
  ClientErrorSource,
  ExportFormat,
  FilterType,
  AnalyticsLang,
  LeaveReason,
  LoginMethod,
  ModelTab,
  NavType,
  PayMethod,
  ProviderFamily,
  RangeBucket,
  AnalyticsTheme,
} from './whitelist'

export type {
  ApiErrorKind,
  ClientErrorSource,
  ProviderFamily,
  PayMethod,
  RangeBucket,
  ExportFormat,
  ModelTab,
  FilterType,
  LoginMethod,
  LeaveReason,
  NavType,
} from './whitelist'

export type VitalName =
  | 'vital.fcp'
  | 'vital.lcp'
  | 'vital.ttfb'
  | 'vital.route_change'

export type AnalyticsFeatureEventName =
  | 'playground.request_submit'
  | 'pricing.filter_change'
  | 'models.view_detail'
  | 'token.create'
  | 'token.copy'
  | 'token.toggle'
  | 'usage_log.filter'
  | 'usage_log.export'
  | 'wallet.topup_open'
  | 'wallet.redeem_submit'
  | 'subscription.view'
  | 'preference.theme_change'
  | 'preference.lang_change'
  | 'preference.sidebar_toggle'
  | 'auth.login_method_select'
  | 'onboarding.step_complete'
  | 'onboarding.skip'

interface TokenFlags {
  has_expiry?: boolean
  has_quota_limit?: boolean
}

export interface AnalyticsFeatureProps {
  'playground.request_submit': {
    stream?: boolean
    has_image?: boolean
    provider_family?: ProviderFamily
  }
  'pricing.filter_change': { filter_type?: FilterType }
  'models.view_detail': { tab?: ModelTab }
  'token.create': TokenFlags
  'token.copy': TokenFlags
  'token.toggle': TokenFlags
  'usage_log.filter': { range_bucket?: RangeBucket }
  'usage_log.export': { range_bucket?: RangeBucket; format?: ExportFormat }
  'wallet.topup_open': { pay_method?: PayMethod }
  'wallet.redeem_submit': { result?: 'ok' | 'fail' }
  'subscription.view': Record<string, never>
  'preference.theme_change': { value?: AnalyticsTheme }
  'preference.lang_change': { value?: AnalyticsLang }
  'preference.sidebar_toggle': { value?: 'expanded' | 'collapsed' }
  'auth.login_method_select': { method?: LoginMethod }
  'onboarding.step_complete': { step?: number }
  'onboarding.skip': { step?: number }
}

export interface AnalyticsStatusInput {
  analytics_enabled?: boolean
  analytics_sample_rate?: number
  analytics_respect_dnt?: boolean
}

let active = false

export function isAnalyticsActive(): boolean {
  return active
}

function deactivate(): void {
  active = false
  setTransportDevice(null)
}

function doNotTrackRequested(): boolean {
  if (typeof navigator === 'undefined') return false
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean }
  return (
    nav.doNotTrack === '1' ||
    nav.doNotTrack === 'yes' ||
    nav.globalPrivacyControl === true
  )
}

function clampSampleRate(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 100
  return Math.min(Math.max(Math.floor(value), 1), 100)
}

/**
 * Idempotent; call on every status change. Sampling is a deterministic hash of
 * the device id. A new visitor's id is transient until the sampling decision
 * says yes; a sampled-out visitor stores nothing (and re-rolls on a later load).
 */
export function initAnalytics(
  status: AnalyticsStatusInput | null | undefined
): void {
  if (typeof window === 'undefined' || status?.analytics_enabled !== true) {
    deactivate()
    return
  }
  if (status.analytics_respect_dnt !== false && doNotTrackRequested()) {
    deactivate()
    return
  }

  const rate = clampSampleRate(status.analytics_sample_rate)
  const stored = loadDeviceId()
  const candidate = stored ?? generateId()
  // Persist before sampling so a sampled-out browser keeps its decision on
  // later loads instead of re-rolling. The id stays local until sampled in.
  if (!stored) persistDeviceId(candidate)
  if (sampleBucket(candidate) >= rate) {
    deactivate()
    return
  }
  setTransportDevice(candidate)
  active = true
}

function currentRoute(): string {
  return templateRoute(window.location.pathname)
}

function emit(
  eventType: string,
  eventName: string,
  raw: RawAnalyticsEvent
): void {
  if (!active) return
  const event = buildEvent(eventType, eventName, raw)
  if (!event) return
  touchSession()
  enqueueEvent(event)
}

export function trackPageView(input: {
  routePath: string
  fromRoute?: string
  referrerHost?: string
  isAuth: boolean
}): void {
  emit('page_view', 'route.enter', {
    routePath: input.routePath,
    fromRoute: input.fromRoute,
    referrerHost: input.referrerHost,
    props: { is_auth: input.isAuth },
  })
}

/** hide / unload reasons also flush synchronously with keepalive. */
export function trackPageLeave(input: {
  routePath: string
  durationMs: number
  activeMs: number
  reason: LeaveReason
}): void {
  emit('page_leave', 'route.leave', {
    routePath: input.routePath,
    durationMs: input.durationMs,
    props: { active_ms: Math.round(input.activeMs), reason: input.reason },
  })
  if (input.reason !== 'navigate') flushAnalytics({ unload: true })
}

export function trackFeature<N extends AnalyticsFeatureEventName>(
  name: N,
  props?: AnalyticsFeatureProps[N]
): void {
  if (!active) return
  emit('feature_use', name, {
    routePath: currentRoute(),
    props: props as Record<string, unknown> | undefined,
  })
}

export function trackApiError(input: {
  url: string
  method: string
  status?: number
  durationMs: number
  kind: ApiErrorKind
}): void {
  if (!active || input.url.includes('/api/analytics/')) return
  emit('api_error', 'api.request_failed', {
    routePath: currentRoute(),
    durationMs: input.durationMs,
    statusCode: input.status,
    props: {
      api_route: templateApiRoute(input.url),
      method: input.method.toUpperCase(),
      kind: input.kind,
    },
  })
}

/** Reads only `error.name`; never the message or the stack. */
export function trackClientError(input: {
  error: unknown
  source: ClientErrorSource
  name?: 'runtime.error' | 'runtime.unhandled_rejection'
}): void {
  if (!active) return
  const name =
    input.name ??
    (input.source === 'promise'
      ? 'runtime.unhandled_rejection'
      : 'runtime.error')
  emit('client_error', name, {
    routePath: currentRoute(),
    props: { error_name: errorNameOf(input.error), source: input.source },
  })
}

export function trackVital(
  name: VitalName,
  durationMs: number,
  navType?: NavType
): void {
  if (!active) return
  emit('perf_vital', name, {
    routePath: currentRoute(),
    durationMs,
    props: name === 'vital.route_change' ? {} : { nav_type: navType },
  })
}

/** FCP / LCP / TTFB once per load. Returns a cleanup function. */
export function startWebVitals(): () => void {
  if (typeof window === 'undefined') return () => undefined
  return observeWebVitals((name, durationMs, navType) =>
    trackVital(name, durationMs, navType)
  )
}

/** window `error` and `unhandledrejection` listeners. */
export function startRuntimeErrorListeners(): () => void {
  if (typeof window === 'undefined') return () => undefined
  const onError = (event: ErrorEvent | Event) => {
    // Resource load failures arrive as plain Events; they carry no error.
    if (!(event instanceof ErrorEvent)) return
    trackClientError({
      error: event.error,
      source: 'window',
      name: 'runtime.error',
    })
  }
  const onRejection = (event: PromiseRejectionEvent) =>
    trackClientError({
      error: event.reason,
      source: 'promise',
      name: 'runtime.unhandled_rejection',
    })
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  return () => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}

export function flushAnalytics(opts?: { unload?: boolean }): void {
  if (!active) return
  flushQueue(opts)
}

export { templateRoute } from './sanitize'

export function __resetAnalyticsForTests(): void {
  active = false
  clearQueue()
  setTransportDevice(null)
  __resetContextForTests()
  __resetVitalsForTests()
}
