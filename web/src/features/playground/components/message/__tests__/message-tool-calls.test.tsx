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
import { describe, expect, test, vi } from 'vitest'

import type { ToolCall } from '../../../types'
import { MessageToolCalls } from '../message-tool-calls'

const calls: ToolCall[] = [
  {
    index: 0,
    id: 'call_1',
    name: 'get_weather',
    arguments: '{"city":"Paris"}',
  },
  { index: 1, id: 'call_2', name: 'get_time', arguments: '{}' },
]

function renderToolCalls(options: {
  toolCalls?: ToolCall[]
  canSubmit: boolean
  onSubmit?: (results: Record<string, string>) => void
}) {
  return render(
    <MessageToolCalls
      canSubmit={options.canSubmit}
      messageKey='turn-1'
      onSubmit={options.onSubmit}
      toolCalls={options.toolCalls ?? calls}
    />
  )
}

describe('MessageToolCalls', () => {
  test('send stays disabled until every call has a result, then sends them by index', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderToolCalls({ canSubmit: true, onSubmit })
    const send = screen.getByRole('button', { name: 'Send tool results' })

    await user.type(screen.getByLabelText('Result for get_weather'), '18°C')

    expect(send).toHaveProperty('disabled', true)

    await user.type(screen.getByLabelText('Result for get_time'), '09:30')
    await user.click(send)

    expect(onSubmit).toHaveBeenCalledWith({ '0': '18°C', '1': '09:30' })
  })

  test('a turn that cannot take results shows the calls without inputs', () => {
    renderToolCalls({ canSubmit: false })

    expect(screen.getByText('get_weather')).toBeTruthy()
    expect(screen.queryByLabelText('Result for get_weather')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Send tool results' })
    ).toBeNull()
  })

  test('answered calls show their result and ask for nothing', () => {
    renderToolCalls({
      canSubmit: true,
      toolCalls: [{ ...calls[0], result: '18°C and sunny' }],
    })

    expect(screen.getByText('Result sent')).toBeTruthy()
    expect(screen.getByText(/18°C and sunny/)).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Send tool results' })
    ).toBeNull()
  })

  test('partial streamed arguments are shown as raw text', () => {
    renderToolCalls({
      canSubmit: false,
      toolCalls: [{ ...calls[0], arguments: '{"city":"Pa' }],
    })

    expect(screen.getByText('Generating arguments')).toBeTruthy()
    expect(screen.getByText(/"Pa/)).toBeTruthy()
  })
})
