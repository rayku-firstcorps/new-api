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
import { nanoid } from 'nanoid'

import { MESSAGE_ROLES, MESSAGE_STATUS } from '../../constants'
import type {
  Message,
  MessageVersion,
  ChatCompletionMessage,
  ContentPart,
  GeneratedImage,
} from '../../types'

/**
 * Create a new message version
 */
export function createMessageVersion(content: string): MessageVersion {
  return {
    id: nanoid(),
    content,
  }
}

/**
 * Get current version from message (always returns the first version)
 */
export function getCurrentVersion(message: Message): MessageVersion {
  return message.versions[0] || { id: 'default', content: '' }
}

/**
 * Get displayable content from the current message version.
 */
export function getMessageContent(message: Message): string {
  return getCurrentVersion(message).content
}

/**
 * Check whether a message has non-empty content in its current version.
 */
export function hasMessageContent(message: Message): boolean {
  return getMessageContent(message).trim() !== ''
}

/**
 * Check whether a message carries generated images.
 */
export function hasMessageImages(message: Message): boolean {
  return (message.images?.length ?? 0) > 0
}

/**
 * Add a generated image, replacing an earlier image with the same id so a
 * final image takes the place of its partial previews.
 */
export function upsertMessageImage(
  message: Message,
  image: GeneratedImage
): Message {
  const images = message.images ?? []
  const index = images.findIndex((existing) => existing.id === image.id)
  if (index === -1) {
    return { ...message, images: [...images, image] }
  }

  const nextImages = [...images]
  nextImages[index] = image
  return { ...message, images: nextImages }
}

// A complete Markdown image whose URL is a base64 image data URI, the way
// gateways render inline image parts in chat completions (Gemini image
// models, for example). Partial images from an unfinished chunk do not match.
const INLINE_BASE64_IMAGE_PATTERN =
  /!\[[^\]\n]*\]\(data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)\)/g

/**
 * Move complete base64 Markdown images out of the current version content
 * into message.images. They are megabytes long, so the Markdown renderer
 * would show them as raw text; as images they render, are not stored in
 * localStorage, and are not sent back as text in the next request.
 */
export function moveInlineImagesToMessage(message: Message): Message {
  const content = getMessageContent(message)
  if (!content.includes('](data:image/')) {
    return message
  }

  const extracted: GeneratedImage[] = []
  const remaining = content.replace(
    INLINE_BASE64_IMAGE_PATTERN,
    (_match, mediaType: string, base64: string) => {
      extracted.push({ id: nanoid(), mediaType, base64 })
      return ''
    }
  )
  if (extracted.length === 0) {
    return message
  }

  return {
    ...updateCurrentVersionContent(message, remaining.trim()),
    images: [...(message.images ?? []), ...extracted],
  }
}

/**
 * Update current version content in message
 */
export function updateCurrentVersionContent(
  message: Message,
  content: string
): Message {
  const currentVersion = getCurrentVersion(message)
  return {
    ...message,
    versions: [{ ...currentVersion, content }],
  }
}

/**
 * Create a user message
 */
export function createUserMessage(
  content: string,
  createdAt: number = Date.now()
): Message {
  return {
    key: nanoid(),
    from: MESSAGE_ROLES.USER,
    versions: [createMessageVersion(content)],
    createdAt,
  }
}

/**
 * Create a loading assistant message
 */
export function createLoadingAssistantMessage(
  startedAt: number = Date.now()
): Message {
  return {
    key: nanoid(),
    from: MESSAGE_ROLES.ASSISTANT,
    versions: [createMessageVersion('')],
    createdAt: startedAt,
    startedAt,
    reasoning: undefined,
    isReasoningComplete: false,
    isContentComplete: false,
    isReasoningStreaming: false,
    status: MESSAGE_STATUS.LOADING,
  }
}

/**
 * Build message content with optional images
 */
export function buildMessageContent(
  text: string,
  imageUrls: string[] = []
): string | ContentPart[] {
  const validImages = imageUrls.filter((url) => url.trim() !== '')

  if (validImages.length === 0) {
    return text
  }

  const parts: ContentPart[] = [
    {
      type: 'text',
      text: text || '',
    },
    ...validImages.map((url) => ({
      type: 'image_url' as const,
      image_url: { url: url.trim() },
    })),
  ]

  return parts
}

/**
 * Extract text content from message content
 */
export function getTextContent(content: string | ContentPart[]): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    const textPart = content.find((part) => part.type === 'text')
    return textPart?.text || ''
  }

  return ''
}

/**
 * Format message for API request
 */
export function formatMessageForAPI(message: Message): ChatCompletionMessage {
  const currentVersion = getCurrentVersion(message)
  return {
    role: message.from,
    content: currentVersion.content,
  }
}

/**
 * Check if message is valid for API request
 * Excludes loading/streaming assistant messages and empty content
 */
export function isValidMessage(message: Message): boolean {
  if (!message || !message.from || !message.versions.length) return false

  // Exclude empty assistant messages (loading/streaming placeholders)
  if (message.from === MESSAGE_ROLES.ASSISTANT && !hasMessageContent(message)) {
    return false
  }

  return true
}
