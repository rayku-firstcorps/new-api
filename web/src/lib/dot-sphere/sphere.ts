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
/**
 * Pure geometry + lighting for the halftone dot sphere (Prompt 3).
 * No DOM access: everything here is deterministic and unit-testable.
 *
 * Coordinates:
 * - "screen" = canvas-local CSS pixels.
 * - "sphere space" = relative to the sphere center, with y multiplied by `flip`
 *   so the lit pole is always at (0, -R). For the `inverted` variant flip = -1,
 *   which mirrors the whole lighting model vertically.
 */
import { clamp, smoothstep } from './math'
import { hash2, valueNoise2D } from './noise'

export type SphereKind = 'hero' | 'inverted' | 'mini'

export type SphereGeometry = {
  kind: SphereKind
  width: number
  height: number
  cx: number
  cy: number
  R: number
  flip: 1 | -1
}

export type LightingProfile = {
  /** Tilt (rad) of the view normal toward the lit pole: keeps the rim at the pole bright. */
  tilt: number
  topWeight: number
  /** I_top reaches 0 at this distance from the pole (px). */
  topReach: number
  /** Extra contrast on I_top (1 = plain smoothstep). */
  topPower: number
  beamWeight: number
  beamSigma: number
  beamDecay: number
  rimWeight: number
  rimWidth: number
  /** Exponent of the rim light's falloff away from the pole. */
  rimFalloff: number
  /** Faint thin outline that keeps the silhouette readable down the sides. */
  outlineWeight: number
  outlineWidth: number
  ambient: number
  spotWeight: number
  spotSigma: number
  /** Height of the point light in front of the sphere (Lambert term). */
  spotZ: number
  noiseAmp: number
  rippleSpeed: number
}

export type DotField = {
  count: number
  gap: number
  /** Screen position. */
  x: Float32Array
  y: Float32Array
  /** Sphere-space position. */
  sx: Float32Array
  sy: Float32Array
  /** Tilted view normal. */
  nx: Float32Array
  ny: Float32Array
  nz: Float32Array
  edge: Float32Array
  /** Static intensity (top light + rim + ambient), before edge. */
  base: Float32Array
  /** Static beam shape (0–1), before breathing / weight / edge. */
  beam: Float32Array
  phaseA: Float32Array
  phaseB: Float32Array
}

export type Ripple = { sx: number; sy: number; age: number }

export type FrameParams = {
  time: number
  /** Beam multiplier (breathing), ~0.88–1.12. */
  breath: number
  /** Light position in sphere space. */
  lx: number
  ly: number
  /** 0–1 multiplier on the pointer spot. */
  spot: number
  ripples: readonly Ripple[]
  noise: boolean
  intensity: number
}

export const DOT_BUDGET = 28000
export const RIPPLE_DURATION = 0.8
export const MAX_RIPPLES = 5
const TAU = Math.PI * 2

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export function sphereGeometry(
  kind: SphereKind,
  width: number,
  height: number,
  /** Hero only: pole y as a fraction of height (default 0.55). */
  topRatio = 0.55
): SphereGeometry {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  if (kind === 'mini') {
    const R = Math.max(4, Math.min(w, h) * 0.44)
    return { kind, width: w, height: h, cx: w / 2, cy: h / 2, R, flip: 1 }
  }
  if (kind === 'inverted') {
    // Sphere hangs from above; its lower rim (the lit pole) sits at ~34% of the band.
    const R = Math.max(w * 0.6, 520)
    const rimY = h * 0.34
    return { kind, width: w, height: h, cx: w / 2, cy: rimY - R, R, flip: -1 }
  }
  // Hero: R per spec; center placed so the pole (top of the arc) sits at `topRatio` of the hero height.
  const R = Math.max(w * 0.62, 520)
  const topY = h * clamp(topRatio, 0.3, 0.9)
  return { kind, width: w, height: h, cx: w / 2, cy: topY + R, R, flip: 1 }
}

/** Screen y of the lit pole. */
export const poleY = (g: SphereGeometry): number => g.cy - g.R * g.flip

export const toSphere = (
  g: SphereGeometry,
  x: number,
  y: number
): [number, number] => [x - g.cx, (y - g.cy) * g.flip]

export const toScreen = (
  g: SphereGeometry,
  sx: number,
  sy: number
): [number, number] => [g.cx + sx, g.cy + sy * g.flip]

export const spotSigma = (g: SphereGeometry): number =>
  g.kind === 'mini' ? g.R * 0.55 : clamp(g.R * 0.18, 90, 220)

