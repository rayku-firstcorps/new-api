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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { ModelDetailsDrawer } from '../components/model-details'
import type { PricingModel } from '../types'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

const model: PricingModel = {
  id: 1,
  model_name: 'example-model',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default'],
}

let client: QueryClient
const originalWidth = window.innerWidth

beforeEach(() => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { data: {} } })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  client.clear()
  vi.restoreAllMocks()
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalWidth,
  })
})

function renderDrawer() {
  return render(
    <QueryClientProvider client={client}>
      <ModelDetailsDrawer
        open
        onOpenChange={vi.fn()}
        model={model}
        groupRatio={{ default: 1 }}
        usableGroup={{ default: { desc: '', ratio: 1 } }}
        endpointMap={{}}
        autoGroups={[]}
        priceRate={1}
        usdExchangeRate={1}
        tokenUnit='M'
      />
    </QueryClientProvider>
  )
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
}

describe('model details drawer', () => {
  it('labels the dialog with the visible model name as a level-two heading', async () => {
    setViewportWidth(1280)
    renderDrawer()

    const dialog = await screen.findByRole('dialog', { name: model.model_name })
    expect(dialog).toBeVisible()
    expect(
      screen.getByRole('heading', { level: 2, name: model.model_name })
    ).toBeVisible()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('opens from the right on wide screens', async () => {
    setViewportWidth(1280)
    renderDrawer()

    const dialog = await screen.findByRole('dialog', { name: model.model_name })
    expect(dialog).toHaveAttribute('data-side', 'right')
  })

  it('opens as a bottom sheet on phone widths', async () => {
    setViewportWidth(375)
    renderDrawer()

    const dialog = await screen.findByRole('dialog', { name: model.model_name })
    expect(dialog).toHaveAttribute('data-side', 'bottom')
  })
})
