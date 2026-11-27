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

import type { GeneratedImage, PlaygroundStreamRequest } from '../types'
import { createStreamRequestController } from './use-stream-request'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

class FakeStreamSource {
  readyState = 0
  closed = false
  streamed = false
  private listeners = new Map<
    string,
    Array<(event: Event & { data?: string; readyState?: number }) => void>
  >()

  addEventListener(
    type: string,
    listener: (event: Event & { data?: string; readyState?: number }) => void
  ) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  close() {
    this.closed = true
  }

  stream() {
    this.streamed = true
  }

  emit(type: string, data?: string) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data, readyState: this.readyState } as Event & {
        data?: string
        readyState?: number
      })
    }
  }
}

const payload: PlaygroundStreamRequest = {
  format: 'chat',
  payload: {
    model: 'test-model',
    messages: [{ role: 'user', content: 'hello' }],
    stream: true,
  },
}

const noopCallbacks = {
  onUpdate: () => undefined,
  onImage: () => undefined,
  onComplete: () => undefined,
  onError: () => undefined,
}

describe('latest-wins stream request coordination', () => {
  test('only creates a stream for the latest header request', async () => {
    const firstHeaders = deferred<Record<string, string>>()
    const secondHeaders = deferred<Record<string, string>>()
    let headerRequest = 0
    const sources: FakeStreamSource[] = []
    const controller = createStreamRequestController({
      getHeaders: () => {
        headerRequest += 1
        return headerRequest === 1
          ? firstHeaders.promise
          : secondHeaders.promise
      },
      createSource: () => {
        const source = new FakeStreamSource()
        sources.push(source)
        return source
      },
      setStreaming: () => undefined,
    })

    const first = controller.send(payload, noopCallbacks)
    const second = controller.send(payload, noopCallbacks)
    firstHeaders.resolve({ Authorization: 'Bearer stale' })
    await first
    expect(sources.length).toBe(0)

    secondHeaders.resolve({ Authorization: 'Bearer current' })
    await second
    expect(sources.length).toBe(1)
    expect(sources[0]?.streamed).toBe(true)
  })

  test('stop cancels a request that is still waiting for headers', async () => {
    const headers = deferred<Record<string, string>>()
    let sourceCount = 0
    const controller = createStreamRequestController({
      getHeaders: () => headers.promise,
      createSource: () => {
        sourceCount += 1
        return new FakeStreamSource()
      },
      setStreaming: () => undefined,
    })

    const request = controller.send(payload, noopCallbacks)
    controller.stop()
    headers.resolve({ Authorization: 'Bearer ignored' })
    await request

    expect(sourceCount).toBe(0)
  })

  test('dispose cancels a pending header request without a state update', async () => {
    const headers = deferred<Record<string, string>>()
    const streamingStates: boolean[] = []
    let sourceCount = 0
    const controller = createStreamRequestController({
      getHeaders: () => headers.promise,
      createSource: () => {
        sourceCount += 1
        return new FakeStreamSource()
      },
      setStreaming: (streaming) => streamingStates.push(streaming),
    })

    const request = controller.send(payload, noopCallbacks)
    controller.dispose()
    headers.resolve({ Authorization: 'Bearer ignored' })
    await request

    expect(sourceCount).toBe(0)
    expect(streamingStates).toEqual([false])
  })

  test('closes the previous source and ignores all of its later events', async () => {
    const nextHeaders = deferred<Record<string, string>>()
    let headerRequest = 0
    const sources: FakeStreamSource[] = []
    const updates: string[] = []
    const controller = createStreamRequestController({
      getHeaders: () => {
        headerRequest += 1
        if (headerRequest === 1) {
          return Promise.resolve({ Authorization: 'Bearer first' })
        }
        return nextHeaders.promise
      },
      createSource: () => {
        const source = new FakeStreamSource()
        sources.push(source)
        return source
      },
      setStreaming: () => undefined,
    })
    const callbacks = {
      onUpdate: (_type: 'reasoning' | 'content', chunk: string) =>
        updates.push(chunk),
      onImage: () => undefined,
      onComplete: () => undefined,
      onError: () => undefined,
    }

    await controller.send(payload, callbacks)
    const second = controller.send(payload, callbacks)
    expect(sources[0]?.closed).toBe(true)
    sources[0]?.emit(
      'message',
      JSON.stringify({ choices: [{ delta: { content: 'stale' } }] })
    )

    nextHeaders.resolve({ Authorization: 'Bearer second' })
    await second
    sources[1]?.emit(
      'message',
      JSON.stringify({ choices: [{ delta: { content: 'current' } }] })
    )

    expect(updates).toEqual(['current'])
  })
})

