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
import type { Message, ToolCall } from '../../../types'
import { applyChatCompletionChoice } from '../../message/message-streaming-utils'
import {
  applyMessagesBlockEvent,
  getMessagesResponseBlocks,
} from '../../streaming/messages-blocks'
import {
  buildChatCompletionPayload,
  buildMessagesPayload,
} from '../../streaming/payload-builder'
import {
  getMessagesResponseChoice,
  parseChatCompletionChunk,
  parseMessagesStreamEvent,
} from '../../streaming/stream-utils'
import {
  applyToolCallDeltas,
  applyToolResults,
  parseToolDefinitions,
} from '../tool-calling'

const weatherTool = {
  name: 'get_weather',
  description: 'Get the weather',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string' } },
  },
}

function userMessage(content: string): Message {
  return {
    key: `user-${content}`,
    from: 'user',
    versions: [{ id: 'v', content }],
  }
}

function assistantMessage(
  content: string,
  extra: Partial<Message> = {}
): Message {
  return {
    key: `assistant-${content}`,
    from: 'assistant',
    versions: [{ id: 'v', content }],
    status: 'complete',
    ...extra,
  }
}

const answeredCall: ToolCall = {
  index: 0,
  id: 'call_1',
  name: 'get_weather',
  arguments: '{"city":"Paris"}',
  result: '18°C and sunny',
}

describe('tool definitions', () => {
  test('accepts the OpenAI shape, bare definitions and input_schema', () => {
    const result = parseToolDefinitions(
      JSON.stringify([
        { type: 'function', function: weatherTool },
        { name: 'get_time', input_schema: { type: 'object' } },
        { name: 'ping' },
      ])
    )

    expect(result.error).toBeNull()
    expect(result.tools).toEqual([
      weatherTool,
      { name: 'get_time', parameters: { type: 'object' } },
      { name: 'ping', parameters: { type: 'object', properties: {} } },
    ])
  })

  test('accepts a single object and treats blank text as no tools', () => {
    expect(parseToolDefinitions(JSON.stringify(weatherTool)).tools).toEqual([
      weatherTool,
    ])
    expect(parseToolDefinitions('  ').tools).toEqual([])
  })

  test.each([
    {
      name: 'invalid JSON',
      text: '[{',
      key: 'Tools must be valid JSON: {{error}}',
    },
    {
      name: 'non-object entry',
      text: '[1]',
      key: 'Tool {{index}} must be an object',
    },
    {
      name: 'name with spaces',
      text: '[{"name":"get weather"}]',
      key: 'Tool {{index}} needs a name of letters, digits, _ or - (up to 64)',
    },
    {
      name: 'duplicate name',
      text: '[{"name":"a"},{"name":"a"}]',
      key: 'Tool name {{name}} is used more than once',
    },
    {
      name: 'array parameters',
      text: '[{"name":"a","parameters":[]}]',
      key: 'Tool {{name}} parameters must be a JSON Schema object',
    },
  ])('rejects $name', ({ text, key }) => {
    const result = parseToolDefinitions(text)

    expect(result.tools).toBeNull()
    expect(result.error?.key).toBe(key)
  })
})

describe('tool calls from responses', () => {
  test('chat stream fragments merge by index into named calls', () => {
    const chunks = [
      {
        tool_calls: [
          {
            index: 0,
            id: 'call_1',
            function: { name: 'get_weather', arguments: '' },
          },
        ],
      },
      { tool_calls: [{ index: 0, function: { arguments: '{"city":' } }] },
      {
        tool_calls: [
          {
            index: 1,
            id: 'call_2',
            function: { name: 'ping', arguments: '{}' },
          },
        ],
      },
      { tool_calls: [{ index: 0, function: { arguments: '"Paris"}' } }] },
    ]
    let message = assistantMessage('', { status: 'streaming' })
    for (const delta of chunks) {
      const parsed = parseChatCompletionChunk(
        JSON.stringify({ choices: [{ delta }] })
      )
      message = applyToolCallDeltas(message, parsed.toolCalls)
    }

    expect(message.toolCalls).toEqual([
      {
        index: 0,
        id: 'call_1',
        name: 'get_weather',
        arguments: '{"city":"Paris"}',
      },
      { index: 1, id: 'call_2', name: 'ping', arguments: '{}' },
    ])
  })

  test('Messages stream builds the call and keeps blocks with the thinking signature', () => {
    const events = [
      {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'thinking', thinking: '', signature: '' },
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'signature_delta', signature: 'sig-1' },
      },
      {
        type: 'content_block_start',
        index: 1,
        content_block: {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'get_weather',
          input: {},
        },
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '{"city":' },
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'input_json_delta', partial_json: '"Paris"}' },
      },
    ]
    let message = assistantMessage('', { status: 'streaming' })
    for (const event of events) {
      const parsed = parseMessagesStreamEvent(JSON.stringify(event))
      if (parsed.kind !== 'updates') throw new Error('unexpected event')
      if (parsed.block) message = applyMessagesBlockEvent(message, parsed.block)
      message = applyToolCallDeltas(message, parsed.toolCalls ?? [])
    }

    expect(message.toolCalls).toEqual([
      {
        index: 1,
        id: 'toolu_1',
        name: 'get_weather',
        arguments: '{"city":"Paris"}',
      },
    ])
    expect(message.messagesBlocks).toEqual([
      { type: 'thinking', thinking: '', signature: 'sig-1' },
      {
        type: 'tool_use',
        id: 'toolu_1',
        name: 'get_weather',
        input: '{"city":"Paris"}',
      },
    ])
  })

  test('non-streaming Messages tool_use becomes a tool call and a kept block', () => {
    const response = {
      content: [
        { type: 'text', text: 'Checking.' },
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'get_weather',
          input: { city: 'Paris' },
        },
      ],
    }
    const choice = getMessagesResponseChoice(response)
    const message =
      choice && applyChatCompletionChoice(assistantMessage(''), choice)

    expect(message?.versions[0].content).toBe('Checking.')
    expect(message?.toolCalls).toEqual([
      {
        index: 0,
        id: 'toolu_1',
        name: 'get_weather',
        arguments: '{"city":"Paris"}',
      },
    ])
    expect(getMessagesResponseBlocks(response)).toEqual([
      { type: 'text', text: 'Checking.' },
      {
        type: 'tool_use',
        id: 'toolu_1',
        name: 'get_weather',
        input: '{"city":"Paris"}',
      },
    ])
  })
})