export function lightingProfile(g: SphereGeometry): LightingProfile {
  const R = g.R
  if (g.kind === 'mini') {
    return {
      tilt: 0.35,
      topWeight: 0.22,
      topReach: R * 1.1,
      topPower: 1,
      beamWeight: 0,
      beamSigma: 1,
      beamDecay: 1,
      rimWeight: 0.3,
      rimWidth: Math.max(1.5, R * 0.08),
      rimFalloff: 1.2,
      outlineWeight: 0,
      outlineWidth: 1,
      ambient: 0.1,
      spotWeight: 1.05,
      spotSigma: spotSigma(g),
      spotZ: R * 0.9,
      noiseAmp: 0.05,
      rippleSpeed: R * 2,
    }
  }
  const inverted = g.kind === 'inverted'
  return {
    tilt: 0.95,
    topWeight: 0.75,
    topReach: R * (inverted ? 0.42 : 0.5),
    topPower: 1.5,
    beamWeight: 0.95,
    beamSigma: clamp(R * 0.026, 22, 34),
    beamDecay: R * 0.35,
    rimWeight: 0.55,
    rimWidth: clamp(R * 0.05, 18, 60),
    rimFalloff: 10,
    outlineWeight: 0.14,
    outlineWidth: clamp(R * 0.012, 6, 14),
    ambient: 0.07,
    spotWeight: 0.9,
    spotSigma: spotSigma(g),
    spotZ: R * 0.6,
    noiseAmp: 0.06,
    rippleSpeed: clamp(R * 0.6, 320, 720),
  }
}

export const defaultGap = (kind: SphereKind, viewportWidth: number): number => {
  if (kind === 'mini') return 3.5
  return viewportWidth < 768 ? 11 : 9
}

/** Grid iteration bounds (sphere-space indices) for dots inside the circle and the canvas. */
function forEachGridDot(
  g: SphereGeometry,
  gap: number,
  visit: (sx: number, sy: number, x: number, y: number) => void
): void {
  const R = g.R
  const R2 = R * R
  const margin = gap
  // Columns are centered on the sphere axis (so the beam column is symmetric),
  // rows start exactly at the lit pole.
  const iMin = Math.ceil((-margin - g.cx) / gap)
  const iMax = Math.floor((g.width + margin - g.cx) / gap)
  const rows = Math.floor((2 * R) / gap)
  for (let j = 0; j <= rows; j++) {
    const sy = -R + j * gap
    const y = g.cy + sy * g.flip
    if (y < -margin || y > g.height + margin) continue
    const sy2 = sy * sy
    for (let i = iMin; i <= iMax; i++) {
      const sx = i * gap
      if (sx * sx + sy2 > R2) continue
      visit(sx, sy, g.cx + sx, y)
    }
  }
}

export function countDots(g: SphereGeometry, gap: number): number {
  let n = 0
  forEachGridDot(g, gap, () => {
    n++
  })
  return n
}

/** Grow `gap` until the dot count fits the budget. */
export function resolveGap(
  g: SphereGeometry,
  gap: number,
  budget = DOT_BUDGET
): number {
  let gp = Math.max(1, gap)
  for (let k = 0; k < 8; k++) {
    const n = countDots(g, gp)
    if (n <= budget) return gp
    gp *= Math.sqrt(n / budget) * 1.02
  }
  return gp
}

export function buildDotField(
  g: SphereGeometry,
  p: LightingProfile,
  gap: number
): DotField {
  const n = countDots(g, gap)
  const f: DotField = {
    count: n,
    gap,
    x: new Float32Array(n),
    y: new Float32Array(n),
    sx: new Float32Array(n),
    sy: new Float32Array(n),
    nx: new Float32Array(n),
    ny: new Float32Array(n),
    nz: new Float32Array(n),
    edge: new Float32Array(n),
    base: new Float32Array(n),
    beam: new Float32Array(n),
    phaseA: new Float32Array(n),
    phaseB: new Float32Array(n),
  }
  const R = g.R
  const cosT = Math.cos(p.tilt)
  const sinT = Math.sin(p.tilt)
  const noiseScale = 1 / (gap * 7)
  let k = 0
  forEachGridDot(g, gap, (sx, sy, x, y) => {
    const ux = sx / R
    const uy = sy / R
    const uz = Math.sqrt(Math.max(0, 1 - ux * ux - uy * uy))
    // Rotate the geometric normal about the x axis so the pole faces the viewer.
    const ty = uy * cosT + uz * sinT
    const tz = uz * cosT - uy * sinT
    f.x[k] = x
    f.y[k] = y
    f.sx[k] = sx
    f.sy[k] = sy
    f.nx[k] = ux
    f.ny[k] = ty
    f.nz[k] = tz
    f.edge[k] = edgeFactor(tz)
    f.base[k] = staticLight(p, R, sx, sy)
    f.beam[k] = beamShape(p, R, sx, sy)
    f.phaseA[k] = valueNoise2D(sx * noiseScale, sy * noiseScale) * TAU * 2
    f.phaseB[k] = hash2(Math.round(sx / gap), Math.round(sy / gap)) * TAU
    k++
  })
  return f
}

