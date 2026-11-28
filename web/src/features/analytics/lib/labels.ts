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
import type { TFunction } from 'i18next'

import {
  convertDetectedLanguage,
  INTERFACE_LANGUAGE_OPTIONS,
} from '@/i18n/languages'
import type {
  AnalyticsEventName,
  AnalyticsEventType,
  AnalyticsFeatureModule,
  BrowserFamily,
  OsFamily,
} from '@/lib/analytics/whitelist'

import type { AnalyticsClientType } from '../types'

/**
 * Label for a value outside the whitelist, such as an event from an older
 * release: the raw value, or "Unknown" when it is empty. The `never` argument
 * makes a switch fail to compile when a whitelist entry has no case.
 */
function unmappedLabel(t: TFunction, raw: string, unmapped: never): string {
  void unmapped
  return raw === '' || raw === 'unknown' ? t('Unknown') : raw
}

export function eventNameLabel(t: TFunction, eventName: string): string {
  const name = eventName as AnalyticsEventName
  switch (name) {
    case 'route.enter':
      return t('Page view')
    case 'route.leave':
      return t('Page leave')
    case 'playground.request_submit':
      return t('Send playground request')
    case 'pricing.filter_change':
      return t('Change pricing filter')
    case 'models.view_detail':
      return t('View model details')
    case 'token.create':
      return t('Create API Key')
    case 'token.copy':
      return t('Copy API key')
    case 'token.toggle':
      return t('Toggle API key status')
    case 'usage_log.filter':
      return t('Filter usage logs')
    case 'usage_log.export':
      return t('Export usage logs')
    case 'wallet.topup_open':
      return t('Open top-up')
    case 'wallet.redeem_submit':
      return t('Submit redemption code')
    case 'subscription.view':
      return t('View subscription plans')
    case 'preference.theme_change':
      return t('Change theme')
    case 'preference.lang_change':
      return t('Change language')
    case 'preference.sidebar_toggle':
      return t('Toggle sidebar')
    case 'auth.login_method_select':
      return t('Select login method')
    case 'onboarding.step_complete':
      return t('Complete onboarding step')
    case 'onboarding.skip':
      return t('Skip onboarding')
    case 'vital.fcp':
      return t('First contentful paint')
    case 'vital.lcp':
      return t('Largest contentful paint')
    case 'vital.ttfb':
      return t('Time to first byte')
    case 'vital.route_change':
      return t('Route change')
    case 'api.request_failed':
      return t('API request failed')
    case 'runtime.error':
      return t('Runtime error')
    case 'runtime.unhandled_rejection':
      return t('Unhandled promise rejection')
    default:
      return unmappedLabel(t, eventName, name)
  }
}

export function featureModuleLabel(t: TFunction, module: string): string {
  const name = module as AnalyticsFeatureModule
  switch (name) {
    case 'playground':
      return t('Playground')
    case 'pricing':
      return t('Pricing')
    case 'models':
      return t('Models')
    case 'token':
      return t('API Keys')
    case 'usage_log':
      return t('Usage Logs')
    case 'wallet':
      return t('Wallet')
    case 'subscription':
      return t('Subscription')
    case 'preference':
      return t('Preferences')
    case 'auth':
      return t('Authentication')
    case 'onboarding':
      return t('Onboarding')
    default:
      return unmappedLabel(t, module, name)
  }
}

export function eventTypeLabel(t: TFunction, eventType: string): string {
  const name = eventType as AnalyticsEventType
  switch (name) {
    case 'page_view':
      return t('Page view')
    case 'page_leave':
      return t('Page leave')
    case 'feature_use':
      return t('Feature usage')
    case 'perf_vital':
      return t('Web vitals')
    case 'api_error':
      return t('API error')
    case 'client_error':
      return t('Client error')
    default:
      return unmappedLabel(t, eventType, name)
  }
}

const OS_FAMILY_NAMES: Record<Exclude<OsFamily, 'other'>, string> = {
  windows: 'Windows',
  macos: 'macOS',
  ios: 'iOS',
  android: 'Android',
  linux: 'Linux',
}

const BROWSER_FAMILY_NAMES: Record<Exclude<BrowserFamily, 'other'>, string> = {
  chrome: 'Chrome',
  safari: 'Safari',
  edge: 'Edge',
  firefox: 'Firefox',
  electron: 'Electron',
}

/** Device dimensions returned by GET /api/analytics/devices. */
export type DeviceDimension =
  | 'os_family'
  | 'browser_family'
  | 'viewport'
  | 'lang'
  | 'theme'

export function deviceDimensionLabel(
  t: TFunction,
  dimension: DeviceDimension,
  key: string
): string {
  if (key === '' || key === 'unknown') return t('Unknown')
  if (key === 'other') return t('Other')

  switch (dimension) {
    case 'os_family':
      return Object.hasOwn(OS_FAMILY_NAMES, key)
        ? OS_FAMILY_NAMES[key as keyof typeof OS_FAMILY_NAMES]
        : key
    case 'browser_family':
      return Object.hasOwn(BROWSER_FAMILY_NAMES, key)
        ? BROWSER_FAMILY_NAMES[key as keyof typeof BROWSER_FAMILY_NAMES]
        : key
    case 'lang': {
      // Language names stay in their own language, as in the language switcher.
      const code = convertDetectedLanguage(key)
      return (
        INTERFACE_LANGUAGE_OPTIONS.find((option) => option.code === code)
          ?.label ?? key
      )
    }
    case 'theme':
      if (key === 'light') return t('Light')
      if (key === 'dark') return t('Dark')
      if (key === 'system') return t('System')
      return key
    default:
      // Viewport buckets (xs … 2xl) are breakpoint names and stay as they are.
      return key
  }
}

export function clientTypeLabel(t: TFunction, key: string): string {
  switch (key as AnalyticsClientType) {
    case 'web_desktop':
      return t('Web desktop')
    case 'web_mobile':
      return t('Web mobile')
    case 'web_tablet':
      return t('Web tablet')
    case 'electron_desktop':
      return t('Electron')
    default:
      return key === '' ? t('Unknown') : key
  }
}

/** A "+"-joined client type combination, for example "web_desktop+web_mobile". */
export function clientComboLabel(t: TFunction, combo: string): string {
  return combo
    .split('+')
    .map((part) => clientTypeLabel(t, part))
    .join(' + ')
}
