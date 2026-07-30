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
  adminExportImageGenTemplates,
  adminImportImageGenTemplates,
} from '../api'
import type { ImageGenTemplateExportItem } from '../types'

/** 拉取全部模板用于导出，返回导出项数组 */
export function useExportImageGenTemplates() {
  return useMutation({
    mutationFn: async (): Promise<ImageGenTemplateExportItem[]> => {
      const res = await adminExportImageGenTemplates()
      if (!res.success) {
        throw new Error(res.message || i18next.t('Failed to export templates'))
      }
      return res.data?.items ?? []
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to export templates'))
    },
  })
}

/** 批量导入模板（全部新增） */
export function useImportImageGenTemplates() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: ImageGenTemplateExportItem[]) =>
      adminImportImageGenTemplates(items),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success(
          i18next.t('Imported {{imported}} templates, {{failed}} failed', {
            imported: res.data.imported,
            failed: res.data.failed,
          })
        )
        queryClient.invalidateQueries({
          queryKey: ['admin-image-gen-templates'],
        })
      } else {
        toast.error(res.message || i18next.t('Failed to import templates'))
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || i18next.t('Failed to import templates'))
    },
  })
}
