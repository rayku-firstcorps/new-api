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
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore, type AuthUser } from '@/stores/auth-store'

import {
  resetOnboardingAutoOpenMemory,
  useOnboardingAutoOpen,
} from '../hooks/use-onboarding-auto-open'
import { useOnboardingEntry } from '../hooks/use-onboarding-entry'

const navigate = vi.hoisted(() => vi.fn())
const getApiKeys = vi.hoisted(() => vi.fn())
const getChannels = vi.hoisted(() => vi.fn())
const statusRef = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: statusRef.current, loading: false }),
}))
vi.mock('@/features/keys/api', () => ({ getApiKeys }))
vi.mock('@/features/channels/api', () => ({ getChannels }))

const ADMIN_ON = {
  onboarding_enabled: true,
  onboarding_auto_open: true,
  onboarding_admin_guide_enabled: true,
}

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    username: 'root',
    role: 100,
    request_count: 12,
    setting: '{}',
    ...overrides,
  }
}

function Probe() {
  const autoOpen = useOnboardingAutoOpen()
  const entry = useOnboardingEntry()
  return (
    <div>
      <span data-testid='settled'>{String(autoOpen.settled)}</span>
      <span data-testid='entry'>{String(entry.visible)}</span>
    </div>
  )
}

function renderProbe(user: AuthUser, status: Record<string, unknown>) {
  statusRef.current = status
  useAuthStore.setState((state) => ({
    auth: { ...state.auth, user, accessToken: 'token' },
  }))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <Probe />
    </QueryClientProvider>
  )
}

function channelTotal(total: number) {
  getChannels.mockResolvedValue({
    success: true,
    data: { items: [], total, page: 1, page_size: 1 },
  })
}

beforeEach(() => {
  navigate.mockReset()
  getApiKeys.mockReset()
  getChannels.mockReset()
  channelTotal(0)
  window.localStorage.clear()
  resetOnboardingAutoOpenMemory()
})

describe('admin onboarding auto open', () => {
  it('sends an administrator to /onboarding when the system has no channel', async () => {
    renderProbe(makeUser(), ADMIN_ON)

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/onboarding',
        replace: true,
      })
    )
    expect(getApiKeys).not.toHaveBeenCalled()
  })

  it('does not open when the system already has a channel', async () => {
    channelTotal(2)
    renderProbe(makeUser(), ADMIN_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not open, fetch channels or show the entry when the admin guide is off', async () => {
    renderProbe(makeUser(), {
      ...ADMIN_ON,
      onboarding_admin_guide_enabled: false,
    })

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(getChannels).not.toHaveBeenCalled()
    expect(screen.getByTestId('entry')).toHaveTextContent('false')
  })

  it('does not open an administrator who skipped the guide', async () => {
    renderProbe(
      makeUser({ setting: '{"onboarding_dismissed":true}' }),
      ADMIN_ON
    )

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(getChannels).not.toHaveBeenCalled()
  })

  it('still lets the console load when the channel count request fails', async () => {
    getChannels.mockRejectedValue(new Error('boom'))
    renderProbe(makeUser(), ADMIN_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('never reads the channel count for a normal user and keeps their entry', async () => {
    renderProbe(makeUser({ id: 7, role: 1, request_count: 3 }), ADMIN_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(getChannels).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('entry')).toHaveTextContent('true')
  })

  it('shows the reopen entry to an administrator when the admin guide is on', async () => {
    channelTotal(3)
    renderProbe(makeUser(), ADMIN_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(screen.getByTestId('entry')).toHaveTextContent('true')
  })
})
