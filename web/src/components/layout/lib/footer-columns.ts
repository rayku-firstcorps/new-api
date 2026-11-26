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
import type { UptimeGroupResult } from '@/features/dashboard/types'

import type { TopNavLink } from '../types'

export type FooterItem = {
  /** React key, unique inside the column. */
  key: string
  /** English i18n key; the renderer passes it through `t()`. */
  label: string
  href: string
  /** Module is auth-gated and the visitor is signed out: send them to sign-in first. */
  requiresAuth?: boolean
}

export type FooterColumn = {
  key: string
  /** English i18n key; the renderer passes it through `t()`. */
  title: string
  items: FooterItem[]
}

type LegalFlags = {
  userAgreement: boolean
  privacyPolicy: boolean
}

const PRODUCT_LABELS: Record<string, string> = {
  '/pricing': 'Model Square',
  '/rankings': 'Rankings',
  '/image-generation': 'Image Generation',
}

function findLink(links: TopNavLink[], href: string): TopNavLink | undefined {
  return links.find((link) => link.href === href)
}

function toItem(link: TopNavLink, label: string): FooterItem {
  return {
    key: link.href,
    label,
    href: link.href,
    requiresAuth: link.requiresAuth,
  }
}

/**
 * Builds the footer link columns from the same links the top bar renders
 * (`useTopNavLinks`), so HeaderNavModules enabled/requireAuth gating applies to
 * both. Only existing routes are listed and empty columns are dropped.
 */
export function buildFooterColumns(
  links: TopNavLink[],
  legal: LegalFlags
): FooterColumn[] {
  const product: FooterItem[] = []
  for (const href of Object.keys(PRODUCT_LABELS)) {
    const link = findLink(links, href)
    if (link) product.push(toItem(link, PRODUCT_LABELS[href]))
  }

  const developers: FooterItem[] = []
  const docs = findLink(links, '/docs')
  if (docs) developers.push(toItem(docs, 'Docs'))
  if (findLink(links, '/dashboard')) {
    developers.push({ key: '/keys', label: 'API Keys', href: '/keys' })
    developers.push({ key: '/dashboard', label: 'Console', href: '/dashboard' })
  }

  const company: FooterItem[] = []
  const about = findLink(links, '/about')
  if (about) company.push(toItem(about, 'About'))

  const legalItems: FooterItem[] = []
  if (legal.userAgreement) {
    legalItems.push({
      key: '/user-agreement',
      label: 'User Agreement',
      href: '/user-agreement',
    })
  }
  if (legal.privacyPolicy) {
    legalItems.push({
      key: '/privacy-policy',
      label: 'Privacy Policy',
      href: '/privacy-policy',
    })
  }

  const columns: FooterColumn[] = [
    { key: 'product', title: 'Product', items: product },
    { key: 'developers', title: 'Developers', items: developers },
    { key: 'company', title: 'Company', items: company },
    { key: 'legal', title: 'Legal', items: legalItems },
  ]
  return columns.filter((column) => column.items.length > 0)
}

export type FooterHealth = 'operational' | 'issues'

const MONITOR_UP = 1
const MONITOR_MAINTENANCE = 3

/**
 * Collapses Uptime Kuma monitor groups into one footer status. Returns null
 * when there is nothing real to report (no monitors, or only monitors under
 * maintenance), in which case the footer shows no status line.
 */
export function summarizeUptime(
  groups: UptimeGroupResult[] | undefined
): FooterHealth | null {
  const monitors = (groups ?? [])
    .flatMap((group) => group.monitors ?? [])
    .filter((monitor) => monitor.status !== MONITOR_MAINTENANCE)
  if (monitors.length === 0) return null
  return monitors.every((monitor) => monitor.status === MONITOR_UP)
    ? 'operational'
    : 'issues'
}
