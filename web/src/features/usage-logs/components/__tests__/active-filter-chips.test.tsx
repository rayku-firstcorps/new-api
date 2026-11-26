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
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'

import { ActiveFilterChips } from '../active-filter-chips'

afterEach(cleanup)

it('renders nothing when no filter is applied', () => {
  const { container } = render(
    <ActiveFilterChips chips={[]} onClearAll={vi.fn()} />
  )
  expect(container).toBeEmptyDOMElement()
})

it('removes only the chosen chip when its remove button is pressed', async () => {
  const user = userEvent.setup()
  const onRemoveModel = vi.fn()
  const onRemoveGroup = vi.fn()
  render(
    <ActiveFilterChips
      chips={[
        {
          key: 'model',
          label: 'Model',
          value: 'gpt-5',
          onRemove: onRemoveModel,
        },
        { key: 'group', label: 'Group', value: 'vip', onRemove: onRemoveGroup },
      ]}
      onClearAll={vi.fn()}
    />
  )

  await user.click(screen.getByRole('button', { name: 'Remove Model' }))

  expect(onRemoveModel).toHaveBeenCalledTimes(1)
  expect(onRemoveGroup).not.toHaveBeenCalled()
})

it('offers Clear only when more than one chip is applied', async () => {
  const user = userEvent.setup()
  const onClearAll = vi.fn()
  const single = [{ key: 'a', label: 'A', value: '1', onRemove: vi.fn() }]
  const { rerender } = render(
    <ActiveFilterChips chips={single} onClearAll={onClearAll} />
  )
  expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()

  rerender(
    <ActiveFilterChips
      chips={[
        ...single,
        { key: 'b', label: 'B', value: '2', onRemove: vi.fn() },
      ]}
      onClearAll={onClearAll}
    />
  )
  await user.click(screen.getByRole('button', { name: 'Clear' }))

  expect(onClearAll).toHaveBeenCalledTimes(1)
})
