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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CCSwitchPanel } from '../cc-switch-panel'
import { CCSwitchDialog } from '../dialogs/cc-switch-dialog'

const getUserModels = vi.hoisted(() => vi.fn())
const toastWarning = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', () => ({ getUserModels }))
vi.mock('sonner', () => ({ toast: { warning: toastWarning } }))

function withClient(node: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>
  )
}

const openSpy = vi.fn()

beforeEach(() => {
  getUserModels.mockReset()
  getUserModels.mockResolvedValue({ success: true, data: ['claude-x'] })
  toastWarning.mockReset()
  openSpy.mockReset()
  vi.stubGlobal('open', openSpy)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CCSwitchDialog on the keys page', () => {
  it('warns instead of opening CC Switch when no primary model is chosen', async () => {
    const user = userEvent.setup()
    withClient(<CCSwitchDialog open onOpenChange={vi.fn()} tokenKey='abc123' />)

    await user.click(
      await screen.findByRole('button', { name: 'Open CC Switch' })
    )

    expect(toastWarning).toHaveBeenCalledWith('Please select a primary model')
    expect(openSpy).not.toHaveBeenCalled()
  })

  it('closes from the cancel button', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    withClient(
      <CCSwitchDialog open onOpenChange={onOpenChange} tokenKey='abc123' />
    )

    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('CCSwitchPanel', () => {
  it('opens the ccswitch deep link with the prefixed key and default model, then reports it', async () => {
    const onOpened = vi.fn()
    const user = userEvent.setup()
    withClient(
      <CCSwitchPanel
        tokenKey='abc123'
        defaultModel='claude-x'
        onOpened={onOpened}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Open CC Switch' }))

    const url = new URL(openSpy.mock.calls[0][0])
    expect(url.protocol).toBe('ccswitch:')
    expect(url.searchParams.get('apiKey')).toBe('sk-abc123')
    expect(url.searchParams.get('app')).toBe('claude')
    expect(url.searchParams.get('model')).toBe('claude-x')
    expect(onOpened).toHaveBeenCalledTimes(1)
  })

  it('disables the import while there is no key', () => {
    withClient(<CCSwitchPanel tokenKey='' defaultModel='claude-x' />)

    expect(
      screen.getByRole('button', { name: 'Open CC Switch' })
    ).toBeDisabled()
  })
})
