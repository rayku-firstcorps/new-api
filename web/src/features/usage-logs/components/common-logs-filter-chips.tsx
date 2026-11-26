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
import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { LOG_TYPE_ALL_VALUE, LOG_TYPE_FILTERS } from '../constants'
import { ActiveFilterChips, type ActiveFilterChip } from './active-filter-chips'
import { useLogsViewScope, useUsageLogsContext } from './usage-logs-provider'

const route = getRouteApi('/_authenticated/usage-logs/$section')

const MASKED_VALUE = '••••'

type ChipKey =
  | 'model'
  | 'group'
  | 'token'
  | 'username'
  | 'channel'
  | 'requestId'
  | 'upstreamRequestId'

/**
 * Chips for the filters currently applied through the URL. Removing a chip
 * drops that search param and returns to page 1, exactly like Search does.
 */
export function CommonLogsFilterChips() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const searchParams = route.useSearch()
  const { isAdminView: isAdmin } = useLogsViewScope()
  const { sensitiveVisible } = useUsageLogsContext()

  const refresh = (search: Record<string, unknown>) => {
    void navigate({
      to: '/usage-logs/$section',
      params: { section: 'common' },
      search: { ...searchParams, ...search, page: 1 },
    })
    void queryClient.invalidateQueries({ queryKey: ['logs'] })
    void queryClient.invalidateQueries({ queryKey: ['usage-logs-stats'] })
  }

  const textFields: {
    key: ChipKey
    label: string
    sensitive?: boolean
    adminOnly?: boolean
  }[] = [
    { key: 'model', label: t('Model Name') },
    { key: 'group', label: t('Group'), sensitive: true },
    { key: 'token', label: t('Token Name'), sensitive: true },
    { key: 'username', label: t('Username'), sensitive: true, adminOnly: true },
    { key: 'channel', label: t('Channel ID'), adminOnly: true },
    { key: 'requestId', label: t('Request ID') },
    { key: 'upstreamRequestId', label: t('Upstream Request ID') },
  ]

  const chips: ActiveFilterChip[] = []
  const typeValues = (searchParams.type ?? []).filter(
    (value) => value !== LOG_TYPE_ALL_VALUE
  )
  if (typeValues.length > 0) {
    const labels = typeValues.map((value) => {
      const match = LOG_TYPE_FILTERS.find((type) => type.value === value)
      return match ? t(match.label) : value
    })
    chips.push({
      key: 'type',
      label: t('Type'),
      value: labels.join(', '),
      onRemove: () => refresh({ type: [LOG_TYPE_ALL_VALUE] }),
    })
  }
  for (const field of textFields) {
    const value = searchParams[field.key]
    if (!value || (field.adminOnly && !isAdmin)) continue
    chips.push({
      key: field.key,
      label: field.label,
      value: field.sensitive && !sensitiveVisible ? MASKED_VALUE : value,
      onRemove: () => refresh({ [field.key]: undefined }),
    })
  }

  const clearAll = () =>
    refresh({
      type: [LOG_TYPE_ALL_VALUE],
      ...Object.fromEntries(textFields.map((field) => [field.key, undefined])),
    })

  return <ActiveFilterChips chips={chips} onClearAll={clearAll} />
}
