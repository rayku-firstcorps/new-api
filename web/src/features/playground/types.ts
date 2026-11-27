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
// Message types
export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'loading' | 'streaming' | 'complete' | 'error'

export type PlaygroundMessageLayoutMode = 'alternating' | 'left'

export interface MessageVersion {
  id: string
  content: string
}

/**
 * An image returned by a Responses image_generation_call. base64 is kept in
 * memory only; stored messages drop it, so a reloaded image has no base64.
 */
export interface GeneratedImage {
  id: string
  mediaType: string
  base64?: string
}

export interface Message {
  key: string
  from: MessageRole
  versions: MessageVersion[]
  createdAt?: number
  startedAt?: number
  completedAt?: number
  durationMs?: number
  sources?: MessageSource[]
  reasoning?: {
    content: string
    duration: number
    startedAt?: number
    completedAt?: number
    durationMs?: number
  }
  isReasoningStreaming?: boolean
  isReasoningComplete?: boolean
  isContentComplete?: boolean
  status?: MessageStatus
  errorCode?: string | null
  images?: GeneratedImage[]
  toolCalls?: ToolCall[]
  // Anthropic Messages turns keep their content blocks as received so the
  // history replays thinking blocks unchanged; an edit drops them.
  messagesBlocks?: MessagesReplayBlock[]
  // Hosted tool calls of a Responses turn (web_search_call,
  // code_interpreter_call) as received, the latest copy of each item
  responsesItems?: Record<string, unknown>[]
}

/**
 * An assistant content block from a Messages response, kept for replay.
 * tool_use and server_tool_use input is JSON text (partial while streaming).
 * Hosted tool results (web_search_tool_result, ...) arrive complete and are
 * kept as received under block; text keeps its citations.
 */
export type MessagesReplayBlock =
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'redacted_thinking'; data: string }
  | { type: 'text'; text: string; citations?: Record<string, unknown>[] }
  | { type: 'tool_use'; id: string; name: string; input: string }
  | { type: 'server_tool_use'; id: string; name: string; input: string }
  | { type: 'server_tool_result'; block: Record<string, unknown> }

/** A Messages stream event that changes the content block at index. */
export type MessagesBlockEvent =
  | { kind: 'start'; index: number; block: Record<string, unknown> }
  | {
      kind: 'delta'
      index: number
      delta: {
        type?: string
        text?: string
        thinking?: string
        signature?: string
        partial_json?: string
        citation?: Record<string, unknown>
      }
    }

/**
 * A function call the assistant requested. index is the position the stream
 * used for its deltas (tool_calls[].index in chat completions, the content
 * block index in Messages). arguments is JSON text, partial while streaming.
 * The browser runs no tool: result is what the user entered, sent back with
 * the next request.
 */
export interface ToolCall {
  index: number
  id: string
  name: string
  arguments: string
  result?: string
}

/** A tool-call fragment from one stream event, merged by index. */
export interface ToolCallDelta {
  index: number
  id?: string
  name?: string
  arguments?: string
}

/**
 * A tool the upstream runs itself (Anthropic server tools, OpenAI chat
 * web_search_options); the playground only switches it on.
 */
export type HostedToolKey = 'web_search' | 'web_fetch' | 'code_execution'

/** A web page the answer cites or a hosted tool fetched. */
export interface MessageSource {
  href: string
  title: string
}

/** A tool definition normalized from the playground tools JSON. */
export interface ToolDefinition {
  name: string
  description?: string
  parameters: Record<string, unknown>
}

// API payload types
export interface ChatCompletionToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatCompletionTool {
  type: 'function'
  function: ToolDefinition
}

export interface ChatCompletionMessage {
  role: MessageRole | 'tool'
  content: string | ContentPart[] | null
  tool_calls?: ChatCompletionToolCall[]
  tool_call_id?: string
}

export interface ContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface ChatCompletionRequest {
  model: string
  group?: string
  messages: ChatCompletionMessage[]
  stream: boolean
  temperature?: number
  top_p?: number
  max_tokens?: number
  frequency_penalty?: number
  presence_penalty?: number
  seed?: number
  tools?: ChatCompletionTool[]
  web_search_options?: Record<string, never>
}

