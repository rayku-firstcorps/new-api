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
import { useMemo } from 'react'

import { useThemeColor } from '@/lib/theme-color'

/**
 * Resolved chart colors for canvas charts (VChart cannot read CSS variables):
 * the eight `--chart-*` tokens plus the axis label and grid colors. Values
 * follow the active light/dark theme.
 */
export function useChartPalette() {
  const resolved = [
    useThemeColor('--chart-1'),
    useThemeColor('--chart-2'),
    useThemeColor('--chart-3'),
    useThemeColor('--chart-4'),
    useThemeColor('--chart-5'),
    useThemeColor('--chart-6'),
    useThemeColor('--chart-7'),
    useThemeColor('--chart-8'),
  ]
    .filter((color): color is string => Boolean(color))
    .join('|')
  // Stable identity so memoized chart specs only rebuild when a color changes.
  const series = useMemo(
    () => (resolved ? resolved.split('|') : []),
    [resolved]
  )

  return {
    series,
    textColor: useThemeColor('--muted-foreground'),
    gridColor: useThemeColor('--border'),
    neutralColor: useThemeColor('--neutral'),
  }
}
