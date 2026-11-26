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
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export type ActiveFilterChip = {
  key: string
  label: string
  value: string
  onRemove: () => void
}

/**
 * Removable chips that mirror the filters currently applied to the list.
 * Presentational only: removing a chip calls back into the owner's filter state.
 */
export function ActiveFilterChips(props: {
  chips: ActiveFilterChip[]
  onClearAll: () => void
}) {
  const { t } = useTranslation()
  if (props.chips.length === 0) return null

  return (
    <ul
      aria-label={t('Filter')}
      className='border-border mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2'
    >
      {props.chips.map((chip) => (
        <li key={chip.key}>
          <span className='border-border bg-secondary text-secondary-foreground inline-flex h-6 max-w-64 items-center gap-1 rounded-full border ps-2.5 pe-0.5 text-xs'>
            <span className='text-muted-foreground shrink-0'>{chip.label}</span>
            <span className='truncate font-medium'>{chip.value}</span>
            <button
              type='button'
              onClick={chip.onRemove}
              aria-label={`${t('Remove')} ${chip.label}`}
              className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex size-5 shrink-0 items-center justify-center rounded-full focus-visible:ring-[3px] focus-visible:outline-none'
            >
              <X className='size-3' aria-hidden='true' />
            </button>
          </span>
        </li>
      ))}
      {props.chips.length > 1 && (
        <li>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='text-muted-foreground h-6 px-2 text-xs'
            onClick={props.onClearAll}
          >
            {t('Clear')}
          </Button>
        </li>
      )}
    </ul>
  )
}
