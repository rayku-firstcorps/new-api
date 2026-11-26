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

import { AMBER, hexToRgb } from '../color'
import { BUCKETS, buildSpherePalette, parseHexColor } from '../palette'

describe('palette', () => {
  test('parseHexColor accepts hex colors and rejects other values', () => {
    expect(parseHexColor(' #f5a50b ')).toBe('#f5a50b')
    expect(parseHexColor('#fff')).toBe('#fff')
    expect(parseHexColor('rgb(0 0 0 / 10%)')).toBeNull()
    expect(parseHexColor('')).toBeNull()
    expect(parseHexColor(null)).toBeNull()
  })

  test('buildSpherePalette builds one colour and one fill per bucket', () => {
    const palette = buildSpherePalette('dark')
    expect(palette.bucketRgb).toHaveLength(BUCKETS)
    expect(palette.baseStyles).toHaveLength(BUCKETS)
    expect(palette.baseStyles[0]).toMatch(/^rgba\(/)
  })

  test('dark palette takes the amber glow from the primary token', () => {
    const palette = buildSpherePalette('dark', { primary: '#112233' })
    expect(palette.amber).toEqual(hexToRgb('#112233'))
  })

  test('dark palette falls back to KuCode amber for a non-hex token', () => {
    const palette = buildSpherePalette('dark', { primary: 'oklch(0.7 0.1 80)' })
    expect(palette.amber).toEqual(hexToRgb(AMBER.amber))
  })

  test('light palette ignores the primary token and uses its own ramp', () => {
    const light = buildSpherePalette('light', { primary: '#112233' })
    const dark = buildSpherePalette('dark')
    expect(light.amber).toEqual(hexToRgb(AMBER.amber))
    expect(light.bucketRgb[0]).not.toEqual(dark.bucketRgb[0])
    expect(light.bucketRgb[0][0]).toBeGreaterThan(200)
  })

  test('foreground follows the token and defaults per theme', () => {
    const token = buildSpherePalette('light', { foreground: '#222222' })
    expect(token.foreground).toEqual(hexToRgb('#222222'))
    expect(buildSpherePalette('light').foreground).toEqual(hexToRgb('#111111'))
    expect(buildSpherePalette('dark').foreground).toEqual(hexToRgb('#F5F5F5'))
  })
})
