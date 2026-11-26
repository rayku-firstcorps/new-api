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
import { describe, expect, test } from 'vitest'

import { clamp, damp, lerp, smoothstep } from '../math'

describe('math', () => {
  test('clamp limits values below min and above max', () => {
    expect(clamp(-1, 0, 1)).toBe(0)
    expect(clamp(2, 0, 1)).toBe(1)
    expect(clamp(0.4, 0, 1)).toBe(0.4)
  })

  test('lerp at t=0, 0.5 and 1 returns start, midpoint and end', () => {
    expect(lerp(10, 20, 0)).toBe(10)
    expect(lerp(10, 20, 0.5)).toBe(15)
    expect(lerp(10, 20, 1)).toBe(20)
  })

  test('smoothstep is 0 below the edges, 1 above and 0.5 at the middle', () => {
    expect(smoothstep(0, 1, -5)).toBe(0)
    expect(smoothstep(0, 1, 5)).toBe(1)
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5)
  })

  test('damp at 60fps returns the per-frame rate and grows with dt', () => {
    expect(damp(0.08, 1 / 60)).toBeCloseTo(0.08)
    expect(damp(0.08, 1 / 30)).toBeGreaterThan(damp(0.08, 1 / 60))
    expect(damp(0.08, 0)).toBe(0)
  })
})
