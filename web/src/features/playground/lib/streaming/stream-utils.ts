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
import { ERROR_MESSAGES } from '../../constants'
import type {
  ChatCompletionChunk,
  GeneratedImage,
  MessagesResponse,
} from '../../types'
import type { ChatCompletionChoice } from '../message/message-streaming-utils'

const STREAM_DONE_MESSAGE = '[DONE]'
const STREAM_CLOSED_READY_STATE = 2

export type StreamUpdateType = 'reasoning' | 'content'

export type StreamMessageUpdate = {
  type: StreamUpdateType
  chunk: string
}

type StreamErrorPayload = {
  error?: {
    code?: string
    message?: string
  }
  // Responses streams send errors as { type: 'error', code, message }
  type?: string
  code?: string
  message?: string
}

export type StreamErrorDetails = {
  errorCode?: string
  errorMessage: string
}

export function parseStreamErrorDetails(data?: string): StreamErrorDetails {
  const fallbackMessage = data || ERROR_MESSAGES.API_REQUEST_ERROR

  if (!data) {
    return { errorMessage: fallbackMessage }
  }

  try {
    const parsed = JSON.parse(data) as StreamErrorPayload

    if (!parsed?.error) {
      if (parsed?.type === 'error' && parsed.message) {
        return {
          errorCode: parsed.code || undefined,
          errorMessage: parsed.message,
        }
      }
      return { errorMessage: fallbackMessage }
    }

    return {
      errorCode: parsed.error.code || undefined,
      errorMessage: parsed.error.message || fallbackMessage,
    }
  } catch {
    return { errorMessage: fallbackMessage }
  }
}

export function parseStreamMessageUpdates(data: string): StreamMessageUpdate[] {
  const chunk = JSON.parse(data) as ChatCompletionChunk
  const delta = chunk.choices?.[0]?.delta

  if (!delta) {
    return []
  }

  const updates: StreamMessageUpdate[] = []
  const reasoning = delta.reasoning_content ?? delta.reasoning

  if (reasoning) {
    updates.push({ type: 'reasoning', chunk: reasoning })
  }

  if (delta.content) {
    updates.push({ type: 'content', chunk: delta.content })
  }

  return updates
}

type ResponsesStreamPayload = {
  type?: string
  delta?: string
  item_id?: string
  partial_image_b64?: string
  output_format?: string
  item?: {
    type?: string
    id?: string
    result?: string
    output_format?: string
  }
  response?: {
    error?: { code?: string; message?: string } | null
  }
  code?: string
  message?: string
  error?: { code?: string; message?: string }
}

// Named Responses events the playground handles. "error" is left out: sse.js
// routes it to the stream error listener, which parses the same payload.
export const RESPONSES_STREAM_EVENT_TYPES = [
  'response.output_text.delta',
  'response.reasoning_summary_text.delta',
  'response.reasoning_text.delta',
  'response.image_generation_call.partial_image',
  'response.output_item.done',
  'response.completed',
  'response.done',
  'response.incomplete',
  'response.failed',
] as const

export type ResponsesStreamEvent =
  | { kind: 'updates'; updates: StreamMessageUpdate[] }
  | { kind: 'image'; image: GeneratedImage }
  | { kind: 'done' }
  | ({ kind: 'error' } & StreamErrorDetails)

function getImageMediaType(outputFormat?: string): string {
  return `image/${outputFormat || 'png'}`
}

/**
 * Map one Responses API stream event to a playground update. Final images
 * come from response.output_item.done; partial images share the item id so
 * the final image replaces them. Images repeated in response.completed are
 * ignored. Unknown event types produce no update.
 */
