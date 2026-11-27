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
  ChatCompletionMessage,
  ChatCompletionRequest,
  Message,
  MessagesContentBlock,
  MessagesRequest,
  MessagesRequestMessage,
  PlaygroundConfig,
  ParameterEnabled,
  ResponsesRequest,
  ToolDefinition,
} from '../../types'
import {
  formatMessageForAPI,
  getMessageContent,
  isValidMessage,
} from '../message/message-utils'
import {
  getToolCallId,
  hasAnsweredToolCalls,
  parseToolCallInput,
  toChatCompletionToolCalls,
  toChatCompletionTools,
  toMessagesTools,
} from '../tools/tool-calling'
import { toMessagesReplayContent } from './messages-blocks'

/**
 * Build API request payload from messages and config. An assistant turn
 * whose tool calls the user answered goes back as assistant.tool_calls
 * followed by one tool message per result; unanswered calls are left out.
 */
export function buildChatCompletionPayload(
  messages: Message[],
  config: PlaygroundConfig,
  parameterEnabled: ParameterEnabled,
  tools: ToolDefinition[] = []
): ChatCompletionRequest {
  const processedMessages = messages
    .filter(isValidMessage)
    .flatMap((message): ChatCompletionMessage[] => {
      const toolCalls = message.toolCalls ?? []
      if (!hasAnsweredToolCalls(message)) {
        return [formatMessageForAPI(message)]
      }

      return [
        {
          role: 'assistant',
          content: getMessageContent(message) || null,
          tool_calls: toChatCompletionToolCalls(toolCalls),
        },
        ...toolCalls.map((call): ChatCompletionMessage => ({
          role: 'tool',
          tool_call_id: getToolCallId(call),
          content: call.result ?? '',
        })),
      ]
    })

  const payload: ChatCompletionRequest = {
    model: config.model,
    group: config.group,
    messages: processedMessages,
    stream: config.stream,
  }

  if (tools.length > 0) {
    payload.tools = toChatCompletionTools(tools)
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
 *
 * Assistant turns replay their kept content blocks, thinking blocks
 * unchanged, as Claude requires within a tool round. A turn whose tool calls
 * the user answered is followed by a user turn of tool_result blocks.
 */
export function buildMessagesPayload(
  messages: Message[],
  config: PlaygroundConfig,
  tools: ToolDefinition[] = []
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
      .flatMap((message): MessagesRequestMessage[] => {
        if (message.from !== 'assistant') {
          return [{ role: 'user', content: getMessageContent(message) }]
        }

        const answered = hasAnsweredToolCalls(message)
        const toolCalls = message.toolCalls ?? []
        let content: string | MessagesContentBlock[] =
          getMessageContent(message)
        if (message.messagesBlocks?.length) {
          content = toMessagesReplayContent(message.messagesBlocks, answered)
        } else if (answered) {
          const text = getMessageContent(message)
          content = [
            ...(text ? [{ type: 'text' as const, text }] : []),
            ...toolCalls.map((call) => ({
              type: 'tool_use' as const,
              id: getToolCallId(call),
              name: call.name,
              input: parseToolCallInput(call.arguments),
            })),
          ]
        }

        const turns: MessagesRequestMessage[] = [{ role: 'assistant', content }]
        if (answered) {
          turns.push({
            role: 'user',
            content: toolCalls.map((call) => ({
              type: 'tool_result',
              tool_use_id: getToolCallId(call),
              content: call.result ?? '',
            })),
          })
        }
        return turns
      }),
    max_tokens:
      config.max_tokens > 0 ? config.max_tokens : DEFAULT_CONFIG.max_tokens,
    stream: config.stream,
  }

  if (system) {
    payload.system = system
  }

  if (tools.length > 0) {
    payload.tools = toMessagesTools(tools)
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
