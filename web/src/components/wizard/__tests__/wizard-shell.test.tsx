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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import { WizardShell } from '../wizard-shell'

const STEPS = [
  { titleKey: 'First step', descriptionKey: 'First description' },
  { titleKey: 'Second step', descriptionKey: 'Second description' },
  { titleKey: 'Third step', descriptionKey: 'Third description' },
]

function renderShell(props: { onSkip?: () => void; footer?: boolean } = {}) {
  return render(
    <WizardShell
      steps={STEPS}
      currentStep={1}
      title='Welcome'
      cardTitle='Wizard card'
      onSkip={props.onSkip}
      footer={
        props.footer ? <button type='button'>Footer action</button> : undefined
      }
    >
      <p>Step body</p>
    </WizardShell>
  )
}

it('marks only the active step as the current step', () => {
  renderShell()

  const items = screen.getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(items[0]).not.toHaveAttribute('aria-current')
  expect(items[1]).toHaveAttribute('aria-current', 'step')
  expect(items[2]).not.toHaveAttribute('aria-current')
  expect(screen.getByText('Step body')).toBeInTheDocument()
})

it('calls onSkip when the skip button is clicked', async () => {
  const user = userEvent.setup()
  const onSkip = vi.fn()
  renderShell({ onSkip })

  await user.click(screen.getByRole('button', { name: 'Skip' }))

  expect(onSkip).toHaveBeenCalledTimes(1)
})

it('renders no skip button and no footer when their props are omitted', () => {
  renderShell()

  expect(screen.queryByRole('button', { name: 'Skip' })).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Footer action' })
  ).not.toBeInTheDocument()
})

it('renders the footer slot when provided', () => {
  renderShell({ footer: true })

  expect(
    screen.getByRole('button', { name: 'Footer action' })
  ).toBeInTheDocument()
})
