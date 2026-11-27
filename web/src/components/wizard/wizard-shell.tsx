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
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface WizardStep {
  /** i18n key (English source text) of the step title. */
  titleKey: string
  /** i18n key (English source text) of the step description. */
  descriptionKey: string
}

export interface WizardShellProps {
  steps: WizardStep[]
  /** Zero-based index of the active step. */
  currentStep: number
  /** Already translated page title shown under the logo. */
  title: ReactNode
  /** Already translated subtitle shown under the title. */
  description?: ReactNode
  /** Already translated card title. */
  cardTitle: ReactNode
  /** Already translated card description. */
  cardDescription?: ReactNode
  /** Logo image URL. */
  logo?: string
  /** Shows skeletons instead of logo and title while brand data loads. */
  brandLoading?: boolean
  /** Step body, rendered inside the card below the step bar. */
  children: ReactNode
  /** Bottom navigation slot (usually `<StepNavigation />`). Omit to hide the card footer. */
  footer?: ReactNode
  /** Top-right language switcher slot. */
  languageSwitcher?: ReactNode
  /** When provided, a top-right skip button is rendered and calls this on click. */
  onSkip?: () => void
  /** Already translated skip button label. Defaults to "Skip". */
  skipLabel?: string
}

const STEP_GRID_COLUMNS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
}

/**
 * Presentational wizard frame: brand header, step bar, content card and
 * navigation slots. Holds no business logic.
 */
export function WizardShell(props: WizardShellProps) {
  const { t } = useTranslation()
  const hasTopActions = Boolean(props.languageSwitcher) || Boolean(props.onSkip)

  return (
    <div className='bg-muted/40 relative min-h-svh py-10'>
      {hasTopActions && (
        <div className='absolute top-4 right-4 flex items-center gap-2 sm:top-6 sm:right-6'>
          {props.onSkip && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={props.onSkip}
            >
              {props.skipLabel ?? t('Skip')}
            </Button>
          )}
          {props.languageSwitcher}
        </div>
      )}
      <div className='container mx-auto flex max-w-5xl flex-col gap-8 px-4 sm:px-6'>
        <div className='flex flex-col items-center gap-3'>
          <div className='relative h-12 w-12'>
            {props.brandLoading ? (
              <Skeleton className='absolute inset-0 rounded-full' />
            ) : (
              <img
                src={props.logo}
                alt={t('System logo')}
                className='h-12 w-12 rounded-full object-cover shadow-sm'
              />
            )}
          </div>
          {props.brandLoading ? (
            <Skeleton className='h-7 w-40' />
          ) : (
            <h1 className='text-2xl font-semibold tracking-tight'>
              {props.title}
            </h1>
          )}
          {props.description && (
            <p className='text-muted-foreground text-center text-sm sm:text-base'>
              {props.description}
            </p>
          )}
        </div>

        <Card className='shadow-lg'>
          <CardHeader className='space-y-2'>
            <CardTitle className='text-xl font-semibold'>
              {props.cardTitle}
            </CardTitle>
            {props.cardDescription && (
              <CardDescription>{props.cardDescription}</CardDescription>
            )}
          </CardHeader>

          <CardContent className='space-y-6'>
            <ol
              className={cn(
                'grid gap-3',
                STEP_GRID_COLUMNS[props.steps.length] ?? 'sm:grid-cols-4'
              )}
            >
              {props.steps.map((step, index) => {
                const isActive = props.currentStep === index
                const isCompleted = props.currentStep > index
                return (
                  <li
                    key={step.titleKey}
                    aria-current={isActive ? 'step' : undefined}
                    className={cn('rounded-xl border p-3', {
                      'border-primary ring-primary/20 ring-2': isActive,
                      'border-primary/40 bg-primary/5':
                        !isActive && isCompleted,
                      'border-muted bg-card': !isActive && !isCompleted,
                    })}
                  >
                    <div className='flex items-start gap-3'>
                      <span
                        className={cn(
                          'flex size-6 items-center justify-center rounded-md border text-xs font-semibold',
                          isActive || isCompleted
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-muted-foreground/40 text-muted-foreground'
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className='space-y-1'>
                        <p className='text-sm font-semibold'>
                          {t(step.titleKey)}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {t(step.descriptionKey)}
                        </p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>

            {props.children}
          </CardContent>

          {props.footer && (
            <CardFooter className='w-full justify-end border-t'>
              {props.footer}
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
