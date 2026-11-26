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

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { getLandingPrimaryAction } from '../../lib/landing-actions'
import { HomeSphere } from '../home-sphere'
import { MixedHeading } from '../mixed-heading'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

/** Full-width band with the inverted, top-lit dot sphere behind the call to action. */
export function CTA(props: CTAProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const primaryAction = getLandingPrimaryAction(
    status as Record<string, unknown> | null,
    Boolean(props.isAuthenticated)
  )

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section
      id='home-cta'
      aria-labelledby='home-cta-title'
      className={cn(
        'home-cta relative isolate flex min-h-[480px] items-center justify-center overflow-hidden px-5 sm:px-8 md:min-h-[560px]',
        props.className
      )}
    >
      <div
        className='pointer-events-none absolute inset-0 -z-10'
        aria-hidden='true'
      >
        <HomeSphere variant='inverted' />
      </div>
      <div
        className='from-background pointer-events-none absolute inset-x-0 top-0 -z-10 h-16 bg-linear-to-b to-transparent'
        aria-hidden='true'
      />
      <div
        className='from-background pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-linear-to-t to-transparent'
        aria-hidden='true'
      />
      <div className='mx-auto flex max-w-7xl flex-col items-center pt-28 pb-16 text-center md:pt-36'>
        <AnimateInView className='flex min-w-0 flex-col items-center'>
          <MixedHeading
            id='home-cta-title'
            lead={t('Start routing')}
            rest={t('in minutes')}
            className='max-w-3xl text-[clamp(40px,6.5vw,80px)] leading-[1.02]'
          />
          <p className='text-muted-foreground mt-5 max-w-xl text-base leading-relaxed text-pretty wrap-anywhere md:text-lg'>
            {t('Create a key, change your base_url, ship.')}
          </p>
          <Button
            role='link'
            className='group mt-9 h-auto min-h-12 px-6 py-3 whitespace-normal'
            render={<Link to={primaryAction.to} />}
          >
            {t(primaryAction.label)}
            <ArrowRight
              aria-hidden='true'
              className='ml-1 size-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1'
            />
          </Button>
        </AnimateInView>
      </div>
    </section>
  )
}
