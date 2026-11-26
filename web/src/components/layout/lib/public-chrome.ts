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
import type { TopNavLink } from '../types'

/** Shared KuCode focus ring: primary at 60% with an offset against the page. */
export const FOCUS_RING =
  'focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none'

/** Outline capsule used for the top-bar call to action (KuCode `Button` outline). */
export const CTA_CAPSULE =
  'h-auto rounded-full border-input bg-transparent px-4 py-2 text-[13px] text-foreground hover:bg-foreground/5 active:bg-foreground/10'

/** Pointer-driven styles shared by the round icon buttons in the top bar. */
export const ROUND_ICON_BUTTON =
  'size-10 rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10 aria-expanded:bg-foreground/5'

/** Active-link state: the home link matches exactly, other links match nested paths. */
export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Splits the top-nav links into the group left of the centered brand and the
 * group right of it. The right group holds at most two links so the actions
 * beside it (language, notifications, theme, auth) always fit.
 */
export function splitNavLinks(links: TopNavLink[]): {
  left: TopNavLink[]
  right: TopNavLink[]
} {
  const rightCount = Math.min(2, Math.floor(links.length / 2))
  const leftCount = links.length - rightCount
  return { left: links.slice(0, leftCount), right: links.slice(leftCount) }
}
