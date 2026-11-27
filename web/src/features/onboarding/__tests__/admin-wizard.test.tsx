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

import { AdminOnboardingWizard } from '../admin-onboarding-wizard'
import { ChannelsReturnBanner } from '../components/channels-return-banner'

const navigate = vi.hoisted(() => vi.fn())
const navigateTo = vi.hoisted(() => vi.fn())
const setOpen = vi.hoisted(() => vi.fn())
const routeSearch = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))
const getChannels = vi.hoisted(() => vi.fn())
const getUserModels = vi.hoisted(() => vi.fn())
const getApiKeys = vi.hoisted(() => vi.fn())
const updateOnboarding = vi.hoisted(() => vi.fn())
const statusRef = vi.hoisted(() => ({ current: {} as Record<string, unknown> }))

vi.mock('@tanstack/react-router', () => ({
  Navigate: (props: Record<string, unknown>) => {
    navigateTo(props)
    return null
  },
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  useNavigate: () => navigate,
  getRouteApi: () => ({
    useSearch: () => routeSearch.current,
    useNavigate: () => navigate,
  }),
}))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: statusRef.current, loading: false }),
}))
vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({ systemName: 'TestSite', logo: '', loading: false }),
}))
vi.mock('@/features/channels/api', () => ({
  getChannels,
  testChannel: vi.fn(),
}))
vi.mock('@/features/channels/components/channels-provider', () => ({
  useChannels: () => ({ setOpen }),
}))
vi.mock('@/features/keys/api', () => ({
  getApiKeys,
  createApiKey: vi.fn(),
  fetchTokenKey: vi.fn(),
}))
vi.mock('@/lib/api', () => ({ getUserModels }))
vi.mock('../api', () => ({ updateOnboarding }))

const ADMIN_ON = {
  onboarding_enabled: true,
  onboarding_auto_open: true,
  onboarding_admin_guide_enabled: true,
}

function renderWithClient(
  ui: React.ReactNode,
  status: Record<string, unknown> = ADMIN_ON
) {
  statusRef.current = status
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      user: { id: 1, username: 'root', role: 100, setting: '{}' },
      accessToken: 'token',
    },
  }))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  navigate.mockReset()
  navigateTo.mockReset()
  setOpen.mockReset()
  routeSearch.current = {}
  getChannels.mockReset()
  getChannels.mockResolvedValue({
    success: true,
    data: {
      items: [{ id: 1, status: 1 }],
      total: 1,
      page: 1,
      page_size: 100,
    },
  })
  getUserModels.mockReset()
  getUserModels.mockResolvedValue({ success: true, data: ['gpt-4o', 'o3'] })
  getApiKeys.mockReset()
  getApiKeys.mockResolvedValue({ success: true, data: { items: [] } })
  updateOnboarding.mockReset()
  updateOnboarding.mockResolvedValue({ success: true, data: {} })
  window.localStorage.clear()
})

describe('admin onboarding wizard', () => {
  it('opens /channels from a provider card without any secret in the URL', async () => {
    const user = userEvent.setup()
    renderWithClient(<AdminOnboardingWizard />)

    await user.click(await screen.findByRole('button', { name: /Anthropic/ }))

    expect(navigate).toHaveBeenCalledWith({
      to: '/channels',
      search: { onboarding: 'channel', provider: 'anthropic' },
    })
  })

  it('resumes at the models step with live counts when returning from /channels', async () => {
    renderWithClient(<AdminOnboardingWizard initialStep={1} />)

    const label = await screen.findByText('Available models')
    expect(label.nextElementSibling).toHaveTextContent('2')
    expect(
      screen.getByText('Enabled channels').nextElementSibling
    ).toHaveTextContent('1')
  })

  it('points back to the channel step when the model check finds no channel', async () => {
    getChannels.mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, page_size: 100 },
    })
    const user = userEvent.setup()
    renderWithClient(<AdminOnboardingWizard initialStep={1} />)

    await user.click(
      await screen.findByRole('button', { name: 'Back to add a channel' })
    )

    expect(navigate).toHaveBeenCalledWith({
      to: '/onboarding',
      search: { step: 0 },
    })
  })

  it('offers repair guidance when channels exist but no model is available', async () => {
    getUserModels.mockResolvedValue({ success: true, data: [] })
    renderWithClient(<AdminOnboardingWizard initialStep={1} />)

    expect(await screen.findByText('No models available yet')).toBeVisible()
  })

  it('clamps an out-of-range step and persists the skip like the user wizard', async () => {
    const user = userEvent.setup()
    renderWithClient(<AdminOnboardingWizard initialStep={9} />)

    expect(
      await screen.findByText('Create a key and test forwarding')
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Skip, go to console' })
    )

    await waitFor(() =>
      expect(updateOnboarding).toHaveBeenCalledWith({ dismissed: true })
    )
    await waitFor(() => expect(navigateTo).toHaveBeenCalled())
  })

  it('leaves for the overview when the admin guide is switched off', async () => {
    renderWithClient(<AdminOnboardingWizard />, {
      ...ADMIN_ON,
      onboarding_admin_guide_enabled: false,
    })

    await waitFor(() => expect(navigateTo).toHaveBeenCalled())
  })
})

describe('channels return banner', () => {
  it('stays hidden and leaves the drawer closed without the onboarding param', () => {
    renderWithClient(<ChannelsReturnBanner />)

    expect(screen.queryByRole('region', { name: 'First Setup' })).toBeNull()
    expect(setOpen).not.toHaveBeenCalled()
  })

  it('opens the create drawer once and returns to the models step', async () => {
    routeSearch.current = { onboarding: 'channel' }
    const user = userEvent.setup()
    renderWithClient(<ChannelsReturnBanner />)

    await waitFor(() => expect(setOpen).toHaveBeenCalledWith('create-channel'))
    await user.click(
      screen.getByRole('button', { name: 'Return to First Setup' })
    )

    expect(navigate).toHaveBeenCalledWith({
      to: '/onboarding',
      search: { step: 1 },
    })
  })
})
