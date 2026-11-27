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
import type { Message, MessagesBlockEvent } from '../../../types'
import { applyChatCompletionChoice } from '../../message/message-streaming-utils'
import { getHostedToolsRoute } from '../../options/playground-option-utils'
import {
  applyMessagesBlockEvent,
  getMessagesResponseBlocks,
} from '../../streaming/messages-blocks'
import {
  buildChatCompletionPayload,
  buildMessagesPayload,
  buildResponsesPayload,
} from '../../streaming/payload-builder'
import {
  parseChatCompletionChunk,
  parseMessagesStreamEvent,
  parseResponsesStreamEvent,
} from '../../streaming/stream-utils'
import {
  getActiveHostedTools,
  getHostedToolActivities,
  getMessagesBlockSources,
  getResponsesHostedActivities,
  getTurnRequestFormat,
  upsertResponsesItem,
} from '../hosted-tools'
import { applyToolCallDeltas } from '../tool-calling'

const ALL_HOSTED = ['web_search', 'web_fetch', 'code_execution'] as const

function userMessage(content: string): Message {
  return {
    key: `user-${content}`,
    from: 'user',
    versions: [{ id: 'v', content }],
  }
}

function emptyAssistant(): Message {
  return {
    key: 'assistant-1',
    from: 'assistant',
    versions: [{ id: 'v', content: '' }],
    status: 'loading',
  }
}

/** Run Messages stream events through the parser into one assistant turn. */
function streamMessagesEvents(events: Record<string, unknown>[]): Message {
  let message = emptyAssistant()
  for (const event of events) {
    const parsed = parseMessagesStreamEvent(JSON.stringify(event))
    if (parsed.kind !== 'updates') continue
    if (parsed.block) {
      message = applyMessagesBlockEvent(
        message,
        parsed.block as MessagesBlockEvent
      )
    }
    message = applyToolCallDeltas(message, parsed.toolCalls ?? [])
  }
  return message
}

const searchResult = {
  type: 'web_search_tool_result',
  tool_use_id: 'srvtoolu_1',
  content: [
    {
      type: 'web_search_result',
      url: 'https://example.com/news',
      title: 'Example news',
      encrypted_content: 'enc-1',
    },
    {
      type: 'web_search_result',
      url: 'javascript:alert(1)',
      title: 'Not a page',
      encrypted_content: 'enc-2',
    },
  ],
}

const citation = {
  type: 'web_search_result_location',
  url: 'https://example.com/news',
  title: 'Example news',
  cited_text: 'It rained.',
  encrypted_index: 'idx-1',
}

const searchTurnEvents: Record<string, unknown>[] = [
  {
    type: 'content_block_start',
    index: 0,
    content_block: {
      type: 'server_tool_use',
      id: 'srvtoolu_1',
      name: 'web_search',
      input: {},
    },
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'input_json_delta', partial_json: '{"query":"wea' },
  },
  {
    type: 'content_block_delta',
    index: 0,
    delta: { type: 'input_json_delta', partial_json: 'ther"}' },
  },
  { type: 'content_block_start', index: 1, content_block: searchResult },
  {
    type: 'content_block_start',
    index: 2,
    content_block: { type: 'text', text: '' },
  },
  {
    type: 'content_block_delta',
    index: 2,
    delta: { type: 'citations_delta', citation },
  },
  {
    type: 'content_block_delta',
    index: 2,
    delta: { type: 'text_delta', text: 'It rained.' },
  },
]

