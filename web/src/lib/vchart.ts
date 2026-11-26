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
export const VCHART_OPTION = {
  // 与老前端保持一致（浏览器环境渲染优化）
  mode: 'desktop-browser',
} as const

type VChartThemeManager = (typeof import('@visactor/vchart'))['ThemeManager']
type ChartMode = 'light' | 'dark'

// VChart palette key -> design token. Tokens are read per mode (see
// readChartTokens), so a chart follows the KuCode tokens in both themes.
const CHART_PALETTE_TOKENS = {
  backgroundColor: '--card',
  borderColor: '--border',
  hoverBackgroundColor: '--muted',
  sliderRailColor: '--muted',
  sliderHandleColor: '--card',
  sliderTrackColor: '--primary',
  popupBackgroundColor: '--popover',
  primaryFontColor: '--foreground',
  secondaryFontColor: '--muted-foreground',
  tertiaryFontColor: '--muted-foreground',
  axisLabelFontColor: '--muted-foreground',
  axisMarkerFontColor: '--background',
  axisGridColor: '--border',
  axisDomainColor: '--input',
  dataZoomHandleStrokeColor: '--muted-foreground',
  dataZoomChartColor: '--input',
  playerControllerColor: '--primary',
  scrollBarSliderColor: '--input',
  axisMarkerBackgroundColor: '--foreground',
  markLabelBackgroundColor: '--muted',
  markLineStrokeColor: '--muted-foreground',
  dangerColor: '--destructive',
  warningColor: '--warning',
  successColor: '--success',
  infoColor: '--info',
  emptyCircleColor: '--input',
  linearProgressTrackColor: '--muted',
} as const

const CHART_DATA_SCHEME_TOKENS = [
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--chart-6',
  '--chart-7',
  '--chart-8',
] as const

/**
 * Resolve the chart tokens for one theme. A hidden probe carrying the `light`
 * or `dark` class resolves that palette whichever theme the page is showing.
 */
function readChartTokens(mode: ChartMode): {
  palette: Record<string, string>
  dataScheme: string[]
  fontFamily: string
} | null {
  if (typeof document === 'undefined') return null

  const probe = document.createElement('div')
  probe.className = mode
  probe.style.display = 'none'
  document.documentElement.appendChild(probe)

  const read = (token: string): string => {
    probe.style.color = ''
    probe.style.color = `var(${token})`
    return getComputedStyle(probe).color
  }

  const palette: Record<string, string> = {}
  for (const [key, token] of Object.entries(CHART_PALETTE_TOKENS)) {
    const value = read(token)
    if (value) palette[key] = value
  }
  const dataScheme = CHART_DATA_SCHEME_TOKENS.map(read).filter(Boolean)
  const fontFamily = getComputedStyle(document.body).fontFamily
  probe.remove()

  if (!palette.primaryFontColor || dataScheme.length === 0) return null
  return { palette, dataScheme, fontFamily }
}

let registeredThemeManager: VChartThemeManager | null = null

/**
 * Register the KuCode `light` and `dark` VChart themes. They replace the
 * built-in palettes under the same names, so `ThemeManager.setCurrentTheme`
 * callers need no change. Safe to call repeatedly.
 */
export function registerChartThemes(themeManager: VChartThemeManager): void {
  if (registeredThemeManager === themeManager) return
  if (typeof themeManager?.registerTheme !== 'function') return

  const modes: ChartMode[] = ['light', 'dark']
  const tokens = modes.map((mode) => readChartTokens(mode))
  if (tokens.some((entry) => entry === null)) return

  modes.forEach((mode, index) => {
    const entry = tokens[index]
    if (!entry) return
    themeManager.registerTheme(mode, {
      type: mode,
      fontFamily: entry.fontFamily,
      colorScheme: {
        default: { dataScheme: entry.dataScheme, palette: entry.palette },
      },
    })
  })
  registeredThemeManager = themeManager
}

// Several charts load VChart themselves and call `setCurrentTheme` directly.
// Registering as soon as this module loads (it is imported by every chart)
// makes sure the KuCode themes exist before any of them switches theme.
if (typeof window !== 'undefined') {
  import('@visactor/vchart')
    .then((module) => registerChartThemes(module.ThemeManager))
    .catch(() => {
      // Charts fall back to VChart's built-in themes.
    })
}
