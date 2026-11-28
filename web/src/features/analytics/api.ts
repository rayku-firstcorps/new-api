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
import { api } from '@/lib/api'

import type {
  AnalyticsDevices,
  AnalyticsFeatures,
  AnalyticsHealth,
  AnalyticsOverview,
  AnalyticsPages,
  AnalyticsPurgeResult,
  AnalyticsRangeParams,
  AnalyticsRotateResult,
  AnalyticsTrends,
  ApiResponse,
} from './types'

export const ANALYTICS_QUERY_KEY = ['analytics'] as const

export async function getAnalyticsOverview(p: AnalyticsRangeParams) {
  const res = await api.get<ApiResponse<AnalyticsOverview>>(
    '/api/analytics/overview',
    { params: p }
  )
  return res.data
}

export async function getAnalyticsTrends(
  p: AnalyticsRangeParams & { granularity?: 'hour' | 'day' }
) {
  const res = await api.get<ApiResponse<AnalyticsTrends>>(
    '/api/analytics/trends',
    { params: p }
  )
  return res.data
}

export async function getAnalyticsDevices(p: AnalyticsRangeParams) {
  const res = await api.get<ApiResponse<AnalyticsDevices>>(
    '/api/analytics/devices',
    { params: p }
  )
  return res.data
}

export async function getAnalyticsPages(
  p: AnalyticsRangeParams & { limit?: number }
) {
  const res = await api.get<ApiResponse<AnalyticsPages>>(
    '/api/analytics/pages',
    { params: p }
  )
  return res.data
}

export async function getAnalyticsFeatures(
  p: AnalyticsRangeParams & { limit?: number }
) {
  const res = await api.get<ApiResponse<AnalyticsFeatures>>(
    '/api/analytics/features',
    { params: p }
  )
  return res.data
}

export async function getAnalyticsHealth(p: AnalyticsRangeParams) {
  const res = await api.get<ApiResponse<AnalyticsHealth>>(
    '/api/analytics/health',
    { params: p }
  )
  return res.data
}

export async function rotateAnalyticsSecret() {
  const res = await api.post<ApiResponse<AnalyticsRotateResult>>(
    '/api/analytics/salt/rotate'
  )
  return res.data
}

export async function purgeExpiredAnalytics() {
  const res = await api.delete<ApiResponse<AnalyticsPurgeResult>>(
    '/api/analytics/expired'
  )
  return res.data
}
