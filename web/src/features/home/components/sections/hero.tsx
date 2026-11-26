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
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Fragment, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import { useHeroParallax } from '../../hooks/use-hero-parallax'
import { useSphereTopRatio } from '../../hooks/use-sphere-top-ratio'
import type { HomeCatalogSummary } from '../../lib/catalog-summary'
import { getLandingPrimaryAction } from '../../lib/landing-actions'
import { HeroLogoRow } from '../hero-logo-row'
import { HomeSphere } from '../home-sphere'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
  catalog?: HomeCatalogSummary | null
}

/** Brand names rendered in the foreground color inside the subtitle. */
const SUBTITLE_HIGHLIGHT = /(OpenAI|Anthropic|Gemini)/

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { systemName } = useSystemConfig()
  const rootRef = useRef<HTMLElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const sphereTop = useSphereTopRatio(rootRef, actionsRef)
  useHeroParallax(rootRef)
  const primaryAction = getLandingPrimaryAction(
    status as Record<string, unknown> | null,
    Boolean(props.isAuthenticated)
  )
  let offset = 0
  const subtitleParts = t(
    'OpenAI, Anthropic, Gemini and many more models through a single endpoint. Native API compatibility, routing and automatic failover, built for production.'
  )
    .split(SUBTITLE_HIGHLIGHT)
    .map((text, index) => {
      const part = { text, offset, highlighted: index % 2 === 1 }
      offset += text.length
      return part
    })

  return (
    <section
      id='home-hero'
      ref={rootRef}
      aria-labelledby='home-title'
      className={cn(
        'home-hero relative isolate flex min-h-[calc(100svh-4rem)] flex-col items-center overflow-hidden px-6 pt-[max(2.5rem,7svh)] pb-28 text-center md:min-h-[max(calc(100svh-4rem),680px)]',
        props.className
      )}
    >
      {/* Sphere layer: reverse parallax via the `translate` property. */}
      <div
        className='pointer-events-none absolute inset-0 -z-10 [translate:calc(var(--px,0)*-12px)_calc(var(--py,0)*-12px)]'
        aria-hidden='true'
      >
        <HomeSphere variant='hero' interactive topRatio={sphereTop} />
      </div>
      <div
        className='from-background/0 to-background pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[22%] min-h-32 bg-linear-to-b'
        aria-hidden='true'
      />
      <h1
        id='home-title'
        className='home-enter home-title font-display max-w-[960px] text-[clamp(40px,6vw,72px)] leading-[1.05] font-medium tracking-[-0.03em] text-balance'
      >
        <span className='block'>
          <span className='text-foreground'>{t('One API for')}</span>{' '}
          <span className='text-muted-foreground'>{t('Every Model')}</span>
        </span>
        <span className='block'>
          <span className='text-muted-foreground'>{t('Routed by')}</span>{' '}
          <span className='text-foreground wrap-anywhere'>{systemName}</span>
        </span>
      </h1>
      <p className='home-enter home-description text-muted-foreground mt-5 max-w-[560px] text-[15px] leading-[1.6] text-pretty md:text-base'>
        {subtitleParts.map((part) => (
          <Fragment key={part.offset}>
            {part.highlighted ? (
              <span className='text-foreground'>{part.text}</span>
            ) : (
              part.text
            )}
          </Fragment>
        ))}
      </p>
      <div className='home-enter home-logos mt-5 w-full'>
        <HeroLogoRow catalog={props.catalog ?? null} />
      </div>
      <div ref={actionsRef} className='home-enter home-actions mt-7'>
        <Button
          role='link'
          className='group h-auto min-h-12 px-6 py-3 whitespace-normal'
          render={<Link to={primaryAction.to} />}
        >
          {t(primaryAction.label)}
          <ArrowRight
            className='size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1'
            aria-hidden='true'
          />
        </Button>
      </div>
    </section>
  )
}
