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
import type { RangeBucket } from './whitelist'

const DAY_MS = 86_400_000

/** Buckets a selected time span; the actual timestamps never leave the browser. */
export function rangeBucketOf(
  start: Date | number | undefined,
  end: Date | number | undefined
): RangeBucket {
  if (start === undefined || end === undefined) return 'custom'
  const spanMs = Number(end) - Number(start)
  if (!Number.isFinite(spanMs) || spanMs <= 0) return 'custom'
  if (spanMs <= DAY_MS) return '24h'
  if (spanMs <= 7 * DAY_MS) return '7d'
  if (spanMs <= 30 * DAY_MS) return '30d'
  return 'custom'
}
