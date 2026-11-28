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
import { useTranslation } from 'react-i18next'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PanelWrapper } from '@/features/dashboard/components/ui/panel-wrapper'
import { formatNumber } from '@/lib/format'

import { getAnalyticsFeatures, getAnalyticsPages } from '../api'
import { useAnalyticsQuery } from '../hooks/use-analytics-query'
import { useIntlLocale } from '../hooks/use-intl-locale'
import { formatDurationMs } from '../lib/format'
import { clientTypeLabel } from '../lib/labels'
import { ANALYTICS_CLIENT_TYPES } from '../lib/search'
import type { AnalyticsRangeParams } from '../types'
import { BarList } from './bar-list'
import { QueryError } from './query-error'

interface BehaviorTabProps {
  params: AnalyticsRangeParams
}

export function BehaviorTab(props: BehaviorTabProps) {
  const { t } = useTranslation()
  const locale = useIntlLocale()
  const pages = useAnalyticsQuery('pages', props.params, getAnalyticsPages)
  const features = useAnalyticsQuery(
    'features',
    props.params,
    getAnalyticsFeatures
  )
  const featureItems = features.data?.items ?? []
  const byClient = features.data?.by_client_type ?? []

  return (
    <div className='flex flex-col gap-4'>
      {pages.isError ? (
        <QueryError query={pages} />
      ) : (
        <PanelWrapper
          title={t('Top pages')}
          description={t('Route templates, ordered by page views')}
          loading={pages.isPending}
          empty={(pages.data?.items.length ?? 0) === 0}
          contentClassName='px-0 sm:px-0 pb-2'
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Route')}</TableHead>
                <TableHead className='text-right'>{t('Page views')}</TableHead>
                <TableHead className='text-right'>{t('Devices')}</TableHead>
                <TableHead className='text-right'>
                  {t('Avg. time on page')}
                </TableHead>
                <TableHead className='text-right'>
                  {t('Avg. active time')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pages.data?.items ?? []).map((item) => (
                <TableRow key={item.route_path}>
                  <TableCell className='max-w-[16rem] truncate font-mono text-xs'>
                    {item.route_path}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {formatNumber(item.pv, locale)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {formatNumber(item.uv, locale)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {formatDurationMs(item.avg_duration_ms, locale)}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {formatDurationMs(item.avg_active_ms, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </PanelWrapper>
      )}

      {features.isError ? (
        <QueryError query={features} />
      ) : (
        <>
          <div className='grid gap-4 md:grid-cols-2'>
            <PanelWrapper
              title={t('Feature usage')}
              loading={features.isPending}
              empty={featureItems.length === 0}
              height='h-24'
            >
              <BarList
                items={featureItems.map((item) => ({
                  key: item.event_name,
                  label: item.event_name,
                  value: item.count,
                  detail: t('{{count}} devices', { count: item.devices }),
                }))}
              />
            </PanelWrapper>
            <PanelWrapper
              title={t('Feature modules')}
              loading={features.isPending}
              empty={(features.data?.modules.length ?? 0) === 0}
              height='h-24'
            >
              <BarList
                items={(features.data?.modules ?? []).map((item) => ({
                  key: item.module,
                  label: item.module,
                  value: item.count,
                }))}
              />
            </PanelWrapper>
          </div>
          <PanelWrapper
            title={t('Feature usage by client type')}
            loading={features.isPending}
            empty={featureItems.length === 0}
            height='h-24'
            contentClassName='px-0 sm:px-0 pb-2'
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Feature')}</TableHead>
                  {ANALYTICS_CLIENT_TYPES.map((type) => (
                    <TableHead key={type} className='text-right'>
                      {clientTypeLabel(t, type)}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {featureItems.map((item) => (
                  <TableRow key={item.event_name}>
                    <TableCell className='font-mono text-xs'>
                      {item.event_name}
                    </TableCell>
                    {ANALYTICS_CLIENT_TYPES.map((type) => {
                      const row = byClient.find(
                        (entry) =>
                          entry.event_name === item.event_name &&
                          entry.client_type === type
                      )
                      return (
                        <TableCell
                          key={type}
                          className='text-right tabular-nums'
                        >
                          {formatNumber(row?.count ?? 0, locale)}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PanelWrapper>
        </>
      )}
    </div>
  )
}