// Image generation models stream through the Responses API instead, and
// Claude models use the native Anthropic Messages API.
export type PlaygroundRequestFormat = 'chat' | 'responses' | 'messages'

/**
 * Where a model's hosted tools go, from its catalog endpoints: a native
 * Messages or Responses endpoint, chat completions' web_search_options, or
 * nowhere (image models).
 */
export type HostedToolsRoute = 'messages' | 'responses' | 'chat' | 'none'

export type MessagesContentBlock =
  | { type: 'text'; text: string; citations?: Record<string, unknown>[] }
  | { type: 'thinking'; thinking: string; signature: string }
  | { type: 'redacted_thinking'; data: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'server_tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string }
  // A hosted tool result replayed as received (web_search_tool_result, ...)
  | HostedToolResultBlock

export type HostedToolResultBlock = Record<string, unknown> & {
  type: `${string}_tool_result`
}

export interface MessagesRequestMessage {
  role: 'user' | 'assistant'
  content: string | MessagesContentBlock[]
}

export interface MessagesTool {
  name: string
  description?: string
  input_schema: Record<string, unknown>
}

/** An Anthropic server tool definition (web_search_20250305, ...). */
export interface MessagesServerTool {
  type: string
  name: string
  max_uses?: number
}

export interface MessagesRequest {
  model: string
  group?: string
  system?: string
  messages: MessagesRequestMessage[]
  max_tokens: number
  stream: boolean
  tools?: Array<MessagesTool | MessagesServerTool>
}

export interface MessagesResponse {
  content?: Array<{
    type: string
    text?: string
    thinking?: string
    signature?: string
    data?: string
    id?: string
    name?: string
    input?: unknown
    citations?: Record<string, unknown>[]
    [key: string]: unknown
  }>
}

export interface ResponsesInputMessage {
  role: MessageRole
  content: string
}

/** A function call and its result replayed in a Responses input. */
export type ResponsesInputItem =
  | ResponsesInputMessage
  | { type: 'function_call'; call_id: string; name: string; arguments: string }
  | { type: 'function_call_output'; call_id: string; output: string }

/** A function tool in the Responses API, flat rather than nested. */
export interface ResponsesFunctionTool {
  type: 'function'
  name: string
  description?: string
  parameters: Record<string, unknown>
}

export interface ResponsesRequest {
  model: string
  group?: string
  input: ResponsesInputItem[]
  stream: true
  tools?: Array<ResponsesFunctionTool | Record<string, unknown>>
  include?: string[]
}

export type PlaygroundStreamRequest =
  | { format: 'chat'; payload: ChatCompletionRequest }
  | { format: 'responses'; payload: ResponsesRequest }
  | { format: 'messages'; payload: MessagesRequest }

/** A chat completions url_citation annotation of hosted web search. */
export interface ChatCompletionAnnotation {
  type?: string
  url_citation?: { url?: string; title?: string }
  url?: string
  title?: string
}

export interface ChatCompletionChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: MessageRole
      content?: string
      reasoning_content?: string | null
      reasoning?: string | null
      annotations?: ChatCompletionAnnotation[]
      tool_calls?: Array<{
        index?: number
        id?: string
        type?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason: string | null
  }>
}

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: MessageRole
      content: string | null
      reasoning_content?: string | null
      reasoning?: string | null
      annotations?: ChatCompletionAnnotation[]
      tool_calls?: ChatCompletionToolCall[]
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// Configuration types
export interface PlaygroundConfig {
  model: string
  group: string
  temperature: number
  top_p: number
  max_tokens: number
  frequency_penalty: number
  presence_penalty: number
  seed: number | null
  stream: boolean
  // Tool definitions as JSON text, sent when parameterEnabled.tools is on
  tools: string
  // Hosted tools switched on; each format sends the ones it supports
  hosted_tools: HostedToolKey[]
}

export interface ParameterEnabled {
  temperature: boolean
  top_p: boolean
  max_tokens: boolean
  frequency_penalty: boolean
  presence_penalty: boolean
  seed: boolean
  tools: boolean
}

// Model and group options
export interface ModelOption {
  label: string
  value: string
}

export interface GroupOption {
  label: string
  value: string
  ratio: number | string
  desc?: string
}
