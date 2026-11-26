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
import type { PricingModel, PricingVendor } from '@/features/pricing/types'
import { resolveModelProvider } from '@/lib/model-provider'

export type HomeProtocol = 'openai' | 'anthropic' | 'gemini'

export type HomeProvider = {
  id: number
  name: string
  icon?: string
  modelCount: number
  /** A few of the vendor's catalog model names, in catalog order. */
  modelNames: string[]
  /** Native API protocols the vendor's models are served through. */
  protocols: HomeProtocol[]
}

/** Models listed on one provider card; the full count is shown beside it. */
export const PROVIDER_MODEL_NAME_LIMIT = 6

const PROTOCOL_ORDER: HomeProtocol[] = ['openai', 'anthropic', 'gemini']

/** Endpoint types in the catalog that belong to each native protocol. */
const PROTOCOL_ENDPOINTS: Record<HomeProtocol, string[]> = {
  openai: ['openai', 'openai-response'],
  anthropic: ['anthropic'],
  gemini: ['gemini'],
}

/**
 * Marks shown while no public catalog is available (signed-in users, pricing
 * hidden). Negative ids keep them apart from real vendor ids.
 */
export const FALLBACK_PROVIDERS: HomeProvider[] = [
  ['OpenAI', 'OpenAI'],
  ['Claude', 'Claude'],
  ['Gemini', 'Gemini'],
  ['DeepSeek', 'DeepSeek'],
].map(([name, icon], index) => ({
  id: -(index + 1),
  name,
  icon,
  modelCount: 0,
  modelNames: [],
  protocols: [],
}))

/**
 * Names and icon names that mean the same provider (lower case, icon names
 * without their ".Color" suffix). Used only to avoid showing one provider
 * twice when padding a row with fallback marks.
 */
const PROVIDER_ALIASES: string[][] = [
  ['openai', 'chatgpt'],
  ['anthropic', 'claude'],
  ['google', 'gemini', 'google gemini'],
  ['xai', 'grok', 'xai grok'],
  ['moonshot', 'kimi', 'moonshot kimi'],
  ['zhipu', 'glm', 'chatglm', 'zhipu glm', '智谱'],
  ['qwen', 'tongyi', 'alibaba', '通义', '阿里'],
  ['meta', 'llama', 'meta llama'],
  ['doubao', 'bytedance', '豆包'],
  ['hunyuan', 'tencent', '腾讯'],
  ['minimax'],
  ['stepfun', '阶跃'],
]

/** Every key a provider is known by: its name, its icon and their aliases. */
function providerKeys(provider: HomeProvider): string[] {
  const keys = new Set<string>()
  for (const raw of [provider.name, iconKey(provider.icon)]) {
    const key = raw.trim().toLowerCase()
    if (!key) continue
    keys.add(key)
    for (const group of PROVIDER_ALIASES) {
      if (group.includes(key)) for (const alias of group) keys.add(alias)
    }
  }
  return [...keys]
}

/**
 * Append the fallback marks that are not already represented (by name, icon
 * or alias) in `shown`, until `list` reaches `size`. `list` itself is never
 * shortened.
 */
function padWithFallbacks(
  list: HomeProvider[],
  shown: HomeProvider[],
  fallbacks: HomeProvider[],
  size: number
): HomeProvider[] {
  const seen = new Set(shown.flatMap(providerKeys))
  const padded = [...list]
  for (const fallback of fallbacks) {
    if (padded.length >= size) break
    const keys = providerKeys(fallback)
    if (keys.some((key) => seen.has(key))) continue
    padded.push(fallback)
    for (const key of keys) seen.add(key)
  }
  return padded
}

/** Number of marks the hero logo row shows at least. */
export const HERO_MIN_LOGOS = 10

/**
 * Hero padding marks, following the KuCode landing design's provider list
 * and order. Marks only (no model counts); ids sit far below real vendor ids.
 */
export const HERO_FALLBACK_PROVIDERS: HomeProvider[] = [
  ['OpenAI', 'OpenAI'],
  ['Anthropic', 'Claude'],
  ['Google Gemini', 'Gemini'],
  ['DeepSeek', 'DeepSeek'],
  ['Qwen', 'Qwen'],
  ['Mistral', 'Mistral'],
  ['Meta Llama', 'Meta'],
  ['xAI Grok', 'Grok'],
  ['Moonshot Kimi', 'Kimi'],
  ['Zhipu GLM', 'Zhipu'],
].map(([name, icon], index) => ({
  id: -700_000 - index,
  name,
  icon,
  modelCount: 0,
  modelNames: [],
  protocols: [],
}))

/**
 * Hero logo row: every catalog provider (never capped), then KuCode's
 * provider marks not already shown, up to `HERO_MIN_LOGOS` in total. Without
 * a catalog the row is the padding marks alone.
 */
export function buildHeroProviders(
  catalogProviders: HomeProvider[]
): HomeProvider[] {
  return padWithFallbacks(
    catalogProviders,
    catalogProviders,
    HERO_FALLBACK_PROVIDERS,
    HERO_MIN_LOGOS
  )
}

/**
 * Well-known provider marks that keep the home marquee populated when the
 * public catalog has few or no vendors beyond the featured cards. They are
 * marks only (no model counts). Ids sit far below real vendor ids, which can
 * also be negative for built-in presets.
 */
