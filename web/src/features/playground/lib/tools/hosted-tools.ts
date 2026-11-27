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
  ChatCompletionAnnotation,
  HostedToolKey,
  HostedToolsRoute,
  MessageSource,
  MessagesReplayBlock,
  MessagesServerTool,
  PlaygroundRequestFormat,
} from '../../types'

export const HOSTED_TOOL_KEYS: readonly HostedToolKey[] = [
  'web_search',
  'web_fetch',
  'code_execution',
]

// Calls per request of each search and fetch tool, bounding the extra cost
// of one turn (hosted tool calls are billed on top of tokens).
export const HOSTED_TOOL_MAX_USES = 5

// Anthropic server tool versions every Claude model and the gateway's
// protocol conversion accept; newer variants are limited to newer models.
const MESSAGES_SERVER_TOOLS: Record<HostedToolKey, MessagesServerTool> = {
  web_search: {
    type: 'web_search_20250305',
    name: 'web_search',
    max_uses: HOSTED_TOOL_MAX_USES,
  },
  web_fetch: {
    type: 'web_fetch_20250910',
    name: 'web_fetch',
    max_uses: HOSTED_TOOL_MAX_USES,
  },
  code_execution: { type: 'code_execution_20250825', name: 'code_execution' },
}

// OpenAI hosted tools in the Responses API. Web fetch has no OpenAI tool.
const RESPONSES_HOSTED_TOOLS: Partial<
  Record<HostedToolKey, Record<string, unknown>>
> = {
  web_search: { type: 'web_search' },
  code_execution: { type: 'code_interpreter', container: { type: 'auto' } },
}

// Output the Responses API leaves out unless asked: the pages a search
// read and the logs of a code run.
export const RESPONSES_HOSTED_TOOL_INCLUDE: Partial<
  Record<HostedToolKey, string>
> = {
  web_search: 'web_search_call.action.sources',
  code_execution: 'code_interpreter_call.outputs',
}

/**
 * Hosted tools a route can carry: Messages takes the Anthropic server tools,
 * Responses OpenAI's web search and code interpreter (no web fetch), chat
 * completions only web_search_options; image models take none.
 */
export function getSupportedHostedTools(
  route: HostedToolsRoute
): readonly HostedToolKey[] {
  if (route === 'messages') return HOSTED_TOOL_KEYS
  if (route === 'responses') return ['web_search', 'code_execution']
  if (route === 'chat') return ['web_search']
  return []
}

/** The switched-on hosted tools the route supports, in order. */
export function getActiveHostedTools(
  enabled: readonly HostedToolKey[] | undefined,
  route: HostedToolsRoute
): HostedToolKey[] {
  const supported = getSupportedHostedTools(route)
  return HOSTED_TOOL_KEYS.filter(
    (key) => supported.includes(key) && (enabled ?? []).includes(key)
  )
}

/**
 * The API a turn is sent to: with a hosted tool on, a chat model goes to the
 * native endpoint of its route (Responses or Messages); every other turn
 * uses the model's own format.
 */
export function getTurnRequestFormat(
  format: PlaygroundRequestFormat,
  route: HostedToolsRoute,
  hostedTools: readonly HostedToolKey[]
): PlaygroundRequestFormat {
  if (format !== 'chat' || hostedTools.length === 0) return format
  if (route === 'responses' || route === 'messages') return route
  return format
}

export function toResponsesHostedTools(
  keys: readonly HostedToolKey[]
): Record<string, unknown>[] {
  return keys.flatMap((key) => {
    const tool = RESPONSES_HOSTED_TOOLS[key]
    return tool ? [structuredClone(tool)] : []
  })
}

export function toMessagesServerTools(
  keys: readonly HostedToolKey[]
): MessagesServerTool[] {
  return keys.map((key) => ({ ...MESSAGES_SERVER_TOOLS[key] }))
}

/** What a hosted tool returned, read from its *_tool_result block. */
export type HostedToolResult =
  | { kind: 'error'; errorCode: string }
  | { kind: 'search'; results: MessageSource[] }
  | { kind: 'fetch'; page: MessageSource }
  | {
      kind: 'code'
      stdout: string
      stderr: string
      returnCode: number | null
    }
  | { kind: 'other'; content: unknown }

