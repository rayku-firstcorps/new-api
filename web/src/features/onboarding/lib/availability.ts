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
import type { SystemStatus } from '@/features/auth/types'
import { ROLE } from '@/lib/roles'
import type { AuthUser } from '@/stores/auth-store'

import { isOnboardingFinished } from './progress'

export interface OnboardingFlags {
  enabled: boolean
  /** Already ANDed with `enabled`. */
  autoOpen: boolean
  inlineTest: boolean
  ccSwitch: boolean
  adminGuide: boolean
  selfUseMode: boolean
  newUserQuotaEnabled: boolean
  newUserQuotaRequireEmail: boolean
  newUserQuotaAmount: number
}

/** Reads the public onboarding fields from `/api/status` (top level or nested `data`). */
export function readOnboardingFlags(
  status: SystemStatus | null | undefined
): OnboardingFlags {
  const source: Record<string, unknown> = {
    ...(status?.data as Record<string, unknown> | undefined),
    ...(status as Record<string, unknown> | null | undefined),
  }
  const pick = (key: string) => source[key]
  const enabled = pick('onboarding_enabled') === true
  const amount = Number(pick('new_user_quota_amount') ?? 0)
  return {
    enabled,
    autoOpen: enabled && pick('onboarding_auto_open') === true,
    inlineTest: pick('onboarding_inline_test_enabled') === true,
    ccSwitch: pick('onboarding_cc_switch_enabled') === true,
    adminGuide: pick('onboarding_admin_guide_enabled') === true,
    selfUseMode: pick('self_use_mode_enabled') === true,
    newUserQuotaEnabled: pick('new_user_quota_enabled') === true,
    newUserQuotaRequireEmail: pick('new_user_quota_require_email') === true,
    newUserQuotaAmount: Number.isFinite(amount) ? amount : 0,
  }
}

/** Whether the account is an administrator (admin or super admin). */
export function isOnboardingAdmin(user: AuthUser | null | undefined): boolean {
  return !!user && user.role >= ROLE.ADMIN
}

/** Whether the normal-user wizard applies to this account (route guard of the user wizard). */
export function isUserOnboardingAvailable(
  flags: OnboardingFlags,
  user: AuthUser | null | undefined
): boolean {
  if (!user || !flags.enabled) return false
  return user.role < ROLE.ADMIN
}

/** Whether the admin First Setup wizard applies: master switch, admin guide switch and an admin account. */
export function isAdminOnboardingAvailable(
  flags: OnboardingFlags,
  user: AuthUser | null | undefined
): boolean {
  if (!user || !flags.enabled || !flags.adminGuide) return false
  return isOnboardingAdmin(user)
}

/** Reopen entry and `/onboarding` route: either wizard applies. */
export function isOnboardingAvailable(
  flags: OnboardingFlags,
  user: AuthUser | null | undefined
): boolean {
  return (
    isUserOnboardingAvailable(flags, user) ||
    isAdminOnboardingAvailable(flags, user)
  )
}

export type AutoOpenDecision = 'no' | 'pending' | 'yes'

export interface AutoOpenInput {
  flags: OnboardingFlags
  user: AuthUser | null | undefined
  /** Number of API keys the user owns; `undefined` while still loading. */
  apiKeyCount: number | undefined
  /** Total number of upstream channels (admins only); `undefined` while loading. */
  channelCount?: number
}

/**
 * Single place deciding whether a login lands in the wizard. `pending` means
 * the answer depends on data that is still loading (keys, or channels for
 * administrators, who are opened only when the system has no channel at all).
 */
export function evaluateOnboardingAutoOpen(
  input: AutoOpenInput
): AutoOpenDecision {
  const user = input.user
  if (!user || !input.flags.autoOpen) return 'no'
  if (isOnboardingFinished(user)) return 'no'
  if (isOnboardingAdmin(user)) {
    if (!isAdminOnboardingAvailable(input.flags, user)) return 'no'
    if (input.channelCount === undefined) return 'pending'
    return input.channelCount === 0 ? 'yes' : 'no'
  }
  if (!isUserOnboardingAvailable(input.flags, user)) return 'no'
  if (user.request_count !== 0) return 'no'
  if (input.apiKeyCount === undefined) return 'pending'
  return input.apiKeyCount === 0 ? 'yes' : 'no'
}