export const MARQUEE_FALLBACK_PROVIDERS: HomeProvider[] = [
  ['OpenAI', 'OpenAI'],
  ['Claude', 'Claude'],
  ['Gemini', 'Gemini'],
  ['DeepSeek', 'DeepSeek'],
  ['Qwen', 'Qwen'],
  ['Kimi', 'Kimi'],
  ['Zhipu', 'Zhipu'],
  ['Doubao', 'Doubao'],
  ['Grok', 'Grok'],
  ['Mistral', 'Mistral'],
  ['Meta', 'Meta'],
  ['MiniMax', 'Minimax'],
  ['Cohere', 'Cohere'],
  ['Hunyuan', 'Hunyuan'],
  ['StepFun', 'Stepfun'],
  ['Perplexity', 'Perplexity'],
].map(([name, icon], index) => ({
  id: -900_000 - index,
  name,
  icon,
  modelCount: 0,
  modelNames: [],
  protocols: [],
}))

/**
 * Marquee row: the given catalog providers first, then fallback marks that
 * are not already shown anywhere on the providers section (by name, icon or
 * alias), capped at `limit`. Never empty.
 */
export function buildMarqueeProviders(
  catalogProviders: HomeProvider[],
  shownProviders: HomeProvider[],
  limit: number
): HomeProvider[] {
  return padWithFallbacks(
    catalogProviders,
    shownProviders,
    MARQUEE_FALLBACK_PROVIDERS,
    limit
  ).slice(0, limit)
}

export type HomeCatalogSummary = {
  providers: HomeProvider[]
  modelCount: number
  providerCount: number
}

/** Lower-cased icon name without its variant suffix ("Claude.Color" -> "claude"). */
function iconKey(icon: string | undefined) {
  return (icon ?? '').split('.')[0].trim().toLowerCase()
}

/** Ids of providers inferred from model names; far below real vendor ids. */
const INFERRED_PROVIDER_ID_BASE = -800_000

type ProviderGroup = {
  id: number
  name: string
  icon?: string
  names: Set<string>
  endpoints: Set<string>
}

/**
 * Derive the landing page's provider row and totals from the public pricing
 * catalog. Everything is computed, never hard-coded: vendors without a listed
 * model are dropped, and the busiest vendors come first. A model without a
 * known vendor is attributed by its name (`resolveModelProvider`), merged
 * into a catalog vendor with the same name or icon when there is one, so every
 * listed model is represented; models no rule recognizes count only in the
 * total.
 */
export function summarizeCatalog(
  models: PricingModel[],
  vendors: PricingVendor[]
): HomeCatalogSummary {
  const modelNames = new Set<string>()
  const groups = new Map<string, ProviderGroup>()
  const vendorKeyByLabel = new Map<string, string>()
  for (const vendor of vendors) {
    if (!vendor.name) continue
    const key = `vendor:${vendor.id}`
    groups.set(key, {
      id: vendor.id,
      name: vendor.name,
      icon: vendor.icon,
      names: new Set(),
      endpoints: new Set(),
    })
    vendorKeyByLabel.set(vendor.name.trim().toLowerCase(), key)
    const icon = iconKey(vendor.icon)
    if (icon && !vendorKeyByLabel.has(icon)) vendorKeyByLabel.set(icon, key)
  }

  let inferredCount = 0
  const groupFor = (model: PricingModel): ProviderGroup | undefined => {
    const vendorGroup =
      model.vendor_id === undefined
        ? undefined
        : groups.get(`vendor:${model.vendor_id}`)
    if (vendorGroup) return vendorGroup
    const inferred = resolveModelProvider(model.model_name)
    if (!inferred) return undefined
    const labels = [inferred.name, inferred.label, iconKey(inferred.icon)]
    for (const label of labels) {
      const key = label && vendorKeyByLabel.get(label.trim().toLowerCase())
      if (key) return groups.get(key)
    }
    const key = `inferred:${inferred.name}`
    let group = groups.get(key)
    if (!group) {
      group = {
        id: INFERRED_PROVIDER_ID_BASE - inferredCount++,
        name: inferred.label ?? inferred.name,
        icon: inferred.icon,
        names: new Set(),
        endpoints: new Set(),
      }
      groups.set(key, group)
    }
    return group
  }

  for (const model of models) {
    if (!model.model_name) continue
    modelNames.add(model.model_name)
    const group = groupFor(model)
    if (!group) continue
    group.names.add(model.model_name)
    for (const endpoint of model.supported_endpoint_types ?? []) {
      group.endpoints.add(endpoint)
    }
  }

  const providers: HomeProvider[] = []
  for (const group of groups.values()) {
    if (group.names.size === 0) continue
    const names = [...group.names]
    providers.push({
      id: group.id,
      name: group.name,
      icon: group.icon,
      modelCount: names.length,
      modelNames: names.slice(0, PROVIDER_MODEL_NAME_LIMIT),
      protocols: PROTOCOL_ORDER.filter((protocol) =>
        PROTOCOL_ENDPOINTS[protocol].some((endpoint) =>
          group.endpoints.has(endpoint)
        )
      ),
    })
  }
  providers.sort(
    (a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name)
  )

  return {
    providers,
    modelCount: modelNames.size,
    providerCount: providers.length,
  }
}
