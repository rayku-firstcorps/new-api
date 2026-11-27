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
import { useState } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { SettingsPageProvider } from '../components/settings-page-context'
import { OnboardingSettingsSection } from '../operations/onboarding-settings-section'

const allOn = {
  'onboarding_setting.enabled': true,
  'onboarding_setting.auto_open_on_first_login': true,
  'onboarding_setting.allow_inline_test_request': true,
  'onboarding_setting.show_cc_switch': true,
  'onboarding_setting.admin_guide_enabled': true,
}

const childNames = [
  'Open the guide automatically on first login',
  'Allow sending a test request in the guide',
  'Show CC Switch one-click import',
  'Admin first-run channel guide',
]

function Fixture(props: { values: typeof allOn }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  return (
    <>
      <div ref={setContainer} />
      <SettingsPageProvider actionsContainer={container}>
        <OnboardingSettingsSection defaultValues={props.values} />
      </SettingsPageProvider>
    </>
  )
}

function renderSection(values: typeof allOn) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <Fixture values={values} />
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
})

test('master switch off disables the four child switches and keeps their values', async () => {
  const user = userEvent.setup()
  renderSection(allOn)
  await user.click(
    screen.getByRole('switch', { name: 'Enable user onboarding' })
  )
  for (const name of childNames) {
    const child = screen.getByRole('switch', { name })
    expect(child).toHaveAttribute('aria-disabled', 'true')
    expect(child).toBeChecked()
  }
})

test('master switch on leaves the child switches enabled', () => {
  renderSection(allOn)
  for (const name of childNames) {
    expect(screen.getByRole('switch', { name })).not.toHaveAttribute(
      'aria-disabled',
      'true'
    )
  }
})

test('saving submits only the changed onboarding option key', async () => {
  const user = userEvent.setup()
  renderSection(allOn)
  await user.click(
    screen.getByRole('switch', { name: 'Show CC Switch one-click import' })
  )
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'onboarding_setting.show_cc_switch',
      value: false,
    })
  )
  expect(api.put).toHaveBeenCalledTimes(1)
})
