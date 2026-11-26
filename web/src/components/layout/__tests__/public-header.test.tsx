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
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { PublicHeader } from '../components/public-header'
import type { TopNavLink } from '../types'

const state = vi.hoisted(() => ({
  links: [] as TopNavLink[],
  status: {} as Record<string, unknown>,
  user: null as Record<string, unknown> | null,
  loading: false,
  navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: (props: {
    to: string
    className?: string
    children?: React.ReactNode
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
    'aria-current'?: 'page'
    title?: string
  }) => (
    <a
      href={props.to}
      className={props.className}
      onClick={props.onClick}
      aria-current={props['aria-current']}
      title={props.title}
    >
      {props.children}
    </a>
  ),
  useNavigate: () => state.navigate,
  useRouterState: (options?: {
    select?: (s: { location: { pathname: string } }) => unknown
  }) => {
    const value = { location: { pathname: '/pricing' } }
    return options?.select ? options.select(value) : value
  },
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: state.status, loading: false, error: null }),
}))
vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({
    systemName: 'KuCode',
    logo: '/kucode-mark.svg',
    loading: state.loading,
    logoLoaded: true,
  }),
}))
vi.mock('@/hooks/use-top-nav-links', () => ({
  useTopNavLinks: () => state.links,
}))
vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: () => ({
    popoverOpen: false,
    setPopoverOpen: vi.fn(),
    unreadCount: 0,
    activeTab: 'notice',
    setActiveTab: vi.fn(),
    notice: '',
    announcements: [],
    loading: false,
  }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { user: state.user } }),
}))
vi.mock('@/components/language-switcher', () => ({
  LanguageSwitcher: () => <button type='button'>Change language</button>,
}))
vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <button type='button'>Toggle theme</button>,
}))
vi.mock('@/components/notification-popover', () => ({
  NotificationPopover: () => <button type='button'>Notifications</button>,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <button type='button'>Profile menu</button>,
}))
vi.mock('@/components/sign-out-dialog', () => ({
  SignOutDialog: () => null,
}))
vi.mock('@/features/system-update/system-update-action', () => ({
  SystemUpdateAction: () => null,
}))
vi.mock('@/hooks/use-sidebar-config', () => ({
  useIsSidebarModuleVisible: () => true,
}))
vi.mock('@/hooks/use-user-display', () => ({
  useUserDisplay: () => ({
    displayName: 'Ada',
    initials: 'A',
    roleLabel: 'User',
  }),
}))

const NAV: TopNavLink[] = [
  { title: 'Home', href: '/' },
  { title: 'Console', href: '/dashboard' },
  { title: 'Model Square', href: '/pricing' },
  { title: 'Rankings', href: '/rankings', requiresAuth: true },
  { title: 'Docs', href: '/docs' },
  { title: 'About', href: '/about' },
]

beforeEach(() => {
  state.links = NAV
  state.status = {}
  state.user = null
  state.loading = false
  state.navigate.mockReset()
})

describe('PublicHeader', () => {
  test('renders the nav links, the brand and the actions', () => {
    render(<PublicHeader />)

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    const labels = within(nav)
      .getAllByRole('link')
      .map((a) => a.textContent)
    expect(labels).toEqual([
      'Home',
      'Console',
      'Model Square',
      'Rankings',
      'KuCode',
      'Docs',
      'About',
      'Sign in',
      'Sign up',
    ])
    const current = within(nav).getByText('Model Square')
    expect(current.getAttribute('aria-current')).toBe('page')
    expect(
      within(nav).getByText('Home').getAttribute('aria-current')
    ).toBeNull()
    expect(screen.getByText('Change language')).toBeTruthy()
    expect(screen.getByText('Notifications')).toBeTruthy()
    expect(screen.getAllByText('Toggle theme').length).toBeGreaterThan(0)
  })

  test('hides Sign up when registration is closed', () => {
    state.status = { register_enabled: false }
    render(<PublicHeader />)
    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull()
    expect(screen.getAllByRole('link', { name: 'Sign in' })).toHaveLength(1)
  })

  test('hides Sign up in self-use mode', () => {
    state.status = { self_use_mode_enabled: true }
    render(<PublicHeader />)
    expect(screen.queryByRole('link', { name: 'Sign up' })).toBeNull()
  })

  test('signed-in users get the profile menu instead of sign in', () => {
    state.user = { username: 'ada' }
    render(<PublicHeader />)
    expect(screen.getAllByText('Profile menu').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
    // Console is already a nav link, so no second Console button.
    expect(screen.getAllByRole('link', { name: 'Console' })).toHaveLength(1)
  })

  test('signed-in users get a Console button when the nav has no console link', () => {
    state.user = { username: 'ada' }
    state.links = NAV.filter((l) => l.href !== '/dashboard')
    render(<PublicHeader />)
    const link = screen.getByRole('link', { name: 'Console' })
    expect(link.getAttribute('href')).toBe('/dashboard')
  })

  test('an auth-gated link opens the sign-in prompt instead of navigating', () => {
    render(<PublicHeader />)
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    fireEvent.click(within(nav).getByText('Rankings'))
    expect(screen.getByText('Sign in required')).toBeTruthy()
  })

  test('the menu button opens the drawer with every link and closes it again', () => {
    render(<PublicHeader />)
    const button = screen.getByRole('button', { name: 'Open menu' })
    expect(button.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const dialog = screen.getByRole('dialog')
    const labels = within(dialog)
      .getAllByRole('link')
      .map((a) => a.textContent)
    expect(labels).toEqual(
      expect.arrayContaining([
        'Home',
        'Console',
        'Model Square',
        'Rankings',
        'Docs',
        'About',
        'Sign in',
        'Sign up',
      ])
    )

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close menu' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
