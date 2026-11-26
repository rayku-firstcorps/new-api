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

import { isSameGeometry, measureDiagram } from '../lib/diagram-geometry'

const box = (left: number, top: number, width: number, height: number) =>
  ({
    getBoundingClientRect: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }),
  }) as unknown as HTMLElement

describe('measureDiagram', () => {
  const container = box(0, 0, 900, 300)

  it('draws a straight inbound line and curves into each node in the wide layout', () => {
    const geometry = measureDiagram(
      container,
      box(0, 120, 160, 60),
      box(400, 100, 100, 100),
      [box(700, 20, 200, 50), box(700, 230, 200, 50)]
    )
    expect(geometry.w).toBe(900)
    expect(geometry.h).toBe(300)
    expect(geometry.inbound).toBe('M160 150 L400 150')
    expect(geometry.outbound).toHaveLength(2)
    expect(geometry.outbound[0]).toMatch(/^M500 150 C600 150 600 45 700 45$/)
    expect(geometry.outbound[1]).toMatch(/^M500 150 C600 150 600 255 700 255$/)
  })

  it('uses a vertical trunk when the router sits below the app node', () => {
    const geometry = measureDiagram(
      box(0, 0, 360, 500),
      box(0, 0, 150, 50),
      box(0, 100, 88, 88),
      [box(112, 300, 240, 50)]
    )
    expect(geometry.inbound).toBe('M44 50 L44 100')
    expect(geometry.outbound[0]).toMatch(/^M44 188 L44 \d+(\.\d)? Q44 325 /)
  })
})

describe('isSameGeometry', () => {
  const a = { w: 1, h: 2, inbound: 'M0 0', outbound: ['M1 1'] }

  it('treats equal geometry as the same and null or changed paths as different', () => {
    expect(isSameGeometry({ ...a }, a)).toBe(true)
    expect(isSameGeometry(null, a)).toBe(false)
    expect(isSameGeometry({ ...a, outbound: ['M2 2'] }, a)).toBe(false)
  })
})
