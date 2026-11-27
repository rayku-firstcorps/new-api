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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { OnboardingUseCase } from '@/features/auth/types'
import { useAuthStore } from '@/stores/auth-store'

import { ConnectStep } from '../components/connect-step'
import { readOnboardingFlags } from '../lib/availability'
import type { OnboardingSelectedKey } from '../types'

const updateOnboarding = vi.hoisted(() => vi.fn())
const getUserModels = vi.hoisted(() => vi.fn())
const copyText = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children?: React.ReactNode; to?: string }) => (
    <a href={props.to}>{props.children}</a>
  ),
}))
vi.mock('@/hooks/use-gateway-base-url', () => ({
  useGatewayBaseUrl: () => 'https://gw.example.com',
}))
vi.mock('@/lib/api', () => ({ getUserModels }))
vi.mock('../api', () => ({ updateOnboarding }))
vi.mock('@/lib/copy-to-clipboard', () => ({ copyToClipboard: copyText }))

const FULL_KEY = 'sk-FULLSECRETKEY1234567890'
const selectedKey: OnboardingSelectedKey = {
  id: 3,
  name: 'My key',
  maskedKey: 'sk-FULL...7890',
  fullKey: FULL_KEY,
}

function renderStep(args: {
  useCase: OnboardingUseCase
  status?: Record<string, unknown>
  key?: OnboardingSelectedKey | null
  onBack?: () => void
}) {
  useAuthStore.setState((state) => ({
    auth: {
      ...state.auth,
      user: { id: 7, username: 'newbie', role: 1, quota: 0, setting: '{}' },
    },
  }))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ConnectStep
        useCase={args.useCase}
        selectedKey={args.key === undefined ? selectedKey : args.key}
        flags={readOnboardingFlags({
          onboarding_enabled: true,
          ...args.status,
        })}
        onBack={args.onBack ?? vi.fn()}
      />
    </QueryClientProvider>
  )
}

