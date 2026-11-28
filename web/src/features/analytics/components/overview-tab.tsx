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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { KpiTile } from '@/features/dashboard/components/ui/kpi-tile'
import { PanelWrapper } from '@/features/dashboard/components/ui/panel-wrapper'
import { formatNumber } from '@/lib/format'

import { getAnalyticsOverview, getAnalyticsTrends } from '../api'
import { useAnalyticsQuery } from '../hooks/use-analytics-query'
import { useIntlLocale } from '../hooks/use-intl-locale'
import { buildHourlySpec, buildTrendSpec } from '../lib/chart-specs'
import { formatDurationMs, formatRatio } from '../lib/format'
import { pickGranularity } from '../lib/range'
import type { AnalyticsRangeParams } from '../types'
import { AnalyticsChart } from './analytics-chart'
import { QueryError } from './query-error'

interface OverviewTabProps {
  params: AnalyticsRangeParams
}

export function OverviewTab(props: OverviewTabProps) {
  const { t } = useTranslation()
  const locale = useIntlLocale()
  const overview = useAnalyticsQuery(
    'overview',
    props.params,
    getAnalyticsOverview
  )
  const trendParams = useMemo(
    () => ({ ...props.params, granularity: pickGranularity(props.params) }),
    [props.params]
  )
  const trends = useAnalyticsQuery('trends', trendParams, getAnalyticsTrends)

  const labels = useMemo(
    () => ({
      pv: t('Page views'),
      deviceUv: t('Devices'),
      p95: t('P95'),
    }),
    [t]
  )
  const trendSpec = useMemo(
    () =>
      trends.data ? buildTrendSpec(trends.data, labels, locale) : undefined,
    [trends.data, labels, locale]
  )
  const hourlySpec = useMemo(
    () =>
      trends.data
        ? buildHourlySpec(trends.data.hourly_distribution, labels)
        : undefined,
    [trends.data, labels]
  )
  const trendEmpty = !trends.data || trends.data.series.every((p) => p.pv === 0)
  const hourlyEmpty =
    !trends.data || trends.data.hourly_distribution.every((p) => p.pv === 0)
  const kpi = overview.data

  return (
    <div className='flex flex-col gap-4'>
      {overview.isError ? (
        <QueryError query={overview} />
      ) : (
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-3'>
          <KpiTile
            label={t('Page views')}
            loading={overview.isPending}
            value={formatNumber(kpi?.pv, locale)}
          />
          <KpiTile
            label={t('Devices (UV)')}
            loading={overview.isPending}
            value={formatNumber(kpi?.device_uv, locale)}
            detail={t('Distinct devices, including anonymous visitors')}
          />
          <KpiTile
            label={t('Signed-in users')}
            loading={overview.isPending}
            value={formatNumber(kpi?.actor_uv, locale)}
            detail={t('Distinct anonymized accounts')}
          />
          <KpiTile
            label={t('Multi-device users')}
            loading={overview.isPending}
            value={formatRatio(kpi?.multi_device_ratio, locale)}
            detail={t('{{count}} users with 2+ devices', {
              count: kpi?.multi_device_actor_uv ?? 0,
            })}
          />
          <KpiTile
            label={t('Avg. time on page')}
            loading={overview.isPending}
            value={formatDurationMs(kpi?.avg_duration_ms, locale)}
            detail={t('Active: {{value}}', {
              value: formatDurationMs(kpi?.avg_active_ms, locale),
            })}
          />
          <KpiTile
            label={t('API errors')}
            loading={overview.isPending}
            value={formatNumber(kpi?.api_error_count, locale)}
            detail={t('{{value}} per page view', {
              value: formatNumber(kpi?.api_errors_per_pv, locale),
            })}
          />
        </div>
      )}

      {trends.isError ? (
        <QueryError query={trends} />
      ) : (
        <>
          <PanelWrapper
            title={t('Page views and devices')}
            loading={trends.isPending}
            empty={trendEmpty}
          >
            {trendSpec && <AnalyticsChart spec={trendSpec} />}
          </PanelWrapper>
          <PanelWrapper
            title={t('Active hours')}
            description={t('Hour of day in each visitor local time')}
            loading={trends.isPending}
            empty={hourlyEmpty}
          >
            {hourlySpec && <AnalyticsChart spec={hourlySpec} />}
          </PanelWrapper>
        </>
      )}
    </div>
  )
}
