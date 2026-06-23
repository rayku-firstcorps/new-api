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
import { useTranslation } from 'react-i18next'
import { useStatus } from '@/hooks/use-status'
import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'
import {
  getLandingPrimaryAction,
  isLandingPricingEnabled,
} from '../../lib/landing-actions'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const statusRecord = status as Record<string, unknown> | null
  const primaryAction = getLandingPrimaryAction(
    statusRecord,
    Boolean(props.isAuthenticated)
  )
  const showPricing = isLandingPricingEnabled(statusRecord)

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section className='relative z-10 overflow-hidden px-4 py-20 sm:px-6 md:py-28'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-70 dark:opacity-25'
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in oklch, var(--border) 40%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border) 40%, transparent) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <AnimateInView
        className='border-border/70 bg-background/95 mx-auto max-w-3xl rounded-[18px] border px-6 py-10 text-center backdrop-blur md:px-10 md:py-12 dark:bg-neutral-950/85'
        animation='scale-in'
      >
        <h2 className='text-2xl leading-tight font-bold md:text-4xl'>
          {t('Start with the AI tool you already use')}
        </h2>
        <p className='text-muted-foreground/80 mx-auto mt-5 max-w-xl text-sm leading-relaxed md:text-base'>
          {t(
            'Create one account, copy the right setup, and keep keys, models, balance, usage, and cost records visible from the console.'
          )}
        </p>
        <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
          <Button
            className='group min-h-10 rounded-lg px-5'
            render={<Link to={primaryAction.to} />}
          >
            {t(primaryAction.label)}
            <ArrowRight className='ml-1 size-3.5 transition-transform duration-200 group-hover:translate-x-0.5' />
          </Button>
          {showPricing ? (
            <Button
              variant='outline'
              className='border-border/50 hover:border-border hover:bg-muted/50 min-h-10 rounded-lg px-5'
              render={<Link to='/pricing' />}
            >
              {t('View Pricing')}
            </Button>
          ) : null}
        </div>
      </AnimateInView>
    </section>
  )
}
