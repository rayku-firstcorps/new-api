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

import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

export interface BarListItem {
  key: string
  label: string
  value: number
  detail?: string
}

interface BarListProps {
  items: BarListItem[]
  emptyMessage?: string
}

/**
 * Horizontal bar ranking drawn with plain markup. Bars scale to the largest
 * value and the label column truncates, so it never forces horizontal scroll.
 */
export function BarList(props: BarListProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)

  if (props.items.length === 0) {
    return (
      <p className='text-muted-foreground flex h-24 items-center justify-center text-sm'>
        {props.emptyMessage ?? t('No data available')}
      </p>
    )
  }

  const max = Math.max(...props.items.map((item) => item.value), 1)

  return (
    <ul className='flex flex-col gap-2.5'>
      {props.items.map((item) => (
        <li key={item.key} className='grid gap-1'>
          <div className='flex items-baseline justify-between gap-2 text-xs'>
            <span className='min-w-0 truncate font-medium'>{item.label}</span>
            <span className='text-muted-foreground shrink-0 tabular-nums'>
              {formatNumber(item.value, locale)}
              {item.detail != null && ` · ${item.detail}`}
            </span>
          </div>
          <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
            <div
              className='bg-chart-1 h-full rounded-full'
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
