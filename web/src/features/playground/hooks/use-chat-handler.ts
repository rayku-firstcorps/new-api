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
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { trackFeature } from '@/lib/analytics'
import { providerFamilyOf } from '@/lib/analytics/provider-family'
import { handleServerError } from '@/lib/handle-server-error'

import { sendChatCompletion, sendMessages } from '../api'
import { ERROR_MESSAGES, MESSAGE_STATUS } from '../constants'
import {
  applyMessagesBlockEvent,
  applyStreamingChunk,
  applyToolCallDeltas,
  buildChatCompletionPayload,
  buildMessagesPayload,
  buildResponsesPayload,
  getActiveHostedTools,
  getMessagesBlockSources,
  getTurnRequestFormat,
  getMessagesResponseBlocks,
  getMessagesResponseChoice,
  parseToolDefinitions,
  updateAssistantMessageWithError,
  updateLastAssistantMessage,
  parseRequestErrorDetails,
  applyChatCompletionChoice,
  completeAssistantMessage,
  isAssistantMessageFinal,
  isAssistantMessagePending,
  mergeSources,
  upsertMessageImage,
  upsertResponsesItem,
  type ChatCompletionChoice,
} from '../lib'
import type {
  GeneratedImage,
  HostedToolKey,
  HostedToolsRoute,
  Message,
  MessageSource,
  MessagesBlockEvent,
  PlaygroundConfig,
  PlaygroundRequestFormat,
  PlaygroundStreamRequest,
  ParameterEnabled,
  ToolCallDelta,
  ToolDefinition,
} from '../types'
import { useStreamRequest } from './use-stream-request'

interface UseChatHandlerOptions {
  config: PlaygroundConfig
  // Where hosted tools go; with one on, a chat turn may use another format
  hostedToolsRoute: HostedToolsRoute
  parameterEnabled: ParameterEnabled
  // 'responses' always streams, whatever config.stream says
  requestFormat: PlaygroundRequestFormat
  onMessageUpdate: (updater: (prev: Message[]) => Message[]) => void
}

const KNOWN_ERROR_MESSAGES = new Set<string>(Object.values(ERROR_MESSAGES))
const STREAM_UPDATE_FLUSH_MS = 50

// Stream changes batched into one message update per flush
type PendingStreamChunks = {
  generation: number
  content: string
  reasoning: string
  toolCalls: ToolCallDelta[]
  blocks: MessagesBlockEvent[]
  sources: MessageSource[]
  responsesItems: Record<string, unknown>[]
}

function mergePendingStreamChunk(
  currentChunk: string,
  nextChunk: string
): string {
  if (!currentChunk || !nextChunk.startsWith(currentChunk)) {
    return currentChunk + nextChunk
  }

  return nextChunk
}

/**
 * Hook for handling chat message sending and receiving
 */
