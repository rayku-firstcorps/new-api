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
import { ArrowRight, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { usePopularModels } from '../../hooks/use-popular-models'
import {
  getLandingPrimaryAction,
  isLandingPricingEnabled,
} from '../../lib/landing-actions'
import { PopularModelCard } from './popular-model-card'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()
  const { status, loading, error } = useStatus()
  const statusRecord = status as Record<string, unknown> | null
  const primaryAction = getLandingPrimaryAction(
    statusRecord,
    Boolean(props.isAuthenticated)
  )
  const showPricing = isLandingPricingEnabled(statusRecord)
  const popularModels = usePopularModels(
    Boolean(status) &&
      !loading &&
      !error &&
      showPricing &&
      !props.isAuthenticated
  )
  const modelCount = popularModels.length

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section
      aria-labelledby='home-cta-title'
      className={cn('px-5 pb-16 sm:px-8 md:pb-24', props.className)}
    >
      <AnimateInView className='home-cta mx-auto max-w-7xl rounded-2xl border px-6 py-10 sm:px-10 lg:px-14 lg:py-14'>
        <div className='grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-16'>
          <div className='min-w-0'>
            {modelCount > 0 ? (
              <Badge
                variant='outline'
                className='mb-4 h-auto max-w-full gap-2 px-3 py-1.5 whitespace-normal'
              >
                <TrendingUp aria-hidden='true' className='shrink-0' />
                {t('Most called models · Last 24 hours')}
              </Badge>
            ) : null}
            <h2
              id='home-cta-title'
              className='text-2xl leading-tight font-semibold tracking-tight text-balance wrap-anywhere md:text-3xl'
            >
              {t('Start with the AI tool you already use')}
            </h2>
            <p className='text-muted-foreground mt-4 max-w-xl text-sm leading-7 text-pretty wrap-anywhere'>
              {t(
                'Create one account, copy the right setup, and keep keys, models, balance, usage, and cost records visible from the console.'
              )}
            </p>
          </div>
          <div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-64 lg:flex-col'>
            <Button
              role='link'
              className='group h-auto min-h-12 rounded-xl px-6 py-3 whitespace-normal'
              render={<Link to={primaryAction.to} />}
            >
              {t(primaryAction.label)}
              <ArrowRight
                aria-hidden='true'
                className='ml-1 size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1'
              />
            </Button>
            {showPricing ? (
              <Button
                role='link'
                variant='outline'
                className='h-auto min-h-12 rounded-xl px-6 py-3 whitespace-normal'
                render={<Link to='/pricing' />}
              >
                {t('View Pricing')}
              </Button>
            ) : null}
          </div>
        </div>
        {modelCount > 0 ? (
          <ul
            aria-label={t('Most called models · Last 24 hours')}
            className={cn(
              'mt-10 grid gap-4',
              modelCount === 1 && 'max-w-md',
              modelCount === 2 && 'sm:grid-cols-2',
              modelCount >= 3 && 'lg:grid-cols-3'
            )}
          >
            {popularModels.map((model, index) => (
              <PopularModelCard
                key={model.model_name}
                model={model}
                rank={index + 1}
              />
            ))}
          </ul>
        ) : null}
      </AnimateInView>
    </section>
  )
}
