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
import { describe, expect, it } from 'vitest'

import type { PricingModel, PricingVendor } from '@/features/pricing/types'

import {
  buildHeroProviders,
  buildMarqueeProviders,
  HERO_FALLBACK_PROVIDERS,
  HERO_MIN_LOGOS,
  MARQUEE_FALLBACK_PROVIDERS,
  PROVIDER_MODEL_NAME_LIMIT,
  summarizeCatalog,
  type HomeProvider,
} from '../lib/catalog-summary'

const model = (name: string, vendorId?: number, endpoints?: string[]) =>
  ({
    model_name: name,
    vendor_id: vendorId,
    supported_endpoint_types: endpoints,
  }) as PricingModel

const vendors: PricingVendor[] = [
  { id: 1, name: 'Alpha', icon: 'OpenAI' },
  { id: 2, name: 'Beta' },
  { id: 3, name: 'Gamma' },
]

describe('summarizeCatalog', () => {
  it('counts unique models and providers that actually list a model', () => {
    const summary = summarizeCatalog(
      [model('a-1', 1), model('a-2', 1), model('b-1', 2), model('loose')],
      vendors
    )
    expect(summary.modelCount).toBe(4)
    expect(summary.providerCount).toBe(2)
    expect(summary.providers.map((provider) => provider.name)).toEqual([
      'Alpha',
      'Beta',
    ])
  })

  it('attributes a model without a vendor to the provider its name implies', () => {
    const summary = summarizeCatalog([model('gpt-6-astra')], [])

    expect(summary.modelCount).toBe(1)
    expect(summary.providerCount).toBe(1)
    expect(summary.providers[0]).toMatchObject({
      name: 'OpenAI',
      icon: 'OpenAI.Color',
      modelCount: 1,
      modelNames: ['gpt-6-astra'],
    })
    expect(summary.providers[0].id).toBeLessThan(-100_000)
  })

  it('merges inferred models into a catalog vendor with the same name or icon', () => {
    const summary = summarizeCatalog(
      [
        model('claude-opus-5-5', 3),
        model('claude-sonnet-5-5'),
        model('gemini-3.1-pro'),
        model('gemini-3.1-flash', 99),
        model('kimi-k3'),
      ],
      [
        { id: 3, name: 'Anthropic', icon: 'Claude.Color' },
        { id: 4, name: 'Google', icon: 'Gemini.Color' },
      ]
    )

    expect(
      summary.providers.map((provider) => [provider.name, provider.modelCount])
    ).toEqual([
      ['Anthropic', 2],
      ['Google', 2],
      ['Moonshot', 1],
    ])
    expect(summary.providers[0].id).toBe(3)
    expect(summary.providers[1].id).toBe(4)
  })

  it('orders providers by model count, then by name', () => {
    const summary = summarizeCatalog(
      [model('g-1', 3), model('b-1', 2), model('b-2', 2), model('a-1', 1)],
      vendors
    )
    expect(summary.providers.map((provider) => provider.name)).toEqual([
      'Beta',
      'Alpha',
      'Gamma',
    ])
  })

  it('does not double count a model name listed twice', () => {
    const summary = summarizeCatalog(
      [model('a-1', 1), model('a-1', 1)],
      vendors
    )
    expect(summary.modelCount).toBe(1)
    expect(summary.providers[0].modelCount).toBe(1)
  })

  it('lists a capped number of model names per provider in catalog order', () => {
    const many = Array.from({ length: PROVIDER_MODEL_NAME_LIMIT + 3 }, (_, i) =>
      model(`a-${i}`, 1)
    )
    const summary = summarizeCatalog(many, vendors)
    expect(summary.providers[0].modelCount).toBe(many.length)
    expect(summary.providers[0].modelNames).toEqual(
      many.slice(0, PROVIDER_MODEL_NAME_LIMIT).map((m) => m.model_name)
    )
  })

  it('derives native protocols from endpoint types, folding Responses into OpenAI', () => {
    const summary = summarizeCatalog(
      [
        model('a-1', 1, ['openai-response']),
        model('a-2', 1, ['gemini', 'embeddings']),
        model('b-1', 2, ['anthropic']),
        model('g-1', 3),
      ],
      vendors
    )
    const byName = Object.fromEntries(
      summary.providers.map((provider) => [provider.name, provider.protocols])
    )
    expect(byName.Alpha).toEqual(['openai', 'gemini'])
    expect(byName.Beta).toEqual(['anthropic'])
    expect(byName.Gamma).toEqual([])
  })

  it('returns empty totals for an empty catalog', () => {
    expect(summarizeCatalog([], vendors)).toEqual({
      providers: [],
      modelCount: 0,
      providerCount: 0,
    })
  })
})

