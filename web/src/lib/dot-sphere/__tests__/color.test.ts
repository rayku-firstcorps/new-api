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

import {
  AMBER,
  AMBER_LIGHT,
  buildColorLut,
  hexToRgb,
  intensityToAlpha,
  intensityToRgb,
  isNearWhite,
  luminance,
  lutRgb,
  mixRgb,
  rgba,
} from '../color'

describe('color', () => {
  test('hexToRgb parses 6 and 3 digit hex', () => {
    expect(hexToRgb('#FFC23A')).toEqual([255, 194, 58])
    expect(hexToRgb('fff')).toEqual([255, 255, 255])
  })

  test('hexToRgb falls back to amber for invalid input', () => {
    expect(hexToRgb('nope')).toEqual([245, 165, 11])
  })

  test('mixRgb at t=0.5 returns the midpoint', () => {
    expect(mixRgb([0, 0, 0], [100, 200, 50], 0.5)).toEqual([50, 100, 25])
  })

  test('intensityToRgb hits the ramp stops and clamps outside 0..1', () => {
    expect(intensityToRgb(0)).toEqual(hexToRgb(AMBER.ember))
    expect(intensityToRgb(0.25)).toEqual(hexToRgb(AMBER.deep))
    expect(intensityToRgb(-3)).toEqual(intensityToRgb(0))
    expect(intensityToRgb(9)).toEqual(intensityToRgb(1))
  })

  test('the light ramp starts paler than the dark ramp and ends deeper', () => {
    const lightLow = luminance(intensityToRgb(0, AMBER_LIGHT))
    const darkLow = luminance(intensityToRgb(0, AMBER))
    const lightHigh = luminance(intensityToRgb(1, AMBER_LIGHT))
    const darkHigh = luminance(intensityToRgb(1, AMBER))
    expect(lightLow).toBeGreaterThan(darkLow)
    expect(lightHigh).toBeLessThan(darkHigh)
  })

  test('intensityToAlpha maps 0..1 onto 0.15..1', () => {
    expect(intensityToAlpha(0)).toBeCloseTo(0.15)
    expect(intensityToAlpha(1)).toBeCloseTo(1)
  })

  test('lutRgb at full intensity matches intensityToRgb', () => {
    const lut = buildColorLut(256)
    const expected = intensityToRgb(1)
    lutRgb(lut, 1).forEach((channel, k) => {
      expect(Math.abs(channel - expected[k])).toBeLessThanOrEqual(1)
    })
  })

  test('isNearWhite flags white but not amber', () => {
    expect(isNearWhite([255, 255, 255])).toBe(true)
    expect(isNearWhite(hexToRgb(AMBER.amber))).toBe(false)
  })

  test('rgba rounds channels and clamps alpha', () => {
    expect(rgba([10.4, 20.6, 30], 2)).toBe('rgba(10,21,30,1.000)')
    expect(rgba([0, 0, 0], -1)).toBe('rgba(0,0,0,0.000)')
  })
})
