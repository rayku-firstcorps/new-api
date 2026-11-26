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
import { useEffect, type RefObject } from 'react'

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/**
 * Pointer parallax: writes --px/--py (-1..1) on the root inside
 * requestAnimationFrame, easing toward the pointer. Never touches React
 * state, and is off under reduced motion.
 */
export function useHeroParallax(rootRef: RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion() ?? false

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (reduced) {
      root.style.removeProperty('--px')
      root.style.removeProperty('--py')
      return
    }

    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    let raf = 0
    let last = 0

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60
      last = now
      const k = 1 - Math.pow(1 - 0.08, dt * 60)
      cur.x += (target.x - cur.x) * k
      cur.y += (target.y - cur.y) * k
      const settled =
        Math.abs(target.x - cur.x) < 0.001 && Math.abs(target.y - cur.y) < 0.001
      if (settled) {
        cur.x = target.x
        cur.y = target.y
      }
      root.style.setProperty('--px', cur.x.toFixed(4))
      root.style.setProperty('--py', cur.y.toFixed(4))
      if (settled) {
        raf = 0
        last = 0
      } else {
        raf = requestAnimationFrame(tick)
      }
    }
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const rect = root.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      target.x = clamp(
        (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2),
        -1,
        1
      )
      target.y = clamp(
        (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2),
        -1,
        1
      )
      kick()
    }
    // Pointer left the window: ease back to center.
    const onOut = (event: PointerEvent) => {
      if (event.relatedTarget) return
      target.x = 0
      target.y = 0
      kick()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerout', onOut)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onOut)
      root.style.removeProperty('--px')
      root.style.removeProperty('--py')
    }
  }, [reduced, rootRef])
}