const responsesRequest: PlaygroundStreamRequest = {
  format: 'responses',
  payload: {
    model: 'gpt-image-test',
    input: [{ role: 'user', content: 'a red apple' }],
    stream: true,
  },
}

async function startResponsesStream() {
  const source = new FakeStreamSource()
  const updates: string[] = []
  const images: GeneratedImage[] = []
  const errors: Array<{ message: string; code?: string }> = []
  let completions = 0
  const controller = createStreamRequestController({
    getHeaders: () => Promise.resolve({}),
    createSource: () => source,
    setStreaming: () => undefined,
  })
  await controller.send(responsesRequest, {
    onUpdate: (_type, chunk) => updates.push(chunk),
    onImage: (image) => images.push(image),
    onComplete: () => {
      completions += 1
    },
    onError: (message, code) => errors.push({ message, code }),
  })
  return {
    source,
    updates,
    images,
    errors,
    getCompletions: () => completions,
  }
}

describe('responses image stream', () => {
  test('named output_item.done event delivers the generated image', async () => {
    const stream = await startResponsesStream()

    stream.source.emit(
      'response.output_item.done',
      JSON.stringify({
        type: 'response.output_item.done',
        item: {
          type: 'image_generation_call',
          id: 'ig_1',
          status: 'completed',
          result: 'iVBORw0KGgo',
          output_format: 'png',
        },
      })
    )

    expect(stream.images).toEqual([
      { id: 'ig_1', mediaType: 'image/png', base64: 'iVBORw0KGgo' },
    ])
  })

  test('named output_text.delta event delivers content text', async () => {
    const stream = await startResponsesStream()

    stream.source.emit(
      'response.output_text.delta',
      JSON.stringify({ type: 'response.output_text.delta', delta: 'Here' })
    )

    expect(stream.updates).toEqual(['Here'])
  })

  test('response.completed completes once and ignores its repeated output', async () => {
    const stream = await startResponsesStream()

    stream.source.emit(
      'response.completed',
      JSON.stringify({
        type: 'response.completed',
        response: {
          status: 'completed',
          output: [
            { type: 'image_generation_call', id: 'ig_1', result: 'iVBOR' },
          ],
        },
      })
    )

    expect(stream.getCompletions()).toBe(1)
    expect(stream.images).toEqual([])
    expect(stream.source.closed).toBe(true)
  })

  test('response.failed reports the upstream error message', async () => {
    const stream = await startResponsesStream()

    stream.source.emit(
      'response.failed',
      JSON.stringify({
        type: 'response.failed',
        response: {
          status: 'failed',
          error: { code: 'server_error', message: 'Image generation failed' },
        },
      })
    )

    expect(stream.errors).toEqual([
      { message: 'Image generation failed', code: 'server_error' },
    ])
    expect(stream.getCompletions()).toBe(0)
  })

  test('chat stream does not subscribe to named responses events', async () => {
    const source = new FakeStreamSource()
    const images: GeneratedImage[] = []
    const controller = createStreamRequestController({
      getHeaders: () => Promise.resolve({}),
      createSource: () => source,
      setStreaming: () => undefined,
    })
    await controller.send(payload, {
      ...noopCallbacks,
      onImage: (image) => images.push(image),
    })

    source.emit(
      'response.output_item.done',
      JSON.stringify({
        type: 'response.output_item.done',
        item: { type: 'image_generation_call', id: 'ig_1', result: 'iVBOR' },
      })
    )

    expect(images).toEqual([])
  })
})

const messagesRequest: PlaygroundStreamRequest = {
  format: 'messages',
  payload: {
    model: 'claude-test',
    messages: [{ role: 'user', content: 'hello' }],
    max_tokens: 1024,
    stream: true,
  },
}

