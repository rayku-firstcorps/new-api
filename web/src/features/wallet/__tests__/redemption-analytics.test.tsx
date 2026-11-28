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

import { redeemTopupCode } from '../api'
import { useRedemption } from '../hooks/use-redemption'

vi.mock('@/lib/analytics', () => ({ trackFeature: vi.fn() }))
vi.mock('@/lib/api', () => ({ getSelf: vi.fn() }))
vi.mock('@/lib/handle-server-error', () => ({ handleServerError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../api', () => ({ redeemTopupCode: vi.fn() }))

describe('redemption analytics', () => {
  beforeEach(() => vi.mocked(trackFeature).mockClear())

  test('a successful redemption reports only the ok result, not the code or amount', async () => {
    vi.mocked(redeemTopupCode).mockResolvedValue({
      success: true,
      message: '',
      data: 500000,
    })
    const view = renderHook(() => useRedemption())
    await act(() => view.result.current.redeemCode('SECRET-CODE'))

    expect(trackFeature).toHaveBeenCalledWith('wallet.redeem_submit', {
      result: 'ok',
    })
    expect(JSON.stringify(vi.mocked(trackFeature).mock.calls)).not.toContain(
      'SECRET-CODE'
    )
  })

  test('a rejected redemption reports the fail result', async () => {
    vi.mocked(redeemTopupCode).mockResolvedValue({
      success: false,
      message: 'invalid',
    })
    const view = renderHook(() => useRedemption())
    await act(() => view.result.current.redeemCode('BAD'))

    expect(trackFeature).toHaveBeenCalledWith('wallet.redeem_submit', {
      result: 'fail',
    })
  })
})
