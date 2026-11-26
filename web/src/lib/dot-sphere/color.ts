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
import { clamp } from './math'

export type Rgb = readonly [number, number, number]

/** Intensity ramp stops, from barely lit (ember) to the hottest dots (hot). */
export type AmberRamp = {
  ember: string
  deep: string
  amber: string
  core: string
  hot: string
}

/** Dark theme: dots glow brighter as they light up (match the design tokens in styles/index.css). */
export const AMBER: AmberRamp = {
  ember: '#4A2A06',
  deep: '#B8680A',
  amber: '#F5A50B',
  core: '#FFC23A',
  hot: '#FFF3D1',
}

/**
 * Light theme: the ramp runs the other way, from a pale tint that melts into the page to a deep,
 * saturated amber, so the lit area still has the most contrast against a white background.
 */
export const AMBER_LIGHT: AmberRamp = {
  ember: '#F4E4C6',
  deep: '#EDB04A',
  amber: '#E0900A',
  core: '#C77400',
  hot: '#A85600',
}

export const hexToRgb = (hex: string): Rgb => {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3 || h.length === 4) {
    h = h.slice(0, 3).replaceAll(/./g, (c) => c + c)
  }
  const n = Number.parseInt(h.slice(0, 6), 16)
  if (!Number.isFinite(n) || h.length < 6) return [245, 165, 11]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]

/**
 * Intensity (0–1) → color.
 * <0.25 ember→deep, 0.25–0.7 deep→amber, >0.7 amber→core, >0.92 additionally toward hot.
 */
export const intensityToRgb = (
  intensity: number,
  ramp: AmberRamp = AMBER
): Rgb => {
  const i = clamp(intensity, 0, 1)
  if (i < 0.25) {
    return mixRgb(hexToRgb(ramp.ember), hexToRgb(ramp.deep), i / 0.25)
  }
  const mid = hexToRgb(ramp.amber)
  if (i < 0.7) return mixRgb(hexToRgb(ramp.deep), mid, (i - 0.25) / 0.45)
  const c = mixRgb(mid, hexToRgb(ramp.core), (i - 0.7) / 0.3)
  if (i <= 0.92) return c
  return mixRgb(c, hexToRgb(ramp.hot), ((i - 0.92) / 0.08) * 0.5)
}

/** Dot alpha for a given intensity (§3.3). */
export const intensityToAlpha = (intensity: number): number =>
  0.15 + 0.85 * clamp(intensity, 0, 1)

/** Precomputed ramp: `size` entries of packed RGB (0–255), index = round(I * (size - 1)). */
export const buildColorLut = (
  size = 256,
  ramp: AmberRamp = AMBER
): Uint8ClampedArray => {
  const lut = new Uint8ClampedArray(size * 3)
  for (let k = 0; k < size; k++) {
    const [r, g, b] = intensityToRgb(k / (size - 1), ramp)
    lut[k * 3] = r
    lut[k * 3 + 1] = g
    lut[k * 3 + 2] = b
  }
  return lut
}

export const lutRgb = (lut: Uint8ClampedArray, intensity: number): Rgb => {
  const size = lut.length / 3
  const k = Math.round(clamp(intensity, 0, 1) * (size - 1)) * 3
  return [lut[k], lut[k + 1], lut[k + 2]]
}

/** Relative luminance (0–1, WCAG). */
export const luminance = ([r, g, b]: Rgb): number => {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** White-ish colors (e.g. a provider accent of #FFFFFF) vanish on the light theme. */
export const isNearWhite = (c: Rgb): boolean => luminance(c) > 0.8

export const rgba = (c: Rgb, a: number): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${clamp(a, 0, 1).toFixed(3)})`
