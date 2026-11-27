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
  Message,
  MessagesBlockEvent,
  MessagesContentBlock,
  MessagesReplayBlock,
  MessagesResponse,
} from '../../types'
import { parseToolCallInput } from '../tools/tool-calling'

// Blocks are kept by stream index; indexes of blocks that are not kept
// (server tools, ...) stay empty and are skipped on replay.
type IndexedBlocks = Array<MessagesReplayBlock | undefined>

function stringField(block: Record<string, unknown>, key: string): string {
  const value = block[key]
  return typeof value === 'string' ? value : ''
}

/**
 * Turn the block of a content_block_start event (or of a non-streaming
 * response) into a replay block. tool_use input arrives as JSON deltas when
 * streaming, so a start block's empty input object is not serialized.
 */
function toReplayBlock(
  block: Record<string, unknown>,
  streaming: boolean
): MessagesReplayBlock | undefined {
  switch (block.type) {
    case 'thinking':
      return {
        type: 'thinking',
        thinking: stringField(block, 'thinking'),
        signature: stringField(block, 'signature'),
      }
    case 'redacted_thinking':
      return { type: 'redacted_thinking', data: stringField(block, 'data') }
    case 'text':
      return { type: 'text', text: stringField(block, 'text') }
    case 'tool_use':
      return {
        type: 'tool_use',
        id: stringField(block, 'id'),
        name: stringField(block, 'name'),
        input: streaming ? '' : JSON.stringify(block.input ?? {}),
      }
  }
  return undefined
}

/**
 * Apply one Messages stream event to the assistant turn's content blocks:
 * a start event opens the block at its index, deltas append text, thinking,
 * the signature, or tool input JSON to it.
 */
export function applyMessagesBlockEvent(
  message: Message,
  event: MessagesBlockEvent
): Message {
  const blocks: IndexedBlocks = [...(message.messagesBlocks ?? [])]

  if (event.kind === 'start') {
    blocks[event.index] = toReplayBlock(event.block, true)
    return { ...message, messagesBlocks: blocks as MessagesReplayBlock[] }
  }

  const block = blocks[event.index]
  if (!block) {
    return message
  }

  const delta = event.delta
  let next: MessagesReplayBlock = block
  if (block.type === 'text' && delta.type === 'text_delta') {
    next = { ...block, text: block.text + (delta.text ?? '') }
  } else if (block.type === 'thinking' && delta.type === 'thinking_delta') {
    next = { ...block, thinking: block.thinking + (delta.thinking ?? '') }
  } else if (block.type === 'thinking' && delta.type === 'signature_delta') {
    next = { ...block, signature: block.signature + (delta.signature ?? '') }
  } else if (block.type === 'tool_use' && delta.type === 'input_json_delta') {
    next = { ...block, input: block.input + (delta.partial_json ?? '') }
  } else {
    return message
  }

  blocks[event.index] = next
  return { ...message, messagesBlocks: blocks as MessagesReplayBlock[] }
}

/** Replay blocks of a non-streaming Messages response. */
export function getMessagesResponseBlocks(
  response: MessagesResponse
): MessagesReplayBlock[] {
  if (!Array.isArray(response?.content)) {
    return []
  }

  return response.content.flatMap((block) => {
    const replay = toReplayBlock(block as Record<string, unknown>, false)
    return replay ? [replay] : []
  })
}

/**
 * Content of an assistant turn as sent back to Messages: the kept blocks in
 * order, thinking blocks unchanged. tool_use blocks are kept only when the
 * user answered the calls (their results follow in the next user turn);
 * an unanswered call cannot be replayed without a result.
 */
export function toMessagesReplayContent(
  blocks: readonly (MessagesReplayBlock | undefined)[],
  includeToolUse: boolean
): MessagesContentBlock[] {
  const content: MessagesContentBlock[] = []
  for (const block of blocks) {
    if (!block) continue
    if (block.type === 'tool_use') {
      if (!includeToolUse) continue
      content.push({
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: parseToolCallInput(block.input),
      })
      continue
    }
    if (block.type === 'text' && block.text === '') continue
    content.push(block)
  }
  return content
}
