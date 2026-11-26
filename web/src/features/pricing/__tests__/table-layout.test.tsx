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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PricingTable } from '../components/pricing-table'
import type { PricingModel } from '../types'

const model: PricingModel = {
  id: 1,
  model_name: 'example-model',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default'],
}

describe('pricing table layout', () => {
  it('pins the model column to the left edge for horizontal scrolling', () => {
    render(<PricingTable models={[model]} />)

    const modelCell = screen.getByText(model.model_name).closest('td')
    expect(modelCell).toHaveClass('sticky', 'left-0')
  })

  it('opens the model details when a row is clicked', async () => {
    const user = userEvent.setup()
    const onModelClick = vi.fn()
    render(<PricingTable models={[model]} onModelClick={onModelClick} />)

    await user.click(screen.getByText(model.model_name))
    expect(onModelClick).toHaveBeenCalledWith(model.model_name)
  })
})
