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
import { describe, expect, test } from 'vitest'

import type { HostedToolActivity } from '../../../lib'
import { MessageHostedTools } from '../message-hosted-tools'

const searchCall: HostedToolActivity = {
  id: 'srvtoolu_1',
  name: 'web_search',
  input: '{"query":"paris weather"}',
}

describe('MessageHostedTools', () => {
  test('a finished search names its query and lists the result pages when opened', async () => {
    const user = userEvent.setup()
    render(
      <MessageHostedTools
        activities={[
          {
            ...searchCall,
            result: {
              kind: 'search',
              results: [
                { href: 'https://example.com/weather', title: 'Paris weather' },
              ],
            },
          },
        ]}
        isPending={false}
      />
    )

    await user.click(
      screen.getByRole('button', { name: /Web search: paris weather/ })
    )

    expect(screen.getByText('Completed')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: /Paris weather/ }).getAttribute('href')
    ).toBe('https://example.com/weather')
  })

  test('a call without a result is running while the turn streams and not finished after', () => {
    const { rerender } = render(
      <MessageHostedTools activities={[searchCall]} isPending />
    )
    expect(screen.getByText('Running')).toBeTruthy()

    rerender(<MessageHostedTools activities={[searchCall]} isPending={false} />)
    expect(screen.getByText('Not finished')).toBeTruthy()
  })

  test('an error result shows the error code', async () => {
    const user = userEvent.setup()
    render(
      <MessageHostedTools
        activities={[
          {
            ...searchCall,
            result: { kind: 'error', errorCode: 'max_uses_exceeded' },
          },
        ]}
        isPending={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /Web search/ }))

    expect(
      screen.getByText('The tool returned an error: max_uses_exceeded')
    ).toBeTruthy()
  })

  test('code output shows stdout and the exit code', async () => {
    const user = userEvent.setup()
    render(
      <MessageHostedTools
        activities={[
          {
            id: 'c1',
            name: 'bash_code_execution',
            input: '{"command":"python -c \\"print(4)\\""}',
            result: { kind: 'code', stdout: '4', stderr: '', returnCode: 0 },
          },
        ]}
        isPending={false}
      />
    )

    await user.click(screen.getByRole('button', { name: /Code execution/ }))

    expect(screen.getByText('Exit code: 0')).toBeTruthy()
    expect(screen.getAllByText('4').length).toBeGreaterThan(0)
  })
})