/* ------------------------------------------------------------------ */
/* Lighting terms                                                      */
/* ------------------------------------------------------------------ */

/** §3.1 edge attenuation on the (tilted) view normal z. */
export const edgeFactor = (nz: number): number =>
  nz <= 0 ? 0 : Math.pow(nz, 0.6)

/** §3.2.1 fixed top light, distance measured from the lit pole (0, -R). */
export const topLight = (
  p: LightingProfile,
  R: number,
  sx: number,
  sy: number
): number => {
  const d = Math.hypot(sx, sy + R)
  const s = smoothstep(0, 1, 1 - d / p.topReach)
  return p.topPower === 1 ? s : Math.pow(s, p.topPower)
}

/** Thin back-light hugging the circle outline, strongest at the pole. */
export const rimLight = (
  p: LightingProfile,
  R: number,
  sx: number,
  sy: number
): number => {
  const r = Math.hypot(sx, sy)
  if (r < 1e-6) return 0
  const cosFromPole = -sy / r
  const half = Math.max(0, (1 + cosFromPole) / 2)
  const depth = R - r
  const band =
    p.rimWeight * Math.exp(-depth / p.rimWidth) * Math.pow(half, p.rimFalloff)
  const outline =
    p.outlineWeight > 0
      ? p.outlineWeight * Math.exp(-depth / p.outlineWidth) * half * half
      : 0
  return band + outline
}

export const staticLight = (
  p: LightingProfile,
  R: number,
  sx: number,
  sy: number
): number =>
  p.topWeight * topLight(p, R, sx, sy) + rimLight(p, R, sx, sy) + p.ambient

/** §3.2.2 central beam shape (before breathing and weight). */
export const beamShape = (
  p: LightingProfile,
  R: number,
  sx: number,
  sy: number
): number => {
  if (p.beamWeight <= 0) return 0
  const dyFromTop = Math.max(0, sy + R)
  return (
    Math.exp(-(sx * sx) / (2 * p.beamSigma * p.beamSigma)) *
    Math.exp(-dyFromTop / p.beamDecay)
  )
}

/** Beam breathing: 4s period, ±12%. */
export const breathing = (time: number): number =>
  1 + 0.12 * Math.sin((time * TAU) / 4)

/**
 * §3.2.3 pointer spot for a single dot: gaussian × Lambert term
 * (light treated as a point at height spotZ in front of the sphere).
 */
export function spotLight(
  p: LightingProfile,
  sx: number,
  sy: number,
  nx: number,
  ny: number,
  nz: number,
  lx: number,
  ly: number
): number {
  const dx = sx - lx
  const dy = sy - ly
  const d2 = dx * dx + dy * dy
  const s2 = p.spotSigma * p.spotSigma
  if (d2 > 9 * s2) return 0
  const g = Math.exp(-d2 / (2 * s2))
  const vz = p.spotZ
  const inv = 1 / Math.sqrt(d2 + vz * vz)
  const lambert = Math.max(0, (-dx * nx - dy * ny + vz * nz) * inv)
  return p.spotWeight * g * (0.5 + 0.5 * lambert)
}

/** §3.4 click ripple ring for a single dot. */
export const rippleTerm = (
  p: LightingProfile,
  dist: number,
  age: number
): number => {
  const w = dist - p.rippleSpeed * age
  if (w > 70 || w < -70) return 0
  return 0.6 * Math.exp(-(w * w) / (2 * 20 * 20)) * Math.exp(-age / 0.6)
}

/**
 * Per-frame shading of every dot. Writes final intensity (0–1, after edge and
 * `intensity`) into `outI` and the pointer spot's share of the light into `outShare`.
 */