function mockFetchOnce(response: { status: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => response.body,
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

beforeEach(() => {
  updateOnboarding.mockReset()
  updateOnboarding.mockResolvedValue({ success: true, data: {} })
  getUserModels.mockReset()
  getUserModels.mockResolvedValue({
    success: true,
    data: ['gpt-4o', 'claude-sonnet-x'],
  })
  copyText.mockReset()
  copyText.mockResolvedValue(true)
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('onboarding connect step scenarios', () => {
  it('shows the CC Switch import and the manual config for the coding use case', async () => {
    renderStep({
      useCase: 'coding',
      status: { onboarding_cc_switch_enabled: true },
    })

    expect(
      await screen.findByRole('button', { name: 'Open CC Switch' })
    ).toBeEnabled()
    expect(screen.getByText('Manual configuration')).toBeInTheDocument()
  })

  it('hides the one-click import but keeps manual config and docs when CC Switch is disabled', async () => {
    renderStep({
      useCase: 'coding',
      status: { onboarding_cc_switch_enabled: false },
    })

    expect(await screen.findByText('Manual configuration')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Open CC Switch' })
    ).not.toBeInTheDocument()
    expect(screen.getByText(/ANTHROPIC_BASE_URL/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Open the full setup guide' })
    ).toHaveAttribute('href', '/docs')
  })

  it('renders the multi-language examples for the api use case', async () => {
    renderStep({ useCase: 'api' })

    for (const label of [
      'curl',
      'Python (OpenAI)',
      'Anthropic SDK',
      'Node.js',
    ]) {
      expect(await screen.findByRole('tab', { name: label })).toBeVisible()
    }
    expect(
      screen.getByText(/https:\/\/gw\.example\.com\/v1\/chat/)
    ).toBeVisible()
  })

  it('links to the playground with only the model for the playground use case', async () => {
    renderStep({ useCase: 'playground' })

    expect(
      await screen.findByRole('link', { name: 'Open the playground' })
    ).toHaveAttribute('href', '/playground')
    expect(screen.queryByText(FULL_KEY)).not.toBeInTheDocument()
  })

  it('asks to go back and create a key when none is selected', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    renderStep({ useCase: 'api', key: null, onBack })

    await user.click(
      await screen.findByRole('button', { name: 'Back to API key' })
    )

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('onboarding connect step key handling', () => {
  it('shows only the masked key but copies the full key', async () => {
    const user = userEvent.setup()
    renderStep({ useCase: 'api' })

    expect(
      (await screen.findAllByText(/sk-FULL\.\.\.7890/)).length
    ).toBeGreaterThan(0)
    expect(document.body.textContent).not.toContain('FULLSECRETKEY')

    await user.click(screen.getByRole('button', { name: 'Copy code' }))

    await waitFor(() =>
      expect(copyText).toHaveBeenCalledWith(
        expect.stringContaining(`Bearer ${FULL_KEY}`)
      )
    )
    expect(window.localStorage.length).toBe(0)
  })

  it('disables copying while the full key is still loading', async () => {
    renderStep({ useCase: 'api', key: { ...selectedKey, fullKey: undefined } })

    expect(
      await screen.findByRole('button', { name: 'Copy code' })
    ).toBeDisabled()
  })
})

describe('onboarding inline test request', () => {
  it('hides the test button when the inline test flag is off', async () => {
    renderStep({
      useCase: 'api',
      status: { onboarding_inline_test_enabled: false },
    })

    await screen.findByRole('tab', { name: 'curl' })
    expect(
      screen.queryByRole('button', { name: 'Send test request' })
    ).not.toBeInTheDocument()
  })

  it('sends a minimal chat completion with the user key and marks onboarding completed on success', async () => {
    const fetchMock = mockFetchOnce({
      status: 200,
      body: { choices: [{ message: { content: 'Hello there!' } }] },
    })
    const user = userEvent.setup()
    renderStep({
      useCase: 'api',
      status: { onboarding_inline_test_enabled: true },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Send test request' })
    )

    expect(
      await screen.findByText('Your first request worked')
    ).toBeInTheDocument()
    expect(screen.getByText('Hello there!')).toBeInTheDocument()
    expect(screen.getByText(/Responded in \d+ ms/)).toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/v1/chat/completions')
    expect(init.credentials).toBe('omit')
    expect(init.headers.Authorization).toBe(`Bearer ${FULL_KEY}`)
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({
      model: 'gpt-4o',
      max_tokens: 16,
      stream: false,
      messages: [{ role: 'user' }],
    })
    await waitFor(() =>
      expect(updateOnboarding).toHaveBeenCalledWith({
        completed: true,
        use_case: 'api',
      })
    )
  })

  it('explains an insufficient balance failure without marking completion', async () => {
    mockFetchOnce({
      status: 403,
      body: {
        error: {
          message: 'user quota is not enough',
          code: 'insufficient_user_quota',
        },
      },
    })
    const user = userEvent.setup()
    renderStep({
      useCase: 'api',
      status: { onboarding_inline_test_enabled: true },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Send test request' })
    )

    expect(await screen.findByText('Not enough balance')).toBeInTheDocument()
    expect(screen.getByText('user quota is not enough')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Top up' })).toHaveAttribute(
      'href',
      '/wallet'
    )
    expect(updateOnboarding).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Send test request' })
    ).toBeEnabled()
  })

  it('does not point to top-up when a quota failure happens in self-use mode', async () => {
    mockFetchOnce({
      status: 403,
      body: {
        error: {
          message: 'user quota is not enough',
          code: 'insufficient_user_quota',
        },
      },
    })
    const user = userEvent.setup()
    renderStep({
      useCase: 'api',
      status: {
        onboarding_inline_test_enabled: true,
        self_use_mode_enabled: true,
      },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Send test request' })
    )

    expect(await screen.findByText('Not enough balance')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Top up' })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(/Top up your balance/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Ask the administrator to raise your quota/)
    ).toBeInTheDocument()
  })

  it('reports an unavailable model when the gateway has no channel for it', async () => {
    mockFetchOnce({
      status: 503,
      body: {
        error: {
          message: 'No available channel for model gpt-4o',
          code: 'model_not_found',
        },
      },
    })
    const user = userEvent.setup()
    renderStep({
      useCase: 'api',
      status: { onboarding_inline_test_enabled: true },
    })

    await user.click(
      await screen.findByRole('button', { name: 'Send test request' })
    )

    expect(
      await screen.findByText('This model is not available')
    ).toBeInTheDocument()
  })

  it('ignores repeated clicks while a request is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {}
    const fetchMock = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve
      })
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    renderStep({
      useCase: 'api',
      status: { onboarding_inline_test_enabled: true },
    })

    const button = await screen.findByRole('button', {
      name: 'Send test request',
    })
    await user.click(button)
    await user.click(button)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(button).toBeDisabled()
    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    })
    expect(
      await screen.findByText('Your first request worked')
    ).toBeInTheDocument()
  })
})
