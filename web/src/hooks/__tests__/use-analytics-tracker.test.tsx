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
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  __resetAnalyticsForTests,
  flushAnalytics,
  trackFeature,
} from '@/lib/analytics'
import {
  __resetTransportForTests,
  whenFlushed,
} from '@/lib/analytics/transport'

import { useAnalyticsTracker } from '../use-analytics-tracker'

const routerState = vi.hoisted(() => ({ pathname: '/dashboard' }))

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => routerState.pathname,
  useRouter: () => ({ subscribe: () => () => undefined }),
}))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: {
      analytics_enabled: true,
      analytics_sample_rate: 100,
      analytics_respect_dnt: false,
    },
  }),
}))

type SentEvent = Record<string, unknown> & {
  event_name: string
  props?: Record<string, unknown>
}

const bodies: string[] = []

function sentEvents(): SentEvent[] {
  return bodies.flatMap((body) => JSON.parse(body).events as SentEvent[])
}

async function flushAll() {
  flushAnalytics()
  await whenFlushed()
}

beforeEach(() => {
  bodies.length = 0
  routerState.pathname = '/dashboard'
  window.localStorage.clear()
  window.sessionStorage.clear()
  __resetAnalyticsForTests()
  __resetTransportForTests()
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit) => {
      bodies.push(init.body as string)
      return Promise.resolve(new Response(null, { status: 202 }))
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  __resetAnalyticsForTests()
})

describe('useAnalyticsTracker', () => {
  test('route change sends the previous page leave before the next page enter with from_route', async () => {
    const view = renderHook(() => useAnalyticsTracker())
    routerState.pathname = '/keys/123'
    view.rerender()
    await flushAll()

    const events = sentEvents().map((e) => [
      e.event_name,
      e.route_path,
      e.from_route,
    ])
    expect(events).toEqual([
      ['route.enter', '/dashboard', undefined],
      ['route.leave', '/dashboard', undefined],
      ['route.enter', '/keys/:id', '/dashboard'],
    ])
    expect(sentEvents()[1].props).toMatchObject({ reason: 'navigate' })
  })

  test('pagehide flushes a leave event with reason unload', async () => {
    renderHook(() => useAnalyticsTracker())
    window.dispatchEvent(new Event('pagehide'))
    await whenFlushed()

    const leave = sentEvents().find((e) => e.event_name === 'route.leave')
    expect(leave?.props).toMatchObject({ reason: 'unload' })
  })

  test('runtime errors send only the error name, never the message', async () => {
    renderHook(() => useAnalyticsTracker())
    const error = new TypeError('secret-token-abc')
    window.dispatchEvent(
      new ErrorEvent('error', { error, message: error.message })
    )
    await flushAll()

    expect(bodies.join('')).not.toContain('secret-token-abc')
    const sent = sentEvents().find((e) => e.event_name === 'runtime.error')
    expect(sent?.props).toEqual({ error_name: 'TypeError', source: 'window' })
  })

  test('feature props outside the whitelist are dropped', async () => {
    renderHook(() => useAnalyticsTracker())
    trackFeature('token.create', {
      has_expiry: true,
      name: 'my-secret-key',
    } as never)
    await flushAll()

    const sent = sentEvents().find((e) => e.event_name === 'token.create')
    expect(sent?.props).toEqual({ has_expiry: true })
    expect(bodies.join('')).not.toContain('my-secret-key')
  })
})
