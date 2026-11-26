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
import { useEffect, useRef, useState, type FocusEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { useInView } from '../hooks/use-in-view'
import type { HomeProvider } from '../lib/catalog-summary'
import { ProviderMark } from './provider-mark'

/** Time for one full copy of the list to scroll past. */
const LOOP_MS = 40_000

interface MarqueeItemsProps {
  providers: HomeProvider[]
  moreCount: number
}

function MarqueeItems(props: MarqueeItemsProps) {
  const { t } = useTranslation()

  return (
    <>
      {props.providers.map((provider) => (
        <li
          key={provider.id}
          className='text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-2.5 transition-colors duration-200'
        >
          <ProviderMark provider={provider} size={20} />
          <span className='text-[15px] font-medium whitespace-nowrap'>
            {provider.name}
          </span>
        </li>
      ))}
      {props.moreCount > 0 ? (
        <li className='text-muted-foreground shrink-0 text-[15px] whitespace-nowrap'>
          {t('and {{count}} more', { count: props.moreCount })}
        </li>
      ) : null}
    </>
  )
}

interface ProvidersMarqueeProps {
  providers: HomeProvider[]
  /** Providers beyond the ones listed, shown as "and N more". */
  moreCount: number
}

/**
 * Infinite marquee of the non-featured providers. The list is rendered twice
 * (the second copy aria-hidden) and the track is translated by -50% with the
 * Web Animations API, so the loop is seamless. It pauses on hover, on focus
 * and off-screen, and wraps statically under reduced motion.
 */
export function ProvidersMarquee(props: ProvidersMarqueeProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion() ?? false
  const wrapRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<Animation | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const inView = useInView(wrapRef, { once: false, rootMargin: '0px' })

  useEffect(() => {
    const el = trackRef.current
    if (reduced || !el || typeof el.animate !== 'function') return
    const anim = el.animate(
      [
        { transform: 'translate3d(0,0,0)' },
        { transform: 'translate3d(-50%,0,0)' },
      ],
      { duration: LOOP_MS, iterations: Infinity, easing: 'linear' }
    )
    anim.pause()
    animRef.current = anim
    return () => {
      anim.cancel()
      animRef.current = null
    }
  }, [reduced])

  useEffect(() => {
    const anim = animRef.current
    if (!anim) return
    if (hovered || focused || !inView) anim.pause()
    else anim.play()
  }, [hovered, focused, inView, reduced])

  if (reduced) {
    return (
      <div ref={wrapRef}>
        <ul
          aria-label={t('More supported providers')}
          className='flex flex-wrap items-center justify-center gap-x-8 gap-y-4'
        >
          <MarqueeItems
            providers={props.providers}
            moreCount={props.moreCount}
          />
        </ul>
      </div>
    )
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }

  return (
    <div
      ref={wrapRef}
      role='region'
      aria-label={t('More supported providers')}
      tabIndex={0}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
      className='focus-visible:ring-ring/60 focus-visible:ring-offset-background rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
    >
      <div className='overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] py-3'>
        <div ref={trackRef} className='flex w-max will-change-transform'>
          <ul className='flex shrink-0 items-center gap-12 pr-12'>
            <MarqueeItems
              providers={props.providers}
              moreCount={props.moreCount}
            />
          </ul>
          <ul
            aria-hidden='true'
            className='flex shrink-0 items-center gap-12 pr-12'
          >
            <MarqueeItems
              providers={props.providers}
              moreCount={props.moreCount}
            />
          </ul>
        </div>
      </div>
    </div>
  )
}
