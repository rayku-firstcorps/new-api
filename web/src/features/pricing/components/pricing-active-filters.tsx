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

import {
  ENDPOINT_TYPES,
  FILTER_ALL,
  QUOTA_TYPES,
  getEndpointTypeLabels,
  getQuotaTypeLabels,
} from '../constants'

export interface PricingActiveFiltersProps {
  searchQuery: string
  quotaTypeFilter: string
  endpointTypeFilter: string
  vendorFilter: string
  groupFilter: string
  tagFilter: string
  onClearSearch: () => void
  onQuotaTypeChange: (value: string) => void
  onEndpointTypeChange: (value: string) => void
  onVendorChange: (value: string) => void
  onGroupChange: (value: string) => void
  onTagChange: (value: string) => void
  onClearAll: () => void
}

type FilterChip = {
  id: string
  label: string
  onRemove: () => void
}

/**
 * Removable chips for the active search and filters, plus "Clear all".
 * Removing a chip resets the same filter the sidebar controls.
 */
export function PricingActiveFilters(props: PricingActiveFiltersProps) {
  const { t } = useTranslation()
  const quotaTypeLabels = getQuotaTypeLabels(t)
  const endpointTypeLabels = getEndpointTypeLabels(t)
  const searchQuery = props.searchQuery.trim()

  const chips: FilterChip[] = []
  if (searchQuery) {
    chips.push({
      id: 'search',
      label: t('Search: {{query}}', { query: searchQuery }),
      onRemove: props.onClearSearch,
    })
  }
  if (props.groupFilter !== FILTER_ALL) {
    chips.push({
      id: 'group',
      label: `${t('Groups')}: ${props.groupFilter}`,
      onRemove: () => props.onGroupChange(FILTER_ALL),
    })
  }
  if (props.vendorFilter !== FILTER_ALL) {
    chips.push({
      id: 'vendor',
      label: props.vendorFilter,
      onRemove: () => props.onVendorChange(FILTER_ALL),
    })
  }
  if (props.tagFilter !== FILTER_ALL) {
    chips.push({
      id: 'tag',
      label: props.tagFilter,
      onRemove: () => props.onTagChange(FILTER_ALL),
    })
  }
  if (props.quotaTypeFilter !== QUOTA_TYPES.ALL) {
    chips.push({
      id: 'quota',
      label:
        quotaTypeLabels[
          props.quotaTypeFilter as keyof typeof quotaTypeLabels
        ] ?? props.quotaTypeFilter,
      onRemove: () => props.onQuotaTypeChange(QUOTA_TYPES.ALL),
    })
  }
  if (props.endpointTypeFilter !== ENDPOINT_TYPES.ALL) {
    chips.push({
      id: 'endpoint',
      label:
        endpointTypeLabels[
          props.endpointTypeFilter as keyof typeof endpointTypeLabels
        ] ?? props.endpointTypeFilter,
      onRemove: () => props.onEndpointTypeChange(ENDPOINT_TYPES.ALL),
    })
  }

  if (chips.length === 0) return null

  return (
    <div
      role='group'
      aria-label={t('Active filters')}
      className='flex flex-wrap items-center gap-2'
    >
      {chips.map((chip) => (
        <span
          key={chip.id}
          className='bg-card text-foreground hover:border-foreground/25 inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border pr-1 pl-3 text-xs transition-colors'
        >
          <span className='truncate'>{chip.label}</span>
          <button
            type='button'
            aria-label={t('Remove filter: {{label}}', { label: chip.label })}
            onClick={chip.onRemove}
            className='text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2'
          >
            <X aria-hidden className='size-3' />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          type='button'
          onClick={props.onClearAll}
          className='text-muted-foreground hover:text-foreground focus-visible:ring-ring ml-1 rounded-sm px-1 text-xs underline-offset-4 transition-colors outline-none hover:underline focus-visible:ring-2'
        >
          {t('Clear all filters')}
        </button>
      )}
    </div>
  )
}