describe('hosted tool selection', () => {
  test('a model goes to the native endpoint its catalog lists, Responses first', () => {
    expect(
      getHostedToolsRoute(['image-generation', 'openai'], 'gpt-image-2')
    ).toBe('none')
    expect(
      getHostedToolsRoute(['anthropic', 'openai'], 'claude-opus-5-5')
    ).toBe('messages')
    expect(getHostedToolsRoute(['openai', 'openai-response'], 'gpt-5.5')).toBe(
      'responses'
    )
    expect(getHostedToolsRoute(['openai', 'anthropic'], 'glm-5')).toBe(
      'messages'
    )
    expect(
      getHostedToolsRoute(
        ['openai', 'openai-response', 'anthropic'],
        'deepseek-chat'
      )
    ).toBe('responses')
    expect(getHostedToolsRoute(['openai'], 'gpt-5.5')).toBe('chat')
    expect(getHostedToolsRoute(undefined, 'gpt-5.5')).toBe('chat')
  })

  test('each route sends only the hosted tools it can carry', () => {
    expect(getActiveHostedTools([...ALL_HOSTED], 'messages')).toEqual([
      'web_search',
      'web_fetch',
      'code_execution',
    ])
    expect(getActiveHostedTools([...ALL_HOSTED], 'responses')).toEqual([
      'web_search',
      'code_execution',
    ])
    expect(getActiveHostedTools([...ALL_HOSTED], 'chat')).toEqual([
      'web_search',
    ])
    expect(getActiveHostedTools([...ALL_HOSTED], 'none')).toEqual([])
    expect(getActiveHostedTools(undefined, 'messages')).toEqual([])
  })

  test('a chat turn with a hosted tool on goes to its native route; others keep their format', () => {
    expect(getTurnRequestFormat('chat', 'responses', ['web_search'])).toBe(
      'responses'
    )
    expect(getTurnRequestFormat('chat', 'messages', ['web_fetch'])).toBe(
      'messages'
    )
    expect(getTurnRequestFormat('chat', 'responses', [])).toBe('chat')
    expect(getTurnRequestFormat('chat', 'chat', ['web_search'])).toBe('chat')
    expect(getTurnRequestFormat('messages', 'messages', [])).toBe('messages')
    expect(getTurnRequestFormat('responses', 'none', [])).toBe('responses')
  })

  test('Responses requests send flat function tools, the hosted tools and their include entries', () => {
    const payload = buildResponsesPayload(
      [userMessage('Plot sin(x)')],
      { ...DEFAULT_CONFIG, model: 'gpt-5.5' },
      [{ name: 'get_time', parameters: { type: 'object', properties: {} } }],
      ['web_search', 'code_execution']
    )

    expect(payload.tools).toEqual([
      {
        type: 'function',
        name: 'get_time',
        parameters: { type: 'object', properties: {} },
      },
      { type: 'web_search' },
      { type: 'code_interpreter', container: { type: 'auto' } },
    ])
    expect(payload.include).toEqual([
      'web_search_call.action.sources',
      'code_interpreter_call.outputs',
    ])
  })

  test('Responses history replays answered function calls as call and output items', () => {
    const answered: Message = {
      key: 'assistant-call',
      from: 'assistant',
      versions: [{ id: 'v', content: '' }],
      status: 'complete',
      toolCalls: [
        {
          index: 1,
          id: 'call_1',
          name: 'get_time',
          arguments: '{"tz":"UTC"}',
          result: '09:30',
        },
      ],
    }

    const payload = buildResponsesPayload(
      [userMessage('Time?'), answered],
      DEFAULT_CONFIG,
      [],
      ['web_search']
    )

    expect(payload.input).toEqual([
      { role: 'user', content: 'Time?' },
      {
        type: 'function_call',
        call_id: 'call_1',
        name: 'get_time',
        arguments: '{"tz":"UTC"}',
      },
      { type: 'function_call_output', call_id: 'call_1', output: '09:30' },
    ])
  })

  test('image model requests stay text input with no tools or include', () => {
    const payload = buildResponsesPayload([userMessage('A red fox')], {
      ...DEFAULT_CONFIG,
      model: 'gpt-image-2',
    })

    expect(payload).toEqual({
      model: 'gpt-image-2',
      group: DEFAULT_CONFIG.group,
      input: [{ role: 'user', content: 'A red fox' }],
      stream: true,
    })
  })

  test('Messages requests list the server tools after the function tools', () => {
    const payload = buildMessagesPayload(
      [userMessage('Weather in Paris?')],
      DEFAULT_CONFIG,
      [{ name: 'get_time', parameters: { type: 'object', properties: {} } }],
      ['web_search', 'code_execution']
    )

    expect(payload.tools).toEqual([
      {
        name: 'get_time',
        input_schema: { type: 'object', properties: {} },
      },
      { type: 'web_search_20250305', name: 'web_search', max_uses: 5 },
      { type: 'code_execution_20250825', name: 'code_execution' },
    ])
  })

  test('chat requests turn web search into web_search_options and send no tools list', () => {
    const withSearch = buildChatCompletionPayload(
      [userMessage('Weather in Paris?')],
      DEFAULT_CONFIG,
      DEFAULT_PARAMETER_ENABLED,
      [],
      ['web_search']
    )
    const without = buildChatCompletionPayload(
      [userMessage('Weather in Paris?')],
      DEFAULT_CONFIG,
      DEFAULT_PARAMETER_ENABLED
    )

    expect(withSearch.web_search_options).toEqual({})
    expect(withSearch.tools).toBeUndefined()
    expect(without).not.toHaveProperty('web_search_options')
  })
})

