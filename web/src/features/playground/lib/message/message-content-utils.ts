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
import { MESSAGE_ROLES, MESSAGE_STATUS } from '../../constants'
import type { GeneratedImage, Message } from '../../types'
import { parseThinkTags } from './message-reasoning-utils'

type MessageContentStateBase = {
  displayContent: string
  images: GeneratedImage[]
  showText: boolean
  hasSources: boolean
  isAssistant: boolean
  showLoader: boolean
  showMessageContent: boolean
  sources: NonNullable<Message['sources']>
}

type MessageContentState = MessageContentStateBase &
  (
    | {
        hasReasoning: true
        reasoningContent: string
      }
    | {
        hasReasoning: false
        reasoningContent: undefined
      }
  )

function shouldShowMessageLoader(
  message: Message,
  isAssistant: boolean,
  versionContent: string,
  hasImages: boolean
): boolean {
  return (
    isAssistant &&
    !message.isReasoningStreaming &&
    !hasImages &&
    (message.status === MESSAGE_STATUS.LOADING ||
      (message.status === MESSAGE_STATUS.STREAMING && !versionContent))
  )
}

function shouldShowMessageContent(
  message: Message,
  versionContent: string,
  hasImages: boolean
): boolean {
  return (
    (message.from === MESSAGE_ROLES.USER || !message.isReasoningStreaming) &&
    (versionContent.length > 0 || hasImages)
  )
}

function getDisplayContent(message: Message, versionContent: string): string {
  if (message.from !== MESSAGE_ROLES.ASSISTANT) {
    return versionContent
  }

  if (!versionContent.includes('<think>')) {
    return versionContent
  }

  return parseThinkTags(versionContent).visibleContent
}

export function getMessageContentState(
  message: Message,
  versionContent: string
): MessageContentState {
  const isAssistant = message.from === MESSAGE_ROLES.ASSISTANT
  const sources = message.sources ?? []
  const reasoningContent = isAssistant ? message.reasoning?.content : undefined
  const images = message.images ?? []
  const hasImages = images.length > 0
  const showLoader = shouldShowMessageLoader(
    message,
    isAssistant,
    versionContent,
    hasImages
  )
  const showMessageContent = shouldShowMessageContent(
    message,
    versionContent,
    hasImages
  )

  const baseState: MessageContentStateBase = {
    displayContent: getDisplayContent(message, versionContent),
    images,
    showText: versionContent.length > 0,
    hasSources: sources.length > 0,
    isAssistant,
    showLoader,
    showMessageContent,
    sources,
  }

  if (reasoningContent) {
    return {
      ...baseState,
      hasReasoning: true,
      reasoningContent,
    }
  }

  return {
    ...baseState,
    hasReasoning: false,
    reasoningContent: undefined,
  }
}
