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
import type { AnalyticsRangeParams } from '../types'
import type { AnalyticsSearch } from './search'

const DAY_SECONDS = 86400
const MINUTE_SECONDS = 60

/**
 * Resolve the URL filters into the query window `[start_ts, end_ts)` (Unix
 * seconds). `end_ts` is rounded up to the next minute so query keys stay
 * stable between renders. An unusable custom range falls back to 7 days.
 */
export function resolveAnalyticsRange(
  search: Pick<AnalyticsSearch, 'range' | 'start' | 'end' | 'client'>,
  nowMs: number
): AnalyticsRangeParams {
  const nowSec = Math.floor(nowMs / 1000)
  const now = (Math.floor(nowSec / MINUTE_SECONDS) + 1) * MINUTE_SECONDS
  let start = now - 7 * DAY_SECONDS
  let end = now

  if (search.range === 'today') {
    const midnight = new Date(nowMs)
    midnight.setHours(0, 0, 0, 0)
    start = Math.floor(midnight.getTime() / 1000)
  } else if (search.range === '30d') {
    start = now - 30 * DAY_SECONDS
  } else if (
    search.range === 'custom' &&
    typeof search.start === 'number' &&
    typeof search.end === 'number' &&
    search.start >= 0 &&
    search.end > search.start
  ) {
    start = Math.floor(search.start)
    end = Math.floor(search.end)
  }

  const params: AnalyticsRangeParams = { start_ts: start, end_ts: end }
  if (search.client !== 'all') params.client_type = search.client
  return params
}

/** Hourly buckets only for short windows; the backend caps them at 14 days. */
export function pickGranularity(params: AnalyticsRangeParams): 'hour' | 'day' {
  return params.end_ts - params.start_ts <= 2 * DAY_SECONDS ? 'hour' : 'day'
}
