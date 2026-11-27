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
import { z } from 'zod'

export const STORAGE_VERSION = 1
export const MAX_STORED_MESSAGES = 100
export const MAX_STORED_MESSAGES_BYTES = 1024 * 1024
export const MAX_LOADED_MESSAGES_CHARS = 120_000
export const MAX_LOADED_MESSAGE_CHARS = 40_000

export const playgroundConfigSchema = z.object({
  model: z.string().optional(),
  group: z.string().optional(),
  temperature: z.number().optional(),
  top_p: z.number().optional(),
  max_tokens: z.number().optional(),
  frequency_penalty: z.number().optional(),
  presence_penalty: z.number().optional(),
  seed: z.number().nullable().optional(),
  stream: z.boolean().optional(),
  tools: z.string().optional(),
  hosted_tools: z
    .array(z.enum(['web_search', 'web_fetch', 'code_execution']))
    .optional(),
})

export const parameterEnabledSchema = z.object({
  temperature: z.boolean().optional(),
  top_p: z.boolean().optional(),
  max_tokens: z.boolean().optional(),
  frequency_penalty: z.boolean().optional(),
  presence_penalty: z.boolean().optional(),
  seed: z.boolean().optional(),
  tools: z.boolean().optional(),
})

const messageRoleSchema = z.enum(['user', 'assistant', 'system'])
const messageStatusSchema = z.enum([
  'loading',
  'streaming',
  'complete',
  'error',
])

const messageVersionSchema = z.object({
  id: z.string(),
  content: z.string(),
})

const sourceSchema = z.object({
  href: z.string(),
  title: z.string(),
})

const reasoningSchema = z.object({
  content: z.string(),
  duration: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  durationMs: z.number().optional(),
})

const generatedImageSchema = z.object({
  id: z.string(),
  mediaType: z.string(),
  base64: z.string().optional(),
})

const toolCallSchema = z.object({
  index: z.number(),
  id: z.string(),
  name: z.string(),
  arguments: z.string(),
  result: z.string().optional(),
})

const messagesReplayBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('thinking'),
    thinking: z.string(),
    signature: z.string(),
  }),
  z.object({ type: z.literal('redacted_thinking'), data: z.string() }),
  z.object({
    type: z.literal('text'),
    text: z.string(),
    citations: z.array(z.record(z.string(), z.unknown())).optional(),
  }),
  z.object({
    type: z.literal('tool_use'),
    id: z.string(),
    name: z.string(),
    input: z.string(),
  }),
  z.object({
    type: z.literal('server_tool_use'),
    id: z.string(),
    name: z.string(),
    input: z.string(),
  }),
  z.object({
    type: z.literal('server_tool_result'),
    block: z.record(z.string(), z.unknown()),
  }),
])

const messageSchema = z.object({
  key: z.string(),
  from: messageRoleSchema,
  versions: z.array(messageVersionSchema).min(1),
  createdAt: z.number().optional(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
  durationMs: z.number().optional(),
  sources: z.array(sourceSchema).optional(),
  reasoning: reasoningSchema.optional(),
  isReasoningStreaming: z.boolean().optional(),
  isReasoningComplete: z.boolean().optional(),
  isContentComplete: z.boolean().optional(),
  status: messageStatusSchema.optional(),
  errorCode: z.string().nullable().optional(),
  images: z.array(generatedImageSchema).optional(),
  toolCalls: z.array(toolCallSchema).optional(),
  messagesBlocks: z.array(messagesReplayBlockSchema).optional(),
  responsesItems: z.array(z.record(z.string(), z.unknown())).optional(),
})

export const messagesSchema = z.array(messageSchema)
