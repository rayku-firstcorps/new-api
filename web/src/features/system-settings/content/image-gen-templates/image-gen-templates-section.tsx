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
import i18next from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { SettingsSection } from '../../components/settings-section'
import { ImageGenTemplateFormDialog } from './components/image-gen-template-form-dialog'
import { ImageGenTemplateTable } from './components/image-gen-template-table'
import {
  useExportImageGenTemplates,
  useImportImageGenTemplates,
} from './hooks/use-image-gen-template-io'
import { useImageGenTemplates } from './hooks/use-image-gen-templates'
import { downloadExcel, downloadJson, parseImportFile } from './lib/io'
import type { ImageGenTemplate } from './types'

const PAGE_SIZE = 20

export function ImageGenTemplatesSection() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] =
    useState<ImageGenTemplate | null>(null)

  const { data, isLoading } = useImageGenTemplates({
    keyword: searchKeyword,
    page,
    page_size: PAGE_SIZE,
  })

  const exportMutation = useExportImageGenTemplates()
  const importMutation = useImportImageGenTemplates()

  const buildExportFilename = (ext: string) => `image-gen-templates.${ext}`

  const handleExportJson = async () => {
    const items = await exportMutation.mutateAsync()
    downloadJson(items, buildExportFilename('json'))
  }

  const handleExportExcel = async () => {
    const items = await exportMutation.mutateAsync()
    downloadExcel(items, buildExportFilename('xlsx'))
  }

  const handleImportFile = async (file: File) => {
    let items
    try {
      items = await parseImportFile(file)
    } catch {
      toast.error(i18next.t('Invalid import file'))
      return
    }
    if (!items.length) {
      toast.error(i18next.t('Invalid import file'))
      return
    }
    await importMutation.mutateAsync(items)
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setDialogOpen(true)
  }

  const handleEdit = (t: ImageGenTemplate) => {
    setEditingTemplate(t)
    setDialogOpen(true)
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingTemplate(null)
  }

  const handleSearch = () => {
    setPage(1)
    setSearchKeyword(keyword)
  }

  if (isLoading) {
    return (
      <SettingsSection
        title={t('Image Gen Templates')}
        description={t(
          'Manage image generation prompt templates shown in the plaza'
        )}
      >
        <div className='text-muted-foreground py-8 text-center text-sm'>
          {t('Loading...')}
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection
      title={t('Image Gen Templates')}
      description={t(
        'Manage image generation prompt templates shown in the plaza'
      )}
    >
      <ImageGenTemplateTable
        items={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onSearch={handleSearch}
        onPageChange={setPage}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onExportJson={handleExportJson}
        onExportExcel={handleExportExcel}
        onImportFile={handleImportFile}
        exporting={exportMutation.isPending}
        importing={importMutation.isPending}
      />

      <ImageGenTemplateFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        template={editingTemplate}
      />
    </SettingsSection>
  )
}
