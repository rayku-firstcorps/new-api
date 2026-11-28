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
export type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

export type AnalyticsClientType =
  | 'web_desktop'
  | 'web_mobile'
  | 'web_tablet'
  | 'electron_desktop'

export interface AnalyticsRangeParams {
  start_ts: number
  end_ts: number
  client_type?: AnalyticsClientType
}

// GET /api/analytics/overview
export interface AnalyticsOverview {
  pv: number
  device_uv: number
  actor_uv: number
  multi_device_actor_uv: number
  multi_device_ratio: number
  avg_duration_ms: number
  avg_active_ms: number
  api_error_count: number
  api_errors_per_pv: number
}

// GET /api/analytics/trends
export interface AnalyticsTrends {
  granularity: 'hour' | 'day'
  series: { ts: number; pv: number; device_uv: number }[]
  hourly_distribution: { hour: number; pv: number }[]
}

// GET /api/analytics/devices
export interface AnalyticsDimensionItem {
  key: string
  devices: number
  pv: number
}

export interface AnalyticsDevices {
  client_types: AnalyticsDimensionItem[]
  os_families: AnalyticsDimensionItem[]
  browsers: AnalyticsDimensionItem[]
  viewports: AnalyticsDimensionItem[]
  langs: AnalyticsDimensionItem[]
  themes: AnalyticsDimensionItem[]
  cross_device: {
    actors_total: number
    actors_multi_device: number
    actors_multi_client: number
    combos: { combo: string; actors: number }[]
  }
}

// GET /api/analytics/pages
export interface AnalyticsPages {
  items: {
    route_path: string
    pv: number
    uv: number
    avg_duration_ms: number
    avg_active_ms: number
  }[]
}

// GET /api/analytics/features
export interface AnalyticsFeatures {
  items: { event_name: string; count: number; devices: number }[]
  modules: { module: string; count: number }[]
  by_client_type: { event_name: string; client_type: string; count: number }[]
}

// GET /api/analytics/health
export type AnalyticsVitalName =
  | 'vital.fcp'
  | 'vital.lcp'
  | 'vital.ttfb'
  | 'vital.route_change'

export interface AnalyticsHealth {
  vitals: {
    name: AnalyticsVitalName
    count: number
    avg_ms: number
    p50_ms: number
    p95_ms: number
  }[]
  vital_trend: {
    ts: number
    name: AnalyticsVitalName
    count: number
    p50_ms: number
    p95_ms: number
  }[]
  api_errors: {
    api_route: string
    status_code: number
    count: number
    avg_duration_ms: number
  }[]
  api_error_total: number
  client_errors: { error_name: string; count: number }[]
  client_error_total: number
}

// POST /api/analytics/salt/rotate (Root)
export interface AnalyticsRotateResult {
  rotated_at: number
}

// DELETE /api/analytics/expired (Root)
export interface AnalyticsPurgeResult {
  deleted: number
  handled_by_ttl: boolean
}
