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
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { OverviewDashboard } from '../overview-dashboard'

const legacyStorageKey = 'dashboard_overview_setup_guide_expanded'
const storageKey = `${legacyStorageKey}:u_1`
let client: QueryClient
let keyLookupError: Error | null
let keyItems: { id: number; name: string; key: string; status: number }[]
let statusFlags: Record<string, unknown>
let selfData: Record<string, unknown>

beforeEach(() => {
  window.localStorage.clear()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'dashboard-user',
    role: 1,
    quota: 1000000,
    used_quota: 1000,
    request_count: 1,
  })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  keyLookupError = null
  keyItems = [{ id: 1, name: 'App key', key: 'masked', status: 1 }]
  statusFlags = {}
  selfData = {}
  vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: true, data: { key: 'fullkey' } },
  })
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    switch (url) {
      case '/api/token/?p=1&size=10':
        if (keyLookupError) throw keyLookupError
        return {
          data: {
            success: true,
            data: { items: keyItems },
          },
        }
      case '/api/status':
        return {
          data: {
            data: {
              api_info_enabled: false,
              announcements_enabled: false,
              faq_enabled: false,
              uptime_kuma_enabled: false,
              ...statusFlags,
            },
          },
        }
      case '/api/user/self':
        return { data: { success: true, data: selfData } }
      case '/api/user/models':
        return { data: { success: true, data: ['gpt-4o-mini'] } }
      case '/api/data/self':
        return { data: { success: true, data: [] } }
      default:
        throw new Error(`Unexpected dashboard request: ${url}`)
    }
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  window.localStorage.clear()
})

async function renderOverview() {
  const router = createRouter({
    routeTree: createRootRoute({ component: OverviewDashboard }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('overview setup guide', () => {
  it('shows usage first and only a header entry when setup is complete', async () => {
    await renderOverview()

    const toggle = await screen.findByRole('button', { name: 'Setup guide' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getAllByRole('heading').map((heading) => heading.textContent)
    ).toEqual(['Overview', 'Usage at a glance'])
    expect(screen.queryByText('Setup guide complete')).not.toBeInTheDocument()
    expect(screen.queryByText('Setup progress: 3/3')).not.toBeInTheDocument()
    for (const name of ['API Keys', 'Channels', 'Usage Logs', 'Pricing']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
    const panel = document.getElementById(
      toggle.getAttribute('aria-controls') ?? ''
    )
    expect(panel).toBeInTheDocument()
    expect(panel).not.toBeVisible()
  })

  it('toggles the completed guide with the keyboard and restores focus after hiding it', async () => {
    const user = userEvent.setup()
    await renderOverview()
    const toggle = await screen.findByRole('button', { name: 'Setup guide' })

    await user.tab()
    expect(toggle).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    ).toBeVisible()
    expect(
      screen.getByRole('heading', {
        name: 'Build on your API gateway in minutes',
      })
    ).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^API Keys/ })).toBeVisible()
    )

    await user.keyboard(' ')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
    await user.click(toggle)
    await user.click(screen.getByRole('button', { name: 'Hide setup guide' }))
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('restores the completed guide preference after remounting', async () => {
    const user = userEvent.setup()
    const first = await renderOverview()
    await user.click(await screen.findByRole('button', { name: 'Setup guide' }))
    first.unmount()

    const second = await renderOverview()
    expect(
      await screen.findByRole('button', { name: 'Setup guide' })
    ).toHaveAttribute('aria-expanded', 'true')
    await user.click(screen.getByRole('button', { name: 'Hide setup guide' }))
    second.unmount()

    await renderOverview()
    expect(
      await screen.findByRole('button', { name: 'Setup guide' })
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Setup guide complete')).not.toBeInTheDocument()
  })

  it('keeps the existing progress banner when an incomplete guide is manually collapsed', async () => {
    const user = userEvent.setup()
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'new-user', role: 1 })
    await renderOverview()

    await user.click(
      await screen.findByRole('button', { name: 'Hide setup guide' })
    )
    expect(screen.getByText('Setup progress: 1/3')).toBeVisible()
    expect(
      screen.getByText('Setup guide is collapsed. Expand it anytime.')
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'API Keys' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Setup guide' })
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show setup guide' }))
    expect(
      screen.getByRole('button', { name: 'Hide setup guide' })
    ).toBeVisible()
  })

  it('removes the collapsed progress banner when the remaining setup step completes', async () => {
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'dashboard-user',
      role: 1,
      quota: 1000000,
    })
    window.localStorage.setItem(storageKey, 'collapsed')
    await renderOverview()
    expect(await screen.findByText('Setup progress: 2/3')).toBeVisible()

    act(() => {
      useAuthStore.getState().auth.setUser({
        id: 1,
        username: 'dashboard-user',
        role: 1,
        quota: 1000000,
        request_count: 1,
      })
    })
    expect(
      await screen.findByRole('button', { name: 'Setup guide' })
    ).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/Setup progress:/)).not.toBeInTheDocument()
  })

  it('does not show a completed setup entry when the key lookup fails', async () => {
    keyLookupError = new Error('Key lookup unavailable')
    await renderOverview()

    expect(
      await screen.findByRole('button', { name: 'Hide setup guide' })
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Setup guide' })
    ).not.toBeInTheDocument()
  })
})

