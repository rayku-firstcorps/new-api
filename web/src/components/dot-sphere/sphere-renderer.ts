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
import { mixRgb, rgba, type Rgb } from '@/lib/dot-sphere/color'
import { clamp } from '@/lib/dot-sphere/math'
import {
  BUCKET_ALPHA,
  BUCKETS,
  type SpherePalette,
} from '@/lib/dot-sphere/palette'
import {
  buildDotField,
  defaultGap,
  idleLight,
  lightingProfile,
  pointerTarget,
  poleY,
  resolveGap,
  shadeDots,
  sphereGeometry,
  toScreen,
  type DotField,
  type LightingProfile,
  type Ripple,
  type SphereGeometry,
} from '@/lib/dot-sphere/sphere'

import type { DotSphereVariant } from './types'

export type SphereRipple = Ripple & { born: number }

/** Mutable animation state shared by the render loop and the renderer. */
export type SphereState = {
  geom: SphereGeometry | null
  cssW: number
  cssH: number
  dpr: number
  time: number
  /** Light position, sphere space. */
  lx: number
  ly: number
  spot: number
  tintAmt: number
  tintRgb: Rgb
  ripples: SphereRipple[]
}

export type SphereRenderer = {
  state: SphereState
  layout: (width: number, height: number) => void
  render: (breath: number, noise: boolean, intensityMul: number) => void
  setTint: (rgb: Rgb) => void
}

export type SphereRendererOptions = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  palette: SpherePalette
  variant: DotSphereVariant
  gap?: number
  topRatio: number
}

const TAU = Math.PI * 2
const MIN_I = 0.03
const TINT_LEVELS = 3
/** pow(I, 0.8) lookup for dot radii. */
const RADIUS_LUT = (() => {
  const lut = new Float32Array(256)
  for (let k = 0; k < 256; k++) lut[k] = Math.pow(k / 255, 0.8)
  return lut
})()

