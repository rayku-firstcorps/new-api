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
import type { LucideIcon } from 'lucide-react'

import type { IconBadgeTone } from '@/components/ui/icon-badge'
import type { ApiKey } from '@/features/keys/types'

export const SETUP_GUIDE_VISIBILITY_STORAGE_KEY =
  'dashboard_overview_setup_guide_expanded'

export type DashboardActionPath =
  | '/keys'
  | '/wallet'
  | '/playground'
  | '/channels'
  | '/usage-logs'
  | '/pricing'

export type StartStepId = 'key' | 'credits' | 'request'

export interface StartStep {
  id: StartStepId
  title: string
  description: string
  to: DashboardActionPath
  /** Label of the primary button shown while this is the active step. */
  ctaLabel: string
  /** Preset model for `/playground?model=`; never a key. */
  playgroundModel?: string
  icon: LucideIcon
  completed: boolean
}

export interface QuickAction {
  title: string
  description: string
  to: DashboardActionPath
  icon: LucideIcon
  adminOnly?: boolean
}

export interface RequestExample {
  endpoint: string
  model: string
  keyName: string
  keyId?: number
  displayKey: string
  ready: boolean
}

export interface HeroSignal {
  label: string
  value: string
  icon: LucideIcon
  tone: IconBadgeTone
}

/** Per-account key, so switching accounts in one browser never shares the state. */
export function getSetupGuideStorageKey(userId: number): string {
  return `${SETUP_GUIDE_VISIBILITY_STORAGE_KEY}:u_${userId}`
}

function parseSetupGuideExpanded(saved: string | null): boolean | null {
  if (saved === 'expanded') return true
  if (saved === 'collapsed') return false
  return null
}

/**
 * Reads the saved preference of one account. The pre-isolation global key is
 * adopted once (copied to the account key, then removed) so existing
 * single-account browsers keep their choice without leaking it to other accounts.
 */
export function getSavedSetupGuideExpanded(userId?: number): boolean | null {
  if (typeof window === 'undefined' || userId === undefined) return null
  try {
    const key = getSetupGuideStorageKey(userId)
    const own = window.localStorage.getItem(key)
    if (own !== null) return parseSetupGuideExpanded(own)

    const legacy = window.localStorage.getItem(
      SETUP_GUIDE_VISIBILITY_STORAGE_KEY
    )
    if (legacy === null) return null
    window.localStorage.removeItem(SETUP_GUIDE_VISIBILITY_STORAGE_KEY)
    const migrated = parseSetupGuideExpanded(legacy)
    if (migrated !== null) window.localStorage.setItem(key, legacy)
    return migrated
  } catch {
    return null
  }
}

export function saveSetupGuideExpanded(
  expanded: boolean,
  userId?: number
): void {
  if (typeof window === 'undefined' || userId === undefined) return
  try {
    window.localStorage.setItem(
      getSetupGuideStorageKey(userId),
      expanded ? 'expanded' : 'collapsed'
    )
  } catch {
    // Storage can be unavailable; the in-memory state still applies.
  }
}

function getCurrentOrigin(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

export function normalizeEndpoint(sourceUrl?: string): string {
  const fallback = `${getCurrentOrigin()}/v1/chat/completions`
  const trimmed = sourceUrl?.trim()
  if (!trimmed) return fallback

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')
  if (withoutTrailingSlash.endsWith('/v1/chat/completions')) {
    return withoutTrailingSlash
  }
  if (withoutTrailingSlash.endsWith('/v1')) {
    return `${withoutTrailingSlash}/chat/completions`
  }
  return `${withoutTrailingSlash}/v1/chat/completions`
}

export function getPreferredKey(keys: ApiKey[]): ApiKey | null {
  return keys.find((item) => item.status === 1) ?? keys[0] ?? null
}

export function formatDisplayKey(key?: string): string {
  if (!key) return 'sk-...'
  if (key.length <= 14) return key
  return `${key.slice(0, 7)}...${key.slice(-4)}`
}

export function buildCurlCommand(args: {
  endpoint: string
  apiKey: string
  model: string
}): string {
  return [
    `curl ${args.endpoint} \\`,
    '  -H "Content-Type: application/json" \\',
    `  -H "Authorization: Bearer ${args.apiKey}" \\`,
    `  -d '{"model":"${args.model}","messages":[{"role":"user","content":"Say hello in one sentence."}]}'`,
  ].join('\n')
}
