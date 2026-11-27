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
import { DEFAULT_CONFIG } from '../../constants'
import type {
  ChatCompletionRequest,
  Message,
  MessagesRequest,
  PlaygroundConfig,
  ParameterEnabled,
  ResponsesRequest,
} from '../../types'
import {
  formatMessageForAPI,
  getMessageContent,
  isValidMessage,
} from '../message/message-utils'

/**
 * Build API request payload from messages and config
 */
export function buildChatCompletionPayload(
  messages: Message[],
  config: PlaygroundConfig,
  parameterEnabled: ParameterEnabled
): ChatCompletionRequest {
  // Filter and format valid messages
  const processedMessages = messages
    .filter(isValidMessage)
    .map(formatMessageForAPI)

  const payload: ChatCompletionRequest = {
    model: config.model,
    group: config.group,
    messages: processedMessages,
    stream: config.stream,
  }

  if (parameterEnabled.temperature) {
    payload.temperature = config.temperature
  }

  if (parameterEnabled.top_p) {
    payload.top_p = config.top_p
  }

  if (parameterEnabled.max_tokens) {
    payload.max_tokens = config.max_tokens
  }

  if (parameterEnabled.frequency_penalty) {
    payload.frequency_penalty = config.frequency_penalty
  }

  if (parameterEnabled.presence_penalty) {
    payload.presence_penalty = config.presence_penalty
  }

  if (parameterEnabled.seed && config.seed !== null) {
    payload.seed = config.seed
  }

  return payload
}

/**
 * Build an Anthropic Messages payload. System messages become the top-level
 * system prompt. max_tokens is required by the API, so it is always sent.
 * Sampling parameters (temperature, top_p) are never sent: current Claude
 * models reject them with a 400, and pass-through channels forward the body
 * unchanged. Penalties and seed have no Messages equivalent.
 */
export function buildMessagesPayload(
  messages: Message[],
  config: PlaygroundConfig
): MessagesRequest {
  const validMessages = messages.filter(isValidMessage)
  const system = validMessages
    .filter((message) => message.from === 'system')
    .map(getMessageContent)
    .filter((content) => content.trim() !== '')
    .join('\n\n')

  const payload: MessagesRequest = {
    model: config.model,
    group: config.group,
    messages: validMessages
      .filter((message) => message.from !== 'system')
      .map((message) => ({
        role: message.from === 'assistant' ? 'assistant' : 'user',
        content: getMessageContent(message),
      })),
    max_tokens:
      config.max_tokens > 0 ? config.max_tokens : DEFAULT_CONFIG.max_tokens,
    stream: config.stream,
  }

  if (system) {
    payload.system = system
  }

  return payload
}

/**
 * Build a streaming Responses payload for image generation models. Sampling
 * parameters are left out because image models do not accept them; earlier
 * generated images are not sent back, only the text of each turn.
 */
export function buildResponsesPayload(
  messages: Message[],
  config: PlaygroundConfig
): ResponsesRequest {
  return {
    model: config.model,
    group: config.group,
    input: messages.filter(isValidMessage).map((message) => ({
      role: message.from,
      content: getMessageContent(message),
    })),
    stream: true,
  }
}
