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
import { useEffect, useState } from 'react'

/** Top offset of the reading area: the 72px public header plus some air. */
const READING_TOP_OFFSET = 120

/**
 * Scroll-spy for the "On this page" rail. Returns the first of `ids` whose
 * element is inside the upper part of the viewport, falling back to the first
 * id (also when IntersectionObserver is unavailable). `ids` must be memoized.
 */
export function useActiveHeading(ids: string[]): string | undefined {
  const [activeId, setActiveId] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const firstVisible = ids.find((id) => visible.has(id))
        if (firstVisible) setActiveId(firstVisible)
      },
      { rootMargin: `-${READING_TOP_OFFSET}px 0px -55% 0px` }
    )

    for (const id of ids) {
      const element = document.querySelector(`#${id}`)
      if (element) observer.observe(element)
    }

    return () => observer.disconnect()
  }, [ids])

  return activeId !== undefined && ids.includes(activeId) ? activeId : ids[0]
}
