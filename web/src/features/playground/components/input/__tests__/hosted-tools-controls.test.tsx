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

import { TooltipProvider } from '@/components/ui/tooltip'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import type { HostedToolKey, HostedToolsRoute } from '../../../types'
import { PlaygroundHostedToolsEditor } from '../playground-hosted-tools-editor'
import { PlaygroundInputTools } from '../playground-input-tools'

function renderInputTools(
  hostedTools: HostedToolKey[],
  hostedToolsRoute: HostedToolsRoute
) {
  const onConfigChange = vi.fn()
  render(
    <TooltipProvider>
      <PlaygroundInputTools
        config={{ ...DEFAULT_CONFIG, hosted_tools: hostedTools }}
        onConfigChange={onConfigChange}
        onParameterEnabledChange={vi.fn()}
        parameterEnabled={DEFAULT_PARAMETER_ENABLED}
        hostedToolsRoute={hostedToolsRoute}
      />
    </TooltipProvider>
  )
  return { onConfigChange }
}

describe('hosted tool switches', () => {
  test('a chat-completions model can switch on web search only; fetch and code say they are unavailable', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <PlaygroundHostedToolsEditor
        onChange={onChange}
        hostedToolsRoute='chat'
        value={['code_execution']}
      />
    )

    const codeSwitch = screen.getByRole('switch', { name: 'Code execution' })
    expect(codeSwitch.getAttribute('aria-checked')).toBe('false')
    expect(codeSwitch.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getAllByText('Not available for this model')).toHaveLength(2)

    await user.click(screen.getByRole('switch', { name: 'Web search' }))

    expect(onChange).toHaveBeenCalledWith(['code_execution', 'web_search'])
  })

  test('a Responses model can switch on code execution but not web fetch', () => {
    render(
      <PlaygroundHostedToolsEditor
        onChange={vi.fn()}
        hostedToolsRoute='responses'
        value={['code_execution', 'web_fetch']}
      />
    )

    const codeSwitch = screen.getByRole('switch', { name: 'Code execution' })
    const fetchSwitch = screen.getByRole('switch', { name: 'Web fetch' })
    expect(codeSwitch.getAttribute('aria-checked')).toBe('true')
    expect(codeSwitch.getAttribute('aria-disabled')).not.toBe('true')
    expect(fetchSwitch.getAttribute('aria-checked')).toBe('false')
    expect(fetchSwitch.getAttribute('aria-disabled')).toBe('true')
  })

  test('the globe button toggles web search and shows whether it is on', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = renderInputTools(['web_fetch'], 'messages')
    const globe = screen.getByRole('button', { name: 'Web search' })

    expect(globe.getAttribute('aria-pressed')).toBe('false')
    await user.click(globe)

    expect(onConfigChange).toHaveBeenCalledWith('hosted_tools', [
      'web_fetch',
      'web_search',
    ])
  })

  test('the globe button turns web search off when it is on', async () => {
    const user = userEvent.setup()
    const { onConfigChange } = renderInputTools(['web_search'], 'chat')
    const globe = screen.getByRole('button', { name: 'Web search' })

    expect(globe.getAttribute('aria-pressed')).toBe('true')
    await user.click(globe)

    expect(onConfigChange).toHaveBeenCalledWith('hosted_tools', [])
  })

  test('image models cannot search, so the globe button is disabled and not pressed', () => {
    renderInputTools(['web_search'], 'none')
    const globe = screen.getByRole('button', { name: 'Web search' })

    expect(globe.hasAttribute('disabled')).toBe(true)
    expect(globe.getAttribute('aria-pressed')).toBe('false')
  })
})
