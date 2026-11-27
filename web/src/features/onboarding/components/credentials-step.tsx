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
import { useState } from 'react'

import type { OnboardingUseCase } from '@/features/auth/types'
import { EmailBindDialog } from '@/features/security/components/dialogs/email-bind-dialog'
import { getSelf } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import type { OnboardingFlags } from '../lib/availability'
import type { OnboardingSelectedKey } from '../types'
import { ApiKeyBlock } from './api-key-block'
import { QuotaBlock } from './quota-block'

interface CredentialsStepProps {
  flags: OnboardingFlags
  useCase: OnboardingUseCase
  selectedKey: OnboardingSelectedKey | null
  onSelectKey: (key: OnboardingSelectedKey) => void
}

interface SelfPayload {
  success?: boolean
  data?: {
    quota?: number
    email?: string
    new_user_quota_rewarded?: boolean
  }
  new_user_quota_rewarded?: boolean
}

/** Step 2: quota readiness (block A) and in-place API key creation (block B). */
export function CredentialsStep(props: CredentialsStepProps) {
  const user = useAuthStore((state) => state.auth.user)
  const [bindOpen, setBindOpen] = useState(false)

  const selfQuery = useQuery({
    queryKey: ['onboarding', 'self', user?.id],
    queryFn: async () => (await getSelf()) as SelfPayload,
    staleTime: 0,
  })
  const self = selfQuery.data?.data
  const email = self?.email ?? user?.email ?? ''

  const handleBindSuccess = async () => {
    const refreshed = await selfQuery.refetch()
    const next = (refreshed.data as { data?: typeof user } | undefined)?.data
    if (next) useAuthStore.getState().auth.setUser(next)
  }

  return (
    <div className='space-y-4'>
      <QuotaBlock
        flags={props.flags}
        quota={Number(self?.quota ?? user?.quota ?? 0)}
        rewarded={
          (self?.new_user_quota_rewarded ??
            selfQuery.data?.new_user_quota_rewarded) === true
        }
        emailBound={email !== ''}
        onBindEmail={() => setBindOpen(true)}
      />
      <ApiKeyBlock
        useCase={props.useCase}
        selectedKey={props.selectedKey}
        onSelect={props.onSelectKey}
      />
      <EmailBindDialog
        open={bindOpen}
        onOpenChange={setBindOpen}
        currentEmail={email}
        onSuccess={handleBindSuccess}
      />
    </div>
  )
}
