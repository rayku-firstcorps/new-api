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
import {
  getOnboardingStorageKey,
  isOnboardingFinished,
  writeLocalOnboardingProgress,
} from '../lib/progress'

const navigate = vi.hoisted(() => vi.fn())
const getApiKeys = vi.hoisted(() => vi.fn())
const statusRef = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: statusRef.current, loading: false }),
}))

vi.mock('@/features/keys/api', () => ({ getApiKeys }))

const ALL_ON = {
  onboarding_enabled: true,
  onboarding_auto_open: true,
}

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 7,
    username: 'newbie',
    role: 1,
    request_count: 0,
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

beforeEach(() => {
  navigate.mockReset()
  getApiKeys.mockReset()
  getApiKeys.mockResolvedValue({
    success: true,
    data: { items: [], total: 0, page: 1, page_size: 1 },
  })
  window.localStorage.clear()
  resetOnboardingAutoOpenMemory()
})

describe('onboarding auto open', () => {
  it('sends a brand-new user to /onboarding when both switches are on', async () => {
    renderProbe(makeUser(), ALL_ON)

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/onboarding',
        replace: true,
      })
    )
    expect(screen.getByTestId('settled')).toHaveTextContent('false')
  })

  it('does not redirect and hides the entry when onboarding is disabled', async () => {
    renderProbe(makeUser(), {
      onboarding_enabled: false,
      onboarding_auto_open: true,
    })

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('entry')).toHaveTextContent('false')
  })

  it('does not redirect when auto open is off but keeps the manual entry', async () => {
    renderProbe(makeUser(), {
      onboarding_enabled: true,
      onboarding_auto_open: false,
    })

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByTestId('entry')).toHaveTextContent('true')
  })

  it('never auto-opens the user wizard for administrators', async () => {
    renderProbe(makeUser({ role: 10 }), ALL_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
    expect(getApiKeys).not.toHaveBeenCalled()
  })

  it.each([
    [
      'dismissed in the backend setting',
      { setting: '{"onboarding_dismissed":true}' },
    ],
    [
      'completed in the backend setting',
      { setting: '{"onboarding_completed":true}' },
    ],
    ['already made requests', { request_count: 3 }],
  ])('does not redirect a user who %s', async (_name, overrides) => {
    renderProbe(makeUser(overrides), ALL_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not redirect a user who already owns an API key', async () => {
    getApiKeys.mockResolvedValue({
      success: true,
      data: { items: [{ id: 1 }], total: 1, page: 1, page_size: 1 },
    })
    renderProbe(makeUser(), ALL_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not bounce back after a skip is cached locally, even if the backend write failed', async () => {
    writeLocalOnboardingProgress(7, { dismissed: true })
    renderProbe(makeUser(), ALL_ON)

    await waitFor(() =>
      expect(screen.getByTestId('settled')).toHaveTextContent('true')
    )
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('onboarding local cache isolation', () => {
  it('keeps each user id on its own storage key', () => {
    writeLocalOnboardingProgress(1, { dismissed: true })

    expect(getOnboardingStorageKey(1)).not.toBe(getOnboardingStorageKey(2))
    expect(isOnboardingFinished(makeUser({ id: 1 }))).toBe(true)
    expect(isOnboardingFinished(makeUser({ id: 2 }))).toBe(false)
  })

  it('treats unreadable cache content as not finished', () => {
    window.localStorage.setItem(getOnboardingStorageKey(3), '{broken')

    expect(isOnboardingFinished(makeUser({ id: 3 }))).toBe(false)
  })
})
