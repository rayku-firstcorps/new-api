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
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider, useTheme } from '@/context/theme-provider'
import { initializeFrontendCache } from '@/lib/frontend-cache'

const legacyPreferences = {
  'newapi:theme:v1:preset': 'rose-garden',
  'newapi:theme:v1:font': 'serif',
  'newapi:theme:v1:radius': 'lg',
  'newapi:theme:v1:scale': 'sm',
  'newapi:theme:v1:content-layout': 'centered',
}

function mockSystemDarkMode(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: dark && query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList
  )
}

function ThemeControls() {
  const theme = useTheme()

  return (
    <>
      <output aria-label='Theme mode'>{theme.theme}</output>
      <button type='button' onClick={() => theme.setTheme('light')}>
        Light
      </button>
      <button type='button' onClick={() => theme.setTheme('system')}>
        System
      </button>
      <button type='button' onClick={() => theme.resetTheme()}>
        Reset
      </button>
    </>
  )
}

function ThemeFixture() {
  return (
    <ThemeProvider>
      <ThemeControls />
    </ThemeProvider>
  )
}

function clearCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.trim().split('=')[0]
    document.cookie = `${name}=; path=/; max-age=0`
  }
}

beforeEach(() => {
  localStorage.clear()
  mockSystemDarkMode(false)
  document.head.insertAdjacentHTML(
    'beforeend',
    '<meta name="theme-color" content="#0e0e0e" />'
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  clearCookies()
  document.documentElement.classList.remove('light', 'dark')
  document.head.querySelector('meta[name="theme-color"]')?.remove()
  for (const name of document.body.getAttributeNames()) {
    if (name.startsWith('data-theme-')) document.body.removeAttribute(name)
  }
})

describe('theme mode preference', () => {
  it('defaults first-time visitors to dark even when the system prefers light', () => {
    render(<ThemeFixture />)

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement).not.toHaveClass('light')
  })

  it('ignores shared legacy theme cookies', () => {
    document.cookie = 'vite-ui-theme=light; path=/'
    document.cookie = 'theme_preset=ocean-breeze; path=/'

    render(<ThemeFixture />)

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('keeps a saved light choice after remounting', async () => {
    const user = userEvent.setup()
    const first = render(<ThemeFixture />)

    await user.click(screen.getByRole('button', { name: 'Light' }))
    first.unmount()
    render(<ThemeFixture />)

    expect(localStorage.getItem('newapi:theme:v1:mode')).toBe('light')
    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('light')
    expect(document.documentElement).toHaveClass('light')
  })

  it('follows the operating system only after system is chosen', async () => {
    mockSystemDarkMode(false)
    const user = userEvent.setup()
    render(<ThemeFixture />)

    await user.click(screen.getByRole('button', { name: 'System' }))

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('system')
    expect(document.documentElement).toHaveClass('light')
  })

  it('sets the theme-color meta tag for the resolved theme', async () => {
    const user = userEvent.setup()
    render(<ThemeFixture />)

    const meta = document.querySelector('meta[name="theme-color"]')
    expect(meta).toHaveAttribute('content', '#0e0e0e')

    await user.click(screen.getByRole('button', { name: 'Light' }))

    expect(meta).toHaveAttribute('content', '#f7f7f7')
  })

  it('returns to dark and forgets the saved choice on reset', async () => {
    localStorage.setItem('newapi:theme:v1:mode', 'light')
    localStorage.setItem('unrelated-preference', 'keep')
    const user = userEvent.setup()
    const first = render(<ThemeFixture />)

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    first.unmount()
    render(<ThemeFixture />)

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('dark')
    expect(localStorage.getItem('newapi:theme:v1:mode')).toBeNull()
    expect(localStorage.getItem('unrelated-preference')).toBe('keep')
  })

  it.each(['', 'unknown'])('uses dark when the stored mode is %j', (value) => {
    localStorage.setItem('newapi:theme:v1:mode', value)

    render(<ThemeFixture />)

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('dark')
  })

  it('renders dark when reading local storage fails', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError')
    })

    render(<ThemeFixture />)

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('dark')
  })

  it('still applies and resets the mode when storage writes fail', async () => {
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError')
    })
    const user = userEvent.setup()
    render(<ThemeFixture />)

    await user.click(screen.getByRole('button', { name: 'Light' }))

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('light')

    await user.click(screen.getByRole('button', { name: 'Reset' }))

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('dark')
  })

  it('preserves the saved mode during frontend cache initialization', () => {
    localStorage.setItem('newapi:theme:v1:mode', 'light')
    localStorage.setItem('stale-ui-cache', 'old')

    initializeFrontendCache()
    render(<ThemeFixture />)

    expect(screen.getByLabelText('Theme mode')).toHaveTextContent('light')
    expect(localStorage.getItem('newapi:theme:v1:mode')).toBe('light')
    expect(localStorage.getItem('stale-ui-cache')).toBeNull()
  })
})

describe('removed theme customization', () => {
  it('clears stored preset, font, radius, scale and layout values on load', () => {
    for (const [key, value] of Object.entries(legacyPreferences)) {
      localStorage.setItem(key, value)
    }
    localStorage.setItem('newapi:theme:v1:mode', 'light')
    localStorage.setItem('unrelated-preference', 'keep')

    render(<ThemeFixture />)

    for (const key of Object.keys(legacyPreferences)) {
      expect(localStorage.getItem(key)).toBeNull()
    }
    expect(localStorage.getItem('newapi:theme:v1:mode')).toBe('light')
    expect(localStorage.getItem('unrelated-preference')).toBe('keep')
  })

  it('clears the font, direction and sidebar layout cookies on load', () => {
    document.cookie = 'font=manrope; path=/'
    document.cookie = 'dir=rtl; path=/'
    document.cookie = 'layout_collapsible=none; path=/'
    document.cookie = 'layout_variant=floating; path=/'
    document.cookie = 'unrelated=keep; path=/'

    render(<ThemeFixture />)

    expect(document.cookie).toBe('unrelated=keep')
  })

  it('removes theme attributes a previous version left on the body', () => {
    document.body.setAttribute('data-theme-preset', 'rose-garden')
    document.body.setAttribute('data-theme-radius', 'lg')

    render(<ThemeFixture />)

    expect(document.body).not.toHaveAttribute('data-theme-preset')
    expect(document.body).not.toHaveAttribute('data-theme-radius')
  })
})
