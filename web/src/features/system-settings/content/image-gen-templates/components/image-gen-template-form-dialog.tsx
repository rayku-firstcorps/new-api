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
import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  useCreateImageGenTemplate,
  useUpdateImageGenTemplate,
} from '../hooks/use-image-gen-template-mutations'
import type { ImageGenTemplate } from '../types'

type FormValues = {
  title: string
  description: string
  prompt: string
  image_url: string
  image_urls_text: string
  tags_text: string
  sort: number
  visible: boolean
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  template?: ImageGenTemplate | null
}

function tagsToJson(text: string): string {
  const tags = text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  return JSON.stringify(tags)
}

function jsonToTagsText(json: string): string {
  if (!json) return ''
  try {
    const arr = JSON.parse(json) as string[]
    return arr.join(', ')
  } catch {
    return json
  }
}

function urlsToJson(text: string): string {
  const urls = text
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean)
  return JSON.stringify(urls)
}

function jsonToUrlsText(json: string): string {
  if (!json) return ''
  try {
    const arr = JSON.parse(json) as string[]
    return arr.join('\n')
  } catch {
    return json
  }
}

function PreviewThumb({ url }: { url: string }) {
  const { t } = useTranslation()
  const [failed, setFailed] = useState(false)
  // url 变化时重置失败状态
  useEffect(() => {
    setFailed(false)
  }, [url])
  if (!url.trim()) return null
  if (failed) {
    return (
      <div
        className='bg-muted text-muted-foreground flex h-16 w-16 items-center justify-center rounded-md'
        title={t('Image unavailable')}
      >
        <ImageOff className='h-5 w-5' />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=''
      loading='lazy'
      className='bg-muted h-16 w-16 rounded-md object-cover'
      onError={() => setFailed(true)}
    />
  )
}

const DEFAULT_VALUES: FormValues = {
  title: '',
  description: '',
  prompt: '',
  image_url: '',
  image_urls_text: '',
  tags_text: '',
  sort: 0,
  visible: true,
}

export function ImageGenTemplateFormDialog({
  open,
  onOpenChange,
  template,
}: Props) {
  const { t } = useTranslation()
  const isEditing = !!template
  const create = useCreateImageGenTemplate()
  const update = useUpdateImageGenTemplate()

  const form = useForm<FormValues>({ defaultValues: DEFAULT_VALUES })

  useEffect(() => {
    if (open && template) {
      form.reset({
        title: template.title,
        description: template.description,
        prompt: template.prompt,
        image_url: template.image_url,
        image_urls_text: jsonToUrlsText(template.image_urls),
        tags_text: jsonToTagsText(template.tags),
        sort: template.sort,
        visible: template.visible,
      })
    } else if (open && !template) {
      form.reset(DEFAULT_VALUES)
    }
  }, [form, open, template])

  const onSubmit = async (values: FormValues) => {
    const payload = {
      title: values.title,
      description: values.description,
      prompt: values.prompt,
      image_url: values.image_url,
      image_urls: urlsToJson(values.image_urls_text),
      tags: tagsToJson(values.tags_text),
      sort: Number(values.sort),
      visible: values.visible,
    }

    if (isEditing && template) {
      const res = await update.mutateAsync({ id: template.id, data: payload })
      if (res.success) onOpenChange(false)
    } else {
      const res = await create.mutateAsync(payload)
      if (res.success) onOpenChange(false)
    }
  }

  const isPending = create.isPending || update.isPending

  const coverUrl = form.watch('image_url')
  const previewUrlsText = form.watch('image_urls_text')
  const previewUrls = previewUrlsText
    .split('\n')
    .map((u) => u.trim())
    .filter(Boolean)
    .slice(0, 4)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('Edit Image Gen Template')
              : t('Add Image Gen Template')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='flex items-center justify-between rounded-lg border p-3'>
              <FormField
                control={form.control}
                name='visible'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center gap-3 space-y-0'>
                    <FormLabel>{t('Visible')}</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='sort'
                render={({ field }) => (
                  <FormItem className='flex flex-row items-center gap-2 space-y-0'>
                    <FormLabel className='text-muted-foreground text-sm'>
                      {t('Sort')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        className='w-20'
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='title'
              rules={{ required: t('Title is required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('Template title')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Description')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('Short description')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='prompt'
              rules={{ required: t('Prompt is required') }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Prompt')}</FormLabel>
                  <FormControl>
                    <Textarea
                      className='min-h-[120px]'
                      placeholder={t('Image generation prompt')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='image_url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Cover Image URL')}</FormLabel>
                  <FormControl>
                    <Input placeholder='https://...' {...field} />
                  </FormControl>
                  {coverUrl.trim() && (
                    <div className='pt-1'>
                      <PreviewThumb url={coverUrl} />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='image_urls_text'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Preview Image URLs')}</FormLabel>
                  <FormControl>
                    <Textarea
                      className='min-h-[72px] font-mono text-xs'
                      placeholder={
                        'https://example.com/1.jpg\nhttps://example.com/2.jpg'
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('One URL per line (up to 4 images)')}
                  </FormDescription>
                  {previewUrls.length > 0 && (
                    <div className='flex flex-wrap gap-2 pt-1'>
                      {previewUrls.map((u, i) => (
                        <PreviewThumb key={`${u}-${i}`} url={u} />
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='tags_text'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Tags')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('Portrait, Landscape, Abstract')}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t('Comma-separated tags')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t('Cancel')}
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending
                  ? t('Saving...')
                  : isEditing
                    ? t('Update Template')
                    : t('Create Template')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
