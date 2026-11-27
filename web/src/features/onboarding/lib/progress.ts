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
import type { OnboardingUseCase } from '@/features/auth/types'
import type { AuthUser } from '@/stores/auth-store'

import type { OnboardingProgress } from '../types'

const USE_CASES = new Set<unknown>(['coding', 'api', 'playground'])

export function isOnboardingUseCase(
  value: unknown
): value is OnboardingUseCase {
  return USE_CASES.has(value)
}

/** Local optimistic cache key. Always scoped by user id so accounts never share state. */
export function getOnboardingStorageKey(userId: number): string {
  return `onboarding_progress:u_${userId}`
}

function parseProgress(value: unknown): OnboardingProgress {
  const source =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const useCase = source.onboarding_use_case ?? source.use_case
  return {
    completed:
      source.onboarding_completed === true || source.completed === true,
    dismissed:
      source.onboarding_dismissed === true || source.dismissed === true,
    useCase: isOnboardingUseCase(useCase) ? useCase : undefined,
  }
}

/** Reads the onboarding keys out of `user.setting` (a JSON string or an object). */
export function readUserOnboardingSetting(
  user: Pick<AuthUser, 'setting'> | null | undefined
): OnboardingProgress {
  const setting = user?.setting
  if (typeof setting !== 'string') return parseProgress(setting)
  try {
    return parseProgress(JSON.parse(setting))
  } catch {
    return parseProgress(null)
  }
}

export function readLocalOnboardingProgress(
  userId: number
): OnboardingProgress {
  try {
    const raw = window.localStorage.getItem(getOnboardingStorageKey(userId))
    return parseProgress(raw ? JSON.parse(raw) : null)
  } catch {
    return parseProgress(null)
  }
}

/** Merges a partial update into the local cache. Never stores key material. */
export function writeLocalOnboardingProgress(
  userId: number,
  patch: Partial<OnboardingProgress>
): void {
  try {
    const next = { ...readLocalOnboardingProgress(userId), ...patch }
    window.localStorage.setItem(
      getOnboardingStorageKey(userId),
      JSON.stringify(next)
    )
  } catch {
    // Storage can be unavailable (private mode, blocked site data); the backend value still applies.
  }
}

/** True when either the backend setting or the local cache says the guide was completed or skipped. */
export function isOnboardingFinished(user: AuthUser): boolean {
  const remote = readUserOnboardingSetting(user)
  const local = readLocalOnboardingProgress(user.id)
  return (
    remote.completed || remote.dismissed || local.completed || local.dismissed
  )
}
