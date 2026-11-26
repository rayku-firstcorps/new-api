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
import { Link, useRouterState } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'

import { defaultTopNavLinks } from '../config/top-nav.config'
import { FOCUS_RING, isNavLinkActive } from '../lib/public-chrome'
import type { TopNavLink } from '../types'

interface PublicNavigationProps {
  /**
   * Links to render. When omitted, the links produced by the backend
   * HeaderNavModules configuration (or the defaults) are used.
   */
  links?: TopNavLink[]
  /** Click handler shared with the header (requireAuth prompt, disabled links). */
  onLinkClick?: (
    event: React.MouseEvent<HTMLAnchorElement>,
    link: TopNavLink
  ) => void
  className?: string
}

const BASE_LINK_CLASS =
  'min-w-0 rounded-sm whitespace-nowrap transition-colors duration-150'

/**
 * Desktop link group of the public top bar (KuCode `NavLinks`): muted text
 * links, the current page in the foreground color, `aria-current` on the
 * active one. The header renders it once left and once right of the brand.
 */
export function PublicNavigation(props: PublicNavigationProps) {
  const { t } = useTranslation()
  const dynamicLinks = useTopNavLinks()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const defaultLinks = props.links || defaultTopNavLinks
  const links =
    props.links ?? (dynamicLinks.length > 0 ? dynamicLinks : defaultLinks)

  return (
    <ul
      className={cn(
        'flex items-center gap-5 text-[14px] xl:gap-8',
        props.className
      )}
    >
      {links.map((link) => {
        const isActive = isNavLinkActive(pathname, link.href)
        const label = t(link.title)
        const stateClass = cn(
          BASE_LINK_CLASS,
          FOCUS_RING,
          isActive
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground',
          link.disabled && 'pointer-events-none opacity-50'
        )
        const onClick = (event: React.MouseEvent<HTMLAnchorElement>) =>
          props.onLinkClick?.(event, link)

        if (link.external) {
          return (
            <li key={`${link.title}:${link.href}`} className='min-w-0'>
              <a
                href={link.href}
                title={label}
                target='_blank'
                rel='noopener noreferrer'
                aria-disabled={link.disabled}
                tabIndex={link.disabled ? -1 : undefined}
                onClick={onClick}
                className={cn('block truncate', stateClass)}
              >
                {label}
              </a>
            </li>
          )
        }
        return (
          <li key={`${link.title}:${link.href}`} className='min-w-0'>
            <Link
              to={link.href}
              title={label}
              aria-current={isActive ? 'page' : undefined}
              disabled={link.disabled}
              onClick={onClick}
              className={cn('block truncate', stateClass)}
            >
              {label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