export function useChatHandler({
  config,
  hostedToolsRoute,
  parameterEnabled,
  requestFormat,
  onMessageUpdate,
}: UseChatHandlerOptions) {
  const { t } = useTranslation()
  const { sendStreamRequest, stopStream, isStreaming } = useStreamRequest()
  const [isRequesting, setIsRequesting] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestGenerationRef = useRef(0)
  const pendingStreamChunksRef = useRef<PendingStreamChunks>({
    generation: 0,
    content: '',
    reasoning: '',
    toolCalls: [],
    blocks: [],
    sources: [],
    responsesItems: [],
  })
  const streamFlushTimerRef = useRef<number | null>(null)

  const discardPendingStreamUpdates = useCallback((generation: number) => {
    if (streamFlushTimerRef.current !== null) {
      window.clearTimeout(streamFlushTimerRef.current)
      streamFlushTimerRef.current = null
    }
    pendingStreamChunksRef.current = {
      generation,
      content: '',
      reasoning: '',
      toolCalls: [],
      blocks: [],
      sources: [],
      responsesItems: [],
    }
  }, [])

  const flushStreamUpdates = useCallback(
    (generation: number) => {
      if (generation !== requestGenerationRef.current) return
      if (streamFlushTimerRef.current !== null) {
        window.clearTimeout(streamFlushTimerRef.current)
        streamFlushTimerRef.current = null
      }

      const pendingChunks = pendingStreamChunksRef.current
      if (pendingChunks.generation !== generation) return
      if (
        !pendingChunks.reasoning &&
        !pendingChunks.content &&
        pendingChunks.toolCalls.length === 0 &&
        pendingChunks.blocks.length === 0 &&
        pendingChunks.sources.length === 0 &&
        pendingChunks.responsesItems.length === 0
      ) {
        return
      }

      pendingStreamChunksRef.current = {
        generation,
        content: '',
        reasoning: '',
        toolCalls: [],
        blocks: [],
        sources: [],
        responsesItems: [],
      }
      onMessageUpdate((prev) => {
        if (generation !== requestGenerationRef.current) return prev
        return updateLastAssistantMessage(prev, (message) => {
          if (message.status === MESSAGE_STATUS.ERROR) return message
          let updatedMessage = message

          for (const event of pendingChunks.blocks) {
            updatedMessage = applyMessagesBlockEvent(updatedMessage, event)
          }

          // Messages sources follow the blocks: cited and fetched pages
          if (pendingChunks.blocks.length > 0) {
            const blockSources = getMessagesBlockSources(
              updatedMessage.messagesBlocks
            )
            if (blockSources.length > 0) {
              updatedMessage = { ...updatedMessage, sources: blockSources }
            }
          }

          for (const item of pendingChunks.responsesItems) {
            updatedMessage = {
              ...updatedMessage,
              responsesItems: upsertResponsesItem(
                updatedMessage.responsesItems,
                item
              ),
              status: MESSAGE_STATUS.STREAMING,
            }
          }

          if (pendingChunks.sources.length > 0) {
            updatedMessage = {
              ...updatedMessage,
              sources: mergeSources(
                updatedMessage.sources,
                pendingChunks.sources
              ),
            }
          }

          if (pendingChunks.toolCalls.length > 0) {
            updatedMessage = {
              ...applyToolCallDeltas(updatedMessage, pendingChunks.toolCalls),
              status: MESSAGE_STATUS.STREAMING,
            }
          }

          if (pendingChunks.reasoning) {
            updatedMessage = applyStreamingChunk(
              updatedMessage,
              'reasoning',
              pendingChunks.reasoning
            )
          }

          if (pendingChunks.content) {
            updatedMessage = applyStreamingChunk(
              updatedMessage,
              'content',
              pendingChunks.content
            )
          }

          return updatedMessage
        })
      })
    },
    [onMessageUpdate]
  )

  const scheduleStreamFlush = useCallback(
    (generation: number) => {
      if (generation !== requestGenerationRef.current) return
      if (streamFlushTimerRef.current !== null) {
        return
      }

      streamFlushTimerRef.current = window.setTimeout(() => {
        flushStreamUpdates(generation)
      }, STREAM_UPDATE_FLUSH_MS)
    },
    [flushStreamUpdates]
  )

  useEffect(
    () => () => {
      requestGenerationRef.current += 1
      if (streamFlushTimerRef.current !== null) {
        window.clearTimeout(streamFlushTimerRef.current)
      }
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
    },
    []
  )

  const getDisplayError = useCallback(
    (error: string) => {
      if (KNOWN_ERROR_MESSAGES.has(error)) {
        return t(error)
      }

      const connectionClosedSuffix = `: ${ERROR_MESSAGES.CONNECTION_CLOSED}`
      if (error.endsWith(connectionClosedSuffix)) {
        return `${error.slice(0, -ERROR_MESSAGES.CONNECTION_CLOSED.length)}${t(
          ERROR_MESSAGES.CONNECTION_CLOSED
        )}`
      }

      return error
    },
    [t]
  )

  // Handle stream update
  const handleStreamUpdate = useCallback(
    (generation: number, type: 'reasoning' | 'content', chunk: string) => {
      if (generation !== requestGenerationRef.current) return
      if (pendingStreamChunksRef.current.generation !== generation) return
      pendingStreamChunksRef.current[type] = mergePendingStreamChunk(
        pendingStreamChunksRef.current[type],
        chunk
      )
      scheduleStreamFlush(generation)
    },
    [scheduleStreamFlush]
  )

  // Tool call fragments and Messages block changes arrive with nearly every
  // token, so they are batched with the text.
  const handleStreamToolCalls = useCallback(
    (generation: number, deltas: ToolCallDelta[]) => {
      if (generation !== requestGenerationRef.current) return
      if (pendingStreamChunksRef.current.generation !== generation) return
      pendingStreamChunksRef.current.toolCalls.push(...deltas)
      scheduleStreamFlush(generation)
    },
    [scheduleStreamFlush]
  )

  const handleMessagesBlock = useCallback(
    (generation: number, event: MessagesBlockEvent) => {
      if (generation !== requestGenerationRef.current) return
      if (pendingStreamChunksRef.current.generation !== generation) return
      pendingStreamChunksRef.current.blocks.push(event)
      scheduleStreamFlush(generation)
    },
    [scheduleStreamFlush]
  )

  const handleStreamSources = useCallback(
    (generation: number, sources: MessageSource[]) => {
      if (generation !== requestGenerationRef.current) return
      if (pendingStreamChunksRef.current.generation !== generation) return
      pendingStreamChunksRef.current.sources.push(...sources)
      scheduleStreamFlush(generation)
    },
    [scheduleStreamFlush]
  )

  const handleResponsesItem = useCallback(
    (generation: number, item: Record<string, unknown>) => {
      if (generation !== requestGenerationRef.current) return
      if (pendingStreamChunksRef.current.generation !== generation) return
      pendingStreamChunksRef.current.responsesItems.push(item)
      scheduleStreamFlush(generation)
    },
    [scheduleStreamFlush]
  )

  // Images are applied at once: each one is a complete (or partial) picture,
  // not a delta that benefits from batching.
  const handleStreamImage = useCallback(
    (generation: number, image: GeneratedImage) => {
      if (generation !== requestGenerationRef.current) return
      flushStreamUpdates(generation)
      onMessageUpdate((prev) => {
        if (generation !== requestGenerationRef.current) return prev
        return updateLastAssistantMessage(prev, (message) => ({
          ...upsertMessageImage(message, image),
          status: MESSAGE_STATUS.STREAMING,
        }))
      })
    },
    [flushStreamUpdates, onMessageUpdate]
  )

  // Handle stream complete
  const handleStreamComplete = useCallback(
    (generation: number) => {
      if (generation !== requestGenerationRef.current) return
      flushStreamUpdates(generation)
      setIsRequesting(false)
      onMessageUpdate((prev) => {
        if (generation !== requestGenerationRef.current) return prev
        return updateLastAssistantMessage(prev, (message) =>
          isAssistantMessageFinal(message)
            ? message
            : completeAssistantMessage(message)
        )
      })
    },
    [flushStreamUpdates, onMessageUpdate]
  )

  // Handle stream error
  const handleStreamError = useCallback(
    (generation: number, error: string, errorCode?: string) => {
      if (generation !== requestGenerationRef.current) return
      flushStreamUpdates(generation)
      setIsRequesting(false)
      const displayError = getDisplayError(error)
      handleServerError(new Error(displayError))
      const errorTitle = t(ERROR_MESSAGES.API_REQUEST_ERROR)
      onMessageUpdate((prev) => {
        if (generation !== requestGenerationRef.current) return prev
        return updateAssistantMessageWithError(
          prev,
          displayError,
          errorCode,
          errorTitle
        )
      })
    },
    [flushStreamUpdates, getDisplayError, onMessageUpdate, t]
  )

  // Send streaming chat request in the turn's format (see sendChat)
  const sendStreamingChat = useCallback(
    (
      messages: Message[],
      tools: ToolDefinition[],
      hostedTools: HostedToolKey[],
      turnFormat: PlaygroundRequestFormat
    ) => {
      const generation = requestGenerationRef.current + 1
      requestGenerationRef.current = generation
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      discardPendingStreamUpdates(generation)
      setIsRequesting(true)
      let request: PlaygroundStreamRequest
      if (turnFormat === 'responses') {
        request = {
          format: 'responses',
          payload: buildResponsesPayload(messages, config, tools, hostedTools),
        }
      } else if (turnFormat === 'messages') {
        request = {
          format: 'messages',
          payload: buildMessagesPayload(messages, config, tools, hostedTools),
        }
      } else {
        request = {
          format: 'chat',
          payload: buildChatCompletionPayload(
            messages,
            config,
            parameterEnabled,
            tools,
            hostedTools
          ),
        }
      }
      void sendStreamRequest(request, {
        onUpdate: (type, chunk) => handleStreamUpdate(generation, type, chunk),
        onImage: (image) => handleStreamImage(generation, image),
        onToolCalls: (deltas) => handleStreamToolCalls(generation, deltas),
        onMessagesBlock: (event) => handleMessagesBlock(generation, event),
        onSources: (sources) => handleStreamSources(generation, sources),
        onResponsesItem: (item) => handleResponsesItem(generation, item),
        onComplete: () => handleStreamComplete(generation),
        onError: (error, errorCode) =>
          handleStreamError(generation, error, errorCode),
      })
    },
    [
      config,
      parameterEnabled,
      sendStreamRequest,
      discardPendingStreamUpdates,
      handleStreamUpdate,
      handleStreamToolCalls,
      handleMessagesBlock,
      handleStreamSources,
      handleResponsesItem,
      handleStreamImage,
      handleStreamComplete,
      handleStreamError,
    ]
  )

  // Send non-streaming chat request
  const sendNonStreamingChat = useCallback(
    async (
      messages: Message[],
      tools: ToolDefinition[],
      hostedTools: HostedToolKey[]
    ) => {
      const generation = requestGenerationRef.current + 1
      const abortController = new AbortController()

      requestGenerationRef.current = generation
      stopStream()
      discardPendingStreamUpdates(generation)
      abortControllerRef.current?.abort()
      abortControllerRef.current = abortController

      try {
        setIsRequesting(true)
        let choice: ChatCompletionChoice | null
        let messagesBlocks: Message['messagesBlocks']
        if (requestFormat === 'messages') {
          const response = await sendMessages(
            buildMessagesPayload(messages, config, tools, hostedTools),
            abortController.signal
          )
          choice = getMessagesResponseChoice(response)
          messagesBlocks = getMessagesResponseBlocks(response)
        } else {
          const response = await sendChatCompletion(
            buildChatCompletionPayload(
              messages,
              config,
              parameterEnabled,
              tools,
              hostedTools
            ),
            abortController.signal
          )
          choice = response.choices?.[0] ?? null
        }
        if (
          abortController.signal.aborted ||
          requestGenerationRef.current !== generation
        ) {
          return
        }

        if (!choice) {
          handleStreamError(generation, ERROR_MESSAGES.API_REQUEST_ERROR)
          return
        }

        const completedChoice = choice
        const blockSources = getMessagesBlockSources(messagesBlocks)
        onMessageUpdate((prev) => {
          if (requestGenerationRef.current !== generation) return prev
          return updateLastAssistantMessage(prev, (message) => ({
            ...applyChatCompletionChoice(message, completedChoice),
            ...(messagesBlocks?.length ? { messagesBlocks } : {}),
            ...(blockSources.length > 0 ? { sources: blockSources } : {}),
          }))
        })
      } catch (error: unknown) {
        if (
          abortController.signal.aborted ||
          requestGenerationRef.current !== generation
        ) {
          return
        }

        const { errorCode, errorMessage } = parseRequestErrorDetails(error)
        handleStreamError(generation, errorMessage, errorCode)
      } finally {
        if (requestGenerationRef.current === generation) {
          abortControllerRef.current = null
          setIsRequesting(false)
        }
      }
    },
    [
      config,
      parameterEnabled,
      requestFormat,
      stopStream,
      discardPendingStreamUpdates,
      onMessageUpdate,
      handleStreamError,
    ]
  )

  // Send chat request (stream or non-stream based on config). Tools go with
  // chat and Messages requests; image models (Responses) take none. Invalid
  // tools JSON fails the turn before anything is sent. Hosted tools are the
  // switched-on ones the model supports; with one on, an OpenAI chat model
  // sends the turn through Responses, which always streams.
  const sendChat = useCallback(
    (messages: Message[]) => {
      trackFeature('playground.request_submit', {
        stream: config.stream,
        has_image: messages.some((m) => (m.images?.length ?? 0) > 0),
        provider_family: providerFamilyOf(config.model),
      })
      let tools: ToolDefinition[] = []
      if (parameterEnabled.tools && requestFormat !== 'responses') {
        const parsed = parseToolDefinitions(config.tools)
        if (parsed.error) {
          const generation = requestGenerationRef.current + 1
          requestGenerationRef.current = generation
          handleStreamError(
            generation,
            t(parsed.error.key, parsed.error.values)
          )
          return
        }
        tools = parsed.tools
      }

      const hostedTools = getActiveHostedTools(
        config.hosted_tools,
        hostedToolsRoute
      )
      const turnFormat = getTurnRequestFormat(
        requestFormat,
        hostedToolsRoute,
        hostedTools
      )

      // 'responses' always streams; 'messages' follows config.stream like chat
      if (config.stream || turnFormat === 'responses') {
        sendStreamingChat(messages, tools, hostedTools, turnFormat)
      } else {
        void sendNonStreamingChat(messages, tools, hostedTools)
      }
    },
    [
      config.hosted_tools,
      config.model,
      hostedToolsRoute,
      config.stream,
      config.tools,
      parameterEnabled.tools,
      requestFormat,
      handleStreamError,
      sendStreamingChat,
      sendNonStreamingChat,
      t,
    ]
  )

  // Stop generation
  const stopGeneration = useCallback(() => {
    const stoppedGeneration = requestGenerationRef.current
    flushStreamUpdates(stoppedGeneration)
    const idleGeneration = stoppedGeneration + 1
    requestGenerationRef.current = idleGeneration
    discardPendingStreamUpdates(idleGeneration)
    stopStream()
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsRequesting(false)
    onMessageUpdate((prev) => {
      if (requestGenerationRef.current !== idleGeneration) return prev
      return updateLastAssistantMessage(prev, (message) =>
        isAssistantMessagePending(message)
          ? completeAssistantMessage(message)
          : message
      )
    })
  }, [
    stopStream,
    flushStreamUpdates,
    discardPendingStreamUpdates,
    onMessageUpdate,
  ])

  return {
    sendChat,
    stopGeneration,
    isGenerating: isStreaming || isRequesting,
  }
}
