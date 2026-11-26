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
  DOT_BUDGET,
  buildDotField,
  clampInside,
  countDots,
  defaultGap,
  edgeFactor,
  idleLight,
  lightingProfile,
  poleY,
  resolveGap,
  shadeDots,
  sphereGeometry,
  surfaceBelow,
  toScreen,
  toSphere,
  type FrameParams,
} from '../sphere'

const frame = (over: Partial<FrameParams>): FrameParams => ({
  time: 0,
  breath: 1,
  lx: 0,
  ly: 0,
  spot: 0,
  ripples: [],
  noise: false,
  intensity: 1,
  ...over,
})

describe('sphere geometry', () => {
  test('hero places the pole at topRatio of the container height', () => {
    const g = sphereGeometry('hero', 1200, 800, 0.55)
    expect(poleY(g)).toBeCloseTo(800 * 0.55)
    expect(g.R).toBeGreaterThanOrEqual(520)
    expect(g.flip).toBe(1)
  })

  test('hero clamps topRatio into 0.3..0.9', () => {
    expect(poleY(sphereGeometry('hero', 1200, 1000, 0))).toBeCloseTo(300)
    expect(poleY(sphereGeometry('hero', 1200, 1000, 5))).toBeCloseTo(900)
  })

  test('inverted hangs from above with its lit pole at 34% of the height', () => {
    const g = sphereGeometry('inverted', 1000, 500)
    expect(g.flip).toBe(-1)
    expect(poleY(g)).toBeCloseTo(500 * 0.34)
  })

  test('mini centres a sphere that fits its box', () => {
    const g = sphereGeometry('mini', 100, 60)
    expect(g.cx).toBe(50)
    expect(g.cy).toBe(30)
    expect(g.R).toBeLessThanOrEqual(30)
  })

  test('toSphere and toScreen are inverses for both flips', () => {
    for (const kind of ['hero', 'inverted'] as const) {
      const g = sphereGeometry(kind, 900, 600)
      const [sx, sy] = toSphere(g, 123, 77)
      const [x, y] = toScreen(g, sx, sy)
      expect(x).toBeCloseTo(123)
      expect(y).toBeCloseTo(77)
    }
  })

  test('defaultGap is wider under 768px and tight for mini', () => {
    expect(defaultGap('hero', 500)).toBe(11)
    expect(defaultGap('hero', 1200)).toBe(9)
    expect(defaultGap('mini', 1200)).toBe(3.5)
  })
})

describe('dot field', () => {
  test('resolveGap grows the gap until the dots fit the budget', () => {
    const g = sphereGeometry('hero', 1920, 1080)
    const gap = resolveGap(g, 1, DOT_BUDGET)
    expect(countDots(g, gap)).toBeLessThanOrEqual(DOT_BUDGET)
  })

  test('buildDotField holds one finite entry per counted dot', () => {
    const g = sphereGeometry('mini', 80, 80)
    const f = buildDotField(g, lightingProfile(g), 3.5)
    expect(f.count).toBe(countDots(g, 3.5))
    expect(f.count).toBeGreaterThan(0)
    for (let i = 0; i < f.count; i++) {
      expect(Number.isFinite(f.base[i])).toBe(true)
      expect(Number.isFinite(f.edge[i])).toBe(true)
    }
  })

  test('edgeFactor is 0 for back-facing normals and 1 facing the viewer', () => {
    expect(edgeFactor(-0.2)).toBe(0)
    expect(edgeFactor(1)).toBe(1)
  })

  test('shadeDots keeps intensities in 0..1 and lights the pole most', () => {
    const g = sphereGeometry('hero', 1000, 700)
    const p = lightingProfile(g)
    const f = buildDotField(g, p, resolveGap(g, 11))
    const outI = new Float32Array(f.count)
    shadeDots(f, p, frame({ ly: -g.R }), outI, new Float32Array(f.count))
    let nearPole = 0
    let farSide = 0
    for (let i = 0; i < f.count; i++) {
      expect(outI[i]).toBeGreaterThanOrEqual(0)
      expect(outI[i]).toBeLessThanOrEqual(1)
      if (f.sy[i] < -g.R + 40) nearPole = Math.max(nearPole, outI[i])
      if (f.sy[i] > 0) farSide = Math.max(farSide, outI[i])
    }
    expect(nearPole).toBeGreaterThan(farSide)
  })

  test('shadeDots writes zero everywhere when intensity is 0', () => {
    const g = sphereGeometry('mini', 80, 80)
    const p = lightingProfile(g)
    const f = buildDotField(g, p, 3.5)
    const outI = new Float32Array(f.count)
    const params = frame({ time: 1, spot: 1, noise: true, intensity: 0 })
    shadeDots(f, p, params, outI, new Float32Array(f.count))
    expect(Math.max(...outI)).toBe(0)
  })
})

describe('light targets', () => {
  test('clampInside pulls outside points back to 0.97R and keeps inside points', () => {
    const g = sphereGeometry('hero', 1000, 700)
    const [x, y] = clampInside(g, g.R * 3, 0)
    expect(Math.hypot(x, y)).toBeCloseTo(g.R * 0.97)
    expect(clampInside(g, 10, 10)).toEqual([10, 10])
  })

  test('surfaceBelow always lands inside the sphere', () => {
    const g = sphereGeometry('hero', 1000, 700)
    const [x, y] = surfaceBelow(g, 50, -g.R * 2)
    expect(Math.hypot(x, y)).toBeLessThanOrEqual(g.R * 0.97 + 1e-6)
  })

  test('idleLight stays on the sphere and moves over time', () => {
    const g = sphereGeometry('hero', 1000, 700)
    const a = idleLight(g, 0)
    expect(Math.hypot(a[0], a[1])).toBeLessThan(g.R)
    expect(a).not.toEqual(idleLight(g, 3))
  })
})
