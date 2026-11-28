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
import i18next from 'i18next'
import { afterEach, describe, expect, test } from 'vitest'

import { EVENT_WHITELIST } from '@/lib/analytics/whitelist'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { assertAnalyticsAccess } from '../lib/access'
import { formatDurationMs, formatRatio } from '../lib/format'
import {
  deviceDimensionLabel,
  eventNameLabel,
  eventTypeLabel,
  featureModuleLabel,
} from '../lib/labels'
import { pickGranularity, resolveAnalyticsRange } from '../lib/range'
import { analyticsSearchSchema } from '../lib/search'

afterEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true)
})

describe('assertAnalyticsAccess', () => {
  test('redirects a regular user to /403', () => {
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'u', role: ROLE.USER })
    expect(() => assertAnalyticsAccess()).toThrow()
  })

  test('redirects an anonymous visitor', () => {
    expect(() => assertAnalyticsAccess()).toThrow()
  })

  test.each([ROLE.ADMIN, ROLE.SUPER_ADMIN])('lets role %s through', (role) => {
    useAuthStore.getState().auth.setUser({ id: 1, username: 'a', role })
    expect(() => assertAnalyticsAccess()).not.toThrow()
  })
})

describe('resolveAnalyticsRange', () => {
  const now = new Date('2026-05-10T10:30:20').getTime()

  test('7d window ends at the next whole minute', () => {
    const r = resolveAnalyticsRange({ range: '7d', client: 'all' }, now)
    expect(r.end_ts % 60).toBe(0)
    expect(r.end_ts - r.start_ts).toBe(7 * 86400)
    expect(r.client_type).toBeUndefined()
  })

  test('today starts at local midnight and uses hourly buckets', () => {
    const r = resolveAnalyticsRange(
      { range: 'today', client: 'web_tablet' },
      now
    )
    expect(r.start_ts).toBe(new Date('2026-05-10T00:00:00').getTime() / 1000)
    expect(r.client_type).toBe('web_tablet')
    expect(pickGranularity(r)).toBe('hour')
  })

  test('30d uses daily buckets', () => {
    const r = resolveAnalyticsRange({ range: '30d', client: 'all' }, now)
    expect(r.end_ts - r.start_ts).toBe(30 * 86400)
    expect(pickGranularity(r)).toBe('day')
  })

  test('custom range is used as given and a bad one falls back to 7 days', () => {
    expect(
      resolveAnalyticsRange(
        { range: 'custom', start: 1000, end: 5000, client: 'all' },
        now
      )
    ).toEqual({ start_ts: 1000, end_ts: 5000 })
    const bad = resolveAnalyticsRange(
      { range: 'custom', start: 5000, end: 1000, client: 'all' },
      now
    )
    expect(bad.end_ts - bad.start_ts).toBe(7 * 86400)
  })
})

describe('analyticsSearchSchema', () => {
  test('invalid values fall back to the defaults', () => {
    const parsed = analyticsSearchSchema.parse({
      range: 'x',
      client: 'y',
      tab: 'z',
      start: 'q',
    })
    expect(parsed).toMatchObject({
      range: '7d',
      client: 'all',
      tab: 'overview',
    })
    expect(parsed.start).toBeUndefined()
  })
})

describe('formatting', () => {
  test('durations pick ms, s and min units', () => {
    expect(formatDurationMs(850, 'en')).toBe('850 ms')
    expect(formatDurationMs(2500, 'en')).toBe('2.5 s')
    expect(formatDurationMs(90_000, 'en')).toBe('1.5 min')
    expect(formatDurationMs(undefined, 'en')).toBe('-')
  })

  test('ratio uses the locale percent format', () => {
    expect(formatRatio(0.4, 'en')).toBe('40%')
    expect(formatRatio(0.4, 'fr')).toMatch(/40[\s  ]%/)
  })
})

describe('analytics labels', () => {
  const t = i18next.t
  const keys = Object.keys(EVENT_WHITELIST).map((key) => key.split('|'))
  const eventTypes = [...new Set(keys.map(([type]) => type))]
  const eventNames = keys.map(([, name]) => name)
  const modules = [
    ...new Set(
      keys
        .filter(([type]) => type === 'feature_use')
        .map(([, name]) => name.split('.')[0])
    ),
  ]

  test('every whitelisted event, module and event type has a readable label', () => {
    expect(eventNames).toHaveLength(26)
    expect(modules).toHaveLength(10)
    expect(eventTypes).toHaveLength(6)
    for (const name of eventNames) {
      expect(eventNameLabel(t, name)).not.toBe(name)
    }
    for (const module of modules) {
      expect(featureModuleLabel(t, module)).not.toBe(module)
    }
    for (const type of eventTypes) {
      expect(eventTypeLabel(t, type)).not.toBe(type)
    }
  })

  test('values outside the whitelist fall back to the raw value or Unknown', () => {
    expect(eventNameLabel(t, 'legacy.removed_event')).toBe(
      'legacy.removed_event'
    )
    expect(eventNameLabel(t, '')).toBe('Unknown')
    expect(featureModuleLabel(t, 'legacy')).toBe('legacy')
    expect(eventTypeLabel(t, '')).toBe('Unknown')
  })

  test.each([
    ['os_family', 'macos', 'macOS'],
    ['browser_family', 'chrome', 'Chrome'],
    ['lang', 'zh', '简体中文'],
    ['lang', 'zh-TW', '繁體中文'],
    ['lang', 'fr', 'Français'],
    ['theme', 'system', 'System'],
    ['viewport', '2xl', '2xl'],
    ['os_family', 'other', 'Other'],
    ['browser_family', 'unknown', 'Unknown'],
    ['theme', '', 'Unknown'],
    ['os_family', 'constructor', 'constructor'],
  ] as const)('device %s "%s" is shown as "%s"', (dimension, key, label) => {
    expect(deviceDimensionLabel(t, dimension, key)).toBe(label)
  })
})
