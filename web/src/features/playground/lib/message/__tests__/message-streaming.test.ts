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

import { parseStreamMessageUpdates } from '../../streaming/stream-utils'
import {
  applyChatCompletionResponse,
  applyStreamingChunk,
  completeAssistantMessage,
} from '../message-streaming-utils'
import { createLoadingAssistantMessage } from '../message-utils'

const reasoningCases = [
  {
    name: 'preserves reasoning_content',
    fields: { reasoning_content: 'Thought' },
    expected: 'Thought',
  },
  {
    name: 'accepts reasoning when reasoning_content is absent',
    fields: { reasoning: 'Thought' },
    expected: 'Thought',
  },
  {
    name: 'accepts reasoning when reasoning_content is null',
    fields: { reasoning_content: null, reasoning: 'Thought' },
    expected: 'Thought',
  },
  {
    name: 'prefers reasoning_content without appending reasoning',
    fields: { reasoning_content: 'Thought', reasoning: 'Other thought' },
    expected: 'Thought',
  },
  {
    name: 'preserves an explicitly empty reasoning_content',
    fields: { reasoning_content: '', reasoning: 'Other thought' },
    expected: undefined,
  },
  {
    name: 'keeps content-only responses free of reasoning',
    fields: {},
    expected: undefined,
  },
  {
    name: 'ignores null reasoning fields',
    fields: { reasoning_content: null, reasoning: null },
    expected: undefined,
  },
  {
    name: 'preserves think-tag extraction without reasoning fields',
    fields: { content: '<think>Thought</think>Answer' },
    expected: 'Thought',
  },
]

describe('chat completion reasoning', () => {
  test.each(reasoningCases)('streaming: $name', ({ fields, expected }) => {
    const updates = parseStreamMessageUpdates(
      JSON.stringify({
        choices: [{ delta: { content: 'Answer', ...fields } }],
      })
    )
    let message = createLoadingAssistantMessage(0)

    for (const update of updates) {
      message = applyStreamingChunk(message, update.type, update.chunk)
    }
    const completed = completeAssistantMessage(message)

    expect(completed.reasoning?.content).toBe(expected)
    expect(completed.versions[0].content).toBe('Answer')
    expect(completed.status).toBe('complete')
    expect(completed.isReasoningStreaming).toBe(false)
  })

  test.each(reasoningCases)('non-streaming: $name', ({ fields, expected }) => {
    const completed = applyChatCompletionResponse(
      createLoadingAssistantMessage(0),
      {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'test-model',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'Answer', ...fields },
            finish_reason: 'stop',
          },
        ],
      }
    )

    expect(completed).not.toBeNull()
    expect(completed?.reasoning?.content).toBe(expected)
    expect(completed?.versions[0].content).toBe('Answer')
    expect(completed?.status).toBe('complete')
    expect(completed?.isReasoningStreaming).toBe(false)
  })

  test('emits reasoning before content when both occur in one delta', () => {
    const updates = parseStreamMessageUpdates(
      JSON.stringify({
        choices: [{ delta: { reasoning: 'Thought', content: 'Answer' } }],
      })
    )

    expect(updates).toEqual([
      { type: 'reasoning', chunk: 'Thought' },
      { type: 'content', chunk: 'Answer' },
    ])
  })
})

describe('inline base64 images in content', () => {
  const pngData = 'iVBORw0KGgoAAAANSUhEUg=='
  const pngMarkdown = `![image](data:image/png;base64,${pngData})`

  function imagesOf(message: ReturnType<typeof createLoadingAssistantMessage>) {
    return (message.images ?? []).map(({ mediaType, base64 }) => ({
      mediaType,
      base64,
    }))
  }

  test('streamed image markdown moves to images and leaves the text', () => {
    let message = createLoadingAssistantMessage(0)
    message = applyStreamingChunk(message, 'content', 'Here it is:\n\n')
    message = applyStreamingChunk(message, 'content', pngMarkdown)

    expect(message.versions[0].content).toBe('Here it is:')
    expect(imagesOf(message)).toEqual([
      { mediaType: 'image/png', base64: pngData },
    ])
  })

  test('an image split across chunks is extracted once it is complete', () => {
    const splitAt = pngMarkdown.length - 6
    let message = createLoadingAssistantMessage(0)
    message = applyStreamingChunk(
      message,
      'content',
      pngMarkdown.slice(0, splitAt)
    )

    expect(message.images).toBeUndefined()

    message = applyStreamingChunk(
      message,
      'content',
      pngMarkdown.slice(splitAt)
    )

    expect(message.versions[0].content).toBe('')
    expect(imagesOf(message)).toEqual([
      { mediaType: 'image/png', base64: pngData },
    ])
  })

  test('non-streaming content with several images keeps their order', () => {
    const completed = applyChatCompletionResponse(
      createLoadingAssistantMessage(0),
      {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'gemini-image',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: `Two cats\n\n${pngMarkdown}\n\n![image](data:image/jpeg;base64,/9j/4AAQ)`,
            },
            finish_reason: 'stop',
          },
        ],
      }
    )

    expect(completed?.versions[0].content).toBe('Two cats')
    expect(completed && imagesOf(completed)).toEqual([
      { mediaType: 'image/png', base64: pngData },
      { mediaType: 'image/jpeg', base64: '/9j/4AAQ' },
    ])
  })

  test('non-image data URIs and remote images stay in the text', () => {
    const content =
      '[media](data:audio/wav;base64,UklGRg==) ![cat](https://example.com/cat.png)'
    const completed = completeAssistantMessage(
      applyStreamingChunk(createLoadingAssistantMessage(0), 'content', content)
    )

    expect(completed.versions[0].content).toBe(content)
    expect(completed.images).toBeUndefined()
  })
})
