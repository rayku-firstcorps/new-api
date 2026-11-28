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
import { VChart } from '@visactor/react-vchart'
import type { ISpec } from '@visactor/vchart'

import { useChartTheme } from '@/lib/use-chart-theme'
import { cn } from '@/lib/utils'
import { VCHART_OPTION } from '@/lib/vchart'

interface AnalyticsChartProps {
  spec: ISpec
  className?: string
}

/**
 * VChart wrapper that follows the app theme tokens. Rendering waits until the
 * theme is registered so the first paint already uses the right colors.
 */
export function AnalyticsChart(props: AnalyticsChartProps) {
  const { resolvedTheme, themeReady } = useChartTheme()

  return (
    <div className={cn('h-64 w-full min-w-0 overflow-hidden', props.className)}>
      {themeReady && (
        <VChart
          key={resolvedTheme}
          spec={{
            ...props.spec,
            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          }}
          option={VCHART_OPTION}
        />
      )}
    </div>
  )
}
