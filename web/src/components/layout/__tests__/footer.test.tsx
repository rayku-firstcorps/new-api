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
import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { Footer } from '../components/footer'
import type { FooterHealth } from '../lib/footer-columns'
import type { TopNavLink } from '../types'

const state = vi.hoisted(() => ({
  links: [] as TopNavLink[],
  status: {} as Record<string, unknown>,
  config: {} as Record<string, unknown>,
  health: null as FooterHealth | null,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: (props: {
    to: string
    search?: { redirect?: string }
    className?: string
    children?: React.ReactNode
  }) => (
    <a
      href={props.to}
      data-redirect={props.search?.redirect}
      className={props.className}
    >
      {props.children}
    </a>
  ),
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: state.status, loading: false, error: null }),
}))
vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => state.config,
}))
vi.mock('@/hooks/use-top-nav-links', () => ({
  useTopNavLinks: () => state.links,
}))
vi.mock('../lib/use-footer-health', () => ({
  useFooterHealth: () => state.health,
}))

const NAV: TopNavLink[] = [
  { title: 'Home', href: '/' },
  { title: 'Console', href: '/dashboard' },
  { title: 'Model Square', href: '/pricing' },
  { title: 'Docs', href: '/docs' },
  { title: 'About', href: '/about' },
]

beforeEach(() => {
  state.links = NAV
  state.status = {}
  state.config = { systemName: 'KuCode', logo: '/kucode-mark.svg' }
  state.health = null
})

describe('Footer', () => {
  test('renders the brand, real link columns, copyright and disclaimer', () => {
    render(<Footer />)

    expect(screen.getByRole('link', { name: 'KuCode' })).toBeTruthy()
    expect(screen.getByText('Powerful API Management Platform')).toBeTruthy()

    const nav = screen.getByRole('navigation', { name: 'Footer' })
    const headings = within(nav)
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
    expect(headings).toEqual(['Product', 'Developers', 'Company'])
    const hrefs = within(nav)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual([
      '/pricing',
      '/docs',
      '/keys',
      '/dashboard',
      '/about',
    ])

    expect(screen.getByText(/footer\.defaultCopyright/)).toBeTruthy()
    expect(
      screen.getByText(/All product names, logos, and brands/)
    ).toBeTruthy()
  })

  test('sends signed-out visitors of an auth-gated module to sign-in', () => {
    state.links = [{ ...NAV[2], requiresAuth: true }]
    render(<Footer />)
    const link = screen.getByRole('link', { name: 'Model Square' })
    expect(link.getAttribute('href')).toBe('/sign-in')
    expect(link.getAttribute('data-redirect')).toBe('/pricing')
  })

  test('shows legal links only when enabled', () => {
    render(<Footer />)
    expect(screen.queryByText('User Agreement')).toBeNull()

    state.status = { user_agreement_enabled: true }
    render(<Footer />)
    expect(screen.getByText('User Agreement')).toBeTruthy()
    expect(screen.queryByText('Privacy Policy')).toBeNull()
  })

  test('omits the status line without real monitor data', () => {
    render(<Footer />)
    expect(screen.queryByText('All systems operational')).toBeNull()
    expect(
      screen.queryByText('Some services are experiencing issues')
    ).toBeNull()
  })

  test('shows the status line from real health only', () => {
    state.health = 'operational'
    const first = render(<Footer />)
    expect(screen.getByText('All systems operational')).toBeTruthy()
    first.unmount()

    state.health = 'issues'
    render(<Footer />)
    expect(
      screen.getByText('Some services are experiencing issues')
    ).toBeTruthy()
  })

  test('demo-site mode keeps the protected docs and project links', () => {
    state.config = { ...state.config, demoSiteEnabled: true }
    render(<Footer />)
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('https://docs.newapi.pro/getting-started/')
    expect(hrefs).toContain('https://docs.newapi.pro/api/')
    expect(hrefs).toContain('https://github.com/songquanpeng/one-api')
    expect(hrefs).toContain('https://github.com/novicezk/midjourney-proxy')
    expect(hrefs).toContain('https://github.com/Calcium-Ion/new-api-key-tool')
  })

  test('custom footer HTML is rendered as is, with legal links beside it', () => {
    state.config = {
      ...state.config,
      footerHtml: '<p id="x">Custom footer</p>',
    }
    state.status = { privacy_policy_enabled: true }
    const { container } = render(<Footer />)
    expect(container.querySelector('.custom-footer #x')?.textContent).toBe(
      'Custom footer'
    )
    expect(screen.getByText('Privacy Policy')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'Footer' })).toBeNull()
  })
})
