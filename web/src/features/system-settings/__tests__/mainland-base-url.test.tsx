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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { normalizeMainlandBaseUrl } from '@/lib/mainland-base-url'

import { SettingsPageProvider } from '../components/settings-page-context'
import { SystemInfoSection } from '../general/system-info-section'

const defaults = {
  SystemName: 'New API',
  ServerAddress: '',
  TaskPublicAddress: '',
  Logo: '',
  general_setting: { docs_link: '', mainland_base_url: '' },
  legal: {},
}

async function renderSettings(value = '') {
  const i18n = createInstance()
  await i18n.init({ lng: 'en', fallbackLng: 'en', resources: {} })
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  client.setQueryData(['status'], { mainland_base_url: value })
  function Fixture() {
    const [container, setContainer] = useState<HTMLDivElement | null>(null)
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <div ref={setContainer} />
          <SettingsPageProvider actionsContainer={container}>
            <SystemInfoSection
              defaultValues={{
                ...defaults,
                general_setting: { docs_link: '', mainland_base_url: value },
              }}
            />
          </SettingsPageProvider>
        </QueryClientProvider>
      </I18nextProvider>
    )
  }
  const router = createRouter({
    routeTree: createRootRoute({ component: Fixture }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  return client
}

beforeEach(() => {
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
  localStorage.clear()
})

test('saving a domain sends its HTTPS URL and refreshes cached homepage status', async () => {
  const client = await renderSettings()
  localStorage.setItem('status', '{}')
  const user = userEvent.setup()
  await user.type(
    screen.getByRole('textbox', { name: 'Mainland China direct connection' }),
    'cn.kucodeapi.com'
  )
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'general_setting.mainland_base_url',
      value: 'https://cn.kucodeapi.com',
    })
  )
  expect(api.put).toHaveBeenCalledTimes(1)
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled()
  )
  expect(client.getQueryState(['status'])?.isInvalidated).toBe(true)
  expect(localStorage.getItem('status')).toBeNull()
})

test('clearing the configured endpoint saves an empty value', async () => {
  await renderSettings('https://cn.kucodeapi.com')
  const user = userEvent.setup()
  await user.clear(
    screen.getByRole('textbox', { name: 'Mainland China direct connection' })
  )
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'general_setting.mainland_base_url',
      value: '',
    })
  )
})

test('an unsafe address shows a field error and is not submitted', async () => {
  await renderSettings()
  const user = userEvent.setup()
  const field = screen.getByRole('textbox', {
    name: 'Mainland China direct connection',
  })
  await user.type(field, 'https://user:secret@cn.example.com')
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await screen.findByText(
    'Enter a domain or HTTPS URL without credentials, query parameters, or fragments'
  )
  expect(field).toHaveAttribute('aria-invalid', 'true')
  expect(api.put).not.toHaveBeenCalled()
})

test('a failed save retains the edited value for retry', async () => {
  vi.mocked(api.put).mockResolvedValue({
    data: { success: false, message: 'Save failed' },
  })
  await renderSettings()
  const user = userEvent.setup()
  const field = screen.getByRole('textbox', {
    name: 'Mainland China direct connection',
  })
  await user.type(field, 'cn.kucodeapi.com')
  await user.click(screen.getByRole('button', { name: 'Save Changes' }))
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled()
  )
  expect(field).toHaveValue('cn.kucodeapi.com')
  expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled()
})

test.each([
  ['', ''],
  ['  ', ''],
  [' cn.kucodeapi.com ', 'https://cn.kucodeapi.com'],
  ['https://CN.kucodeapi.com/', 'https://cn.kucodeapi.com'],
  [
    'https://cn.kucodeapi.com:8443/gateway/v1/',
    'https://cn.kucodeapi.com:8443/gateway/v1',
  ],
  ['http://cn.example.com', null],
  ['javascript:alert(1)', null],
  ['https://', null],
  ['/relative', null],
  ['not-a-domain', null],
  ['https://@cn.example.com', null],
  ['https://cn.example.com?token=secret', null],
  ['https://cn.example.com#', null],
  ['https://cn.example.com\\path', null],
  ['https://cn.example.com/a b', null],
  ['https://cn.example.com:65536', null],
  ['https://cn.example.com:0', null],
  ['https://cn.example.com:', null],
  ['https://-bad.example.com', null],
  ['https://cn..example.com', null],
])('normalizes mainland address %s to %s', (input, expected) => {
  expect(normalizeMainlandBaseUrl(input)).toBe(expected)
})
