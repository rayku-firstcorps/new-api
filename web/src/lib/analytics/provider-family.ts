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
import { resolveModelProvider } from '@/lib/model-provider'

import type { ProviderFamily } from './whitelist'

const PROVIDER_FAMILY_BY_NAME: Readonly<Record<string, ProviderFamily>> = {
  OpenAI: 'openai',
  Anthropic: 'claude',
  Gemini: 'gemini',
  DeepSeek: 'deepseek',
  Qwen: 'qwen',
  xAI: 'grok',
  Mistral: 'mistral',
  Meta: 'llama',
  Zhipu: 'glm',
  Moonshot: 'moonshot',
  Doubao: 'doubao',
}

/** Maps a model name to a coarse provider family; the model name never leaves the browser. */
export function providerFamilyOf(modelName: string): ProviderFamily {
  const provider = resolveModelProvider(modelName)
  return (provider && PROVIDER_FAMILY_BY_NAME[provider.name]) || 'other'
}
