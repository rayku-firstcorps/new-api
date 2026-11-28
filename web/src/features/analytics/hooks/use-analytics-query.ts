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
import { useQuery, type UseQueryResult } from '@tanstack/react-query'

import { requireServerSuccess } from '@/lib/server-error-message'

import { ANALYTICS_QUERY_KEY } from '../api'
import type { ApiResponse } from '../types'

const STALE_TIME_MS = 30_000

/**
 * One dashboard query. Failed business responses reject so the panel can show
 * its own error state; the global error toast is turned off for that reason.
 */
export function useAnalyticsQuery<TParams, TData>(
  name: string,
  params: TParams,
  fetcher: (params: TParams) => Promise<ApiResponse<TData>>,
  enabled = true
): UseQueryResult<TData> {
  return useQuery({
    queryKey: [...ANALYTICS_QUERY_KEY, name, params],
    queryFn: async () => requireServerSuccess(await fetcher(params)).data,
    enabled,
    staleTime: STALE_TIME_MS,
    meta: { errorToast: false },
  })
}
