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
import { ArrowDown, ArrowRight, Braces } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import {
  getLandingPrimaryAction,
  isLandingPricingEnabled,
} from '../../lib/landing-actions'
import { HomeIntegrationPreview } from '../home-integration-preview'
import { OfficialSocialLinks } from '../official-social-links'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { officialSocialLinks, systemName } = useSystemConfig()
  const statusRecord = status as Record<string, unknown> | null
  const primaryAction = getLandingPrimaryAction(
    statusRecord,
    Boolean(props.isAuthenticated)
  )
  const showPricing = isLandingPricingEnabled(statusRecord)
  const communityLinks = officialSocialLinks.filter(
    (link) =>
      link.platform === 'telegram' ||
      link.platform === 'whatsapp' ||
      link.platform === 'linuxdo'
  )
  const otherSocialLinks = officialSocialLinks.filter(
    (link) =>
      link.platform !== 'telegram' &&
      link.platform !== 'whatsapp' &&
      link.platform !== 'linuxdo'
  )

  return (
    <section
      id='home-hero'
      aria-labelledby='home-title'
      className={cn(
        'home-hero relative isolate overflow-hidden px-5 sm:px-8',
        props.className
      )}
    >
      <div
        className='home-hero-grid pointer-events-none absolute inset-0 -z-10'
        aria-hidden='true'
      />
      <div className='mx-auto max-w-7xl'>
        <div className='grid min-w-0 items-center gap-12 pt-16 pb-12 sm:pt-20 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pt-28 lg:pb-20'>
          <div className='min-w-0'>
            <div className='home-enter'>
              <Badge
                variant='outline'
                className='home-eyebrow mb-7 max-w-full gap-2 rounded-full px-3 py-2 text-[11px] whitespace-normal'
              >
                <Braces className='size-3.5 shrink-0' aria-hidden='true' />
                {t('Fast model gateway for daily AI tools')}
              </Badge>
            </div>
            <h1
              id='home-title'
              className='home-enter home-title text-4xl leading-[1.12] font-semibold tracking-tight text-balance sm:text-5xl xl:text-6xl'
            >
              {t('Use frontier models inside the tools you already know')}
            </h1>
            <p className='home-enter home-description text-muted-foreground mt-6 max-w-xl text-base leading-8 text-pretty'>
              {t(
                'Connect once through new-api, route Codex, Claude Code, Cherry Studio, and Open WebUI to GPT, Claude, Gemini, and more.'
              ).replace('new-api', systemName)}
            </p>
            <div className='home-enter home-actions mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap'>
              <Button
                role='link'
                className='group h-auto min-h-12 rounded-xl px-6 py-3 whitespace-normal'
                render={<Link to={primaryAction.to} />}
              >
                {t(primaryAction.label)}
                <ArrowRight
                  className='size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1'
                  aria-hidden='true'
                />
              </Button>
              <OfficialSocialLinks links={communityLinks} variant='hero' />
              {showPricing ? (
                <Button
                  role='link'
                  variant='ghost'
                  className='h-auto min-h-12 rounded-xl px-4 py-3 whitespace-normal'
                  render={<Link to='/pricing' />}
                >
                  {t('View Pricing')}
                </Button>
              ) : null}
            </div>
            {otherSocialLinks.length > 0 ? (
              <div className='home-enter mt-6'>
                <OfficialSocialLinks links={otherSocialLinks} />
              </div>
            ) : null}
          </div>
          <div className='home-enter home-preview min-w-0'>
            <HomeIntegrationPreview />
          </div>
        </div>
        <div className='border-border flex flex-wrap items-center justify-between gap-4 border-t py-5'>
          <p className='text-muted-foreground flex items-center gap-2 text-xs'>
            <Braces className='text-primary size-4' aria-hidden='true' />
            {t('OpenAI-compatible endpoints')}
          </p>
          <Button
            role='link'
            variant='ghost'
            className='group min-h-11 gap-3 px-0 text-xs'
            render={<a href='#home-tools' />}
          >
            {t('Unified setup')}
            <ArrowDown
              className='size-3.5 motion-safe:transition-transform motion-safe:group-hover:translate-y-1'
              aria-hidden='true'
            />
          </Button>
        </div>
      </div>
    </section>
  )
}
