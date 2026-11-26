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
import { hexToRgb, isNearWhite, type Rgb } from '@/lib/dot-sphere/color'
import { damp } from '@/lib/dot-sphere/math'
import type { SpherePalette, SphereTheme } from '@/lib/dot-sphere/palette'
import {
  MAX_RIPPLES,
  RIPPLE_DURATION,
  breathing,
  idleLight,
  pointerTarget,
  surfaceBelow,
  toSphere,
} from '@/lib/dot-sphere/sphere'

import { createSphereRenderer } from './sphere-renderer'
import type { DotSphereVariant, SphereLiveProps } from './types'

export type SphereEngineOptions = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  palette: SpherePalette
  theme: SphereTheme
  variant: DotSphereVariant
  gap?: number
  topRatio: number
  reduced: boolean
  /** Latest props, read every frame so prop changes never rebuild the canvas. */
  getLive: () => SphereLiveProps
}

export type SphereEngine = {
  /** Redraws the single static frame (reduced motion); no-op while animating. */
  redrawStatic: () => void
  destroy: () => void
}

/** The light returns to its idle orbit this long after the pointer stops moving. */
const IDLE_MS = 3000
const RESIZE_DEBOUNCE_MS = 120

/**
 * Drives one canvas: layout on resize, the requestAnimationFrame loop (paused
 * offscreen, in hidden tabs and under reduced motion), and pointer input.
 * Pointer events are read from the window because the canvas has
 * pointer-events: none.
 */
