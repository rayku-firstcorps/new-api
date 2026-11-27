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
import { afterEach, beforeEach, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { STORAGE_KEYS } from '../../../constants'
import type { Message } from '../../../types'
import {
  clearPlaygroundData,
  loadConfig,
  loadMessages,
  loadParameterEnabled,
  saveConfig,
  saveMessages,
  saveParameterEnabled,
} from '../storage'

const messages: Message[] = [
  {
    key: 'a-chat',
    from: 'user',
    versions: [{ id: 'a-version', content: 'Account A private chat' }],
  },
]

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

afterEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

test('switching accounts isolates config, messages and parameter toggles and preserves returning account data', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  saveConfig({ model: 'account-a-model' })
  saveMessages(messages)
  saveParameterEnabled({ temperature: true })

  useAuthStore.getState().auth.reset()
  useAuthStore.getState().auth.setUser({ id: 2, username: 'B', role: 1 })
  expect(loadConfig()).toEqual({})
  expect(loadMessages()).toBeNull()
  expect(loadParameterEnabled()).toEqual({})
  saveConfig({ model: 'account-b-model' })
  saveMessages([])
  saveParameterEnabled({ temperature: false })

  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  expect(loadConfig()).toEqual({ model: 'account-a-model' })
  expect(loadMessages()).toEqual(messages)
  expect(loadParameterEnabled()).toEqual({ temperature: true })

  clearPlaygroundData()
  expect(loadMessages()).toBeNull()
  useAuthStore.getState().auth.setUser({ id: 2, username: 'B', role: 1 })
  expect(loadConfig()).toEqual({ model: 'account-b-model' })
  expect(loadMessages()).toEqual([])
  expect(loadParameterEnabled()).toEqual({ temperature: false })
})

test('legacy global data is removed instead of assigned to the first signed-in account', () => {
  localStorage.setItem(
    STORAGE_KEYS.CONFIG,
    JSON.stringify({ model: 'legacy-model' })
  )
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
  localStorage.setItem(
    STORAGE_KEYS.PARAMETER_ENABLED,
    JSON.stringify({ temperature: true })
  )
  useAuthStore.getState().auth.setUser({ id: 2, username: 'B', role: 1 })

  expect(loadConfig()).toEqual({})
  expect(loadMessages()).toBeNull()
  expect(loadParameterEnabled()).toEqual({})
  for (const key of Object.values(STORAGE_KEYS)) {
    expect(localStorage.getItem(key)).toBeNull()
  }
})

test('storage calls without a signed-in user do not persist shared data', () => {
  saveConfig({ model: 'signed-out-model' })
  saveMessages(messages)
  saveParameterEnabled({ temperature: true })
  expect(loadConfig()).toEqual({})
  expect(loadMessages()).toBeNull()
  expect(loadParameterEnabled()).toEqual({})
  expect(localStorage.length).toBe(0)
})

test('saving messages drops generated image data and keeps the image placeholder', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  const imageMessage: Message = {
    key: 'image-reply',
    from: 'assistant',
    versions: [{ id: 'image-version', content: '' }],
    status: 'complete',
    images: [{ id: 'ig_1', mediaType: 'image/png', base64: 'iVBORw0KGgo' }],
  }

  saveMessages([imageMessage])

  expect(loadMessages()).toEqual([
    { ...imageMessage, images: [{ id: 'ig_1', mediaType: 'image/png' }] },
  ])
})

test('tool calls, results and Messages blocks survive a reload', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  const blocks: NonNullable<Message['messagesBlocks']> = []
  // Blocks are kept by stream index; index 0 here was a block that is not kept
  blocks[1] = { type: 'thinking', thinking: '', signature: 'sig-1' }
  blocks[2] = {
    type: 'tool_use',
    id: 'toolu_1',
    name: 'get_weather',
    input: '{}',
  }
  saveMessages([
    {
      key: 'tool-turn',
      from: 'assistant',
      versions: [{ id: 'v', content: '' }],
      status: 'complete',
      toolCalls: [
        {
          index: 2,
          id: 'toolu_1',
          name: 'get_weather',
          arguments: '{}',
          result: '18°C',
        },
      ],
      messagesBlocks: blocks,
    },
  ])

  const [loaded] = loadMessages() ?? []

  expect(loaded.toolCalls).toEqual([
    {
      index: 2,
      id: 'toolu_1',
      name: 'get_weather',
      arguments: '{}',
      result: '18°C',
    },
  ])
  expect(loaded.messagesBlocks).toEqual([
    { type: 'thinking', thinking: '', signature: 'sig-1' },
    { type: 'tool_use', id: 'toolu_1', name: 'get_weather', input: '{}' },
  ])
})

test('hosted tool switches, hosted calls, results and citations survive a reload', () => {
  useAuthStore.getState().auth.setUser({ id: 1, username: 'A', role: 1 })
  const result = {
    type: 'web_search_tool_result',
    tool_use_id: 'srvtoolu_1',
    content: [{ type: 'web_search_result', url: 'https://example.com' }],
  }
  const blocks: NonNullable<Message['messagesBlocks']> = [
    {
      type: 'server_tool_use',
      id: 'srvtoolu_1',
      name: 'web_search',
      input: '{"query":"news"}',
    },
    { type: 'server_tool_result', block: result },
    {
      type: 'text',
      text: 'News.',
      citations: [
        { type: 'web_search_result_location', url: 'https://example.com' },
      ],
    },
  ]
  const responsesItems = [
    {
      type: 'web_search_call',
      id: 'ws_1',
      status: 'completed',
      action: { type: 'search', query: 'news' },
    },
  ]
  saveConfig({ hosted_tools: ['web_search', 'code_execution'] })
  saveMessages([
    {
      key: 'search-turn',
      from: 'assistant',
      versions: [{ id: 'v', content: 'News.' }],
      status: 'complete',
      messagesBlocks: blocks,
    },
    {
      key: 'responses-turn',
      from: 'assistant',
      versions: [{ id: 'v2', content: 'More news.' }],
      status: 'complete',
      responsesItems,
    },
  ])

  const [loaded, loadedResponses] = loadMessages() ?? []

  expect(loadConfig().hosted_tools).toEqual(['web_search', 'code_execution'])
  expect(loaded.messagesBlocks).toEqual(blocks)
  expect(loadedResponses.responsesItems).toEqual(responsesItems)
})
