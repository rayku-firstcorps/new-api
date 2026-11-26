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
import { Activity, BarChart3, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '@/components/ui/card'
import { IconBadge } from '@/components/ui/icon-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatQuota } from '@/lib/format'

import type { UserWalletData } from '../types'

interface WalletStatsCardProps {
  user: UserWalletData | null
  loading?: boolean
  className?: string
}

/**
 * Balance panel: the current balance as the headline figure, with total usage
 * and request count listed below it.
 */
export function WalletStatsCard(props: WalletStatsCardProps) {
  const { t } = useTranslation()

  if (props.loading) {
    return (
      <Card data-card-hover='false' className={props.className}>
        <CardContent className='flex flex-col gap-4 sm:gap-5'>
          <Skeleton className='h-3.5 w-28' />
          <Skeleton className='h-10 w-48' />
          <div className='space-y-3 border-t pt-4'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-full' />
          </div>
        </CardContent>
      </Card>
    )
  }

  const details = [
    {
      label: t('Total Usage'),
      description: t('Total consumed quota'),
      value: formatQuota(props.user?.used_quota ?? 0),
      icon: BarChart3,
    },
    {
      label: t('API Requests'),
      description: t('Total requests made'),
      value: (props.user?.request_count ?? 0).toLocaleString(),
      icon: Activity,
    },
  ]

  return (
    <Card data-card-hover='false' className={props.className}>
      <CardContent className='flex h-full flex-col gap-4 sm:gap-5'>
        <div className='flex items-center gap-2.5'>
          <IconBadge tone='primary' size='sm'>
            <WalletCards />
          </IconBadge>
          <div className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
            {t('Current Balance')}
          </div>
        </div>

        <div>
          <div className='font-display text-foreground text-3xl leading-tight font-medium tracking-tight break-all tabular-nums sm:text-4xl'>
            {formatQuota(props.user?.quota ?? 0)}
          </div>
          <div className='text-muted-foreground mt-1 text-xs'>
            {t('Remaining quota')}
          </div>
        </div>

        <dl className='mt-auto space-y-3 border-t pt-4 text-sm'>
          {details.map((item) => (
            <div
              key={item.label}
              className='flex items-baseline justify-between gap-3'
            >
              <dt className='text-muted-foreground flex min-w-0 items-center gap-2'>
                <item.icon className='size-3.5 shrink-0' aria-hidden='true' />
                <span className='truncate' title={item.description}>
                  {item.label}
                </span>
              </dt>
              <dd className='text-foreground font-mono font-medium tabular-nums'>
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