export function createSphereEngine(options: SphereEngineOptions): SphereEngine {
  const { canvas, palette, reduced } = options
  const renderer = createSphereRenderer(options)
  const state = renderer.state
  const ripples = state.ripples
  const pointer = { x: 0, y: 0, has: false, lastMove: -Infinity }
  let rect = canvas.getBoundingClientRect()
  let raf = 0
  let last = 0
  let visible = true
  let tintHex = ''
  let destroyed = false

  const toLocal = (clientX: number, clientY: number): [number, number] => {
    const sx = rect.width > 0 ? state.cssW / rect.width : 1
    const sy = rect.height > 0 ? state.cssH / rect.height : 1
    return [(clientX - rect.left) * sx, (clientY - rect.top) * sy]
  }
  const insideRect = (clientX: number, clientY: number) =>
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom

  const drawStatic = () => {
    const geom = state.geom
    if (!geom) return
    if (geom.kind === 'mini') {
      ;[state.lx, state.ly] = idleLight(geom, 0)
      state.spot = 1
    } else {
      state.spot = 0
    }
    state.tintAmt = 0
    ripples.length = 0
    renderer.render(1, false, options.getLive().intensity)
  }

  /** Moves the light toward its target and eases spot, tint and ripples. */
  const step = (dt: number, t: number) => {
    const geom = state.geom
    if (!geom) return
    const live = options.getLive()
    const att = live.attractTo
    const following =
      live.interactive && pointer.has && t - pointer.lastMove < IDLE_MS
    // Only measure when a client-space target needs converting (avoids per-frame layout reads).
    if (att || following) rect = canvas.getBoundingClientRect()

    let target: [number, number]
    let active = false
    let rate = 0.08
    if (att) {
      const [ax, ay] = toLocal(att.x, att.y)
      const [sx, sy] = toSphere(geom, ax, ay)
      target = surfaceBelow(geom, sx, sy)
      active = true
    } else if (following && insideRect(pointer.x, pointer.y)) {
      const [px, py] = toLocal(pointer.x, pointer.y)
      const [sx, sy] = toSphere(geom, px, py)
      target = pointerTarget(geom, sx, sy)
      active = true
    } else {
      target = idleLight(geom, state.time)
      rate = 0.045 // slower glide back to the idle orbit
    }
    const kL = damp(rate, dt)
    state.lx += (target[0] - state.lx) * kL
    state.ly += (target[1] - state.ly) * kL

    const spotTarget = geom.kind === 'mini' || active ? 1 : 0.8
    state.spot += (spotTarget - state.spot) * damp(0.04, dt)

    const tint = att?.tint
    if (tint && tint !== tintHex) {
      tintHex = tint
      const rgb: Rgb = hexToRgb(tint)
      // Near-white accents vanish on the light theme: tint toward the foreground instead.
      const useForeground = options.theme === 'light' && isNearWhite(rgb)
      renderer.setTint(useForeground ? palette.foreground : rgb)
    }
    state.tintAmt += ((tint ? 1 : 0) - state.tintAmt) * damp(0.08, dt)
    if (state.tintAmt < 0.002) state.tintAmt = 0

    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]
      r.age = state.time - r.born
      if (r.age > RIPPLE_DURATION) ripples.splice(i, 1)
    }
  }

  const shouldRun = () =>
    !reduced && visible && !document.hidden && state.geom !== null

  const frame = (t: number) => {
    raf = 0
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60
    last = t
    state.time += dt
    step(dt, t)
    renderer.render(breathing(state.time), true, options.getLive().intensity)
    if (shouldRun()) raf = requestAnimationFrame(frame)
  }

  const sync = () => {
    if (shouldRun()) {
      if (raf) return
      last = 0
      raf = requestAnimationFrame(frame)
      return
    }
    if (!raf) return
    cancelAnimationFrame(raf)
    raf = 0
  }

  // ---- resize (first call immediate, later ones debounced) ----
  let resizeTimer = 0
  let firstResize = true
  const applyResize = () => {
    resizeTimer = 0
    renderer.layout(canvas.clientWidth, canvas.clientHeight)
    if (reduced) drawStatic()
    sync()
  }
  const resizeObserver = new ResizeObserver(() => {
    if (firstResize) {
      firstResize = false
      applyResize()
      return
    }
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(applyResize, RESIZE_DEBOUNCE_MS)
  })
  resizeObserver.observe(canvas)

  if (reduced) {
    return {
      redrawStatic: drawStatic,
      destroy: () => {
        resizeObserver.disconnect()
        window.clearTimeout(resizeTimer)
      },
    }
  }

  // ---- visibility ----
  const intersection = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) visible = entry.isIntersecting
      sync()
    },
    { rootMargin: '64px' }
  )
  intersection.observe(canvas)
  document.addEventListener('visibilitychange', sync)

  // ---- pointer / touch ----
  const onPointerMove = (e: PointerEvent) => {
    pointer.x = e.clientX
    pointer.y = e.clientY
    pointer.has = true
    pointer.lastMove = performance.now()
  }
  const onPointerDown = (e: PointerEvent) => {
    onPointerMove(e)
    const geom = state.geom
    if (!options.getLive().interactive || !geom) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    rect = canvas.getBoundingClientRect()
    if (!insideRect(e.clientX, e.clientY)) return
    const [px, py] = toLocal(e.clientX, e.clientY)
    const [sx, sy] = toSphere(geom, px, py)
    ripples.push({ sx, sy, age: 0, born: state.time })
    if (ripples.length > MAX_RIPPLES) ripples.shift()
  }
  const onTouch = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    pointer.x = touch.clientX
    pointer.y = touch.clientY
    pointer.has = true
    pointer.lastMove = performance.now()
  }
  const onTouchEnd = () => {
    // Return to the idle orbit ~1s after the finger lifts.
    pointer.lastMove = Math.min(
      pointer.lastMove,
      performance.now() - (IDLE_MS - 1000)
    )
  }
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && !e.relatedTarget) pointer.has = false
  }
  const passive: AddEventListenerOptions = { passive: true }
  window.addEventListener('pointermove', onPointerMove, passive)
  window.addEventListener('pointerdown', onPointerDown, passive)
  window.addEventListener('touchstart', onTouch, passive)
  window.addEventListener('touchmove', onTouch, passive)
  window.addEventListener('touchend', onTouchEnd, passive)
  window.addEventListener('touchcancel', onTouchEnd, passive)
  document.documentElement.addEventListener('pointerleave', onLeave, passive)

  return {
    redrawStatic: () => undefined,
    destroy: () => {
      if (destroyed) return
      destroyed = true
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      state.geom = null
      resizeObserver.disconnect()
      intersection.disconnect()
      window.clearTimeout(resizeTimer)
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    },
  }
}
