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
import { beforeEach, expect, it, vi } from 'vitest'

import { SetupWizard } from '../setup-wizard'

const navigate = vi.hoisted(() => vi.fn())
const submitSetup = vi.hoisted(() => vi.fn())

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => null,
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    systemName: 'TestSite',
    logo: '/logo.png',
    loading: false,
  }),
}))

vi.mock('../api', () => ({
  getSetupStatus: async () => ({
    success: true,
    data: { status: false, root_init: false, database_type: 'sqlite' },
  }),
  submitSetup,
  buildSetupPayload: (values: Record<string, unknown>) => values,
}))

beforeEach(() => {
  navigate.mockReset()
  submitSetup.mockReset()
  submitSetup.mockResolvedValue({ success: true })
})

function renderWizard() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <SetupWizard />
    </QueryClientProvider>
  )
}

it('redirects to sign-in with from=setup after a successful initialization', async () => {
  const user = userEvent.setup()
  renderWizard()

  await user.click(await screen.findByRole('button', { name: 'Next' }))
  await user.type(screen.getByLabelText('Administrator username'), 'root')
  await user.type(screen.getByLabelText('Password'), 'Forest7!Lake')
  await user.type(screen.getByLabelText('Confirm password'), 'Forest7!Lake')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Initialize system' }))

  await waitFor(
    () =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/sign-in',
        search: { from: 'setup' },
      }),
    { timeout: 3000 }
  )
})

it('keeps the user on the admin step when the passwords do not match', async () => {
  const user = userEvent.setup()
  renderWizard()

  await user.click(await screen.findByRole('button', { name: 'Next' }))
  await user.type(screen.getByLabelText('Administrator username'), 'root')
  await user.type(screen.getByLabelText('Password'), 'Forest7!Lake')
  await user.type(screen.getByLabelText('Confirm password'), 'Different1!Lake')
  await user.click(screen.getByRole('button', { name: 'Next' }))

  expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
  expect(submitSetup).not.toHaveBeenCalled()
  expect(screen.getAllByRole('listitem')[1]).toHaveAttribute(
    'aria-current',
    'step'
  )
})
