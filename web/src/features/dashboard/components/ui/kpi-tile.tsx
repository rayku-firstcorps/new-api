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
import { useId, type ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface KpiTileProps {
  label: string
  value: ReactNode
  detail?: ReactNode
  sparkline?: number[]
  loading?: boolean
  error?: boolean
  action?: ReactNode
  className?: string
}

const SPARKLINE_WIDTH = 160
const SPARKLINE_HEIGHT = 28
const SPARKLINE_PADDING = 2

function buildSparklinePaths(values?: number[]) {
  if (!values?.length) return null

  const sanitized = values.map((value) => Math.max(0, Number(value) || 0))
  const max = Math.max(...sanitized)
  const min = Math.min(...sanitized)
  const range = max - min
  const points = sanitized.map((value, index) => {
    const x =
      sanitized.length === 1
        ? SPARKLINE_WIDTH / 2
        : (index / (sanitized.length - 1)) * SPARKLINE_WIDTH
    let normalized = 0
    if (range > 0) {
      normalized = (value - min) / range
    } else if (max > 0) {
      normalized = 0.5
    }
    const y =
      SPARKLINE_HEIGHT -
      SPARKLINE_PADDING -
      normalized * (SPARKLINE_HEIGHT - SPARKLINE_PADDING * 2)
    return { x, y }
  })

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')
  const firstPoint = points.at(0)
  const lastPoint = points.at(-1)
  if (!firstPoint || !lastPoint) return null

  return {
    linePath,
    areaPath: `${linePath} L ${lastPoint.x} ${SPARKLINE_HEIGHT} L ${firstPoint.x} ${SPARKLINE_HEIGHT} Z`,
  }
}

function KpiSparkline(props: { values?: number[] }) {
  const rawId = useId()
  const gradientId = `kpi-tile-line-${rawId.replaceAll(':', '')}`
  const paths = buildSparklinePaths(props.values)

  if (!paths) return <div className='h-7' aria-hidden='true' />

  return (
    <div className='text-primary h-7 overflow-hidden' aria-hidden='true'>
      <svg
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        preserveAspectRatio='none'
        className='size-full'
      >
        <defs>
          <linearGradient id={gradientId} x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor='currentColor' stopOpacity='0.22' />
            <stop offset='100%' stopColor='currentColor' stopOpacity='0' />
          </linearGradient>
        </defs>
        <path d={paths.areaPath} fill={`url(#${gradientId})`} />
        <path
          d={paths.linePath}
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='1.75'
          vectorEffect='non-scaling-stroke'
        />
      </svg>
    </div>
  )
}

/**
 * KuCode KPI tile: small uppercase label, large tabular value, muted detail
 * line and an optional decorative trend line.
 */
export function KpiTile(props: KpiTileProps) {
  let body: ReactNode
  if (props.loading) {
    body = (
      <>
        <Skeleton className='mt-2 h-7 w-24' />
        <Skeleton className='mt-2 h-3 w-32' />
      </>
    )
  } else {
    body = (
      <>
        <p
          className={cn(
            'font-display mt-1.5 truncate text-xl leading-tight font-medium tracking-tight tabular-nums sm:text-[28px]',
            props.error && 'text-muted-foreground'
          )}
        >
          {props.error ? '--' : props.value}
        </p>
        {props.detail != null && (
          <p className='text-muted-foreground mt-1 line-clamp-1 text-xs'>
            {props.detail}
          </p>
        )}
      </>
    )
  }

  return (
    <div
      aria-busy={props.loading || undefined}
      className={cn(
        'bg-card flex min-w-0 flex-col rounded-xl border p-4 sm:p-5',
        props.className
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <p className='text-muted-foreground truncate text-xs leading-4 font-medium tracking-wide uppercase'>
          {props.label}
        </p>
        {props.action != null && <div className='shrink-0'>{props.action}</div>}
      </div>
      {body}
      {props.sparkline != null && (
        <div className='mt-auto hidden pt-3 sm:block'>
          {props.loading ? (
            <Skeleton className='h-7 w-full' />
          ) : (
            <KpiSparkline values={props.sparkline} />
          )}
        </div>
      )}
    </div>
  )
}
