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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import {
  detectBrowserFamily,
  detectClientType,
  detectOsFamily,
  sampleBucket,
  viewportBucket,
} from './context'
import {
  __resetAnalyticsForTests,
  flushAnalytics,
  initAnalytics,
  isAnalyticsActive,
  trackApiError,
  trackClientError,
  trackFeature,
  trackPageLeave,
  trackPageView,
  templateRoute,
} from './index'
import { buildEvent, sanitizeProps } from './sanitize'
import { __resetTransportForTests, queueSize, whenFlushed } from './transport'
import { EVENT_WHITELIST } from './whitelist'

const DEVICE_KEY = 'newapi:analytics:device_id'
const ENABLED = {
  analytics_enabled: true,
  analytics_sample_rate: 100,
  analytics_respect_dnt: true,
}

class KeepaliveRequest {
  get keepalive(): boolean {
    return true
  }
}

interface SentBatch {
  init: RequestInit
  body: {
    device_id: string
    session_id: string
    client_type: string
    events: Array<Record<string, unknown>>
  }
}

function stubFetch() {
  const sent: SentBatch[] = []
  const fetchMock = vi.fn((_url: string, init: RequestInit) => {
    sent.push({ init, body: JSON.parse(init.body as string) })
    return Promise.resolve(new Response(null, { status: 202 }))
  })
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('Request', KeepaliveRequest)
  return { sent, fetchMock }
}

function setAccessToken(
  token: string | null,
  expiresInSeconds = 600,
  userId = 1
) {
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      user: token ? { id: userId, username: `user${userId}`, role: 1 } : null,
      accessToken: token,
      accessExpiresAt: token
        ? Math.floor(Date.now() / 1000) + expiresInSeconds
        : null,
    },
  }))
}

function setUserAgent(ua: string, maxTouchPoints = 0) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  })
}

function pageView(route = '/dashboard') {
  trackPageView({ routePath: route, isAuth: false })
}

beforeEach(() => {
  vi.useFakeTimers()
  window.localStorage.clear()
  window.sessionStorage.clear()
  __resetAnalyticsForTests()
  __resetTransportForTests()
  setAccessToken(null)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete (window as unknown as { electron?: unknown }).electron
  Reflect.deleteProperty(navigator, 'maxTouchPoints')
  setAccessToken(null)
})

describe('route templating', () => {
  test.each([
    ['/channels/123?x=1', '/channels/:id'],
    ['/request-processing', '/request-processing'],
    ['/api/channel/12', '/api/channel/:id'],
    ['/keys#section', '/keys'],
    ['/a/550e8400-e29b-41d4-a716-446655440000', '/a/:id'],
    ['/a/0123456789abcdef', '/a/:id'],
    ['/u/john@example.com', '/u/:id'],
    ['/u/%E4%B8%AD', '/u/:id'],
    ['/s/abcdefghij0123456789', '/s/:id'],
    ['/redemption-codes', '/redemption-codes'],
    ['/dashboard/', '/dashboard'],
    ['//a//b', '/a/b'],
    ['/', '/'],
    ['', ''],
    ['https://example.com/a', ''],
    ['/1/2/3/4/5/6/7/8/9', ''],
    [`/${'g'.repeat(129)}`, ''],
  ])('%s -> %s', (input, expected) => {
    expect(templateRoute(input)).toBe(expected)
  })
})

