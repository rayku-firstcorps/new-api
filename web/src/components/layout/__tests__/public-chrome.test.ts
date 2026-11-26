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
import { describe, expect, test } from 'vitest'

import { buildFooterColumns, summarizeUptime } from '../lib/footer-columns'
import { isNavLinkActive, splitNavLinks } from '../lib/public-chrome'
import type { TopNavLink } from '../types'

const link = (title: string, href: string, extra?: Partial<TopNavLink>) => ({
  title,
  href,
  ...extra,
})

const ALL_LINKS: TopNavLink[] = [
  link('Home', '/'),
  link('Console', '/dashboard'),
  link('Model Square', '/pricing'),
  link('Rankings', '/rankings'),
  link('Image Generation', '/image-generation'),
  link('Docs', '/docs'),
  link('About', '/about'),
]

const NO_LEGAL = { userAgreement: false, privacyPolicy: false }

describe('splitNavLinks', () => {
  test('keeps at most two links on the right of the brand', () => {
    const groups = splitNavLinks(ALL_LINKS)
    expect(groups.left.map((l) => l.href)).toEqual([
      '/',
      '/dashboard',
      '/pricing',
      '/rankings',
      '/image-generation',
    ])
    expect(groups.right.map((l) => l.href)).toEqual(['/docs', '/about'])
  })

  test('preserves order and loses no link for every length', () => {
    for (let count = 0; count <= ALL_LINKS.length; count++) {
      const links = ALL_LINKS.slice(0, count)
      const groups = splitNavLinks(links)
      expect([...groups.left, ...groups.right]).toEqual(links)
      expect(groups.right.length).toBeLessThanOrEqual(2)
    }
  })

  test('a single link stays on the left', () => {
    const groups = splitNavLinks([link('Home', '/')])
    expect(groups.left).toHaveLength(1)
    expect(groups.right).toHaveLength(0)
  })
})

describe('isNavLinkActive', () => {
  test('home only matches the root path', () => {
    expect(isNavLinkActive('/', '/')).toBe(true)
    expect(isNavLinkActive('/pricing', '/')).toBe(false)
  })

  test('other links match themselves and nested paths only', () => {
    expect(isNavLinkActive('/pricing', '/pricing')).toBe(true)
    expect(isNavLinkActive('/pricing/gpt-4o', '/pricing')).toBe(true)
    expect(isNavLinkActive('/pricing-faq', '/pricing')).toBe(false)
  })
})

describe('buildFooterColumns', () => {
  test('lists real destinations in four columns when everything is enabled', () => {
    const columns = buildFooterColumns(ALL_LINKS, {
      userAgreement: true,
      privacyPolicy: true,
    })
    expect(columns.map((c) => c.key)).toEqual([
      'product',
      'developers',
      'company',
      'legal',
    ])
    const hrefs = columns.flatMap((c) => c.items.map((i) => i.href))
    expect(hrefs).toEqual([
      '/pricing',
      '/rankings',
      '/image-generation',
      '/docs',
      '/keys',
      '/dashboard',
      '/about',
      '/user-agreement',
      '/privacy-policy',
    ])
    expect(hrefs.some((href) => href === '#' || href === '')).toBe(false)
  })

  test('follows the header gating: disabled modules disappear', () => {
    const links = ALL_LINKS.filter(
      (l) => !['/rankings', '/image-generation', '/about'].includes(l.href)
    )
    const columns = buildFooterColumns(links, NO_LEGAL)
    expect(columns.map((c) => c.key)).toEqual(['product', 'developers'])
    expect(columns[0].items.map((i) => i.href)).toEqual(['/pricing'])
  })

  test('hides the console entries when the console module is off', () => {
    const links = ALL_LINKS.filter((l) => l.href !== '/dashboard')
    const developers = buildFooterColumns(links, NO_LEGAL).find(
      (c) => c.key === 'developers'
    )
    expect(developers?.items.map((i) => i.href)).toEqual(['/docs'])
  })

  test('carries requiresAuth through for auth-gated modules', () => {
    const links = [link('Model Square', '/pricing', { requiresAuth: true })]
    const columns = buildFooterColumns(links, NO_LEGAL)
    expect(columns[0].items[0].requiresAuth).toBe(true)
  })

  test('drops every empty column', () => {
    expect(buildFooterColumns([], NO_LEGAL)).toEqual([])
    const legalOnly = buildFooterColumns([], {
      userAgreement: false,
      privacyPolicy: true,
    })
    expect(legalOnly.map((c) => c.key)).toEqual(['legal'])
    expect(legalOnly[0].items.map((i) => i.href)).toEqual(['/privacy-policy'])
  })
})

describe('summarizeUptime', () => {
  const group = (statuses: number[]) => ({
    categoryName: 'API',
    monitors: statuses.map((status, index) => ({
      name: `m${index}`,
      uptime: 1,
      status,
    })),
  })

  test('returns null when there is nothing to report', () => {
    expect(summarizeUptime(undefined)).toBeNull()
    expect(summarizeUptime([])).toBeNull()
    expect(summarizeUptime([group([])])).toBeNull()
    expect(summarizeUptime([group([3, 3])])).toBeNull()
  })

  test('reports operational only when every monitor is up', () => {
    expect(summarizeUptime([group([1, 1]), group([1])])).toBe('operational')
    expect(summarizeUptime([group([1, 3])])).toBe('operational')
  })

  test('reports issues for any down or pending monitor', () => {
    expect(summarizeUptime([group([1, 0])])).toBe('issues')
    expect(summarizeUptime([group([1]), group([2])])).toBe('issues')
  })
})