export function parseResponsesStreamEvent(data: string): ResponsesStreamEvent {
  const event = JSON.parse(data) as ResponsesStreamPayload

  switch (event.type) {
    case 'response.output_text.delta':
      return {
        kind: 'updates',
        updates: event.delta ? [{ type: 'content', chunk: event.delta }] : [],
      }
    case 'response.reasoning_summary_text.delta':
    case 'response.reasoning_text.delta':
      return {
        kind: 'updates',
        updates: event.delta ? [{ type: 'reasoning', chunk: event.delta }] : [],
      }
    case 'response.image_generation_call.partial_image':
      if (!event.item_id || !event.partial_image_b64) break
      return {
        kind: 'image',
        image: {
          id: event.item_id,
          mediaType: getImageMediaType(event.output_format),
          base64: event.partial_image_b64,
        },
      }
    case 'response.output_item.done': {
      const item = event.item
      if (item?.type !== 'image_generation_call' || !item.id || !item.result) {
        break
      }
      return {
        kind: 'image',
        image: {
          id: item.id,
          mediaType: getImageMediaType(item.output_format),
          base64: item.result,
        },
      }
    }
    case 'response.completed':
    case 'response.done':
    case 'response.incomplete':
      return { kind: 'done' }
    case 'response.failed':
      return {
        kind: 'error',
        errorCode: event.response?.error?.code || undefined,
        errorMessage:
          event.response?.error?.message || ERROR_MESSAGES.API_REQUEST_ERROR,
      }
    case 'error':
      return {
        kind: 'error',
        errorCode: event.code || event.error?.code || undefined,
        errorMessage:
          event.message ||
          event.error?.message ||
          ERROR_MESSAGES.API_REQUEST_ERROR,
      }
  }

  return { kind: 'updates', updates: [] }
}

type MessagesStreamPayload = {
  type?: string
  delta?: {
    type?: string
    text?: string
    thinking?: string
  }
}

// Named Messages events the playground handles. "error" is left out: sse.js
// routes it to the stream error listener, which reads its error.message.
export const MESSAGES_STREAM_EVENT_TYPES = [
  'content_block_delta',
  'message_stop',
] as const

/**
 * Map one Anthropic Messages stream event to a playground update. Text and
 * thinking deltas update the message, message_stop ends it, and the other
 * events (message_start, ping, signature deltas, ...) produce no update.
 */
export function parseMessagesStreamEvent(data: string): ResponsesStreamEvent {
  const event = JSON.parse(data) as MessagesStreamPayload

  if (event.type === 'message_stop') {
    return { kind: 'done' }
  }

  if (event.type !== 'content_block_delta') {
    return { kind: 'updates', updates: [] }
  }

  if (event.delta?.type === 'text_delta' && event.delta.text) {
    return {
      kind: 'updates',
      updates: [{ type: 'content', chunk: event.delta.text }],
    }
  }

  if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
    return {
      kind: 'updates',
      updates: [{ type: 'reasoning', chunk: event.delta.thinking }],
    }
  }

  return { kind: 'updates', updates: [] }
}

/**
 * Read a non-streaming Messages response as a chat completion choice: text
 * blocks form the content and thinking blocks the reasoning. Returns null
 * when the response carries no content array.
 */
export function getMessagesResponseChoice(
  response: MessagesResponse
): ChatCompletionChoice | null {
  if (!Array.isArray(response?.content)) {
    return null
  }

  let content = ''
  let reasoning = ''
  for (const block of response.content) {
    if (block.type === 'text' && block.text) content += block.text
    if (block.type === 'thinking' && block.thinking) reasoning += block.thinking
  }

  return {
    index: 0,
    message: {
      role: 'assistant',
      content,
      reasoning_content: reasoning || null,
    },
    finish_reason: 'stop',
  }
}

export function isStreamDoneMessage(data: string): boolean {
  return data === STREAM_DONE_MESSAGE
}

export function isStreamClosedReadyState(readyState?: number): boolean {
  return readyState === STREAM_CLOSED_READY_STATE
}

export function getStreamReadyStateError(
  eventReadyState: number | undefined,
  source: unknown
): string | null {
  const status = (source as { status?: number }).status

  if (
    eventReadyState !== undefined &&
    eventReadyState >= STREAM_CLOSED_READY_STATE &&
    status !== undefined &&
    status !== 200
  ) {
    return `HTTP ${status}: ${ERROR_MESSAGES.CONNECTION_CLOSED}`
  }

  return null
}