async function startMessagesStream() {
  const source = new FakeStreamSource()
  const updates: Array<{ type: string; chunk: string }> = []
  const errors: Array<{ message: string; code?: string }> = []
  let completions = 0
  const controller = createStreamRequestController({
    getHeaders: () => Promise.resolve({}),
    createSource: () => source,
    setStreaming: () => undefined,
  })
  await controller.send(messagesRequest, {
    ...noopCallbacks,
    onUpdate: (type, chunk) => updates.push({ type, chunk }),
    onComplete: () => {
      completions += 1
    },
    onError: (message, code) => errors.push({ message, code }),
  })
  return { source, updates, errors, getCompletions: () => completions }
}

describe('anthropic messages stream', () => {
  test('named content_block_delta events deliver thinking and text', async () => {
    const stream = await startMessagesStream()

    stream.source.emit(
      'content_block_delta',
      JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'thinking_delta', thinking: 'Let me think' },
      })
    )
    stream.source.emit(
      'content_block_delta',
      JSON.stringify({
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'signature_delta', signature: 'sig' },
      })
    )
    stream.source.emit(
      'content_block_delta',
      JSON.stringify({
        type: 'content_block_delta',
        index: 1,
        delta: { type: 'text_delta', text: 'Hello' },
      })
    )

    expect(stream.updates).toEqual([
      { type: 'reasoning', chunk: 'Let me think' },
      { type: 'content', chunk: 'Hello' },
    ])
  })

  test('message_stop completes the stream and closes the source', async () => {
    const stream = await startMessagesStream()

    stream.source.emit('message_stop', JSON.stringify({ type: 'message_stop' }))

    expect(stream.getCompletions()).toBe(1)
    expect(stream.source.closed).toBe(true)
  })

  test('error event reports the Anthropic error message', async () => {
    const stream = await startMessagesStream()

    stream.source.emit(
      'error',
      JSON.stringify({
        type: 'error',
        error: { type: 'overloaded_error', message: 'Overloaded' },
      })
    )

    expect(stream.errors).toEqual([{ message: 'Overloaded', code: undefined }])
    expect(stream.getCompletions()).toBe(0)
  })
})

describe('tool call streams', () => {
  test('a named content_block_start event delivers the tool call and its block', async () => {
    const source = new FakeStreamSource()
    const toolCalls: unknown[] = []
    const blocks: unknown[] = []
    const controller = createStreamRequestController({
      getHeaders: () => Promise.resolve({}),
      createSource: () => source,
      setStreaming: () => undefined,
    })
    await controller.send(messagesRequest, {
      ...noopCallbacks,
      onToolCalls: (deltas) => toolCalls.push(...deltas),
      onMessagesBlock: (event) => blocks.push(event),
    })

    const contentBlock = {
      type: 'tool_use',
      id: 'toolu_1',
      name: 'get_weather',
      input: {},
    }
    source.emit(
      'content_block_start',
      JSON.stringify({
        type: 'content_block_start',
        index: 1,
        content_block: contentBlock,
      })
    )

    expect(toolCalls).toEqual([
      { index: 1, id: 'toolu_1', name: 'get_weather' },
    ])
    expect(blocks).toEqual([{ kind: 'start', index: 1, block: contentBlock }])
  })

  test('chat tool_calls deltas reach onToolCalls without content updates', async () => {
    const source = new FakeStreamSource()
    const updates: string[] = []
    const toolCalls: unknown[] = []
    const controller = createStreamRequestController({
      getHeaders: () => Promise.resolve({}),
      createSource: () => source,
      setStreaming: () => undefined,
    })
    await controller.send(payload, {
      ...noopCallbacks,
      onUpdate: (_type, chunk) => updates.push(chunk),
      onToolCalls: (deltas) => toolCalls.push(...deltas),
    })

    source.emit(
      'message',
      JSON.stringify({
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_1',
                  function: { name: 'get_weather', arguments: '{"ci' },
                },
              ],
            },
          },
        ],
      })
    )

    expect(updates).toEqual([])
    expect(toolCalls).toEqual([
      { index: 0, id: 'call_1', name: 'get_weather', arguments: '{"ci' },
    ])
  })
})
