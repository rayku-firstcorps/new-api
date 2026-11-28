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
import { z } from 'zod'

import type { AnalyticsClientType } from '../types'

export const ANALYTICS_RANGES = ['today', '7d', '30d', 'custom'] as const
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number]

export const ANALYTICS_TABS = [
  'overview',
  'devices',
  'behavior',
  'health',
] as const
export type AnalyticsTab = (typeof ANALYTICS_TABS)[number]

export const ANALYTICS_CLIENT_TYPES: AnalyticsClientType[] = [
  'web_desktop',
  'web_mobile',
  'web_tablet',
  'electron_desktop',
]

export type AnalyticsClientFilter = 'all' | AnalyticsClientType

export const analyticsSearchSchema = z.object({
  range: z.enum(ANALYTICS_RANGES).catch('7d'),
  start: z.number().optional().catch(undefined),
  end: z.number().optional().catch(undefined),
  client: z.enum(['all', ...ANALYTICS_CLIENT_TYPES]).catch('all'),
  tab: z.enum(ANALYTICS_TABS).catch('overview'),
})

export type AnalyticsSearch = z.infer<typeof analyticsSearchSchema>

export const DEFAULT_ANALYTICS_SEARCH: AnalyticsSearch = {
  range: '7d',
  client: 'all',
  tab: 'overview',
}
