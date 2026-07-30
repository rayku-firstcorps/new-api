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
import {
  Download,
  Eye,
  EyeOff,
  ImageOff,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useDeleteImageGenTemplate } from '../hooks/use-image-gen-template-mutations'
import type { ImageGenTemplate } from '../types'

type Props = {
  items: ImageGenTemplate[]
  total: number
  page: number
  keyword: string
  onKeywordChange: (v: string) => void
  onSearch: () => void
  onPageChange: (p: number) => void
  onCreate: () => void
  onEdit: (t: ImageGenTemplate) => void
  onExportJson: () => void
  onExportExcel: () => void
  onImportFile: (file: File) => void
  exporting?: boolean
  importing?: boolean
  pageSize: number
}

function CoverThumb({ url, alt }: { url: string; alt: string }) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return (
      <div
        className='bg-muted text-muted-foreground flex h-10 w-14 items-center justify-center rounded-md'
        title={t('Image unavailable')}
      >
        <ImageOff className='h-4 w-4' />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      loading='lazy'
      className='bg-muted h-10 w-14 rounded-md object-cover'
      onError={() => setFailed(true)}
    />
  )
}

function tagsDisplay(json: string): string {
  if (!json) return '-'
  try {
    const arr = JSON.parse(json) as string[]
    return arr.join(', ') || '-'
  } catch {
    return json
  }
}

export function ImageGenTemplateTable(props: Props) {
  const { t } = useTranslation()
  const del = useDeleteImageGenTemplate()
  const [deleteTarget, setDeleteTarget] = useState<ImageGenTemplate | null>(
    null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const totalPages = Math.ceil(props.total / props.pageSize)

  const handleDelete = async () => {
    if (!deleteTarget) return
    await del.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) props.onImportFile(file)
    // 清空以便同一文件可重复选择
    e.target.value = ''
  }

  return (
    <>
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Input
            placeholder={t('Search templates...')}
            value={props.keyword}
            onChange={(e) => props.onKeywordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && props.onSearch()}
            className='w-56'
          />
          <Button variant='outline' size='sm' onClick={props.onSearch}>
            {t('Search')}
          </Button>
        </div>
        <div className='flex items-center gap-2'>
          <input
            ref={fileInputRef}
            type='file'
            accept='.json,.xlsx,.xls,.csv'
            className='hidden'
            onChange={handleFileChange}
          />
          <Button
            variant='outline'
            size='sm'
            disabled={props.importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className='mr-1.5 h-4 w-4' />
            {props.importing ? t('Importing...') : t('Import')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='outline'
                  size='sm'
                  disabled={props.exporting}
                />
              }
            >
              <Download className='mr-1.5 h-4 w-4' />
              {props.exporting ? t('Exporting...') : t('Export')}
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={props.onExportJson}>
                {t('Export as JSON')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={props.onExportExcel}>
                {t('Export as Excel')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size='sm' onClick={props.onCreate}>
            <Plus className='mr-1.5 h-4 w-4' />
            {t('Add Template')}
          </Button>
        </div>
      </div>

      {props.items.length === 0 ? (
        <div className='text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm'>
          {t('No templates found.')}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-10'>ID</TableHead>
                <TableHead className='w-20'>{t('Cover')}</TableHead>
                <TableHead>{t('Title')}</TableHead>
                <TableHead>{t('Tags')}</TableHead>
                <TableHead className='w-16 text-center'>{t('Sort')}</TableHead>
                <TableHead className='w-20'>{t('Status')}</TableHead>
                <TableHead className='text-right'>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className='text-muted-foreground text-xs'>
                    {item.id}
                  </TableCell>
                  <TableCell>
                    <CoverThumb url={item.image_url} alt={item.title} />
                  </TableCell>
                  <TableCell>
                    <div className='font-medium'>{item.title}</div>
                    {item.description && (
                      <div className='text-muted-foreground max-w-[260px] truncate text-xs'>
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className='text-muted-foreground max-w-[180px] truncate text-xs'>
                    {tagsDisplay(item.tags)}
                  </TableCell>
                  <TableCell className='text-center text-sm'>
                    {item.sort}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      label={item.visible ? t('Visible') : t('Hidden')}
                      variant={item.visible ? 'success' : 'neutral'}
                      copyable={false}
                      icon={item.visible ? Eye : EyeOff}
                    />
                  </TableCell>
                  <TableCell className='text-right'>
                    <div className='flex justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => props.onEdit(item)}
                        aria-label={t('Edit')}
                      >
                        <Pencil className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => setDeleteTarget(item)}
                        aria-label={t('Delete')}
                      >
                        <Trash2 className='text-destructive h-4 w-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>
                {t('Total {{count}} templates', { count: props.total })}
              </span>
              <div className='flex gap-1'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={props.page <= 1}
                  onClick={() => props.onPageChange(props.page - 1)}
                >
                  {t('Previous')}
                </Button>
                <span className='flex items-center px-2 text-xs'>
                  {props.page} / {totalPages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={props.page >= totalPages}
                  onClick={() => props.onPageChange(props.page + 1)}
                >
                  {t('Next')}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('Delete Template')}
        desc={t('Are you sure you want to delete "{{name}}"?', {
          name: deleteTarget?.title || '',
        })}
        confirmText={t('Delete')}
        destructive
        handleConfirm={handleDelete}
        isLoading={del.isPending}
      />
    </>
  )
}
