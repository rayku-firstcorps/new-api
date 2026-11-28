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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { AnalyticsSettingsSection } from '../analytics-settings-section'

function Fixture() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <>
      <div ref={setContainer} />
      <SettingsPageProvider actionsContainer={container}>
        <AnalyticsSettingsSection
          defaultValues={{
            'analytics_setting.enabled': false,
            'analytics_setting.sample_rate': 100,
            'analytics_setting.retention_days': 90,
            'analytics_setting.respect_dnt': true,
            'analytics_setting.secret_rotated_at': 0,
          }}
        />
      </SettingsPageProvider>
    </>
  )
}

function renderSettings(role: number) {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'root', role })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <Fixture />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
  vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: true, message: '', data: { rotated_at: 1 } },
  })
  vi.spyOn(api, 'delete').mockResolvedValue({
    data: {
      success: true,
      message: '',
      data: { deleted: 12, handled_by_ttl: false },
    },
  })
})

afterEach(() => {
  useAuthStore.setState(useAuthStore.getInitialState(), true)
})

test('saving sends only the changed analytics options with typed values', async () => {
  const user = userEvent.setup()
  renderSettings(ROLE.SUPER_ADMIN)

  await user.click(
    screen.getByRole('switch', { name: 'Enable behavior analytics' })
  )
  fireEvent.change(
    screen.getByRole('spinbutton', { name: 'Sampling rate (%)' }),
    {
      target: { value: '40' },
    }
  )
  await user.click(
    screen.getByRole('button', { name: 'Save analytics settings' })
  )

  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2))
  expect(api.put).toHaveBeenCalledWith('/api/option/', {
    key: 'analytics_setting.enabled',
    value: true,
  })
  expect(api.put).toHaveBeenCalledWith('/api/option/', {
    key: 'analytics_setting.sample_rate',
    value: 40,
  })
})

test.each([
  ['Sampling rate (%)', '101'],
  ['Sampling rate (%)', '0'],
  ['Data retention (days)', '6'],
  ['Data retention (days)', '366'],
])(
  '%s = %s is rejected with a field error and nothing is saved',
  async (label, value) => {
    const user = userEvent.setup()
    renderSettings(ROLE.SUPER_ADMIN)
    const input = screen.getByRole('spinbutton', { name: label })

    fireEvent.change(input, { target: { value } })
    await user.click(
      screen.getByRole('button', { name: 'Save analytics settings' })
    )

    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(api.put).not.toHaveBeenCalled()
  }
)

test('an admin who is not root sees no rotate or delete buttons', () => {
  renderSettings(ROLE.ADMIN)

  expect(
    screen.queryByRole('button', { name: 'Rotate anonymous hash secret' })
  ).toBeNull()
  expect(
    screen.queryByRole('button', { name: 'Delete expired data now' })
  ).toBeNull()
})

test('cancelling the confirmation sends no request, confirming rotates', async () => {
  const user = userEvent.setup()
  renderSettings(ROLE.SUPER_ADMIN)

  await user.click(
    screen.getByRole('button', { name: 'Rotate anonymous hash secret' })
  )
  await user.click(await screen.findByRole('button', { name: 'Cancel' }))
  expect(api.post).not.toHaveBeenCalled()

  await user.click(
    screen.getByRole('button', { name: 'Rotate anonymous hash secret' })
  )
  await user.click(await screen.findByRole('button', { name: 'Rotate' }))
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/api/analytics/salt/rotate')
  )
})

test('confirming the expired data deletion calls the purge endpoint', async () => {
  const user = userEvent.setup()
  renderSettings(ROLE.SUPER_ADMIN)

  await user.click(
    screen.getByRole('button', { name: 'Delete expired data now' })
  )
  await user.click(await screen.findByRole('button', { name: 'Delete' }))

  await waitFor(() =>
    expect(api.delete).toHaveBeenCalledWith('/api/analytics/expired')
  )
})
