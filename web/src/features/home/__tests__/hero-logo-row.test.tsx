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
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeroLogoRow } from '../components/hero-logo-row'
import {
  HERO_FALLBACK_PROVIDERS,
  HERO_MIN_LOGOS,
  type HomeProvider,
} from '../lib/catalog-summary'

const provider = (id: number, name: string): HomeProvider => ({
  id,
  name,
  modelCount: 1,
  modelNames: [`${name.toLowerCase()}-model`],
  protocols: [],
})

describe('hero logo row', () => {
  it('shows every catalog provider first, padded to the minimum, with catalog totals', () => {
    const providers = [
      'OpenAI',
      'Anthropic',
      'xAI',
      'Google',
      'Zhipu',
      'DeepSeek',
      'Moonshot',
      'Mistral',
    ].map((name, index) => provider(index + 1, name))
    render(
      <HeroLogoRow
        catalog={{ providers, modelCount: 8, providerCount: providers.length }}
      />
    )

    const labels = within(screen.getByRole('list', { name: 'Model providers' }))
      .getAllByRole('link')
      .map((link) => link.getAttribute('aria-label'))
    expect(labels.slice(0, providers.length)).toEqual(
      providers.map((item) => item.name)
    )
    expect(labels).toHaveLength(HERO_MIN_LOGOS)
    expect(screen.getByText('8 models from 8 providers')).toBeInTheDocument()
  })

  it('falls back to the KuCode provider marks without a public catalog', () => {
    render(<HeroLogoRow catalog={null} />)

    expect(
      within(screen.getByRole('list', { name: 'Model providers' }))
        .getAllByRole('link')
        .map((link) => link.getAttribute('aria-label'))
    ).toEqual(HERO_FALLBACK_PROVIDERS.map((item) => item.name))
  })
})
