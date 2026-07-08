import { useState } from 'react'
import { ImageOff, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ImageGenerationTemplateDetail } from '../types'

interface Props {
  template: ImageGenerationTemplateDetail | null
  open: boolean
  onClose: () => void
  onUsePrompt: (prompt: string) => void
}

function DetailImage({ url, alt }: { url: string; alt: string }) {
  const { t } = useTranslation()
  const [err, setErr] = useState(false)

  if (err || !url) {
    return (
      <div className='bg-muted text-muted-foreground flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg'>
        <ImageOff className='size-8 opacity-40' />
        <span className='text-xs'>{t('Image unavailable')}</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className='aspect-[4/3] w-full rounded-lg object-cover'
      onError={() => setErr(true)}
    />
  )
}

export function TemplateDetailDialog({
  template,
  open,
  onClose,
  onUsePrompt,
}: Props) {
  const { t } = useTranslation()

  if (!template) return null

  const handleUsePrompt = () => {
    onUsePrompt(template.prompt)
    onClose()
  }

  const imageUrls =
    template.image_urls?.length > 0
      ? template.image_urls
      : template.image_url
        ? [template.image_url]
        : []

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader className='flex flex-row items-start justify-between gap-2 pr-8'>
          <DialogTitle className='text-lg leading-snug'>
            {template.title}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {imageUrls.length === 0 ? null : imageUrls.length === 1 ? (
            <DetailImage url={imageUrls[0]} alt={template.title} />
          ) : (
            <div className='grid grid-cols-2 gap-2'>
              {imageUrls.slice(0, 4).map((url, i) => (
                <DetailImage key={i} url={url} alt={`${template.title} ${i + 1}`} />
              ))}
            </div>
          )}

          {template.description && (
            <p className='text-muted-foreground text-sm leading-6'>
              {template.description}
            </p>
          )}

          {template.tags.length > 0 && (
            <div className='flex flex-wrap gap-1.5'>
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className='bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs'
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className='space-y-2'>
            <div className='text-sm font-semibold'>{t('Prompt')}</div>
            <div
              className='bg-muted/50 border-border/60 max-h-[360px] overflow-y-auto rounded-lg border p-3 text-sm leading-6 whitespace-pre-wrap'
            >
              {template.prompt}
            </div>
          </div>

          <div className='pt-2'>
            <Button className='w-full gap-2' onClick={handleUsePrompt}>
              <Wand2 className='size-4' />
              {t('Use Prompt')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