export function createSphereRenderer(
  options: SphereRendererOptions
): SphereRenderer {
  const { canvas, ctx, palette, variant, topRatio } = options
  const state: SphereState = {
    geom: null,
    cssW: 0,
    cssH: 0,
    dpr: 1,
    time: 0,
    lx: 0,
    ly: 0,
    spot: 0,
    tintAmt: 0,
    tintRgb: palette.amber,
    ripples: [],
  }
  let profile: LightingProfile | null = null
  let field: DotField | null = null
  let lightInit = false
  let outI = new Float32Array(0)
  let outShare = new Float32Array(0)
  let bucketOf = new Int16Array(0)
  let radius = new Float32Array(0)
  let order = new Uint32Array(0)
  const counts = new Int32Array(BUCKETS * TINT_LEVELS)
  const starts = new Int32Array(BUCKETS * TINT_LEVELS)
  let tintStyles: string[][] = []
  let tintKey = -1

  const layout = (w: number, h: number) => {
    if (w < 1 || h < 1) return
    state.cssW = w
    state.cssH = h
    state.dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.max(1, Math.round(w * state.dpr))
    canvas.height = Math.max(1, Math.round(h * state.dpr))
    const geom = sphereGeometry(variant, w, h, topRatio)
    state.geom = geom
    profile = lightingProfile(geom)
    field = buildDotField(
      geom,
      profile,
      resolveGap(geom, options.gap ?? defaultGap(variant, w))
    )
    const n = field.count
    if (outI.length < n) {
      outI = new Float32Array(n)
      outShare = new Float32Array(n)
      bucketOf = new Int16Array(n)
      radius = new Float32Array(n)
      order = new Uint32Array(n)
    }
    if (lightInit) {
      ;[state.lx, state.ly] = pointerTarget(geom, state.lx, state.ly)
      return
    }
    ;[state.lx, state.ly] = idleLight(geom, state.time)
    lightInit = true
  }

  const setTint = (rgb: Rgb) => {
    state.tintRgb = rgb
    tintKey = -1
  }

  const ellipseGlow = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    inner: Rgb,
    outer: Rgb,
    alpha: number
  ) => {
    if (alpha <= 0.002 || rx < 1 || ry < 1) return
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(rx, ry)
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    grad.addColorStop(0, rgba(inner, alpha))
    grad.addColorStop(0.35, rgba(outer, alpha * 0.5))
    grad.addColorStop(0.7, rgba(outer, alpha * 0.14))
    grad.addColorStop(1, rgba(outer, 0))
    ctx.fillStyle = grad
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
  }

  const tintedStyles = (level: number): string[] => {
    const key = Math.round(state.tintAmt * 32)
    if (key !== tintKey) {
      tintKey = key
      tintStyles = []
      for (let l = 1; l < TINT_LEVELS; l++) {
        const t = (0.3 * (l / (TINT_LEVELS - 1)) * key) / 32
        tintStyles[l] = palette.bucketRgb.map((c, q) =>
          rgba(mixRgb(c, state.tintRgb, t), BUCKET_ALPHA[q])
        )
      }
    }
    return tintStyles[level]
  }

  const drawGlows = (
    g: SphereGeometry,
    p: LightingProfile,
    breath: number,
    k: number
  ) => {
    const { amber, core } = palette
    const spotRgb =
      state.tintAmt > 0
        ? mixRgb(amber, state.tintRgb, 0.3 * state.tintAmt)
        : amber
    const [Lx, Ly] = toScreen(g, state.lx, state.ly)
    const R = g.R
    if (g.kind === 'mini') {
      ellipseGlow(g.cx, g.cy, R * 1.45, R * 1.45, amber, amber, 0.1 * k)
      // Kept within ~1.2R so it fades out before the (square) canvas edge.
      ellipseGlow(
        Lx,
        Ly,
        R * 0.8,
        R * 0.8,
        core,
        spotRgb,
        0.24 * state.spot * k
      )
      return
    }
    const py = poleY(g)
    const cap = g.kind === 'inverted' ? state.cssH * 0.12 : Infinity
    const b = 0.85 + 0.15 * breath
    ellipseGlow(
      g.cx,
      py,
      R * 0.6,
      Math.min(R * 0.13, cap),
      amber,
      amber,
      0.11 * k
    )
    ellipseGlow(
      g.cx,
      py,
      R * 0.21,
      Math.min(R * 0.085, cap * 0.8),
      core,
      amber,
      0.3 * k * b
    )
    const gr = p.spotSigma * 2.2
    ellipseGlow(Lx, Ly, gr, gr, spotRgb, spotRgb, 0.18 * state.spot * k)
  }

  /** Counting sort of the dots by color/alpha bucket. */
  const sortIntoBuckets = (f: DotField) => {
    const n = f.count
    const half = f.gap * 0.5
    const tintOn = state.tintAmt > 0.01
    counts.fill(0)
    for (let i = 0; i < n; i++) {
      const I = outI[i]
      if (I < MIN_I) {
        bucketOf[i] = -1
        continue
      }
      const q = I >= 1 ? BUCKETS - 1 : (I * BUCKETS) | 0
      let level = 0
      if (tintOn) {
        const s = outShare[i]
        if (s > 0.55) level = 2
        else if (s > 0.3) level = 1
      }
      const bi = level * BUCKETS + q
      bucketOf[i] = bi
      counts[bi]++
      const r = half * 0.84 * RADIUS_LUT[(I * 255 + 0.5) | 0]
      radius[i] = r < 0.35 ? 0.35 : r
    }
    let acc = 0
    for (let b = 0; b < counts.length; b++) {
      starts[b] = acc
      acc += counts[b]
    }
    for (let i = 0; i < n; i++) {
      const bi = bucketOf[i]
      if (bi >= 0) order[starts[bi]++] = i
    }
  }

  /** One path and one fill per bucket. */
  const drawBuckets = (f: DotField) => {
    // Sub-pixel dots: squares are indistinguishable from circles and cheaper.
    const rectBelow = 1.1 / state.dpr
    const X = f.x
    const Y = f.y
    let pos = 0
    for (let b = 0; b < counts.length; b++) {
      const c = counts[b]
      if (c === 0) continue
      const level = (b / BUCKETS) | 0
      const q = b - level * BUCKETS
      ctx.fillStyle =
        level === 0 ? palette.baseStyles[q] : tintedStyles(level)[q]
      ctx.beginPath()
      const end = pos + c
      for (; pos < end; pos++) {
        const i = order[pos]
        const r = radius[i]
        if (r < rectBelow) {
          ctx.rect(X[i] - r, Y[i] - r, r * 2, r * 2)
        } else {
          ctx.moveTo(X[i] + r, Y[i])
          ctx.arc(X[i], Y[i], r, 0, TAU)
        }
      }
      ctx.fill()
    }
  }

  const render = (breath: number, noise: boolean, intensityMul: number) => {
    const g = state.geom
    if (!g || !profile || !field) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0)
    ctx.globalCompositeOperation = 'source-over'
    const k = clamp(intensityMul, 0, 2)
    drawGlows(g, profile, breath, k)
    shadeDots(
      field,
      profile,
      {
        time: state.time,
        breath,
        lx: state.lx,
        ly: state.ly,
        spot: state.spot,
        ripples: state.ripples,
        noise,
        intensity: k,
      },
      outI,
      outShare
    )
    sortIntoBuckets(field)
    drawBuckets(field)
  }

  return { state, layout, render, setTint }
}
