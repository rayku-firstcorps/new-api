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
  useCallback,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/utils'

/**
 * Wrap a group of SpotlightCards. One pointermove listener updates --mx/--my on
 * every card, so neighbouring borders light up as the pointer approaches.
 */
export function SpotlightGroup(
  props: HTMLAttributes<HTMLDivElement> & { children: ReactNode }
) {
  const { children, className, ...rest } = props
  const ref = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  const handleMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const { clientX, clientY } = event
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const cards =
        ref.current?.querySelectorAll<HTMLElement>('[data-spotlight]')
      cards?.forEach((card) => {
        const rect = card.getBoundingClientRect()
        card.style.setProperty('--mx', `${clientX - rect.left}px`)
        card.style.setProperty('--my', `${clientY - rect.top}px`)
        card.dataset.lit = 'true'
      })
    })
  }, [])

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(frame.current)
    ref.current
      ?.querySelectorAll<HTMLElement>('[data-spotlight]')
      .forEach((card) => delete card.dataset.lit)
  }, [])

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={className}
      {...rest}
    >
      {children}
    </div>
  )
}

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Make the card itself focusable (when it has no interactive children). */
  focusable?: boolean
}

/** Surface card with a pointer-following amber glow and a highlighted border ring. */
export function SpotlightCard(props: SpotlightCardProps) {
  const { children, className, focusable, style, ...rest } = props

  return (
    <div
      data-spotlight
      tabIndex={focusable ? 0 : undefined}
      className={cn(
        'group/spot border-border bg-card focus-visible:ring-ring/60 focus-visible:ring-offset-background relative isolate rounded-xl border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none focus-visible:[--mx:50%] focus-visible:[--my:50%]',
        className
      )}
      style={{ '--glow': 'var(--primary)', ...style } as CSSProperties}
      {...rest}
    >
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-focus-visible/spot:opacity-100 group-data-[lit]/spot:opacity-100 motion-reduce:transition-none'
        style={{
          background:
            'radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--glow) 8%, transparent), transparent 60%)',
        }}
      />
      <div
        aria-hidden='true'
        className='pointer-events-none absolute -inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-focus-visible/spot:opacity-100 group-data-[lit]/spot:opacity-100 motion-reduce:transition-none'
        style={{
          padding: 1,
          background:
            'radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--glow) 60%, transparent), transparent 70%)',
          mask: 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
        }}
      />
      {children}
    </div>
  )
}
