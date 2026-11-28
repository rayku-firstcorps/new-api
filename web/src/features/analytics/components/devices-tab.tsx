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

import { getAnalyticsDevices } from '../api'
import { useAnalyticsQuery } from '../hooks/use-analytics-query'
import { useIntlLocale } from '../hooks/use-intl-locale'
import { buildDonutSpec } from '../lib/chart-specs'
import { formatRatio } from '../lib/format'
import {
  clientComboLabel,
  clientTypeLabel,
  deviceDimensionLabel,
  type DeviceDimension,
} from '../lib/labels'
import type { AnalyticsDimensionItem, AnalyticsRangeParams } from '../types'
import { AnalyticsChart } from './analytics-chart'
import { BarList } from './bar-list'
import { QueryError } from './query-error'

interface DevicesTabProps {
  params: AnalyticsRangeParams
}

function ratio(part: number, total: number): number {
  return total > 0 ? part / total : 0
}

export function DevicesTab(props: DevicesTabProps) {
  const { t } = useTranslation()
  const locale = useIntlLocale()
  const query = useAnalyticsQuery('devices', props.params, getAnalyticsDevices)
  const data = query.data

  const donutSpec = useMemo(
    () =>
      buildDonutSpec(
        (data?.client_types ?? []).map((item) => ({
          type: clientTypeLabel(t, item.key),
          value: item.devices,
        }))
      ),
    [data?.client_types, t]
  )

  if (query.isError) return <QueryError query={query} />

  const cross = data?.cross_device
  const total = cross?.actors_total ?? 0
  const dimensions: {
    dimension: DeviceDimension
    title: string
    items: AnalyticsDimensionItem[]
  }[] = [
    {
      dimension: 'os_family',
      title: t('Operating system'),
      items: data?.os_families ?? [],
    },
    {
      dimension: 'browser_family',
      title: t('Browser'),
      items: data?.browsers ?? [],
    },
    {
      dimension: 'viewport',
      title: t('Viewport'),
      items: data?.viewports ?? [],
    },
    { dimension: 'lang', title: t('Language'), items: data?.langs ?? [] },
    { dimension: 'theme', title: t('Theme'), items: data?.themes ?? [] },
  ]

  return (
    <div className='flex flex-col gap-4'>
      <PanelWrapper
        title={t('Client type')}
        description={t('Devices by client type')}
        loading={query.isPending}
        empty={(data?.client_types.length ?? 0) === 0}
      >
        <div className='grid items-center gap-4 md:grid-cols-2'>
          <AnalyticsChart spec={donutSpec} />
          <BarList
            items={(data?.client_types ?? []).map((item) => ({
              key: item.key,
              label: clientTypeLabel(t, item.key),
              value: item.devices,
            }))}
          />
        </div>
      </PanelWrapper>

      <div className='grid gap-4 md:grid-cols-2'>
        {dimensions.map((dimension) => (
          <PanelWrapper
            key={dimension.dimension}
            title={dimension.title}
            loading={query.isPending}
            empty={dimension.items.length === 0}
            height='h-24'
          >
            <BarList
              items={dimension.items.map((item) => ({
                key: item.key,
                label: deviceDimensionLabel(t, dimension.dimension, item.key),
                value: item.devices,
              }))}
            />
          </PanelWrapper>
        ))}
      </div>

      <PanelWrapper
        title={t('Cross-device usage')}
        description={t('Signed-in users seen on more than one device')}
        loading={query.isPending}
        empty={total === 0}
        height='h-24'
      >
        <div className='grid gap-4'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <KpiTile
              label={t('Signed-in users')}
              value={formatNumber(total, locale)}
            />
            <KpiTile
              label={t('Multi-device users')}
              value={formatRatio(
                ratio(cross?.actors_multi_device ?? 0, total),
                locale
              )}
              detail={formatNumber(cross?.actors_multi_device, locale)}
            />
            <KpiTile
              label={t('Multi-client users')}
              value={formatRatio(
                ratio(cross?.actors_multi_client ?? 0, total),
                locale
              )}
              detail={formatNumber(cross?.actors_multi_client, locale)}
            />
          </div>
          <BarList
            items={(cross?.combos ?? []).map((item) => ({
              key: item.combo,
              label: clientComboLabel(t, item.combo),
              value: item.actors,
              detail: formatRatio(ratio(item.actors, total), locale),
            }))}
          />
        </div>
      </PanelWrapper>
    </div>
  )
}