describe('event sanitizing', () => {
  test('drops unknown props and invalid values but keeps the event', () => {
    const event = buildEvent('feature_use', 'token.create', {
      routePath: '/keys?token=secret',
      props: {
        has_expiry: true,
        has_quota_limit: 'yes',
        token_name: 'my secret key',
      },
    })
    expect(event?.route_path).toBe('/keys')
    expect(event?.props).toEqual({ has_expiry: true })
  })

  test('rejects event names outside the whitelist and bad required routes', () => {
    expect(buildEvent('feature_use', 'made.up', {})).toBeNull()
    expect(
      buildEvent('page_view', 'route.enter', { routePath: 'https://x/y' })
    ).toBeNull()
  })

  test('enforces enum and integer bounds', () => {
    const rules = EVENT_WHITELIST['feature_use|onboarding.step_complete']
    expect(sanitizeProps(rules.props, { step: 21 })).toEqual({})
    expect(sanitizeProps(rules.props, { step: 1.5 })).toEqual({})
    expect(sanitizeProps(rules.props, { step: 3 })).toEqual({ step: 3 })
    const filter = EVENT_WHITELIST['feature_use|pricing.filter_change']
    expect(sanitizeProps(filter.props, { filter_type: 'nope' })).toEqual({})
  })

  test('keeps only the error name, never message data', () => {
    const event = buildEvent('client_error', 'runtime.error', {
      routePath: '/x',
      props: { error_name: 'bad name with spaces', source: 'window' },
    })
    expect(event?.props).toEqual({ error_name: 'Unknown', source: 'window' })
  })

  test('templates api_route and drops analytics endpoints', () => {
    const event = buildEvent('api_error', 'api.request_failed', {
      durationMs: 70000000,
      statusCode: 500,
      props: { api_route: '/api/channel/12?key=1', kind: 'http_5xx' },
    })
    expect(event?.props?.api_route).toBe('/api/channel/:id')
    expect(event?.duration_ms).toBe(3600000)
    expect(event?.status_code).toBe(500)
    expect(
      buildEvent('api_error', 'api.request_failed', {
        props: { api_route: '/api/analytics/events' },
      })
    ).toBeNull()
  })

  test('strips unknown prop keys and clears nav-only fields for other types', () => {
    const rules = { value: { type: 'enum', values: ['a'] } } as const
    expect(sanitizeProps(rules, { value: 'a', extra: 'b' })).toEqual({
      value: 'a',
    })
    const event = buildEvent('feature_use', 'subscription.view', {
      routePath: '/subscriptions',
      fromRoute: '/x',
      referrerHost: 'example.com',
    })
    expect(event?.from_route).toBeUndefined()
    expect(event?.referrer_host).toBeUndefined()
    expect(event?.event_id.length).toBeLessThanOrEqual(36)
  })
})

describe('environment detection', () => {
  test.each([
    [0, 'xs'],
    [639, 'xs'],
    [640, 'sm'],
    [767, 'sm'],
    [768, 'md'],
    [1023, 'md'],
    [1024, 'lg'],
    [1279, 'lg'],
    [1280, 'xl'],
    [1535, 'xl'],
    [1536, '2xl'],
  ])('viewport %i -> %s', (width, bucket) => {
    expect(viewportBucket(width)).toBe(bucket)
  })

  test('electron wins over the user agent', () => {
    ;(window as unknown as { electron: unknown }).electron = {
      isElectron: true,
    }
    setUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537')
    expect(detectClientType()).toBe('electron_desktop')
    expect(detectBrowserFamily()).toBe('electron')
  })

  test.each([
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Mobile/15E148 Safari/604.1',
      5,
      'web_mobile',
      'ios',
      'safari',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120 Mobile Safari/537',
      5,
      'web_mobile',
      'android',
      'chrome',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit Version/17 Safari/605',
      5,
      'web_tablet',
      'ios',
      'safari',
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120 Safari/537 Edg/120',
      0,
      'web_desktop',
      'windows',
      'edge',
    ],
    [
      'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
      0,
      'web_desktop',
      'linux',
      'firefox',
    ],
  ])('classifies %s', (ua, touch, clientType, os, browser) => {
    setUserAgent(ua, touch)
    expect(detectClientType()).toBe(clientType)
    expect(detectOsFamily()).toBe(os)
    expect(detectBrowserFamily()).toBe(browser)
  })
})

