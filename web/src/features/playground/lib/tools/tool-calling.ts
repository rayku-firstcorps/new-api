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
import type {
  ChatCompletionTool,
  ChatCompletionToolCall,
  Message,
  MessagesTool,
  ToolCall,
  ToolCallDelta,
  ToolDefinition,
} from '../../types'

// Function names both OpenAI and Anthropic accept.
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/
const EMPTY_PARAMETERS_SCHEMA = { type: 'object', properties: {} }

/** An i18n key with its interpolation values, translated by the caller. */
export type ToolDefinitionsError = {
  key: string
  values?: Record<string, string | number>
}

export type ToolDefinitionsResult =
  | { tools: ToolDefinition[]; error: null }
  | { tools: null; error: ToolDefinitionsError }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Parse the playground tools JSON. It takes the OpenAI shape
 * ({ type: 'function', function: { name, description, parameters } }) or the
 * bare definition, with parameters or Anthropic's input_schema, as one object
 * or an array. Blank text means no tools.
 */
export function parseToolDefinitions(text: string): ToolDefinitionsResult {
  if (text.trim() === '') {
    return { tools: [], error: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return {
      tools: null,
      error: {
        key: 'Tools must be valid JSON: {{error}}',
        values: { error: error instanceof Error ? error.message : '' },
      },
    }
  }

  const entries = Array.isArray(parsed) ? parsed : [parsed]
  const tools: ToolDefinition[] = []
  for (const [position, entry] of entries.entries()) {
    const definition = isPlainObject(entry?.function) ? entry.function : entry
    const itemNumber = position + 1
    if (!isPlainObject(definition)) {
      return {
        tools: null,
        error: {
          key: 'Tool {{index}} must be an object',
          values: { index: itemNumber },
        },
      }
    }

    const name = definition.name
    if (typeof name !== 'string' || !TOOL_NAME_PATTERN.test(name)) {
      return {
        tools: null,
        error: {
          key: 'Tool {{index}} needs a name of letters, digits, _ or - (up to 64)',
          values: { index: itemNumber },
        },
      }
    }
    if (tools.some((tool) => tool.name === name)) {
      return {
        tools: null,
        error: {
          key: 'Tool name {{name}} is used more than once',
          values: { name },
        },
      }
    }

    const parameters =
      definition.parameters ??
      definition.input_schema ??
      EMPTY_PARAMETERS_SCHEMA
    if (!isPlainObject(parameters)) {
      return {
        tools: null,
        error: {
          key: 'Tool {{name}} parameters must be a JSON Schema object',
          values: { name },
        },
      }
    }

    const tool: ToolDefinition = { name, parameters }
    if (typeof definition.description === 'string' && definition.description) {
      tool.description = definition.description
    }
    tools.push(tool)
  }

  return { tools, error: null }
}

export function toChatCompletionTools(
  tools: ToolDefinition[]
): ChatCompletionTool[] {
  return tools.map((tool) => ({ type: 'function', function: tool }))
}

export function toMessagesTools(tools: ToolDefinition[]): MessagesTool[] {
  return tools.map((tool) => ({
    name: tool.name,
    ...(tool.description ? { description: tool.description } : {}),
    input_schema: tool.parameters,
  }))
}

/**
 * Merge stream fragments into the message's tool calls: a fragment with a
 * new index starts a call, later ones append to its arguments. A fragment
 * for an unknown index without an id or name starts nothing: in Messages it
 * is the input of a hosted (server) tool, which the upstream runs itself.
 */
export function applyToolCallDeltas(
  message: Message,
  deltas: ToolCallDelta[]
): Message {
  if (deltas.length === 0) {
    return message
  }

  const toolCalls = [...(message.toolCalls ?? [])]
  for (const delta of deltas) {
    const position = toolCalls.findIndex((call) => call.index === delta.index)
    if (position === -1) {
      if (!delta.id && !delta.name) continue
      toolCalls.push({
        index: delta.index,
        id: delta.id ?? '',
        name: delta.name ?? '',
        arguments: delta.arguments ?? '',
      })
      continue
    }

    const current = toolCalls[position]
    toolCalls[position] = {
      ...current,
      id: current.id || delta.id || '',
      name: current.name || delta.name || '',
      arguments: current.arguments + (delta.arguments ?? ''),
    }
  }

  if (toolCalls.length === 0) {
    return message
  }

  return { ...message, toolCalls }
}

/** Tool calls of a finished assistant turn that the user has not answered. */
export function hasPendingToolCalls(message: Message): boolean {
  return (message.toolCalls ?? []).some((call) => call.result === undefined)
}

/**
 * Whether the assistant turn carries tool calls with every result filled in,
 * so the request history can replay the call and its results.
 */
export function hasAnsweredToolCalls(message: Message): boolean {
  return (message.toolCalls?.length ?? 0) > 0 && !hasPendingToolCalls(message)
}

/**
 * The id that pairs a call with its result in the request history. Some
 * OpenAI-compatible upstreams stream calls without an id.
 */
export function getToolCallId(call: ToolCall): string {
  return call.id || `call_${call.index}`
}

export function toChatCompletionToolCalls(
  toolCalls: ToolCall[]
): ChatCompletionToolCall[] {
  return toolCalls.map((call) => ({
    id: getToolCallId(call),
    type: 'function',
    function: { name: call.name, arguments: call.arguments || '{}' },
  }))
}

/**
 * Tool arguments as an object for Messages tool_use blocks, which need the
 * input as JSON rather than text; unparsable text becomes an empty object.
 */
export function parseToolCallInput(argumentsText: string): unknown {
  if (argumentsText.trim() === '') {
    return {}
  }

  try {
    return JSON.parse(argumentsText)
  } catch {
    return {}
  }
}

/**
 * Store the user's results, keyed by tool call index, on the assistant
 * turn's tool calls, then start a new assistant turn that the next request
 * answers.
 */
export function applyToolResults(
  messages: Message[],
  messageKey: string,
  results: Record<string, string>,
  loadingMessage: Message
): Message[] | null {
  const messageIndex = messages.findIndex(
    (message) => message.key === messageKey
  )
  const target = messages[messageIndex]
  if (!target?.toolCalls?.length) {
    return null
  }

  const answered: Message = {
    ...target,
    toolCalls: target.toolCalls.map((call) => ({
      ...call,
      result: results[String(call.index)] ?? call.result ?? '',
    })),
  }

  return [...messages.slice(0, messageIndex), answered, loadingMessage]
}