export function shadeDots(
  f: DotField,
  p: LightingProfile,
  fp: FrameParams,
  outI: Float32Array,
  outShare: Float32Array
): void {
  const n = f.count
  const beamW = p.beamWeight * fp.breath
  const noiseAmp = fp.noise ? p.noiseAmp : 0
  const t1 = fp.time * 0.7
  const t2 = fp.time * 2.3
  const spotOn = fp.spot > 0.001
  const spotCut = 9 * p.spotSigma * p.spotSigma
  const s2x2 = 2 * p.spotSigma * p.spotSigma
  const vz = p.spotZ
  const spotW = p.spotWeight * fp.spot
  const rip = fp.ripples
  const nr = rip.length
  const {
    sx: SX,
    sy: SY,
    nx: NX,
    ny: NY,
    nz: NZ,
    edge: E,
    base: B,
    beam: BM,
  } = f
  for (let i = 0; i < n; i++) {
    const e = E[i]
    if (e <= 0) {
      outI[i] = 0
      outShare[i] = 0
      continue
    }
    const sx = SX[i]
    const sy = SY[i]
    let I = B[i] + BM[i] * beamW
    let spot = 0
    if (spotOn) {
      const dx = sx - fp.lx
      const dy = sy - fp.ly
      const d2 = dx * dx + dy * dy
      if (d2 < spotCut) {
        const g = Math.exp(-d2 / s2x2)
        const inv = 1 / Math.sqrt(d2 + vz * vz)
        const lam = (-dx * NX[i] - dy * NY[i] + vz * NZ[i]) * inv
        spot = spotW * g * (0.5 + 0.5 * (lam > 0 ? lam : 0))
        I += spot
      }
    }
    for (let r = 0; r < nr; r++) {
      const rp = rip[r]
      const ddx = sx - rp.sx
      const ddy = sy - rp.sy
      I += rippleTerm(p, Math.sqrt(ddx * ddx + ddy * ddy), rp.age)
    }
    if (noiseAmp > 0) {
      const nz =
        0.65 * Math.sin(t1 + f.phaseA[i]) + 0.35 * Math.sin(t2 + f.phaseB[i])
      // Fade the grain out in near-black areas so it never pops dark dots in.
      const gate = I > 0.15 ? 1 : I / 0.15
      I += noiseAmp * nz * gate
    }
    const total = I
    I *= e * fp.intensity
    outI[i] = Math.min(1, Math.max(0, I))
    outShare[i] = total > 0 ? spot / total : 0
  }
}

/* ------------------------------------------------------------------ */
/* Light target helpers (sphere space)                                 */
/* ------------------------------------------------------------------ */

/** Pull a point inside the circle (radius R * k) by radial projection. */
export function clampInside(
  g: SphereGeometry,
  sx: number,
  sy: number,
  k = 0.97
): [number, number] {
  const lim = g.R * k
  const r = Math.hypot(sx, sy)
  if (r <= lim || r < 1e-6) return [sx, sy]
  const s = lim / r
  return [sx * s, sy * s]
}

/** Pointer target: points outside the sphere (e.g. over the title) are projected onto the rim. */
export const pointerTarget = (
  g: SphereGeometry,
  sx: number,
  sy: number
): [number, number] => clampInside(g, sx, sy, 0.97)

/**
 * Attractor target: the sphere-surface point directly "below" (toward the sphere,
 * along the pole axis) the given sphere-space point.
 */
export function surfaceBelow(
  g: SphereGeometry,
  sx: number,
  sy: number
): [number, number] {
  const lim = g.R * 0.97
  if (Math.abs(sx) >= lim) return clampInside(g, sx, sy)
  const rimY = -Math.sqrt(lim * lim - sx * sx)
  const drop = spotSigma(g) * 0.25
  const ty = Math.max(sy + drop, rimY + drop)
  return clampInside(g, sx, ty)
}

/** Idle Lissajous orbit hugging the pole (~12s period); mini orbits the whole sphere. */
export function idleLight(g: SphereGeometry, time: number): [number, number] {
  const R = g.R
  if (g.kind === 'mini') {
    const w = TAU / 9
    return [
      R * 0.42 * Math.cos(w * time),
      -R * 0.3 + R * 0.22 * Math.sin(2 * w * time + 0.7),
    ]
  }
  const w = TAU / 12
  const phi = 0.4 * Math.sin(w * time)
  const depth = R * (0.035 + 0.05 * (0.5 + 0.5 * Math.sin(2 * w * time + 1.1)))
  const r = R - depth
  return [Math.sin(phi) * r, -Math.cos(phi) * r]
}