/** One hosted tool call of an assistant turn and its result, if any. */
export type HostedToolActivity = {
  id: string
  // Server tool name: web_search, web_fetch, bash_code_execution, ...
  name: string
  // Input JSON text, partial while streaming
  input: string
  result?: HostedToolResult
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * A link to a page the upstream reported. Only http(s) URLs become links:
 * the URL comes from a third party and is rendered as an anchor.
 */
function toSource(value: unknown): MessageSource | null {
  if (!isRecord(value)) return null
  const href = stringValue(value.url)
  if (!/^https?:\/\//i.test(href)) return null
  return { href, title: stringValue(value.title) || href }
}

/**
 * Read a hosted tool result block. Errors come back as a content object
 * with error_code (HTTP 200, not a failed request); search results are a
 * list, a fetched page a web_fetch_result, code output stdout/stderr.
 */
export function readHostedToolResult(
  block: Record<string, unknown>
): HostedToolResult {
  const content = block.content
  if (isRecord(content) && typeof content.error_code === 'string') {
    return { kind: 'error', errorCode: content.error_code }
  }

  if (block.type === 'web_search_tool_result' && Array.isArray(content)) {
    return {
      kind: 'search',
      results: content.flatMap((item) => {
        const source = toSource(item)
        return source ? [source] : []
      }),
    }
  }

  if (block.type === 'web_fetch_tool_result' && isRecord(content)) {
    const document = isRecord(content.content) ? content.content : {}
    const page = toSource({ url: content.url, title: document.title })
    if (page) return { kind: 'fetch', page }
  }

  if (
    isRecord(content) &&
    ('stdout' in content || 'stderr' in content || 'return_code' in content)
  ) {
    return {
      kind: 'code',
      stdout: stringValue(content.stdout),
      stderr: stringValue(content.stderr),
      returnCode:
        typeof content.return_code === 'number' ? content.return_code : null,
    }
  }

  return { kind: 'other', content }
}

// Responses output items that are hosted tool calls
const RESPONSES_HOSTED_ITEM_TYPES = new Set([
  'web_search_call',
  'code_interpreter_call',
])

export function isResponsesHostedItem(item: Record<string, unknown>): boolean {
  return RESPONSES_HOSTED_ITEM_TYPES.has(stringValue(item.type))
}

/**
 * Read a Responses hosted call item. A web search action is a search (its
 * sources when included), an opened page, or a find in a page; a code run
 * carries its code and logs. A finished item has status completed, a
 * failed one failed or incomplete; anything else is still running.
 */
function readResponsesHostedItem(
  item: Record<string, unknown>
): HostedToolActivity {
  const id = stringValue(item.id)
  const status = stringValue(item.status)
  const finished = status === 'completed'
  const failed = status === 'failed' || status === 'incomplete'

  if (item.type === 'code_interpreter_call') {
    const outputs = Array.isArray(item.outputs) ? item.outputs : []
    const logs = outputs
      .filter(isRecord)
      .filter((output) => output.type === 'logs')
      .map((output) => stringValue(output.logs))
      .join('\n')
    let result: HostedToolResult | undefined
    if (failed) {
      result = { kind: 'error', errorCode: status }
    } else if (finished) {
      result = { kind: 'code', stdout: logs, stderr: '', returnCode: null }
    }
    return {
      id,
      name: 'code_interpreter',
      input: JSON.stringify({ code: stringValue(item.code) }),
      ...(result ? { result } : {}),
    }
  }

  const action = isRecord(item.action) ? item.action : {}
  const actionType = stringValue(action.type)
  let name = 'web_search'
  let input: Record<string, unknown> = {}
  let result: HostedToolResult | undefined
  if (actionType === 'open_page') {
    name = 'web_fetch'
    input = { url: stringValue(action.url) }
    const page = toSource({ url: action.url })
    if (finished && page) result = { kind: 'fetch', page }
  } else if (actionType === 'find' || actionType === 'find_in_page') {
    input = { url: stringValue(action.url), pattern: action.pattern }
    if (finished) result = { kind: 'other', content: action }
  } else {
    const query =
      stringValue(action.query) ||
      (Array.isArray(action.queries) ? stringValue(action.queries[0]) : '')
    input = query ? { query } : {}
    if (finished) {
      const sources = Array.isArray(action.sources) ? action.sources : []
      result = {
        kind: 'search',
        results: sources.flatMap((source) => {
          const link = toSource(source)
          return link ? [link] : []
        }),
      }
    }
  }
  if (failed) result = { kind: 'error', errorCode: status }

  return {
    id,
    name,
    input: JSON.stringify(input),
    ...(result ? { result } : {}),
  }
}

/** Hosted tool calls of a Responses turn, in output order. */
export function getResponsesHostedActivities(
  items: readonly Record<string, unknown>[] | undefined
): HostedToolActivity[] {
  return (items ?? []).map(readResponsesHostedItem)
}

/** Add a Responses hosted call item to a turn, or replace it by id. */
export function upsertResponsesItem(
  items: readonly Record<string, unknown>[] | undefined,
  item: Record<string, unknown>
): Record<string, unknown>[] {
  const next = [...(items ?? [])]
  const position = next.findIndex((current) => current.id === item.id)
  if (position === -1) next.push(item)
  else next[position] = item
  return next
}

/**
 * Hosted tool calls of a Messages turn in block order, each paired with the
 * result block that names its id.
 */
export function getHostedToolActivities(
  blocks: readonly (MessagesReplayBlock | undefined)[] | undefined
): HostedToolActivity[] {
  if (!blocks?.length) return []

  const results = new Map<string, Record<string, unknown>>()
  for (const block of blocks) {
    if (block?.type !== 'server_tool_result') continue
    const id = stringValue(block.block.tool_use_id)
    if (id) results.set(id, block.block)
  }

  const activities: HostedToolActivity[] = []
  for (const block of blocks) {
    if (block?.type !== 'server_tool_use') continue
    const result = results.get(block.id)
    activities.push({
      id: block.id,
      name: block.name,
      input: block.input,
      ...(result ? { result: readHostedToolResult(result) } : {}),
    })
  }
  return activities
}

/** Whether a turn made a hosted tool call (Messages or Responses). */
export function hasHostedToolActivity(message: {
  messagesBlocks?: readonly (MessagesReplayBlock | undefined)[]
  responsesItems?: readonly Record<string, unknown>[]
}): boolean {
  return (
    (message.responsesItems?.length ?? 0) > 0 ||
    (message.messagesBlocks ?? []).some(
      (block) => block?.type === 'server_tool_use'
    )
  )
}

function addSource(
  sources: MessageSource[],
  source: MessageSource | null
): void {
  if (!source || sources.some((item) => item.href === source.href)) return
  sources.push(source)
}

/**
 * Sources of a Messages turn: pages its text cites, then pages a web fetch
 * read. Search results the answer does not cite stay in the tool card.
 */
export function getMessagesBlockSources(
  blocks: readonly (MessagesReplayBlock | undefined)[] | undefined
): MessageSource[] {
  const sources: MessageSource[] = []
  for (const block of blocks ?? []) {
    if (block?.type !== 'text') continue
    for (const citation of block.citations ?? []) {
      addSource(sources, toSource(citation))
    }
  }
  for (const block of blocks ?? []) {
    if (block?.type !== 'server_tool_result') continue
    const result = readHostedToolResult(block.block)
    if (result.kind === 'fetch') addSource(sources, result.page)
  }
  return sources
}

/** Sources of chat completions url_citation annotations. */
export function getAnnotationSources(
  annotations: readonly ChatCompletionAnnotation[] | undefined
): MessageSource[] {
  const sources: MessageSource[] = []
  for (const annotation of annotations ?? []) {
    if (annotation?.type !== 'url_citation') continue
    addSource(sources, toSource(annotation.url_citation ?? annotation))
  }
  return sources
}

/** Add sources to a list, skipping pages already in it. */
export function mergeSources(
  current: readonly MessageSource[] | undefined,
  next: readonly MessageSource[]
): MessageSource[] {
  const merged = [...(current ?? [])]
  for (const source of next) addSource(merged, source)
  return merged
}
