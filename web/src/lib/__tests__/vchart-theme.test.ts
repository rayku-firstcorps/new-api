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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { registerChartThemes } from '../vchart'

type ThemeManager = Parameters<typeof registerChartThemes>[0]

// jsdom does not run the CSS cascade, so stand in for theme.css: the probe's
// class (`light` / `dark`) picks which palette its var() colors resolve to.
const TOKENS: Record<string, Record<string, string>> = {
  light: {
    '--foreground': 'rgb(17, 17, 17)',
    '--card': 'rgb(255, 255, 255)',
    '--chart-1': 'rgb(168, 86, 0)',
    '--chart-2': 'rgb(124, 58, 237)',
  },
  dark: {
    '--foreground': 'rgb(245, 245, 245)',
    '--card': 'rgb(22, 22, 22)',
    '--chart-1': 'rgb(245, 165, 11)',
    '--chart-2': 'rgb(139, 92, 246)',
  },
}

function stubThemeCascade(tokens = TOKENS) {
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    const token = /var\((--[\w-]+)\)/.exec(
      (element as HTMLElement).getAttribute('style') ?? ''
    )?.[1]
    const mode = (element as HTMLElement).className
    return {
      color: (token && tokens[mode]?.[token]) || '',
      fontFamily: 'Inter, sans-serif',
    } as CSSStyleDeclaration
  })
}

function createThemeManager() {
  return { registerTheme: vi.fn() } as unknown as ThemeManager & {
    registerTheme: ReturnType<typeof vi.fn>
  }
}

describe('registerChartThemes', () => {
  beforeEach(() => {
    stubThemeCascade()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("registers a light and a dark theme built from that theme's tokens", () => {
    const themeManager = createThemeManager()

    registerChartThemes(themeManager)

    const calls = themeManager.registerTheme.mock.calls
    expect(calls.map((call) => call[0])).toEqual(['light', 'dark'])
    const [light, dark] = calls.map((call) => call[1].colorScheme.default)
    expect(light.palette.primaryFontColor).toBe('rgb(17, 17, 17)')
    expect(dark.palette.primaryFontColor).toBe('rgb(245, 245, 245)')
    expect(light.palette.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(dark.palette.backgroundColor).toBe('rgb(22, 22, 22)')
    expect(light.dataScheme.slice(0, 2)).toEqual([
      'rgb(168, 86, 0)',
      'rgb(124, 58, 237)',
    ])
    expect(dark.dataScheme.slice(0, 2)).toEqual([
      'rgb(245, 165, 11)',
      'rgb(139, 92, 246)',
    ])
  })

  it('extends the matching built-in theme and keeps the page font', () => {
    const themeManager = createThemeManager()

    registerChartThemes(themeManager)

    const [light, dark] = themeManager.registerTheme.mock.calls.map(
      (call) => call[1]
    )
    expect(light.type).toBe('light')
    expect(dark.type).toBe('dark')
    expect(dark.fontFamily).toBe('Inter, sans-serif')
  })

  it('registers only once per theme manager', () => {
    const themeManager = createThemeManager()

    registerChartThemes(themeManager)
    registerChartThemes(themeManager)

    expect(themeManager.registerTheme).toHaveBeenCalledTimes(2)
  })

  it('registers nothing when the design tokens are not available', () => {
    stubThemeCascade({})
    const themeManager = createThemeManager()

    registerChartThemes(themeManager)

    expect(themeManager.registerTheme).not.toHaveBeenCalled()
  })
})
