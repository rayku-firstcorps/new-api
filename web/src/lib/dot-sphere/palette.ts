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
import {
  AMBER,
  AMBER_LIGHT,
  buildColorLut,
  hexToRgb,
  intensityToAlpha,
  lutRgb,
  rgba,
  type AmberRamp,
  type Rgb,
} from './color'

export type SphereTheme = 'dark' | 'light'

/** Number of intensity buckets dots are sorted into (one fill per bucket). */
export const BUCKETS = 32

/** Theme values the palette can take from CSS tokens; null falls back to KuCode's constants. */
export type SphereThemeTokens = {
  /** `--primary`: replaces the amber stop of the dark ramp and the glow color. */
  primary?: string | null
  /** `--foreground`: tint used instead of near-white accents on the light theme. */
  foreground?: string | null
}

export type SpherePalette = {
  /** Glow colors (pole and light spot). */
  amber: Rgb
  core: Rgb
  /** Near-white accents tint toward this color instead (readable on the page). */
  foreground: Rgb
  /** Dot color per intensity bucket, and the matching fill styles. */
  bucketRgb: Rgb[]
  baseStyles: string[]
}

export const BUCKET_ALPHA: number[] = Array.from({ length: BUCKETS }, (_, q) =>
  intensityToAlpha((q + 0.5) / BUCKETS)
)

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const LIGHT_GLOW_CORE = '#E8920A'
const DARK_FOREGROUND = '#F5F5F5'
const LIGHT_FOREGROUND = '#111111'

/** Returns the value when it is a plain hex color (`#rgb` / `#rrggbb`), otherwise null. */
export const parseHexColor = (
  value: string | null | undefined
): string | null => {
  const trimmed = value?.trim() ?? ''
  return HEX_RE.test(trimmed) ? trimmed : null
}

const buildFromRamp = (
  ramp: AmberRamp,
  glowAmber: string,
  glowCore: string,
  foreground: string
): SpherePalette => {
  const lut = buildColorLut(256, ramp)
  const bucketRgb = Array.from({ length: BUCKETS }, (_, q) =>
    lutRgb(lut, (q + 0.5) / BUCKETS)
  )
  return {
    amber: hexToRgb(glowAmber),
    core: hexToRgb(glowCore),
    foreground: hexToRgb(foreground),
    bucketRgb,
    baseStyles: bucketRgb.map((c, q) => rgba(c, BUCKET_ALPHA[q])),
  }
}

/**
 * Dark: dots glow brighter as they light up (ember -> hot). Light: the ramp runs
 * the other way, from a pale tint to a deep amber, so the lit area keeps its
 * contrast on a white page. The light glow core is deeper (yellow washes out).
 */
export function buildSpherePalette(
  theme: SphereTheme,
  tokens: SphereThemeTokens = {}
): SpherePalette {
  const foreground = parseHexColor(tokens.foreground)
  if (theme === 'light') {
    return buildFromRamp(
      AMBER_LIGHT,
      AMBER.amber,
      LIGHT_GLOW_CORE,
      foreground ?? LIGHT_FOREGROUND
    )
  }
  const primary = parseHexColor(tokens.primary) ?? AMBER.amber
  return buildFromRamp(
    { ...AMBER, amber: primary },
    primary,
    AMBER.core,
    foreground ?? DARK_FOREGROUND
  )
}
