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
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  __resetAnalyticsForTests,
  flushAnalytics,
  initAnalytics,
} from '@/lib/analytics'
import {
  __resetTransportForTests,
  whenFlushed,
} from '@/lib/analytics/transport'

import { api } from '../http-client'

const refreshAuthentication = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-session', () => ({
  applyAuthRotation: vi.fn(),
  clearAuthentication: vi.fn(),
  getFreshAuthHeaders: vi.fn(async () => ({})),
  refreshAuthentication,
}))

type SentEvent = {
  event_name: string
  duration_ms?: number
  status_code?: number
  props?: Record<string, unknown>
}

const bodies: string[] = []
let requestCount = 0

function sentErrors(): SentEvent[] {
  return bodies
    .flatMap((body) => JSON.parse(body).events as SentEvent[])
    .filter((e) => e.event_name === 'api.request_failed')
}

async function flushAll() {
  flushAnalytics()
  await whenFlushed()
}

beforeEach(() => {
  bodies.length = 0
  requestCount = 0
  window.localStorage.clear()
  window.sessionStorage.clear()
  __resetAnalyticsForTests()
  __resetTransportForTests()
  initAnalytics({ analytics_enabled: true, analytics_respect_dnt: false })
  vi.stubGlobal(
    'fetch',
    vi.fn((_url: string, init: RequestInit) => {
      bodies.push(init.body as string)
      return Promise.resolve(new Response(null, { status: 202 }))
    })
  )
  refreshAuthentication.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
  __resetAnalyticsForTests()
})

function respondWith(statuses: Array<number | 'network'>) {
  return (config: InternalAxiosRequestConfig) => {
    const status = statuses[Math.min(requestCount++, statuses.length - 1)]
    if (status === 'network') {
      return Promise.reject(
        Object.assign(new Error('Network Error'), {
          isAxiosError: true,
          code: 'ERR_NETWORK',
          config,
        })
      )
    }
    const response = { data: {}, status, statusText: '', headers: {}, config }
    if (status < 400) return Promise.resolve(response)
    return Promise.reject(
      Object.assign(new Error(`status ${status}`), {
        isAxiosError: true,
        response,
        config,
      })
    )
  }
}

describe('http-client analytics', () => {
  test('a 500 response is reported with a templated route and its kind', async () => {
    await api
      .get('/api/channel/12?key=secret', { adapter: respondWith([500]) })
      .catch(() => undefined)
    await flushAll()

    const [event] = sentErrors()
    expect(event.status_code).toBe(500)
    expect(event.props).toMatchObject({
      api_route: '/api/channel/:id',
      method: 'GET',
      kind: 'http_5xx',
    })
    expect(JSON.stringify(bodies)).not.toContain('secret')
  })

  test('a network failure is reported as kind network', async () => {
    await api
      .get('/api/status', { adapter: respondWith(['network']) })
      .catch(() => undefined)
    await flushAll()

    expect(sentErrors()[0].props).toMatchObject({ kind: 'network' })
  })

  test('a 401 retried successfully after refresh is not reported', async () => {
    refreshAuthentication.mockResolvedValue({ kind: 'authenticated' })
    await api.get('/api/user/self', { adapter: respondWith([401, 200]) })
    await flushAll()

    expect(sentErrors()).toHaveLength(0)
  })

  test('a 401 whose retry also fails is reported once', async () => {
    refreshAuthentication.mockResolvedValue({ kind: 'authenticated' })
    await api
      .get('/api/user/self', { adapter: respondWith([401, 401]) })
      .catch(() => undefined)
    await flushAll()

    expect(sentErrors()).toHaveLength(1)
    expect(sentErrors()[0].status_code).toBe(401)
  })

  test('analytics endpoint failures are never reported', async () => {
    await api
      .post('/api/analytics/events', {}, { adapter: respondWith([500]) })
      .catch(() => undefined)
    await flushAll()

    expect(sentErrors()).toHaveLength(0)
  })
})