describe('switches and sampling', () => {
  test('stays inactive and writes no storage when disabled', () => {
    initAnalytics({ analytics_enabled: false })
    pageView()
    expect(isAnalyticsActive()).toBe(false)
    expect(window.localStorage.getItem(DEVICE_KEY)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
    expect(queueSize()).toBe(0)
    initAnalytics(null)
    initAnalytics(undefined)
    expect(isAnalyticsActive()).toBe(false)
  })

  test('enabled creates a device id and is idempotent', () => {
    initAnalytics(ENABLED)
    const first = window.localStorage.getItem(DEVICE_KEY)
    initAnalytics(ENABLED)
    expect(isAnalyticsActive()).toBe(true)
    expect(first).toMatch(/^[A-Za-z0-9_-]{21}$/)
    expect(window.localStorage.getItem(DEVICE_KEY)).toBe(first)
  })

  test('disabling again drops queued events', () => {
    initAnalytics(ENABLED)
    pageView()
    expect(queueSize()).toBe(1)
    initAnalytics({ analytics_enabled: false })
    expect(queueSize()).toBe(0)
    expect(isAnalyticsActive()).toBe(false)
  })

  test('sampling is deterministic per device id', () => {
    let inId = ''
    let outId = ''
    for (let i = 0; !inId || !outId; i++) {
      const id = `sample_device_${String(i).padStart(6, '0')}`
      if (sampleBucket(id) < 50) inId ||= id
      else outId ||= id
    }
    expect(sampleBucket(inId)).toBe(sampleBucket(inId))

    window.localStorage.setItem(DEVICE_KEY, inId)
    initAnalytics({ ...ENABLED, analytics_sample_rate: 50 })
    expect(isAnalyticsActive()).toBe(true)

    window.localStorage.setItem(DEVICE_KEY, outId)
    initAnalytics({ ...ENABLED, analytics_sample_rate: 50 })
    expect(isAnalyticsActive()).toBe(false)
  })

  test('a sampled-out new visitor keeps its decision on later loads', () => {
    for (let i = 0; i < 50; i++) {
      initAnalytics({ ...ENABLED, analytics_sample_rate: 1 })
      if (!isAnalyticsActive()) {
        const stored = window.localStorage.getItem(DEVICE_KEY)
        expect(stored).toMatch(/^[A-Za-z0-9_-]{21}$/)
        for (let load = 0; load < 5; load++) {
          __resetAnalyticsForTests()
          initAnalytics({ ...ENABLED, analytics_sample_rate: 1 })
          expect(isAnalyticsActive()).toBe(false)
          expect(window.localStorage.getItem(DEVICE_KEY)).toBe(stored)
        }
        expect(queueSize()).toBe(0)
        return
      }
      window.localStorage.clear()
      __resetAnalyticsForTests()
    }
    throw new Error('expected at least one sampled-out visitor')
  })

  test.each([
    ['doNotTrack', '1'],
    ['globalPrivacyControl', true],
  ])('respects %s when analytics_respect_dnt is on', (prop, value) => {
    Object.defineProperty(navigator, prop, { value, configurable: true })
    try {
      initAnalytics(ENABLED)
      expect(isAnalyticsActive()).toBe(false)
      expect(window.localStorage.getItem(DEVICE_KEY)).toBeNull()

      initAnalytics({ ...ENABLED, analytics_respect_dnt: false })
      expect(isAnalyticsActive()).toBe(true)
    } finally {
      Reflect.deleteProperty(navigator, prop)
    }
  })

  test('survives unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(() => {
      initAnalytics(ENABLED)
      pageView()
      trackFeature('subscription.view')
    }).not.toThrow()
    expect(isAnalyticsActive()).toBe(true)
    expect(queueSize()).toBe(2)
  })
})

