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

import { hash2, valueNoise2D } from '../noise'

describe('noise', () => {
  test('hash2 is deterministic and stays inside [0, 1)', () => {
    for (let x = -5; x < 5; x++) {
      for (let y = -5; y < 5; y++) {
        const h = hash2(x, y)
        expect(h).toBe(hash2(x, y))
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThan(1)
      }
    }
  })

  test('hash2 differs between mirrored cells', () => {
    expect(hash2(1, 2)).not.toBe(hash2(2, 1))
  })

  test('valueNoise2D equals the cell hash on integer coordinates', () => {
    expect(valueNoise2D(3, 4)).toBeCloseTo(hash2(3, 4))
  })

  test('valueNoise2D stays inside [0, 1) and is continuous', () => {
    const a = valueNoise2D(1.5, 2.5)
    const b = valueNoise2D(1.5001, 2.5)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(1)
    expect(Math.abs(a - b)).toBeLessThan(0.01)
  })
})