describe('hosted tool stream handling', () => {
  test('server tool input fragments build the hosted call, not a client tool call, and non-http results are dropped', () => {
    const message = streamMessagesEvents(searchTurnEvents)

    expect(message.toolCalls).toBeUndefined()
    expect(getHostedToolActivities(message.messagesBlocks)).toEqual([
      {
        id: 'srvtoolu_1',
        name: 'web_search',
        input: '{"query":"weather"}',
        result: {
          kind: 'search',
          results: [
            { href: 'https://example.com/news', title: 'Example news' },
          ],
        },
      },
    ])
  })

  test('a page cited twice becomes one source', () => {
    const message = streamMessagesEvents([
      ...searchTurnEvents,
      {
        type: 'content_block_delta',
        index: 2,
        delta: { type: 'citations_delta', citation },
      },
    ])

    expect(getMessagesBlockSources(message.messagesBlocks)).toEqual([
      { href: 'https://example.com/news', title: 'Example news' },
    ])
  })

  test('the next request replays hosted calls, results and citations unchanged', () => {
    const answered: Message = {
      ...streamMessagesEvents(searchTurnEvents),
      versions: [{ id: 'v', content: 'It rained.' }],
      status: 'complete',
    }

    const payload = buildMessagesPayload(
      [userMessage('Weather?'), answered, userMessage('And tomorrow?')],
      DEFAULT_CONFIG
    )

    expect(payload.messages[1]).toEqual({
      role: 'assistant',
      content: [
        {
          type: 'server_tool_use',
          id: 'srvtoolu_1',
          name: 'web_search',
          input: { query: 'weather' },
        },
        searchResult,
        { type: 'text', text: 'It rained.', citations: [citation] },
      ],
    })
  })

  test('fetch, code and error results are read from non-streaming blocks', () => {
    const blocks = getMessagesResponseBlocks({
      content: [
        {
          type: 'server_tool_use',
          id: 'f1',
          name: 'web_fetch',
          input: { url: 'https://example.com/doc' },
        },
        {
          type: 'web_fetch_tool_result',
          tool_use_id: 'f1',
          content: {
            type: 'web_fetch_result',
            url: 'https://example.com/doc',
            content: { type: 'document', title: 'Doc' },
          },
        },
        {
          type: 'server_tool_use',
          id: 'c1',
          name: 'bash_code_execution',
          input: { command: 'python -c "print(2+2)"' },
        },
        {
          type: 'bash_code_execution_tool_result',
          tool_use_id: 'c1',
          content: {
            type: 'bash_code_execution_result',
            stdout: '4\n',
            stderr: '',
            return_code: 0,
          },
        },
        {
          type: 'server_tool_use',
          id: 's1',
          name: 'web_search',
          input: { query: 'x' },
        },
        {
          type: 'web_search_tool_result',
          tool_use_id: 's1',
          content: {
            type: 'web_search_tool_result_error',
            error_code: 'max_uses_exceeded',
          },
        },
      ],
    })

    expect(
      getHostedToolActivities(blocks).map((activity) => activity.result)
    ).toEqual([
      {
        kind: 'fetch',
        page: { href: 'https://example.com/doc', title: 'Doc' },
      },
      { kind: 'code', stdout: '4\n', stderr: '', returnCode: 0 },
      { kind: 'error', errorCode: 'max_uses_exceeded' },
    ])
    expect(getMessagesBlockSources(blocks)).toEqual([
      { href: 'https://example.com/doc', title: 'Doc' },
    ])
  })

  test('chat url_citation annotations become sources when streaming and not', () => {
    const annotations = [
      {
        type: 'url_citation',
        url_citation: { url: 'https://example.com/a', title: 'A' },
      },
      {
        type: 'url_citation',
        url_citation: { url: 'https://example.com/a', title: 'A' },
      },
    ]

    const chunk = parseChatCompletionChunk(
      JSON.stringify({ choices: [{ index: 0, delta: { annotations } }] })
    )
    const completed = applyChatCompletionChoice(emptyAssistant(), {
      index: 0,
      message: { role: 'assistant', content: 'Answer', annotations },
      finish_reason: 'stop',
    })

    expect(chunk.sources).toEqual([
      { href: 'https://example.com/a', title: 'A' },
    ])
    expect(completed.sources).toEqual([
      { href: 'https://example.com/a', title: 'A' },
    ])
  })
})

