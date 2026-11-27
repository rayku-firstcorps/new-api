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
import { ArrowRight, Check, Circle } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import type {
  QuickAction,
  StartStep,
} from '@/features/dashboard/lib/setup-guide'
import { cn } from '@/lib/utils'

function StartStepBody(props: {
  step: StartStep
  index: number
  trailing: ReactNode
}) {
  const Icon = props.step.icon

  return (
    <>
      <span className='flex min-w-0 items-start gap-2.5'>
        <span className='bg-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg'>
          <Icon className='size-3.5' aria-hidden='true' />
        </span>
        <span className='flex min-w-0 flex-col gap-0.5'>
          <span className='flex items-center gap-2 text-sm font-medium'>
            <span className='text-muted-foreground font-mono text-xs tabular-nums'>
              {props.index + 1}.
            </span>
            <span className='truncate'>{props.step.title}</span>
          </span>
          <span className='text-muted-foreground line-clamp-1 text-xs'>
            {props.step.description}
          </span>
        </span>
      </span>
      {props.trailing}
    </>
  )
}

const STEP_ROW_CLASS =
  'bg-background flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left'

export function StartStepItem(props: {
  step: StartStep
  index: number
  isLast: boolean
  /** The first incomplete step: highlighted and carries the primary CTA. */
  active?: boolean
  /** Opens the in-place flow of the step (API key creation) instead of navigating. */
  onAction?: () => void
}) {
  const StatusIcon = props.step.completed ? Check : Circle
  const goPlayground = props.step.to === '/playground'

  const connector = !props.isLast && (
    <span
      className='bg-border absolute top-9 bottom-0 left-4 w-px'
      aria-hidden='true'
    />
  )
  const status = (
    <span
      className={cn(
        'bg-background relative z-10 flex size-8 shrink-0 items-center justify-center rounded-lg border',
        props.step.completed && 'border-success/30 bg-success/10',
        props.active && 'border-primary/60'
      )}
    >
      <StatusIcon
        className={props.step.completed ? 'text-success size-4' : 'size-4'}
        aria-hidden='true'
      />
    </span>
  )

  if (props.active) {
    let cta: ReactNode
    if (props.onAction) {
      cta = (
        <Button size='sm' className='shrink-0' onClick={props.onAction}>
          {props.step.ctaLabel}
        </Button>
      )
    } else if (goPlayground) {
      cta = (
        <Button
          size='sm'
          className='shrink-0'
          render={
            <Link
              to='/playground'
              search={{ model: props.step.playgroundModel }}
            />
          }
        >
          {props.step.ctaLabel}
        </Button>
      )
    } else {
      cta = (
        <Button
          size='sm'
          className='shrink-0'
          render={<Link to={props.step.to} />}
        >
          {props.step.ctaLabel}
        </Button>
      )
    }

    return (
      <li className='relative flex gap-3 pb-2.5 last:pb-0' aria-current='step'>
        {connector}
        {status}
        <div
          className={cn(
            STEP_ROW_CLASS,
            'border-primary/60 ring-primary/20 ring-2'
          )}
        >
          <StartStepBody step={props.step} index={props.index} trailing={cta} />
        </div>
      </li>
    )
  }

  return (
    <li className='relative flex gap-3 pb-2.5 last:pb-0'>
      {connector}
      {status}
      <Link
        to={props.step.to}
        className={cn(
          STEP_ROW_CLASS,
          'hover:bg-muted/50 focus-visible:ring-ring transition-colors outline-none focus-visible:ring-2'
        )}
      >
        <StartStepBody
          step={props.step}
          index={props.index}
          trailing={
            <ArrowRight
              className='text-muted-foreground size-4 shrink-0'
              aria-hidden='true'
            />
          }
        />
      </Link>
    </li>
  )
}

export function QuickActionItem(props: { action: QuickAction }) {
  const Icon = props.action.icon

  return (
    <Button
      variant='outline'
      className='h-auto justify-start rounded-lg px-3 py-3 text-left'
      render={<Link to={props.action.to} />}
    >
      <span className='bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg'>
        <Icon className='size-4' aria-hidden='true' />
      </span>
      <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='truncate text-sm font-medium'>
          {props.action.title}
        </span>
        <span className='text-muted-foreground line-clamp-2 text-xs leading-relaxed'>
          {props.action.description}
        </span>
      </span>
    </Button>
  )
}

export function CompactQuickAction(props: { action: QuickAction }) {
  const Icon = props.action.icon

  return (
    <Button
      variant='outline'
      size='sm'
      className='h-8 min-w-24 gap-1.5 px-2.5'
      render={<Link to={props.action.to} />}
    >
      <Icon data-icon='inline-start' />
      <span>{props.action.title}</span>
    </Button>
  )
}
