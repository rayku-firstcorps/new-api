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
import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import { toast } from 'sonner'
import { createSSOClient, deleteSSOClient, updateSSOClient } from '../api'
import type { SSOClient } from '../types'

function useInvalidateOnSuccess() {
  const queryClient = useQueryClient()
  return {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso-clients'] })
    },
  }
}

export function useCreateSSOClient() {
  const invalidate = useInvalidateOnSuccess()

  return useMutation({
    mutationFn: (data: Omit<SSOClient, 'id' | 'created_at' | 'updated_at'>) =>
      createSSOClient(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('SSO application created successfully'))
        invalidate.onSuccess()
      }
    },
    onError: (error: Error) => {
      toast.error(
        error.message || i18next.t('Failed to create SSO application')
      )
    },
  })
}

export function useUpdateSSOClient() {
  const invalidate = useInvalidateOnSuccess()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SSOClient> }) =>
      updateSSOClient(id, data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('SSO application updated successfully'))
        invalidate.onSuccess()
      }
    },
    onError: (error: Error) => {
      toast.error(
        error.message || i18next.t('Failed to update SSO application')
      )
    },
  })
}

export function useDeleteSSOClient() {
  const invalidate = useInvalidateOnSuccess()

  return useMutation({
    mutationFn: (id: number) => deleteSSOClient(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('SSO application deleted successfully'))
        invalidate.onSuccess()
      }
    },
    onError: (error: Error) => {
      toast.error(
        error.message || i18next.t('Failed to delete SSO application')
      )
    },
  })
}
