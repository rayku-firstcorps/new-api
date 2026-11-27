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
import { useCallback } from 'react'

import type { OnboardingUseCase } from '@/features/auth/types'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'

import { updateOnboarding } from '../api'
import { writeLocalOnboardingProgress } from '../lib/progress'

function mergeSetting(user: AuthUser, patch: Record<string, unknown>) {
  let current: Record<string, unknown> = {}
  if (typeof user.setting === 'string') {
    try {
      current = JSON.parse(user.setting) as Record<string, unknown>
    } catch {
      current = {}
    }
  } else if (user.setting) {
    current = user.setting
  }
  const merged = { ...current, ...patch }
  return typeof user.setting === 'string' || !user.setting
    ? JSON.stringify(merged)
    : merged
}

/**
 * Persists onboarding progress: local per-user cache first (so a refresh never
 * bounces back), then the backend, then the in-memory auth user.
 */
export function useOnboardingProgress() {
  const persist = useCallback(
    async (body: {
      completed?: boolean
      dismissed?: boolean
      use_case?: OnboardingUseCase
    }) => {
      const { user, setUser } = useAuthStore.getState().auth
      if (!user) return
      writeLocalOnboardingProgress(user.id, {
        ...(body.completed ? { completed: true } : {}),
        ...(body.dismissed ? { dismissed: true } : {}),
        ...(body.use_case ? { useCase: body.use_case } : {}),
      })
      try {
        requireServerSuccess(await updateOnboarding(body))
        const latest = useAuthStore.getState().auth.user
        if (latest?.id === user.id) {
          setUser({
            ...latest,
            setting: mergeSetting(latest, {
              ...(body.completed ? { onboarding_completed: true } : {}),
              ...(body.dismissed ? { onboarding_dismissed: true } : {}),
              ...(body.use_case ? { onboarding_use_case: body.use_case } : {}),
            }),
          })
        }
      } catch (error) {
        // The local cache already holds the choice, so the wizard keeps working.
        handleServerError(error)
      }
    },
    []
  )

  return {
    saveUseCase: useCallback(
      (useCase: OnboardingUseCase) => persist({ use_case: useCase }),
      [persist]
    ),
    skip: useCallback(() => persist({ dismissed: true }), [persist]),
    complete: useCallback(
      (useCase: OnboardingUseCase) =>
        persist({ completed: true, use_case: useCase }),
      [persist]
    ),
  }
}
