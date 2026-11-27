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
import { useCallback, useEffect, useRef, useState } from 'react'
import { SSE } from 'sse.js'

import { getFreshAuthHeaders } from '@/lib/api'

import { API_ENDPOINTS, ERROR_MESSAGES } from '../constants'
import {
  getStreamReadyStateError,
  isStreamClosedReadyState,
  isStreamDoneMessage,
  MESSAGES_STREAM_EVENT_TYPES,
  parseChatCompletionChunk,
  parseMessagesStreamEvent,
  parseResponsesStreamEvent,
  parseStreamErrorDetails,
  RESPONSES_STREAM_EVENT_TYPES,
  type ResponsesStreamEvent,
} from '../lib'
import type {
  GeneratedImage,
  MessagesBlockEvent,
  PlaygroundStreamRequest,
  ToolCallDelta,
} from '../types'

interface StreamEventSource {
  readyState?: number
  addEventListener: (
    type: string,
    listener: (event: Event & { data?: string; readyState?: number }) => void
  ) => void
  close: () => void
  stream: () => void
}

interface StreamRequestCallbacks {
  onUpdate: (type: 'reasoning' | 'content', chunk: string) => void
  onImage: (image: GeneratedImage) => void
  onToolCalls?: (deltas: ToolCallDelta[]) => void
  onMessagesBlock?: (event: MessagesBlockEvent) => void
  onComplete: () => void
  onError: (error: string, errorCode?: string) => void
}

function parseStreamEvent(
  format: PlaygroundStreamRequest['format'],
  data: string
): ResponsesStreamEvent {
  if (isStreamDoneMessage(data)) return { kind: 'done' }
  if (format === 'responses') return parseResponsesStreamEvent(data)
  if (format === 'messages') return parseMessagesStreamEvent(data)
  return { kind: 'updates', ...parseChatCompletionChunk(data) }
}

const STREAM_ENDPOINTS: Record<PlaygroundStreamRequest['format'], string> = {
  chat: API_ENDPOINTS.CHAT_COMPLETIONS,
  responses: API_ENDPOINTS.RESPONSES,
  messages: API_ENDPOINTS.MESSAGES,
}

// sse.js dispatches named events ("event: response.completed") under their
// own type, so Responses and Messages streams listen to each event they use.
const NAMED_STREAM_EVENT_TYPES: Record<
  PlaygroundStreamRequest['format'],
  readonly string[]
> = {
  chat: [],
  responses: RESPONSES_STREAM_EVENT_TYPES,
  messages: MESSAGES_STREAM_EVENT_TYPES,
}

interface StreamRequestControllerRuntime {
  getHeaders: () => Promise<Record<string, string>>
  createSource: (
    request: PlaygroundStreamRequest,
    headers: Record<string, string>
  ) => StreamEventSource
  setStreaming: (streaming: boolean) => void
}

export function createStreamRequestController(
  runtime: StreamRequestControllerRuntime
) {
  let source: StreamEventSource | null = null
  let generation = 0

  const closeActiveSource = (target: StreamEventSource) => {
    target.close()
    if (source === target) {
      source = null
      runtime.setStreaming(false)
    }
  }

  const send = async (
    request: PlaygroundStreamRequest,
    callbacks: StreamRequestCallbacks
  ) => {
    const requestGeneration = generation + 1
    generation = requestGeneration
    const previousSource = source
    source = null
    previousSource?.close()
    runtime.setStreaming(false)

    let headers: Record<string, string>
    try {
      headers = await runtime.getHeaders()
    } catch (error: unknown) {
      if (generation !== requestGeneration) return
      callbacks.onError(
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.STREAM_START_ERROR
      )
      return
    }
    if (generation !== requestGeneration) return

    const nextSource = runtime.createSource(request, headers)
    source = nextSource
    runtime.setStreaming(true)
    let completed = false

    const isCurrent = () =>
      generation === requestGeneration && source === nextSource

    const handleError = (errorMessage: string, errorCode?: string) => {
      if (!isCurrent() || completed) return
      completed = true
      callbacks.onError(errorMessage, errorCode)
      closeActiveSource(nextSource)
    }

    const handleMessage = (event: Event & { data?: string }) => {
      if (!isCurrent() || completed) return
      let streamEvent: ResponsesStreamEvent
      try {
        streamEvent = parseStreamEvent(request.format, event.data ?? '')
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to parse SSE message:', error)
        handleError(ERROR_MESSAGES.PARSE_ERROR)
        return
      }

      switch (streamEvent.kind) {
        case 'done':
          completed = true
          closeActiveSource(nextSource)
          callbacks.onComplete()
          return
        case 'error':
          handleError(streamEvent.errorMessage, streamEvent.errorCode)
          return
        case 'image':
          callbacks.onImage(streamEvent.image)
          return
        case 'updates':
          for (const update of streamEvent.updates) {
            callbacks.onUpdate(update.type, update.chunk)
          }
          if (streamEvent.block) {
            callbacks.onMessagesBlock?.(streamEvent.block)
          }
          if (streamEvent.toolCalls?.length) {
            callbacks.onToolCalls?.(streamEvent.toolCalls)
          }
      }
    }

    nextSource.addEventListener('message', handleMessage)
    for (const type of NAMED_STREAM_EVENT_TYPES[request.format]) {
      nextSource.addEventListener(type, handleMessage)
    }

    nextSource.addEventListener('error', (event) => {
      if (!isCurrent() || completed) return
      if (!isStreamClosedReadyState(nextSource.readyState)) {
        // eslint-disable-next-line no-console
        console.error('SSE Error:', event)
        const { errorCode, errorMessage } = parseStreamErrorDetails(event.data)
        handleError(errorMessage, errorCode)
      }
    })

    nextSource.addEventListener('readystatechange', (event) => {
      if (!isCurrent() || completed) return
      const errorMessage = getStreamReadyStateError(
        event.readyState,
        nextSource
      )

      if (errorMessage) {
        handleError(errorMessage)
      }
    })

    try {
      if (!isCurrent()) return
      nextSource.stream()
    } catch (error: unknown) {
      if (!isCurrent() || completed) return
      // eslint-disable-next-line no-console
      console.error('Failed to start SSE stream:', error)
      handleError(ERROR_MESSAGES.STREAM_START_ERROR)
    }
  }

  const cancel = (notify: boolean) => {
    generation += 1
    const activeSource = source
    source = null
    activeSource?.close()
    if (notify) runtime.setStreaming(false)
  }

  const stop = () => cancel(true)
  const dispose = () => cancel(false)

  return { send, stop, dispose }
}

/**
 * Hook for handling streaming chat completion requests
 */
export function useStreamRequest() {
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<ReturnType<
    typeof createStreamRequestController
  > | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = createStreamRequestController({
      getHeaders: getFreshAuthHeaders,
      createSource: (request, headers) =>
        new SSE(STREAM_ENDPOINTS[request.format], {
          headers,
          method: 'POST',
          payload: JSON.stringify(request.payload),
        }) as StreamEventSource,
      setStreaming: setIsStreaming,
    })
  }

  const sendStreamRequest = useCallback(
    (request: PlaygroundStreamRequest, callbacks: StreamRequestCallbacks) =>
      controllerRef.current?.send(request, callbacks),
    []
  )

  const stopStream = useCallback(() => {
    controllerRef.current?.stop()
  }, [])

  useEffect(
    () => () => {
      controllerRef.current?.dispose()
    },
    []
  )

  return {
    sendStreamRequest,
    stopStream,
    isStreaming,
  }
}