describe('overview first-use fallback', () => {
  function setNewUser(overrides: Record<string, unknown> = {}) {
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'new-user',
      role: 1,
      quota: 0,
      used_quota: 0,
      request_count: 0,
      ...overrides,
    })
  }

  it('hides the Recommended actions card while setup is unfinished and highlights the first open step', async () => {
    setNewUser()
    await renderOverview()

    expect(
      await screen.findByRole('button', { name: 'Hide setup guide' })
    ).toBeVisible()
    expect(screen.queryByText('Recommended actions')).not.toBeInTheDocument()
    const steps = screen.getAllByRole('listitem')
    const active = steps.filter((item) => item.getAttribute('aria-current'))
    expect(active).toHaveLength(1)
    expect(active[0]).toHaveTextContent('Add credits')
  })

  it('removes the Add credits step in self-use mode', async () => {
    setNewUser()
    statusFlags = { self_use_mode_enabled: true }
    await renderOverview()

    expect(await screen.findByText('Send a request')).toBeVisible()
    await waitFor(() =>
      expect(screen.queryByText('Add credits')).not.toBeInTheDocument()
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Hide setup guide' })
    )
    expect(screen.getByText('Setup progress: 1/2')).toBeVisible()
  })

  it('keeps the Add credits step when the site is not in self-use mode', async () => {
    setNewUser()
    await renderOverview()

    expect((await screen.findAllByText('Add credits')).length).toBeGreaterThan(
      0
    )
  })

  it('opens the in-place key dialog from the active Create API Key step', async () => {
    const user = userEvent.setup()
    setNewUser()
    keyItems = []
    await renderOverview()

    const activeStep = await waitFor(() => {
      const item = screen
        .getAllByRole('listitem')
        .find((entry) => entry.getAttribute('aria-current') === 'step')
      expect(item).toBeDefined()
      return item as HTMLElement
    })
    await user.click(
      within(activeStep).getByRole('button', { name: 'Create API Key' })
    )

    expect(await screen.findByRole('dialog')).toBeVisible()
    expect(await screen.findByLabelText('Key name')).toBeVisible()
  })

  it('stores the collapsed state per account so accounts do not affect each other', async () => {
    const user = userEvent.setup()
    setNewUser()
    const first = await renderOverview()
    await user.click(
      await screen.findByRole('button', { name: 'Hide setup guide' })
    )
    expect(window.localStorage.getItem(storageKey)).toBe('collapsed')
    first.unmount()

    setNewUser({ id: 2, username: 'second-user' })
    await renderOverview()

    expect(
      await screen.findByRole('button', { name: 'Hide setup guide' })
    ).toBeVisible()
    expect(window.localStorage.getItem(`${legacyStorageKey}:u_2`)).toBeNull()
  })

  it('adopts the legacy global preference once for the first account', async () => {
    setNewUser()
    window.localStorage.setItem(legacyStorageKey, 'collapsed')
    await renderOverview()

    expect(await screen.findByText('Setup progress: 1/3')).toBeVisible()
    expect(window.localStorage.getItem(legacyStorageKey)).toBeNull()
    expect(window.localStorage.getItem(storageKey)).toBe('collapsed')
  })

  it('shows a neutral Not topped up yet state instead of Balance depleted for an untouched account', async () => {
    setNewUser()
    await renderOverview()

    expect(await screen.findByText('Not topped up yet')).toBeVisible()
    expect(screen.queryByText('Balance depleted')).not.toBeInTheDocument()
  })

  it('keeps Balance depleted for an account that already used its credit', async () => {
    setNewUser({ used_quota: 5000, request_count: 3 })
    await renderOverview()

    expect(
      (await screen.findAllByText('Balance depleted')).length
    ).toBeGreaterThan(0)
    expect(screen.queryByText('Not topped up yet')).not.toBeInTheDocument()
  })

  it('refreshes request count and balance from the server when the page mounts', async () => {
    setNewUser()
    selfData = { quota: 777, used_quota: 10, request_count: 5 }
    await renderOverview()

    await waitFor(() =>
      expect(useAuthStore.getState().auth.user?.request_count).toBe(5)
    )
    expect(useAuthStore.getState().auth.user?.quota).toBe(777)
  })

  it('shows full scrollable code tabs with docs and Playground entries', async () => {
    setNewUser()
    await renderOverview()

    expect(await screen.findByRole('tab', { name: 'curl' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Python' })).toBeVisible()
    expect(
      screen.queryByRole('tab', { name: 'CC Switch' })
    ).not.toBeInTheDocument()
    const code = await screen.findByLabelText('Terminal')
    expect(code).toHaveClass('overflow-x-auto')
    expect(code.querySelector('.truncate')).toBeNull()
    expect(code).toHaveTextContent('Authorization: Bearer sk-')
    expect(
      screen.getByRole('button', { name: 'Test in Playground' })
    ).toHaveAttribute('href', expect.stringContaining('model=gpt-4o-mini'))
    expect(
      screen.getByRole('button', { name: 'Open the full setup guide' })
    ).toHaveAttribute('href', '/docs')
  })

  it('shows the CC Switch tab only when the CC Switch option is on', async () => {
    setNewUser()
    statusFlags = { onboarding_cc_switch_enabled: true }
    await renderOverview()

    expect(await screen.findByRole('tab', { name: 'CC Switch' })).toBeVisible()
  })

  it('hides the Quick start entry when the onboarding switch is off', async () => {
    setNewUser()
    await renderOverview()

    await screen.findByRole('button', { name: 'Hide setup guide' })
    expect(
      screen.queryByRole('button', { name: 'Quick start' })
    ).not.toBeInTheDocument()
  })
})
