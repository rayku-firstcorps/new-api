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
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { getChannels } from '@/features/channels/api'
import { getApiKeys } from '@/features/keys/api'
import { useStatus } from '@/hooks/use-status'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import {
  evaluateOnboardingAutoOpen,
  isOnboardingAdmin,
  readOnboardingFlags,
} from '../lib/availability'

/** Users already auto-opened during this page load; stops a loop when they leave the wizard unfinished. */
const autoOpenedUserIds = new Set<number>()

/** Test hook: forget which users were already auto-opened. */
export function resetOnboardingAutoOpenMemory() {
  autoOpenedUserIds.clear()
}

/**
 * Sends a first-time user to `/onboarding` from the Overview first paint.
 *
 * It lives on Overview rather than in the login handlers because every login
 * path (password, OAuth, passkey, OTP) and every existing session lands on
 * `/dashboard`, so one check covers all of them without touching auth code.
 * `settled === false` lets the caller render nothing while the decision is
 * pending, so the dashboard never flashes before the redirect.
 */
export function useOnboardingAutoOpen(): { settled: boolean } {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.auth.user)
  const { status, loading } = useStatus()
  const flags = readOnboardingFlags(status)

  // Cheap gate first: only fetch data for accounts that could still be auto-opened.
  const isAdmin = isOnboardingAdmin(user)
  const preliminary = evaluateOnboardingAutoOpen({
    flags,
    user,
    apiKeyCount: 0,
    channelCount: 0,
  })
  const keysQuery = useQuery({
    queryKey: ['onboarding', 'auto-open-keys', user?.id],
    queryFn: async () => {
      const result = requireServerSuccess(await getApiKeys({ p: 1, size: 1 }))
      return result.data?.total ?? result.data?.items.length ?? 0
    },
    enabled: preliminary === 'yes' && !isAdmin,
    staleTime: 0,
  })
  // Administrators are opened only when the system has no channel at all.
  const channelsQuery = useQuery({
    queryKey: ['onboarding', 'auto-open-channels', user?.id],
    queryFn: async () => {
      const result = requireServerSuccess(
        await getChannels({ p: 1, page_size: 1 })
      )
      return result.data?.total ?? result.data?.items.length ?? 0
    },
    enabled: preliminary === 'yes' && isAdmin,
    retry: false,
    staleTime: 0,
  })

  const gated = preliminary === 'yes'
  const decision = evaluateOnboardingAutoOpen({
    flags,
    user,
    apiKeyCount: gated ? keysQuery.data : 0,
    channelCount: gated ? channelsQuery.data : 0,
  })
  const alreadyOpened = user ? autoOpenedUserIds.has(user.id) : false
  const shouldOpen = decision === 'yes' && !alreadyOpened
  const statusPending = loading && status === null
  const redirecting = useRef(false)

  useEffect(() => {
    if (!user || !shouldOpen) return
    autoOpenedUserIds.add(user.id)
    redirecting.current = true
    void navigate({ to: '/onboarding', replace: true })
  }, [navigate, shouldOpen, user])

  // A failed count must never block the console.
  if (gated && (isAdmin ? channelsQuery.isError : keysQuery.isError)) {
    return { settled: true }
  }
  return {
    settled:
      !statusPending &&
      decision !== 'pending' &&
      !shouldOpen &&
      !redirecting.current,
  }
}
