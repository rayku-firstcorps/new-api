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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { OnboardingUseCase } from '@/features/auth/types'
import {
  formatDisplayKey,
  getPreferredKey,
} from '@/features/dashboard/lib/setup-guide'
import { createApiKey, fetchTokenKey, getApiKeys } from '@/features/keys/api'
import { ERROR_MESSAGES } from '@/features/keys/constants'
import {
  getApiKeyFormDefaultValues,
  transformFormDataToPayload,
} from '@/features/keys/lib/api-key-form'
import type { ApiKey } from '@/features/keys/types'
import { handleServerError } from '@/lib/handle-server-error'
import { requireServerSuccess } from '@/lib/server-error-message'

import type { OnboardingSelectedKey } from '../types'

const ONBOARDING_KEYS_QUERY_KEY = ['onboarding', 'api-keys'] as const

interface ApiKeyBlockProps {
  useCase: OnboardingUseCase
  selectedKey: OnboardingSelectedKey | null
  onSelect: (key: OnboardingSelectedKey) => void
}

/** Full keys are `sk-` plus the stored value; only the masked form is ever rendered. */
function toSelectedKey(item: ApiKey, fullKey?: string): OnboardingSelectedKey {
  return {
    id: item.id,
    name: item.name,
    maskedKey: formatDisplayKey(`sk-${item.key}`),
    fullKey,
  }
}

/**
 * Step 2 block B: pick an existing usable key or create one in place.
 * The plaintext key lives only in the `selectedKey` memory state.
 */
export function ApiKeyBlock(props: ApiKeyBlockProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const selectionRef = useRef(0)
  const autoSelectedRef = useRef(false)

  const keysQuery = useQuery({
    queryKey: ONBOARDING_KEYS_QUERY_KEY,
    queryFn: async () => {
      const result = requireServerSuccess(await getApiKeys({ p: 1, size: 10 }))
      return result.data?.items ?? []
    },
    staleTime: 0,
  })
  const items = keysQuery.data
  const preferred = items ? getPreferredKey(items) : null
  const usableKey = preferred?.status === 1 ? preferred : null

  const selectItem = async (item: ApiKey) => {
    const requestId = ++selectionRef.current
    props.onSelect(toSelectedKey(item))
    try {
      const result = await fetchTokenKey(item.id)
      const key = result.success ? result.data?.key : undefined
      if (!key) {
        handleServerError(result, t('Failed to copy to clipboard'))
        return
      }
      if (requestId === selectionRef.current) {
        props.onSelect(toSelectedKey(item, `sk-${key}`))
      }
    } catch (error) {
      handleServerError(error, t('Failed to copy to clipboard'))
    }
  }

  useEffect(() => {
    if (autoSelectedRef.current || props.selectedKey || !usableKey) return
    autoSelectedRef.current = true
    void selectItem(usableKey)
    // Preselect the existing key once; later selections are user driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usableKey?.id, props.selectedKey])

  const keyName =
    name ?? (props.useCase === 'coding' ? 'Claude Code' : 'Default Key')

  const handleCreate = async () => {
    const trimmed = keyName.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      const knownIds = new Set((items ?? []).map((item) => item.id))
      const payload = transformFormDataToPayload({
        ...getApiKeyFormDefaultValues(false),
        name: trimmed,
        unlimited_quota: true,
        expired_time: null,
      })
      const created = await createApiKey(payload)
      if (!created.success) {
        handleServerError(created, t(ERROR_MESSAGES.CREATE_FAILED))
        return
      }
      const latest = requireServerSuccess(await getApiKeys({ p: 1, size: 10 }))
      const latestItems = latest.data?.items ?? []
      queryClient.setQueryData(ONBOARDING_KEYS_QUERY_KEY, latestItems)
      const newItem = latestItems
        .filter((item) => !knownIds.has(item.id))
        .sort((a, b) => b.id - a.id)[0]
      if (!newItem) {
        handleServerError(created, t(ERROR_MESSAGES.CREATE_FAILED))
        return
      }
      setCreatingNew(false)
      await selectItem(newItem)
    } catch (error) {
      handleServerError(error, t(ERROR_MESSAGES.CREATE_FAILED))
    } finally {
      setSubmitting(false)
    }
  }

  const showCreateForm = !keysQuery.isLoading && (creatingNew || !usableKey)
  const selected = props.selectedKey

  return (
    <section
      aria-label={t('API key')}
      className='bg-card space-y-3 rounded-xl border p-4'
    >
      <div className='flex items-center gap-2'>
        <KeyRound className='text-muted-foreground size-4' aria-hidden />
        <h3 className='text-sm font-semibold'>
          {t('Create your first API key')}
        </h3>
      </div>

      {keysQuery.isLoading && (
        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Loader2 className='size-4 animate-spin' aria-hidden />
          {t('Loading')}
        </div>
      )}

      {selected && !showCreateForm && (
        <div className='flex flex-wrap items-center gap-3'>
          <CheckCircle2 className='text-success size-4' aria-hidden />
          <div className='min-w-0 flex-1'>
            <p className='text-sm font-medium'>
              {t('API key ready')}: {selected.name}
            </p>
            <code className='text-muted-foreground text-xs'>
              {selected.maskedKey}
            </code>
          </div>
          {selected.fullKey ? (
            <CopyButton
              value={selected.fullKey}
              variant='outline'
              size='sm'
              aria-label={t('Copy full key')}
            >
              {t('Copy full key')}
            </CopyButton>
          ) : (
            <Button type='button' variant='outline' size='sm' disabled>
              <Loader2 className='size-4 animate-spin' aria-hidden />
              {t('Copy full key')}
            </Button>
          )}
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => setCreatingNew(true)}
          >
            {t('Create another key')}
          </Button>
        </div>
      )}

      {showCreateForm && (
        <div className='flex flex-wrap items-end gap-3'>
          <div className='min-w-48 flex-1 space-y-1.5'>
            <Label htmlFor='onboarding-key-name'>{t('Key name')}</Label>
            <Input
              id='onboarding-key-name'
              value={keyName}
              maxLength={50}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <Button
            type='button'
            disabled={submitting || !keyName.trim()}
            onClick={handleCreate}
          >
            {submitting && (
              <Loader2 className='size-4 animate-spin' aria-hidden />
            )}
            {t('Generate key')}
          </Button>
          {creatingNew && usableKey && (
            <Button
              type='button'
              variant='ghost'
              onClick={() => setCreatingNew(false)}
            >
              {t('Cancel')}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
