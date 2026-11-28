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
import type { ISpec } from '@visactor/vchart'

import type {
  AnalyticsHealth,
  AnalyticsTrends,
  AnalyticsVitalName,
} from '../types'

export interface ChartLabels {
  pv: string
  deviceUv: string
  p95: string
}

const BASE = {
  background: 'transparent',
  animation: false,
  legends: { visible: true, orient: 'bottom' },
} as const

/** Locale-formatted x-axis label for one UTC bucket start. */
export function formatBucketLabel(
  ts: number,
  granularity: 'hour' | 'day',
  locale?: Intl.LocalesArgument
): string {
  const options: Intl.DateTimeFormatOptions =
    granularity === 'hour'
      ? { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { month: 'numeric', day: 'numeric' }
  return new Intl.DateTimeFormat(locale, options).format(new Date(ts * 1000))
}

export function buildTrendSpec(
  trends: AnalyticsTrends,
  labels: ChartLabels,
  locale?: Intl.LocalesArgument
): ISpec {
  const values = trends.series.flatMap((point) => {
    const time = formatBucketLabel(point.ts, trends.granularity, locale)
    return [
      { time, type: labels.pv, value: point.pv },
      { time, type: labels.deviceUv, value: point.device_uv },
    ]
  })
  return {
    ...BASE,
    type: 'line',
    data: [{ id: 'trend', values }],
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
    point: { visible: values.length <= 60 },
  } as ISpec
}

export function buildHourlySpec(
  hours: AnalyticsTrends['hourly_distribution'],
  labels: ChartLabels
): ISpec {
  const values = hours.map((item) => ({
    hour: String(item.hour).padStart(2, '0'),
    type: labels.pv,
    value: item.pv,
  }))
  return {
    ...BASE,
    type: 'bar',
    legends: { visible: false },
    data: [{ id: 'hourly', values }],
    xField: 'hour',
    yField: 'value',
    seriesField: 'type',
  } as ISpec
}

export function buildDonutSpec(
  items: { type: string; value: number }[]
): ISpec {
  return {
    ...BASE,
    type: 'pie',
    data: [{ id: 'donut', values: items }],
    categoryField: 'type',
    valueField: 'value',
    innerRadius: 0.62,
    outerRadius: 0.9,
    padAngle: 0.5,
    label: { visible: false },
  } as ISpec
}

export function buildVitalTrendSpec(
  trend: AnalyticsHealth['vital_trend'],
  nameLabel: (name: AnalyticsVitalName) => string,
  locale?: Intl.LocalesArgument
): ISpec {
  const values = trend.map((point) => ({
    time: formatBucketLabel(point.ts, 'day', locale),
    type: nameLabel(point.name),
    value: point.p95_ms,
  }))
  return {
    ...BASE,
    type: 'line',
    data: [{ id: 'vital-trend', values }],
    xField: 'time',
    yField: 'value',
    seriesField: 'type',
  } as ISpec
}