describe('Responses hosted tool stream handling', () => {
  function parse(event: Record<string, unknown>) {
    const parsed = parseResponsesStreamEvent(JSON.stringify(event))
    if (parsed.kind !== 'updates') throw new Error(parsed.kind)
    return parsed
  }

  test('a function_call item and its argument deltas build one client tool call', () => {
    let message = emptyAssistant()
    for (const event of [
      {
        type: 'response.output_item.added',
        output_index: 2,
        item: {
          type: 'function_call',
          id: 'fc_1',
          call_id: 'call_1',
          name: 'get_time',
          arguments: '',
        },
      },
      {
        type: 'response.function_call_arguments.delta',
        output_index: 2,
        delta: '{"tz":',
      },
      {
        type: 'response.function_call_arguments.delta',
        output_index: 2,
        delta: '"UTC"}',
      },
    ]) {
      message = applyToolCallDeltas(message, parse(event).toolCalls ?? [])
    }

    expect(message.toolCalls).toEqual([
      { index: 2, id: 'call_1', name: 'get_time', arguments: '{"tz":"UTC"}' },
    ])
  })

  test('a web search item runs until done, then lists its sources', () => {
    const added = parse({
      type: 'response.output_item.added',
      output_index: 0,
      item: { type: 'web_search_call', id: 'ws_1', status: 'in_progress' },
    }).responsesItem
    const done = parse({
      type: 'response.output_item.done',
      output_index: 0,
      item: {
        type: 'web_search_call',
        id: 'ws_1',
        status: 'completed',
        action: {
          type: 'search',
          query: 'paris weather',
          sources: [{ type: 'url', url: 'https://example.com/w' }],
        },
      },
    }).responsesItem

    const running = upsertResponsesItem(undefined, added ?? {})
    const finished = upsertResponsesItem(running, done ?? {})

    expect(getResponsesHostedActivities(running)).toEqual([
      { id: 'ws_1', name: 'web_search', input: '{}' },
    ])
    expect(getResponsesHostedActivities(finished)).toEqual([
      {
        id: 'ws_1',
        name: 'web_search',
        input: '{"query":"paris weather"}',
        result: {
          kind: 'search',
          results: [
            { href: 'https://example.com/w', title: 'https://example.com/w' },
          ],
        },
      },
    ])
  })

  test('a code interpreter item shows its code and logs, and a failed one its status', () => {
    const items = [
      {
        type: 'code_interpreter_call',
        id: 'ci_1',
        status: 'completed',
        code: 'print(2+2)',
        outputs: [{ type: 'logs', logs: '4' }],
      },
      { type: 'code_interpreter_call', id: 'ci_2', status: 'failed', code: '' },
    ]

    expect(getResponsesHostedActivities(items)).toEqual([
      {
        id: 'ci_1',
        name: 'code_interpreter',
        input: '{"code":"print(2+2)"}',
        result: { kind: 'code', stdout: '4', stderr: '', returnCode: null },
      },
      {
        id: 'ci_2',
        name: 'code_interpreter',
        input: '{"code":""}',
        result: { kind: 'error', errorCode: 'failed' },
      },
    ])
  })

  test('url_citation annotations on output text become sources', () => {
    const parsed = parse({
      type: 'response.output_text.annotation.added',
      annotation: {
        type: 'url_citation',
        url: 'https://example.com/w',
        title: 'Weather',
      },
    })

    expect(parsed.sources).toEqual([
      { href: 'https://example.com/w', title: 'Weather' },
    ])
  })
})
