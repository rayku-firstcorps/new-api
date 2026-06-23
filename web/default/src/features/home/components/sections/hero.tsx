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
import { ArrowRight, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Button } from '@/components/ui/button'
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

const INTERNAL_DOCS_ROUTE = '/docs'

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
  const hasOfficialSocialLinks = officialSocialLinks.length > 0

  return (
    <section
      id='home-hero'
      className='border-border/60 relative z-10 overflow-hidden border-b px-4 pt-20 pb-10 sm:px-6 md:pt-28 md:pb-14'
    >
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-75 dark:opacity-25'
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklch, var(--border) 42%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 42%, transparent) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />

      <div className='mx-auto max-w-6xl'>
        <div className='mx-auto flex w-full max-w-[calc(100vw-2rem)] min-w-0 flex-col items-center text-center sm:max-w-3xl'>
          <p
            className='landing-animate-fade-up mb-5 text-xs font-semibold tracking-[0.18em] text-[#f05a53] uppercase opacity-0'
            style={{ animationDelay: '0ms' }}
          >
            {t('Fast model gateway for daily AI tools')}
          </p>

          <h1
            className='landing-animate-fade-up w-full max-w-[calc(100vw-2rem)] min-w-0 text-4xl leading-[1.05] font-bold tracking-normal text-balance opacity-0 sm:max-w-4xl sm:text-5xl md:text-6xl'
            style={{ animationDelay: '60ms' }}
          >
            {t('Use frontier models inside the tools you already know')}
          </h1>

          <p
            className='landing-animate-fade-up text-muted-foreground/85 mt-5 w-full max-w-[20rem] min-w-0 text-sm leading-7 text-wrap break-words opacity-0 sm:max-w-2xl md:text-base md:text-balance'
            style={{ animationDelay: '120ms' }}
          >
            <span className='sm:hidden'>
              {t(
                'Connect once through new-api, then use leading models from your favorite AI tools.'
              ).replace('new-api', systemName)}
            </span>
            <span className='hidden sm:inline'>
              {t(
                'Connect once through new-api, route Codex, Claude Code, Cherry Studio, and Open WebUI to GPT, Claude, Gemini, and more.'
              ).replace('new-api', systemName)}
            </span>
          </p>

          <div
            className='landing-animate-fade-up mt-7 flex w-full max-w-[18rem] min-w-0 flex-col items-stretch justify-center gap-3 opacity-0 sm:max-w-xl sm:flex-row'
            style={{ animationDelay: '180ms' }}
          >
            <Button
              className='group h-10 w-full min-w-0 justify-center rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white hover:bg-neutral-800 sm:w-auto dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200'
              render={<Link to={primaryAction.to} />}
            >
              {t(primaryAction.label)}
              <ArrowRight className='ml-1 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5' />
            </Button>

            <Button
              variant='outline'
              className='h-10 w-full min-w-0 justify-center rounded-full px-5 text-sm font-semibold sm:w-auto'
              render={<Link to={INTERNAL_DOCS_ROUTE} />}
            >
              <BookOpen className='size-3.5' />
              {t('Developer Docs')}
            </Button>

            {showPricing ? (
              <Button
                variant='outline'
                className='h-10 w-full min-w-0 justify-center rounded-full px-5 text-sm font-semibold sm:w-auto'
                render={<Link to='/pricing' />}
              >
                {t('View Pricing')}
              </Button>
            ) : null}
          </div>

          {hasOfficialSocialLinks ? (
            <div
              className='landing-animate-fade-up mt-5 flex w-full max-w-[calc(100vw-2rem)] justify-center opacity-0 sm:max-w-full'
              style={{ animationDelay: '240ms' }}
            >
              <OfficialSocialLinks links={officialSocialLinks} />
            </div>
          ) : null}
        </div>

        <div
          className='landing-animate-fade-up mt-12 opacity-0 md:mt-14'
          style={{ animationDelay: '300ms' }}
        >
          <HomeIntegrationPreview />
        </div>
      </div>
    </section>
  )
}
