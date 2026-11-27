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
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { OnboardingWizard } from '../onboarding-wizard'

const navigateTo = vi.hoisted(() => vi.fn())
const updateOnboarding = vi.hoisted(() => vi.fn())
const getApiKeys = vi.hoisted(() => vi.fn())
const createApiKey = vi.hoisted(() => vi.fn())
const fetchTokenKey = vi.hoisted(() => vi.fn())
const getSelf = vi.hoisted(() => vi.fn())
const statusRef = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@tanstack/react-router', () => ({
  Navigate: (props: Record<string, unknown>) => {
    navigateTo(props)
    return null
  },
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: statusRef.current, loading: false }),
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    systemName: 'TestSite',
    logo: '/l.png',
    loading: false,
  }),
}))

vi.mock('@/features/keys/api', () => ({
  getApiKeys,
  createApiKey,
  fetchTokenKey,
}))

vi.mock('@/lib/api', () => ({
  getSelf,
  getUserModels: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
vi.mock('../api', () => ({ updateOnboarding }))
vi.mock('@/features/security/components/dialogs/email-bind-dialog', () => ({
  EmailBindDialog: () => null,
}))

const existingKey = {
  id: 11,
  name: 'My key',
  key: 'abcdefghijklmnopqrstuvwxyz',
  status: 1,
}

function renderWizard(status: Record<string, unknown> = {}) {
  statusRef.current = {
    onboarding_enabled: true,
    onboarding_auto_open: true,
    ...status,
  }
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      user: { id: 7, username: 'newbie', role: 1, quota: 0, setting: '{}' },
      accessToken: 'token',
    },
  }))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <OnboardingWizard />
    </QueryClientProvider>
  )
}

async function goToCredentialsStep() {
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Next' }))
  return user
}

beforeEach(() => {
  navigateTo.mockReset()
  updateOnboarding.mockReset()
  updateOnboarding.mockResolvedValue({ success: true, data: {} })
  getApiKeys.mockReset()
  getApiKeys.mockResolvedValue({ success: true, data: { items: [] } })
  createApiKey.mockReset()
  fetchTokenKey.mockReset()
  fetchTokenKey.mockResolvedValue({
    success: true,
    data: { key: 'FULLSECRET' },
  })
  getSelf.mockReset()
  getSelf.mockResolvedValue({ success: true, data: { quota: 0, email: '' } })
  window.localStorage.clear()
})

describe('onboarding wizard', () => {
  it('writes the dismissed flag to the backend and a per-user cache, then leaves for the overview', async () => {
    const user = userEvent.setup()
    renderWizard()

    await user.click(
      await screen.findByRole('button', { name: 'Skip, go to console' })
    )

    await waitFor(() =>
      expect(updateOnboarding).toHaveBeenCalledWith({ dismissed: true })
    )
    expect(window.localStorage.getItem('onboarding_progress:u_7')).toContain(
      '"dismissed":true'
    )
    await waitFor(() => expect(navigateTo).toHaveBeenCalled())
  })

  it('swaps card 1 wording when CC Switch is disabled', async () => {
    const { unmount } = renderWizard({ onboarding_cc_switch_enabled: true })
    expect(await screen.findByText(/one-click import/)).toBeInTheDocument()
    unmount()

    renderWizard({ onboarding_cc_switch_enabled: false })
    expect(await screen.findByText(/any other AI client/)).toBeInTheDocument()
  })

  it('preselects an existing usable key and shows only its masked value', async () => {
    getApiKeys.mockResolvedValue({
      success: true,
      data: { items: [existingKey] },
    })
    renderWizard()
    await goToCredentialsStep()

    expect(await screen.findByText(/My key/)).toBeInTheDocument()
    expect(screen.getByText('sk-abcd...wxyz')).toBeInTheDocument()
    await waitFor(() => expect(fetchTokenKey).toHaveBeenCalledWith(11))
    expect(screen.queryByText(/FULLSECRET/)).not.toBeInTheDocument()
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(
      'FULLSECRET'
    )
  })

  it('creates a key in place and shows it without leaving the wizard', async () => {
    getApiKeys
      .mockResolvedValueOnce({ success: true, data: { items: [] } })
      .mockResolvedValue({
        success: true,
        data: { items: [{ ...existingKey, id: 12, name: 'Claude Code' }] },
      })
    createApiKey.mockResolvedValue({ success: true })
    renderWizard()
    const user = await goToCredentialsStep()

    expect(await screen.findByLabelText('Key name')).toHaveValue('Claude Code')
    await user.click(screen.getByRole('button', { name: 'Generate key' }))

    expect(await screen.findByText(/API key ready/)).toBeInTheDocument()
    expect(createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Claude Code',
        unlimited_quota: true,
        expired_time: -1,
      })
    )
    expect(fetchTokenKey).toHaveBeenCalledWith(12)
    expect(navigateTo).not.toHaveBeenCalled()
  })

  it('shows the balance block with a non-blocking zero state', async () => {
    renderWizard()
    await goToCredentialsStep()

    expect(await screen.findByText(/Your balance is 0/)).toBeInTheDocument()
    expect(await screen.findByLabelText('Key name')).toBeEnabled()
  })

  it('hides the balance block entirely in self-use mode', async () => {
    renderWizard({ self_use_mode_enabled: true })
    await goToCredentialsStep()

    await screen.findByLabelText('Key name')
    expect(screen.queryByLabelText('Account balance')).not.toBeInTheDocument()
  })

  it('invites binding an email when the signup bonus is pending', async () => {
    renderWizard({
      new_user_quota_enabled: true,
      new_user_quota_require_email: true,
      new_user_quota_amount: 500000,
    })
    await goToCredentialsStep()

    expect(
      await screen.findByRole('button', { name: 'Bind email' })
    ).toBeInTheDocument()
  })

  it('marks the guide completed when finishing the last step', async () => {
    const user = userEvent.setup()
    renderWizard()
    await user.click(await screen.findByRole('button', { name: 'Next' }))
    await user.click(await screen.findByRole('button', { name: 'Next' }))
    await user.click(
      await screen.findByRole('button', { name: 'Finish and open console' })
    )

    await waitFor(() =>
      expect(updateOnboarding).toHaveBeenCalledWith({
        completed: true,
        use_case: 'coding',
      })
    )
  })
})

describe('onboarding wizard availability', () => {
  it('redirects to the overview when onboarding is disabled', async () => {
    renderWizard({ onboarding_enabled: false })

    await waitFor(() => expect(navigateTo).toHaveBeenCalled())
  })
})
