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
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { KpiTile } from '@/features/dashboard/components/ui/kpi-tile'
import { PanelWrapper } from '@/features/dashboard/components/ui/panel-wrapper'
import { formatNumber } from '@/lib/format'

import { getAnalyticsHealth } from '../api'
import { useAnalyticsQuery } from '../hooks/use-analytics-query'
import { useIntlLocale } from '../hooks/use-intl-locale'
import { buildVitalTrendSpec } from '../lib/chart-specs'
import { formatDurationMs } from '../lib/format'
import { eventNameLabel } from '../lib/labels'
import type { AnalyticsRangeParams, AnalyticsVitalName } from '../types'
import { AnalyticsChart } from './analytics-chart'
import { BarList } from './bar-list'
import { QueryError } from './query-error'

interface HealthTabProps {
  params: AnalyticsRangeParams
}

export function HealthTab(props: HealthTabProps) {
  const { t } = useTranslation()
  const locale = useIntlLocale()
  const query = useAnalyticsQuery('health', props.params, getAnalyticsHealth)
  const data = query.data

  const vitalLabel = useCallback(
    (name: AnalyticsVitalName) => eventNameLabel(t, name),
    [t]
  )
  const trendSpec = useMemo(
    () =>
      data ? buildVitalTrendSpec(data.vital_trend, vitalLabel, locale) : null,
    [data, vitalLabel, locale]
  )

  if (query.isError) return <QueryError query={query} />

  return (
    <div className='flex flex-col gap-4'>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        {(data?.vitals ?? [null, null, null, null]).map((vital, index) => (
          <KpiTile
            key={vital?.name ?? index}
            label={vital ? vitalLabel(vital.name) : ''}
            loading={query.isPending}
            value={`P50 ${formatDurationMs(vital?.p50_ms, locale)}`}
            detail={`P95 ${formatDurationMs(vital?.p95_ms, locale)} · ${t(
              '{{count}} samples',
              { count: vital?.count ?? 0 }
            )}`}
          />
        ))}
      </div>

      <PanelWrapper
        title={t('P95 trend')}
        description={t('Daily 95th percentile of each metric')}
        loading={query.isPending}
        empty={(data?.vital_trend.length ?? 0) === 0}
        emptyMessage={t('No trend data for this range')}
      >
        {trendSpec && <AnalyticsChart spec={trendSpec} />}
      </PanelWrapper>

      <PanelWrapper
        title={t('Failing API routes')}
        description={t('{{count}} failed requests in total', {
          count: data?.api_error_total ?? 0,
        })}
        loading={query.isPending}
        empty={(data?.api_errors.length ?? 0) === 0}
        height='h-24'
        contentClassName='px-0 sm:px-0 pb-2'
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Route')}</TableHead>
              <TableHead className='text-right'>{t('Status')}</TableHead>
              <TableHead className='text-right'>{t('Failures')}</TableHead>
              <TableHead className='text-right'>{t('Avg. duration')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.api_errors ?? []).map((item) => (
              <TableRow key={`${item.api_route}:${item.status_code}`}>
                <TableCell className='max-w-[16rem] truncate font-mono text-xs'>
                  {item.api_route}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {item.status_code === 0 ? '-' : item.status_code}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {formatNumber(item.count, locale)}
                </TableCell>
                <TableCell className='text-right tabular-nums'>
                  {formatDurationMs(item.avg_duration_ms, locale)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PanelWrapper>

      <PanelWrapper
        title={t('Frontend errors')}
        description={t('{{count}} errors in total', {
          count: data?.client_error_total ?? 0,
        })}
        loading={query.isPending}
        empty={(data?.client_errors.length ?? 0) === 0}
        height='h-24'
      >
        <BarList
          items={(data?.client_errors ?? []).map((item) => ({
            key: item.error_name,
            label: item.error_name === '' ? t('Unknown') : item.error_name,
            value: item.count,
          }))}
        />
      </PanelWrapper>
    </div>
  )
}