describe('tool results', () => {
  test('results are stored by call index and a new assistant turn follows', () => {
    const toolTurn = assistantMessage('', {
      toolCalls: [{ ...answeredCall, result: undefined }],
    })
    const loading = assistantMessage('', { key: 'loading', status: 'loading' })
    const next = applyToolResults(
      [userMessage('Weather?'), toolTurn],
      toolTurn.key,
      { '0': '18°C' },
      loading
    )

    expect(next?.[1].toolCalls?.[0].result).toBe('18°C')
    expect(next?.[2]).toBe(loading)
  })
})

describe('tool calling requests', () => {
  const config = { ...DEFAULT_CONFIG, model: 'test-model', stream: true }
  const tools = [weatherTool]

  test('chat replays answered calls as tool_calls plus tool messages', () => {
    const payload = buildChatCompletionPayload(
      [
        userMessage('Weather?'),
        assistantMessage('', { toolCalls: [answeredCall] }),
      ],
      config,
      DEFAULT_PARAMETER_ENABLED,
      tools
    )

    expect(payload.tools).toEqual([{ type: 'function', function: weatherTool }])
    expect(payload.messages.slice(1)).toEqual([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: { name: 'get_weather', arguments: '{"city":"Paris"}' },
          },
        ],
      },
      { role: 'tool', tool_call_id: 'call_1', content: '18°C and sunny' },
    ])
  })

  test('chat leaves out unanswered calls and an empty turn that only called tools', () => {
    const pending = { ...answeredCall, result: undefined }
    const payload = buildChatCompletionPayload(
      [
        userMessage('Weather?'),
        assistantMessage('Let me check.', { toolCalls: [pending] }),
        assistantMessage('', { key: 'empty-tool-turn', toolCalls: [pending] }),
        userMessage('Never mind'),
      ],
      config,
      DEFAULT_PARAMETER_ENABLED
    )

    expect(payload).not.toHaveProperty('tools')
    expect(payload.messages).toEqual([
      { role: 'user', content: 'Weather?' },
      { role: 'assistant', content: 'Let me check.' },
      { role: 'user', content: 'Never mind' },
    ])
  })

  test('Messages replays kept blocks unchanged and answers them with tool_result', () => {
    const payload = buildMessagesPayload(
      [
        userMessage('Weather?'),
        assistantMessage('', {
          toolCalls: [{ ...answeredCall, index: 1, id: 'toolu_1' }],
          messagesBlocks: [
            { type: 'thinking', thinking: '', signature: 'sig-1' },
            {
              type: 'tool_use',
              id: 'toolu_1',
              name: 'get_weather',
              input: '{"city":"Paris"}',
            },
          ],
        }),
      ],
      config,
      tools
    )

    expect(payload.tools).toEqual([
      {
        name: 'get_weather',
        description: 'Get the weather',
        input_schema: weatherTool.parameters,
      },
    ])
    expect(payload.messages.slice(1)).toEqual([
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig-1' },
          {
            type: 'tool_use',
            id: 'toolu_1',
            name: 'get_weather',
            input: { city: 'Paris' },
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_1',
            content: '18°C and sunny',
          },
        ],
      },
    ])
  })

  test('Messages builds tool_use from the call when no blocks were kept', () => {
    const payload = buildMessagesPayload(
      [
        userMessage('Weather?'),
        assistantMessage('Checking.', { toolCalls: [answeredCall] }),
      ],
      config
    )

    expect(payload.messages[1]).toEqual({
      role: 'assistant',
      content: [
        { type: 'text', text: 'Checking.' },
        {
          type: 'tool_use',
          id: 'call_1',
          name: 'get_weather',
          input: { city: 'Paris' },
        },
      ],
    })
  })

  test('Messages drops tool_use of unanswered calls but keeps the thinking and text', () => {
    const payload = buildMessagesPayload(
      [
        userMessage('Weather?'),
        assistantMessage('Checking.', {
          toolCalls: [{ ...answeredCall, result: undefined }],
          messagesBlocks: [
            { type: 'thinking', thinking: '', signature: 'sig-1' },
            { type: 'text', text: 'Checking.' },
            {
              type: 'tool_use',
              id: 'call_1',
              name: 'get_weather',
              input: '{}',
            },
          ],
        }),
        userMessage('Never mind'),
      ],
      config
    )

    expect(payload.messages).toEqual([
      { role: 'user', content: 'Weather?' },
      {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig-1' },
          { type: 'text', text: 'Checking.' },
        ],
      },
      { role: 'user', content: 'Never mind' },
    ])
  })
})
