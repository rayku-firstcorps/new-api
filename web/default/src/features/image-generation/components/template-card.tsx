import { useState } from 'react'
import { ImageOff, Info, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ImageGenerationTemplateListItem } from '../types'

interface Props {
  template: ImageGenerationTemplateListItem
  onUsePrompt: (template: ImageGenerationTemplateListItem) => void
  onDetail: (template: ImageGenerationTemplateListItem) => void
}

export function TemplateCard({ template, onUsePrompt, onDetail }: Props) {
  const { t } = useTranslation()
  const [imgError, setImgError] = useState(false)

  return (
    <div className='border-border/60 bg-background flex flex-col overflow-hidden rounded-lg border transition-shadow hover:shadow-md'>
      <button
        type='button'
        className='block w-full cursor-pointer'
        onClick={() => onDetail(template)}
        aria-label={t('View details')}
      >
        <div className='bg-muted relative aspect-[4/3] w-full overflow-hidden'>
          {imgError || !template.image_url ? (
            <div className='text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2'>
              <ImageOff className='size-8 opacity-40' />
              <span className='text-xs'>{t('Image unavailable')}</span>
            </div>
          ) : (
            <img
              src={template.image_url}
              alt={template.title}
              className='h-full w-full object-cover'
              onError={() => setImgError(true)}
            />
          )}
        </div>
      </button>

      <div className='flex flex-1 flex-col gap-2 p-3'>
        <h3 className='line-clamp-2 text-sm font-semibold leading-snug'>
          {template.title}
        </h3>

        {template.description && (
          <p className='text-muted-foreground line-clamp-2 text-xs leading-5'>
            {template.description}
          </p>
        )}

        {template.prompt_excerpt && (
          <div className='bg-muted/60 rounded-md p-2'>
            <p className='text-muted-foreground line-clamp-4 text-xs leading-5'>
              {template.prompt_excerpt}
            </p>
          </div>
        )}

        {template.tags.length > 0 && (
          <div className='flex flex-wrap gap-1'>
            {template.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className='bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 text-[11px]'
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className='mt-auto flex gap-2 pt-1'>
          <Button
            size='sm'
            className='flex-1 gap-1.5'
            onClick={() => onUsePrompt(template)}
          >
            <Wand2 className='size-3.5' />
            {t('Use Prompt')}
          </Button>
          <Button
            size='sm'
            variant='outline'
            className='gap-1.5'
            onClick={() => onDetail(template)}
          >
            <Info className='size-3.5' />
            {t('Details')}
          </Button>
        </div>
      </div>
    </div>
  )
}
