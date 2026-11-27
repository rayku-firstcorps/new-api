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
import { describe, expect, test } from 'vitest'

import { DEFAULT_CONFIG, DEFAULT_PARAMETER_ENABLED } from '../../../constants'
import type { Message, ParameterEnabled } from '../../../types'
import { getPlaygroundRequestFormat } from '../../options/playground-option-utils'
import { buildMessagesPayload } from '../payload-builder'
import { getMessagesResponseChoice } from '../stream-utils'

function message(from: Message['from'], content: string): Message {
  return { key: `${from}-${content}`, from, versions: [{ id: 'v', content }] }
}

describe('playground request format', () => {
  test.each([
    {
      name: 'claude model with an anthropic endpoint uses messages',
      endpoints: ['anthropic', 'openai'],
      model: 'claude-sonnet-4-5',
      expected: 'messages',
    },
    {
      name: 'claude name match ignores case',
      endpoints: ['anthropic'],
      model: 'Claude-Opus-4',
      expected: 'messages',
    },
    {
      name: 'non-claude model listing anthropic stays on chat',
      endpoints: ['openai', 'anthropic', 'gemini'],
      model: 'gpt-5',
      expected: 'chat',
    },
    {
      name: 'claude model without an anthropic endpoint stays on chat',
      endpoints: ['openai'],
      model: 'claude-sonnet-4-5',
      expected: 'chat',
    },
    {
      name: 'image generation model uses responses',
      endpoints: ['image-generation', 'anthropic'],
      model: 'claude-image',
      expected: 'responses',
    },
    {
      name: 'missing catalog data stays on chat',
      endpoints: undefined,
      model: 'claude-sonnet-4-5',
      expected: 'chat',
    },
  ])('$name', ({ endpoints, model, expected }) => {
    expect(getPlaygroundRequestFormat(endpoints, model)).toBe(expected)
  })
})

describe('messages payload', () => {
  const config = { ...DEFAULT_CONFIG, model: 'claude-test', group: 'vip' }

  test('moves system messages to the top-level system prompt', () => {
    const payload = buildMessagesPayload(
      [
        message('system', 'Be brief'),
        message('user', 'Hi'),
        message('assistant', 'Hello'),
        message('user', 'Again'),
      ],
      config,
      DEFAULT_PARAMETER_ENABLED
    )

    expect(payload.system).toBe('Be brief')
    expect(payload.messages).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'Again' },
    ])
  })

  test('always sends max_tokens even when the parameter is disabled', () => {
    const payload = buildMessagesPayload(
      [message('user', 'Hi')],
      { ...config, max_tokens: 2048 },
      { ...DEFAULT_PARAMETER_ENABLED, max_tokens: false }
    )

    expect(payload.max_tokens).toBe(2048)
    expect(payload.system).toBeUndefined()
  })

  test('sends only temperature when temperature and top_p are enabled', () => {
    const payload = buildMessagesPayload([message('user', 'Hi')], config, {
      ...DEFAULT_PARAMETER_ENABLED,
      temperature: true,
      top_p: true,
    })

    expect(payload.temperature).toBe(config.temperature)
    expect(payload).not.toHaveProperty('top_p')
  })

  test('sends top_p when temperature is disabled', () => {
    const payload = buildMessagesPayload([message('user', 'Hi')], config, {
      ...DEFAULT_PARAMETER_ENABLED,
      temperature: false,
      top_p: true,
    })

    expect(payload.top_p).toBe(config.top_p)
    expect(payload).not.toHaveProperty('temperature')
  })

  test('drops parameters that Messages does not accept', () => {
    const enabled: ParameterEnabled = {
      temperature: true,
      top_p: true,
      max_tokens: true,
      frequency_penalty: true,
      presence_penalty: true,
      seed: true,
    }
    const payload = buildMessagesPayload(
      [message('user', 'Hi')],
      { ...config, seed: 42 },
      enabled
    )

    expect(Object.keys(payload).sort()).toEqual(
      [
        'group',
        'max_tokens',
        'messages',
        'model',
        'stream',
        'temperature',
      ].sort()
    )
  })
})

describe('messages response choice', () => {
  test('joins text blocks as content and thinking blocks as reasoning', () => {
    const choice = getMessagesResponseChoice({
      content: [
        { type: 'thinking', thinking: 'Considering' },
        { type: 'text', text: 'Hello' },
        { type: 'text', text: ' world' },
      ],
    })

    expect(choice?.message.content).toBe('Hello world')
    expect(choice?.message.reasoning_content).toBe('Considering')
  })

  test('returns null when the response has no content array', () => {
    expect(getMessagesResponseChoice({})).toBeNull()
  })
})
