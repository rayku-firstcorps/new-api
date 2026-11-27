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
import {
  ANTHROPIC_ENDPOINT_TYPE,
  IMAGE_GENERATION_ENDPOINT_TYPE,
  OPENAI_RESPONSES_ENDPOINT_TYPE,
} from '../../constants'
import type {
  GroupOption,
  HostedToolsRoute,
  ModelOption,
  PlaygroundRequestFormat,
} from '../../types'

export function getModelFallback(
  models: ModelOption[],
  currentModel: string
): string | null {
  const hasCurrentModel = models.some((model) => model.value === currentModel)

  if (hasCurrentModel || models.length === 0) {
    return null
  }

  return models[0].value
}

export function shouldClearModelForGroup(
  models: ModelOption[],
  currentModel: string
): boolean {
  if (currentModel === '') {
    return false
  }

  return !models.some((model) => model.value === currentModel)
}

export function getGroupFallback(
  groups: GroupOption[],
  currentGroup: string
): string | null {
  const hasCurrentGroup = groups.some((group) => group.value === currentGroup)

  if (hasCurrentGroup || groups.length === 0) {
    return null
  }

  return (
    groups.find((group) => group.value === 'default')?.value ?? groups[0].value
  )
}

export function getOptionLoadErrorMessage(
  error: unknown,
  fallbackMessage: string
): string {
  return error instanceof Error ? error.message : fallbackMessage
}

/**
 * Pick the playground request API from the model catalog endpoints. Image
 * generation models use Responses. Claude models with an Anthropic endpoint
 * use Messages, so pass-through Anthropic channels receive a native body;
 * the name check keeps non-Claude models on gateways that list every
 * endpoint (New API, Sub2API) on chat completions. Without catalog data
 * every model uses chat completions.
 */
export function getPlaygroundRequestFormat(
  supportedEndpointTypes: readonly string[] | undefined,
  model: string
): PlaygroundRequestFormat {
  if (supportedEndpointTypes?.includes(IMAGE_GENERATION_ENDPOINT_TYPE)) {
    return 'responses'
  }

  if (
    supportedEndpointTypes?.includes(ANTHROPIC_ENDPOINT_TYPE) &&
    /claude/i.test(model)
  ) {
    return 'messages'
  }

  return 'chat'
}

/**
 * Where the model's hosted tools go. Image models take none; a model that
 * uses Messages keeps it. Any other model goes to the native endpoint its
 * catalog lists, OpenAI Responses before Anthropic Messages; without one,
 * chat completions carries web search as web_search_options.
 */
export function getHostedToolsRoute(
  supportedEndpointTypes: readonly string[] | undefined,
  model: string
): HostedToolsRoute {
  const format = getPlaygroundRequestFormat(supportedEndpointTypes, model)
  if (format === 'responses') return 'none'
  if (format === 'messages') return 'messages'
  if (supportedEndpointTypes?.includes(OPENAI_RESPONSES_ENDPOINT_TYPE)) {
    return 'responses'
  }
  if (supportedEndpointTypes?.includes(ANTHROPIC_ENDPOINT_TYPE)) {
    return 'messages'
  }
  return 'chat'
}
