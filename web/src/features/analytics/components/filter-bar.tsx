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

import { DateTimePicker } from '@/components/datetime-picker'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { clientTypeLabel } from '../lib/labels'
import { resolveAnalyticsRange } from '../lib/range'
import {
  ANALYTICS_CLIENT_TYPES,
  ANALYTICS_RANGES,
  type AnalyticsClientFilter,
  type AnalyticsRange,
  type AnalyticsSearch,
} from '../lib/search'

interface FilterBarProps {
  search: AnalyticsSearch
  onChange: (patch: Partial<AnalyticsSearch>) => void
}

const CLIENT_FILTERS: AnalyticsClientFilter[] = [
  'all',
  ...ANALYTICS_CLIENT_TYPES,
]

/** Global range and client-type filters; the state lives in the URL search. */
export function FilterBar(props: FilterBarProps) {
  const { t } = useTranslation()

  const rangeLabel = (range: AnalyticsRange): string => {
    switch (range) {
      case 'today':
        return t('Today')
      case '7d':
        return t('Last 7 days')
      case '30d':
        return t('Last 30 days')
      default:
        return t('Custom')
    }
  }

  const handleRangeChange = (range: AnalyticsRange) => {
    if (range !== 'custom') {
      props.onChange({ range, start: undefined, end: undefined })
      return
    }
    // Seed the custom window with the range that is currently on screen.
    const current = resolveAnalyticsRange(props.search, Date.now())
    props.onChange({
      range,
      start: current.start_ts,
      end: current.end_ts,
    })
  }

  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <Tabs
          value={props.search.range}
          onValueChange={(value) => handleRangeChange(value as AnalyticsRange)}
        >
          <TabsList aria-label={t('Time range')}>
            {ANALYTICS_RANGES.map((range) => (
              <TabsTrigger key={range} value={range} className='px-3'>
                {rangeLabel(range)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className='max-w-full overflow-x-auto'>
          <Tabs
            value={props.search.client}
            onValueChange={(value) =>
              props.onChange({ client: value as AnalyticsClientFilter })
            }
          >
            <TabsList aria-label={t('Client type')}>
              {CLIENT_FILTERS.map((client) => (
                <TabsTrigger key={client} value={client} className='px-3'>
                  {client === 'all' ? t('All') : clientTypeLabel(t, client)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {props.search.range === 'custom' && (
        <div className='flex flex-wrap items-center gap-2'>
          <DateTimePicker
            className='w-full sm:w-56'
            placeholder={t('Start time')}
            value={
              props.search.start == null
                ? undefined
                : new Date(props.search.start * 1000)
            }
            onChange={(date) =>
              props.onChange({
                start: date ? Math.floor(date.getTime() / 1000) : undefined,
              })
            }
          />
          <DateTimePicker
            className='w-full sm:w-56'
            placeholder={t('End time')}
            value={
              props.search.end == null
                ? undefined
                : new Date(props.search.end * 1000)
            }
            onChange={(date) =>
              props.onChange({
                end: date ? Math.floor(date.getTime() / 1000) : undefined,
              })
            }
          />
        </div>
      )}
    </div>
  )
}