const provider = (id: number, name: string, icon?: string): HomeProvider => ({
  id,
  name,
  icon,
  modelCount: 1,
  modelNames: [],
  protocols: [],
})

describe('buildMarqueeProviders', () => {
  it('fills the marquee with fallback marks when the catalog has no other vendors', () => {
    const marquee = buildMarqueeProviders([], [], 24)

    expect(marquee).toHaveLength(MARQUEE_FALLBACK_PROVIDERS.length)
    expect(marquee.every((item) => item.modelCount === 0)).toBe(true)
  })

  it('lists catalog providers first and skips fallbacks already shown by name or icon', () => {
    const featured = provider(1, 'OpenAI')
    const other = provider(2, 'Acme', 'Claude')

    const marquee = buildMarqueeProviders([other], [featured, other], 24)

    expect(marquee[0]).toBe(other)
    const names = marquee.map((item) => item.name)
    expect(names).not.toContain('OpenAI')
    expect(names).not.toContain('Claude')
    expect(names).toContain('Gemini')
  })

  it('caps the row at the given limit', () => {
    const catalog = Array.from({ length: 30 }, (_, index) =>
      provider(index + 1, `Vendor ${index}`)
    )

    expect(buildMarqueeProviders(catalog, catalog, 24)).toHaveLength(24)
  })

  it('keeps fallback ids apart from negative built-in vendor ids', () => {
    const ids = new Set(MARQUEE_FALLBACK_PROVIDERS.map((item) => item.id))

    expect(ids.size).toBe(MARQUEE_FALLBACK_PROVIDERS.length)
    expect([...ids].every((id) => id <= -900_000)).toBe(true)
  })
})

describe('buildHeroProviders', () => {
  const vendor = (id: number, name: string, icon?: string): HomeProvider => ({
    id,
    name,
    icon,
    modelCount: 1,
    modelNames: [],
    protocols: [],
  })

  it('pads a short catalog with KuCode marks, skipping providers already shown under another name', () => {
    const catalog = [
      vendor(1, 'OpenAI', 'OpenAI'),
      vendor(3, 'Anthropic', 'Claude.Color'),
      vendor(4, 'Google', 'Gemini.Color'),
      vendor(5, 'xAI', 'XAI'),
      vendor(6, '智谱', 'Zhipu.Color'),
      vendor(7, 'Moonshot', 'Moonshot'),
      vendor(-1005, 'DeepSeek', 'DeepSeek.Color'),
    ]
    const row = buildHeroProviders(catalog)

    expect(row).toHaveLength(HERO_MIN_LOGOS)
    expect(row.slice(0, catalog.length)).toEqual(catalog)
    expect(row.slice(catalog.length).map((item) => item.name)).toEqual([
      'Qwen',
      'Mistral',
      'Meta Llama',
    ])
  })

  it('never drops catalog providers beyond the minimum', () => {
    const catalog = Array.from({ length: HERO_MIN_LOGOS + 4 }, (_, i) =>
      vendor(i + 1, `Vendor ${i + 1}`)
    )
    expect(buildHeroProviders(catalog)).toEqual(catalog)
  })

  it('shows the KuCode marks alone without a catalog, with unique ids', () => {
    const row = buildHeroProviders([])
    expect(row).toEqual(HERO_FALLBACK_PROVIDERS)
    expect(new Set(row.map((item) => item.id)).size).toBe(row.length)
  })
})

describe('marquee alias dedupe', () => {
  it('does not add Grok or Kimi marks when xAI and Moonshot are in the catalog', () => {
    const shown: HomeProvider[] = [
      {
        id: 5,
        name: 'xAI',
        icon: 'XAI',
        modelCount: 1,
        modelNames: [],
        protocols: [],
      },
      {
        id: 7,
        name: 'Moonshot',
        icon: 'Moonshot',
        modelCount: 1,
        modelNames: [],
        protocols: [],
      },
    ]
    const names = buildMarqueeProviders([], shown, 24).map((item) => item.name)
    expect(names).not.toContain('Grok')
    expect(names).not.toContain('Kimi')
  })
})
