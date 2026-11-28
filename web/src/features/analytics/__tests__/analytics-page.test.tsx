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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import zhLocale from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'

import { AnalyticsPage } from '..'
import type { AnalyticsSearch } from '../lib/search'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  Link: (props: { children?: React.ReactNode; to: string }) => (
    <a href={props.to}>{props.children}</a>
  ),
}))

vi.mock('../components/analytics-chart', () => ({
  AnalyticsChart: () => <div data-testid='chart' />,
}))

const OVERVIEW = {
  pv: 12345,
  device_uv: 40,
  actor_uv: 10,
  multi_device_actor_uv: 4,
  multi_device_ratio: 0.4,
  avg_duration_ms: 2500,
  avg_active_ms: 900,
  api_error_count: 3,
  api_errors_per_pv: 0.01,
}
const HOURS = Array.from({ length: 24 }, (_, hour) => ({
  hour,
  pv: hour === 3 ? 5 : 0,
}))
const TRENDS = {
  granularity: 'day',
  series: [{ ts: 1_700_000_000, pv: 5, device_uv: 2 }],
  hourly_distribution: HOURS,
}
const DEVICES = {
  client_types: [{ key: 'web_desktop', devices: 7, pv: 20 }],
  os_families: [],
  browsers: [],
  viewports: [],
  langs: [],
  themes: [],
  cross_device: {
    actors_total: 2,
    actors_multi_device: 1,
    actors_multi_client: 1,
    combos: [{ combo: 'web_desktop+web_mobile', actors: 1 }],
  },
}

const PAGES = { items: [] }
const FEATURES = {
  items: [{ event_name: 'playground.request_submit', count: 9, devices: 3 }],
  modules: [{ module: 'token', count: 4 }],
  by_client_type: [
    {
      event_name: 'playground.request_submit',
      client_type: 'web_desktop',
      count: 9,
    },
  ],
}

let overviewBody: unknown
let trendsBody: unknown
const calls: { url: string; params: Record<string, unknown> }[] = []

function ok(data: unknown) {
  return { data: { success: true, message: '', data } }
}

beforeEach(() => {
  calls.length = 0
  overviewBody = ok(OVERVIEW)
  trendsBody = ok(TRENDS)
  vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
    calls.push({
      url,
      params: (config?.params ?? {}) as Record<string, unknown>,
    })
    switch (url) {
      case '/api/analytics/overview':
        return overviewBody
      case '/api/analytics/trends':
        return trendsBody
      case '/api/analytics/devices':
        return ok(DEVICES)
      case '/api/analytics/pages':
        return ok(PAGES)
      case '/api/analytics/features':
        return ok(FEATURES)
      default:
        throw new Error(`unexpected ${url}`)
    }
  })
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await act(() => i18next.changeLanguage('en'))
})

const baseSearch: AnalyticsSearch = {
  range: '7d',
  client: 'all',
  tab: 'overview',
}

function renderPage(
  search: Partial<AnalyticsSearch> = {},
  enabled = true,
  onSearchChange: (patch: Partial<AnalyticsSearch>) => void = () => undefined
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <AnalyticsPage
        search={{ ...baseSearch, ...search }}
        enabled={enabled}
        onSearchChange={onSearchChange}
      />
    </QueryClientProvider>
  )
}

test('overview tab queries overview and trends with the selected window and client type', async () => {
  renderPage({ client: 'web_mobile' })

  await waitFor(() =>
    expect(calls.map((c) => c.url).sort()).toEqual([
      '/api/analytics/overview',
      '/api/analytics/trends',
    ])
  )
  const overview = calls.find((c) => c.url === '/api/analytics/overview')
  expect(overview?.params.client_type).toBe('web_mobile')
  const span =
    (overview?.params.end_ts as number) - (overview?.params.start_ts as number)
  expect(span).toBe(7 * 86400)
  expect(
    calls.find((c) => c.url === '/api/analytics/trends')?.params.granularity
  ).toBe('day')
})

test('the all client filter sends no client_type', async () => {
  renderPage()
  await waitFor(() => expect(calls.length).toBe(2))
  expect(calls[0].params).not.toHaveProperty('client_type')
})

test('choosing a client type, a tab and a range reports the new search values', async () => {
  const onSearchChange = vi.fn()
  const user = userEvent.setup()
  renderPage({}, true, onSearchChange)

  await user.click(screen.getByRole('tab', { name: 'Web mobile' }))
  expect(onSearchChange).toHaveBeenLastCalledWith({ client: 'web_mobile' })

  await user.click(screen.getByRole('tab', { name: 'Devices' }))
  expect(onSearchChange).toHaveBeenLastCalledWith({ tab: 'devices' })

  await user.click(screen.getByRole('tab', { name: 'Last 30 days' }))
  expect(onSearchChange).toHaveBeenLastCalledWith({
    range: '30d',
    start: undefined,
    end: undefined,
  })
})

test('devices tab queries the devices endpoint and lists client-type combos', async () => {
  renderPage({ tab: 'devices' })

  expect(
    await screen.findByText('Web desktop + Web mobile')
  ).toBeInTheDocument()
  expect(calls.map((c) => c.url)).toEqual(['/api/analytics/devices'])
})

test('behavior tab shows readable feature and module names that follow the interface language', async () => {
  renderPage({ tab: 'behavior' })

  // Bar list and the by-client table both name the feature; hover keeps the raw id.
  const labels = await screen.findAllByText('Send playground request')
  expect(labels).toHaveLength(2)
  for (const label of labels) {
    expect(label).toHaveAttribute('title', 'playground.request_submit')
  }
  expect(screen.getByText('API Keys')).toHaveAttribute('title', 'token')
  expect(screen.queryByText('playground.request_submit')).toBeNull()

  i18next.addResourceBundle('zhCN', 'translation', zhLocale.translation)
  try {
    await act(() => i18next.changeLanguage('zhCN'))
    expect(await screen.findAllByText('游乐场发送请求')).toHaveLength(2)
    expect(screen.getByText('API 密钥')).toBeInTheDocument()
  } finally {
    i18next.removeResourceBundle('zhCN', 'translation')
  }
})

test('turned-off analytics shows the settings guide and sends no request', () => {
  renderPage({}, false)

  expect(
    screen.getByRole('link', { name: 'Open analytics settings' })
  ).toBeInTheDocument()
  expect(screen.queryByRole('tab', { name: 'Overview' })).toBeNull()
  expect(calls).toHaveLength(0)
})

test('a window with no events shows empty panels instead of charts', async () => {
  trendsBody = ok({
    granularity: 'day',
    series: [{ ts: 1_700_000_000, pv: 0, device_uv: 0 }],
    hourly_distribution: HOURS.map((h) => ({ ...h, pv: 0 })),
  })
  renderPage()

  await waitFor(() =>
    expect(screen.getAllByText('No data available')).toHaveLength(2)
  )
  expect(screen.queryByTestId('chart')).toBeNull()
})

test('a failed business response shows the error state with a retry button', async () => {
  overviewBody = { data: { success: false, message: 'Invalid time range' } }
  renderPage()

  expect(await screen.findByText('Invalid time range')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
})

test.each([
  ['zhCN', /12,345/],
  ['zhTW', /12,345/],
  ['fr', /12[\s  ]345/],
])(
  'numbers are formatted for the %s interface language',
  async (lng, pattern) => {
    if (!i18next.hasResourceBundle(lng, 'translation')) {
      i18next.addResourceBundle(lng, 'translation', {})
    }
    await act(() => i18next.changeLanguage(lng))
    renderPage()

    expect(await screen.findByText(pattern)).toBeInTheDocument()
  }
)