describe('batching and delivery', () => {
  test('flushes at 20 events', async () => {
    const { sent } = stubFetch()
    initAnalytics(ENABLED)
    for (let i = 0; i < 19; i++) pageView()
    expect(sent).toHaveLength(0)
    pageView()
    await whenFlushed()
    expect(sent).toHaveLength(1)
    expect(sent[0].body.events).toHaveLength(20)
    expect(queueSize()).toBe(0)
  })

  test('flushes after 5 seconds with keepalive and same-origin credentials', async () => {
    const { sent } = stubFetch()
    initAnalytics(ENABLED)
    pageView()
    vi.advanceTimersByTime(4999)
    await whenFlushed()
    expect(sent).toHaveLength(0)
    vi.advanceTimersByTime(1)
    await whenFlushed()
    expect(sent).toHaveLength(1)
    expect(sent[0].init.keepalive).toBe(true)
    expect(sent[0].init.credentials).toBe('same-origin')
    expect(sent[0].body.device_id).toBe(window.localStorage.getItem(DEVICE_KEY))
    expect(sent[0].body.session_id).toMatch(/^[A-Za-z0-9_-]{21}$/)
    expect(sent[0].body.client_type).toBe('web_desktop')
  })

  test('unload flush is synchronous and only sends a token with life left', async () => {
    const { sent, fetchMock } = stubFetch()
    initAnalytics(ENABLED)

    setAccessToken('live-token', 600)
    trackPageLeave({
      routePath: '/dashboard',
      durationMs: 1000,
      activeMs: 500,
      reason: 'hide',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((sent[0].init.headers as Record<string, string>).Authorization).toBe(
      'Bearer live-token'
    )
    expect(sent[0].body.events[0].props).toEqual({
      active_ms: 500,
      reason: 'hide',
    })

    setAccessToken('almost-expired', 3)
    pageView()
    flushAnalytics({ unload: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      (sent[1].init.headers as Record<string, string>).Authorization
    ).toBeUndefined()
    await whenFlushed()
  })

  test('regular flush uses fresh auth headers only when a token exists', async () => {
    const { sent } = stubFetch()
    initAnalytics(ENABLED)

    pageView()
    flushAnalytics()
    await whenFlushed()
    expect(
      (sent[0].init.headers as Record<string, string>).Authorization
    ).toBeUndefined()

    setAccessToken('live-token', 600)
    pageView()
    flushAnalytics()
    await whenFlushed()
    expect((sent[1].init.headers as Record<string, string>).Authorization).toBe(
      'Bearer live-token'
    )
  })

  test('events recorded before sign-in or by another account stay anonymous', async () => {
    const { sent } = stubFetch()
    initAnalytics(ENABLED)

    pageView('/sign-in')
    setAccessToken('user-1-token', 600, 1)
    pageView('/dashboard')
    setAccessToken('user-2-token', 600, 2)
    pageView('/keys')
    flushAnalytics()
    await whenFlushed()

    const auth = sent.map(
      (batch) => (batch.init.headers as Record<string, string>).Authorization
    )
    const routes = sent.map((batch) =>
      batch.body.events.map((event) => event.route_path)
    )
    expect(routes).toEqual([['/sign-in'], ['/dashboard'], ['/keys']])
    expect(auth).toEqual([undefined, undefined, 'Bearer user-2-token'])
  })

  test('falls back to an anonymous sendBeacon without keepalive support', async () => {
    const beacon = vi.fn(() => true)
    vi.stubGlobal('fetch', undefined)
    Object.defineProperty(navigator, 'sendBeacon', {
      value: beacon,
      configurable: true,
    })
    try {
      initAnalytics(ENABLED)
      pageView()
      flushAnalytics({ unload: true })
      await whenFlushed()
      expect(beacon).toHaveBeenCalledTimes(1)
    } finally {
      Reflect.deleteProperty(navigator, 'sendBeacon')
    }
  })

  test('network failures are swallowed without retry', async () => {
    const fetchMock = vi.fn(() => Promise.reject(new TypeError('offline')))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('Request', KeepaliveRequest)
    const consoleSpy = vi.spyOn(console, 'error')
    initAnalytics(ENABLED)
    pageView()
    flushAnalytics()
    await expect(whenFlushed()).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(queueSize()).toBe(0)
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})

describe('tracking helpers', () => {
  test('never reports requests to the analytics endpoint', () => {
    initAnalytics(ENABLED)
    trackApiError({
      url: '/api/analytics/events',
      method: 'post',
      status: 500,
      durationMs: 10,
      kind: 'http_5xx',
    })
    trackApiError({
      url: 'https://example.com/api/analytics/overview?x=1',
      method: 'get',
      durationMs: 10,
      kind: 'network',
    })
    expect(queueSize()).toBe(0)
    trackApiError({
      url: '/api/channel/12',
      method: 'get',
      status: 404,
      durationMs: 10,
      kind: 'http_4xx',
    })
    expect(queueSize()).toBe(1)
  })

  test('client errors carry only the error name', async () => {
    const { sent } = stubFetch()
    initAnalytics(ENABLED)
    class PaymentError extends Error {
      constructor() {
        super('card 4242 4242 4242 4242 failed')
        this.name = 'PaymentError'
      }
    }
    trackClientError({ error: new PaymentError(), source: 'window' })
    trackClientError({ error: 'plain string', source: 'promise' })
    flushAnalytics()
    await whenFlushed()
    const events = sent[0].body.events
    expect(events[0].props).toEqual({
      error_name: 'PaymentError',
      source: 'window',
    })
    expect(events[1].event_name).toBe('runtime.unhandled_rejection')
    expect(events[1].props).toEqual({
      error_name: 'NonError',
      source: 'promise',
    })
    expect(JSON.stringify(sent[0].body)).not.toContain('4242')
  })

  test('feature events attach the templated current route', async () => {
    const { sent } = stubFetch()
    window.history.pushState({}, '', '/keys/123?secret=1#frag')
    initAnalytics(ENABLED)
    trackFeature('token.copy', { has_expiry: true })
    flushAnalytics()
    await whenFlushed()
    expect(sent[0].body.events[0]).toMatchObject({
      event_type: 'feature_use',
      event_name: 'token.copy',
      route_path: '/keys/:id',
      props: { has_expiry: true },
    })
    expect(JSON.stringify(sent[0].body)).not.toContain('secret')
    window.history.pushState({}, '', '/')
  })

  test('every call is a no-op while inactive', () => {
    trackFeature('token.create')
    trackClientError({ error: new Error('x'), source: 'window' })
    pageView()
    flushAnalytics()
    expect(queueSize()).toBe(0)
    expect(window.localStorage.getItem(DEVICE_KEY)).toBeNull()
  })
})
