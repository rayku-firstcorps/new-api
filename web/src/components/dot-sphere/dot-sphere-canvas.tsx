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
import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

import { useTheme } from '@/context/theme-provider'
import { buildSpherePalette } from '@/lib/dot-sphere/palette'
import { cn } from '@/lib/utils'

import { createSphereEngine, type SphereEngine } from './sphere-engine'
import { readSphereThemeTokens } from './theme-tokens'
import type { DotSphereProps, SphereLiveProps } from './types'

/**
 * Halftone dot sphere drawn with Canvas 2D. Decorative: aria-hidden and
 * pointer-events: none. It fills its positioned parent, so give the parent
 * `relative` and a size. Colors follow the theme (dark ramp or the light amber
 * ramp); with reduced motion it draws one static frame; it pauses while
 * offscreen or when the tab is hidden.
 *
 * Load it with `React.lazy(() => import('@/components/dot-sphere'))`.
 */
export function DotSphereCanvas(props: DotSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<SphereEngine | null>(null)
  const reduced = useReducedMotion() ?? false
  const { resolvedTheme } = useTheme()

  const liveRef = useRef<SphereLiveProps>({
    interactive: true,
    intensity: 1,
    attractTo: null,
  })
  const interactive = props.interactive ?? true
  const intensity = props.intensity ?? 1
  const attractTo = props.attractTo ?? null

  useEffect(() => {
    liveRef.current = { interactive, intensity, attractTo }
    engineRef.current?.redrawStatic()
  }, [interactive, intensity, attractTo])

  const variant = props.variant ?? 'hero'
  const topRatio = props.topRatio ?? 0.55

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const engine = createSphereEngine({
      canvas,
      ctx,
      palette: buildSpherePalette(resolvedTheme, readSphereThemeTokens()),
      theme: resolvedTheme,
      variant,
      gap: props.gap,
      topRatio,
      reduced,
      getLive: () => liveRef.current,
    })
    engineRef.current = engine
    return () => {
      engine.destroy()
      engineRef.current = null
    }
  }, [variant, props.gap, reduced, topRatio, resolvedTheme])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      className={cn(
        'pointer-events-none absolute inset-0 h-full w-full',
        props.className
      )}
    />
  )
}

export default DotSphereCanvas
