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

import {
  adminCreateImageGenTemplate,
  adminDeleteImageGenTemplate,
  adminUpdateImageGenTemplate,
} from '../api'
import type { ImageGenTemplateInput } from '../types'

function useInvalidate() {
  const queryClient = useQueryClient()
  return () =>
    queryClient.invalidateQueries({ queryKey: ['admin-image-gen-templates'] })
}

export function useCreateImageGenTemplate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (data: ImageGenTemplateInput) =>
      adminCreateImageGenTemplate(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('Template created successfully'))
        invalidate()
      } else {
        toast.error(res.message || i18next.t('Failed to create template'))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to create template'))
    },
  })
}

export function useUpdateImageGenTemplate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ImageGenTemplateInput }) =>
      adminUpdateImageGenTemplate(id, data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('Template updated successfully'))
        invalidate()
      } else {
        toast.error(res.message || i18next.t('Failed to update template'))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to update template'))
    },
  })
}

export function useDeleteImageGenTemplate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: number) => adminDeleteImageGenTemplate(id),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(i18next.t('Template deleted successfully'))
        invalidate()
      } else {
        toast.error(res.message || i18next.t('Failed to delete template'))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to delete template'))
    },
  })
}
