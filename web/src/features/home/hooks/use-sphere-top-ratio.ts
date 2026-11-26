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
import { useEffect, useState, type RefObject } from 'react'

const MIN_RATIO = 0.55
const MAX_RATIO = 0.8

/**
 * Keep the sphere's rim below the hero actions: the pole sits at
 * max(55% of the hero, actions bottom + breathing room). The value is rounded
 * to 0.01 so the canvas is not rebuilt by sub-pixel layout changes.
 */
export function useSphereTopRatio(
  rootRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>
): number {
  const [ratio, setRatio] = useState(MIN_RATIO)

  useEffect(() => {
    const root = rootRef.current
    const anchor = anchorRef.current
    if (!root || !anchor) return

    const update = () => {
      const height = root.offsetHeight
      if (!height) return
      const anchorBottom = anchor.offsetTop + anchor.offsetHeight
      const room = window.innerWidth < 768 ? 28 : 56
      const next = Math.min(
        MAX_RATIO,
        Math.max(MIN_RATIO, (anchorBottom + room) / height)
      )
      setRatio(Math.round(next * 100) / 100)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(root)
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [rootRef, anchorRef])

  return ratio
}
