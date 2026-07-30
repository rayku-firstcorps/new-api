import { ImageOff, Loader2, RefreshCw, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'

import { generateImage } from '../api'
import type {
  GeneratedImage,
  GenerationOptions,
  GenerationStatus,
} from '../types'

const SIZE_OPTIONS = ['1024x1024', '1024x1536', '1536x1024'] as const

interface Props {
  activePrompt: string
  defaultModel?: string
  templateId?: number
  onRequestLogin: () => void
}

export function GenerationPanel({
  activePrompt,
  defaultModel = 'gpt-image-1',
  templateId,
  onRequestLogin,
}: Props) {
  const { t } = useTranslation()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user

  const [options, setOptions] = useState<GenerationOptions>({
    prompt: activePrompt,
    model: defaultModel,
    size: '1024x1024',
    n: 1,
  })
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  // Sync prompt from parent
  if (options.prompt !== activePrompt && activePrompt) {
    setOptions((prev) => ({ ...prev, prompt: activePrompt }))
  }

  const handleGenerate = async () => {
    if (!options.prompt.trim()) {
      toast.error(t('Please enter a prompt'))
      return
    }
    setStatus('loading')
    setErrorMsg('')
    try {
      const result = await generateImage({
        template_id: templateId,
        model: options.model,
        prompt: options.prompt,
        size: options.size,
        n: options.n,
      })
      setImages(result.images)
      setStatus('success')
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t('Generation failed, please retry')
      setErrorMsg(msg)
      setStatus('error')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className='border-border/60 bg-background flex flex-col gap-4 rounded-xl border p-4'>
        <div className='text-base font-semibold'>{t('Generate Image')}</div>
        <p className='text-muted-foreground text-sm leading-6'>
          {t('Sign in to use template prompts and generate images.')}
        </p>
        <Button onClick={onRequestLogin}>{t('Sign In')}</Button>
      </div>
    )
  }

  return (
    <div className='border-border/60 bg-background flex flex-col gap-4 rounded-xl border p-4'>
      <div className='text-base font-semibold'>{t('Generate Image')}</div>

      {!activePrompt ? (
        <p className='text-muted-foreground text-sm'>
          {t('Select a prompt from the left to get started.')}
        </p>
      ) : (
        <>
          <div className='space-y-1.5'>
            <Label className='text-xs'>{t('Prompt')}</Label>
            <textarea
              value={options.prompt}
              onChange={(e) =>
                setOptions((prev) => ({ ...prev, prompt: e.target.value }))
              }
              rows={5}
              className='border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm leading-5 shadow-xs focus-visible:ring-1 focus-visible:outline-none'
            />
          </div>

          <div className='space-y-1.5'>
            <Label className='text-xs'>{t('Size')}</Label>
            <Select
              value={options.size}
              onValueChange={(v) =>
                setOptions((prev) => ({
                  ...prev,
                  size: v as GenerationOptions['size'],
                }))
              }
            >
              <SelectTrigger className='h-8 text-sm'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-1.5'>
            <Label className='text-xs'>{t('Count')}</Label>
            <Select
              value={String(options.n)}
              onValueChange={(v) =>
                setOptions((prev) => ({ ...prev, n: Number(v) }))
              }
            >
              <SelectTrigger className='h-8 text-sm'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className='gap-2'
            disabled={status === 'loading' || !options.prompt.trim()}
            onClick={() => void handleGenerate()}
          >
            {status === 'loading' ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Wand2 className='size-4' />
            )}
            {t('Generate')}
          </Button>
        </>
      )}

      {status === 'error' && (
        <div className='border-destructive/30 bg-destructive/5 rounded-lg border p-3 text-sm'>
          <p className='text-destructive'>{errorMsg}</p>
          <Button
            size='sm'
            variant='ghost'
            className='mt-2 gap-1.5'
            onClick={() => void handleGenerate()}
          >
            <RefreshCw className='size-3.5' />
            {t('Retry')}
          </Button>
        </div>
      )}

      {status === 'success' && images.length > 0 && (
        <div className='space-y-2'>
          <div className='text-xs font-medium'>{t('Results')}</div>
          <div className='grid gap-2'>
            {images.map((img, i) => (
              <GeneratedImageItem key={i} image={img} />
            ))}
          </div>
        </div>
      )}

      {status === 'idle' && activePrompt && (
        <div className='text-muted-foreground rounded-lg border border-dashed p-4 text-center text-xs'>
          {t('No images yet')}
        </div>
      )}
    </div>
  )
}

function GeneratedImageItem({ image }: { image: GeneratedImage }) {
  const { t } = useTranslation()
  const [err, setErr] = useState(false)

  if (err || !image.url) {
    return (
      <div className='bg-muted text-muted-foreground flex aspect-square items-center justify-center rounded-lg'>
        <ImageOff className='size-6 opacity-40' />
      </div>
    )
  }

  return (
    <a
      href={image.url}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={t('View generated image')}
    >
      <img
        src={image.url}
        alt={t('Generated image')}
        className='w-full rounded-lg object-cover transition-opacity hover:opacity-90'
        onError={() => setErr(true)}
      />
    </a>
  )
}
