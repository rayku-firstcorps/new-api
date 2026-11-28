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
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { trackFeature } from '@/lib/analytics'

import { useFilters } from '../hooks/use-filters'

vi.mock('@tanstack/react-router', () => ({ useSearch: () => ({}) }))
vi.mock('@/lib/analytics', () => ({ trackFeature: vi.fn() }))

describe('pricing filter analytics', () => {
  beforeEach(() => vi.mocked(trackFeature).mockClear())

  test('changing the vendor filter reports only the filter type', () => {
    const view = renderHook(() => useFilters([]))
    act(() => view.result.current.setVendorFilter('OpenAI'))

    expect(trackFeature).toHaveBeenCalledTimes(1)
    expect(trackFeature).toHaveBeenCalledWith('pricing.filter_change', {
      filter_type: 'vendor',
    })
  })

  test('typing a search term and clearing filters report nothing', () => {
    const view = renderHook(() => useFilters([]))
    act(() => view.result.current.setSearchInput('gpt-4 secret'))
    act(() => view.result.current.clearFilters())

    expect(trackFeature).not.toHaveBeenCalled()
  })
})
