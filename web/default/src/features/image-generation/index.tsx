import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PublicLayout } from '@/components/layout'
import { Button } from '@/components/ui/button'
import {
  getImageGenerationTags,
  getImageGenerationTemplate,
  getImageGenerationTemplates,
} from './api'
import { GenerationPanel } from './components/generation-panel'
import { TemplateCard } from './components/template-card'
import { TemplateDetailDialog } from './components/template-detail-dialog'
import { TemplateFilters } from './components/template-filters'
import type {
  ImageGenerationTag,
  ImageGenerationTemplateDetail,
  ImageGenerationTemplateListItem,
} from './types'

const PAGE_SIZE = 24

export function ImageGeneration() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState('')
  const [pendingKeyword, setPendingKeyword] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const [page, setPage] = useState(1)
  const [tags, setTags] = useState<ImageGenerationTag[]>([])
  const [templates, setTemplates] = useState<ImageGenerationTemplateListItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tagsLoading, setTagsLoading] = useState(true)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTemplate, setDetailTemplate] =
    useState<ImageGenerationTemplateDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [activePrompt, setActivePrompt] = useState('')
  const [activeTemplateId, setActiveTemplateId] = useState<number | undefined>()

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    setTagsLoading(true)
    getImageGenerationTags()
      .then((data) => {
        if (mounted.current) setTags(data.tags)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted.current) setTagsLoading(false)
      })
  }, [])

  const fetchTemplates = useCallback(
    async (kw: string, tag: string, p: number) => {
      setLoading(true)
      try {
        const data = await getImageGenerationTemplates({
          keyword: kw || undefined,
          tag: tag || undefined,
          page: p,
          page_size: PAGE_SIZE,
        })
        if (!mounted.current) return
        if (p === 1) {
          setTemplates(data.items)
        } else {
          setTemplates((prev) => [...prev, ...data.items])
        }
        setTotal(data.total)
      } catch {
        if (mounted.current) toast.error(t('Failed to load templates'))
      } finally {
        if (mounted.current) setLoading(false)
      }
    },
    [t]
  )

  useEffect(() => {
    setPage(1)
    void fetchTemplates(keyword, selectedTag, 1)
  }, [keyword, selectedTag, fetchTemplates])

  const handleSearch = () => {
    setKeyword(pendingKeyword)
  }

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag)
  }

  const handleClear = () => {
    setPendingKeyword('')
    setKeyword('')
    setSelectedTag('')
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    void fetchTemplates(keyword, selectedTag, next)
  }

  const handleDetail = async (template: ImageGenerationTemplateListItem) => {
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const detail = await getImageGenerationTemplate(template.id)
      if (mounted.current) setDetailTemplate(detail)
    } catch {
      if (mounted.current) {
        toast.error(t('Template not found or removed'))
        setDetailOpen(false)
      }
    } finally {
      if (mounted.current) setDetailLoading(false)
    }
  }

  const handleUsePromptFromCard = (template: ImageGenerationTemplateListItem) => {
    setActivePrompt(template.prompt_excerpt)
    setActiveTemplateId(template.id)
  }

  const handleUsePromptFromDetail = (prompt: string) => {
    setActivePrompt(prompt)
  }

  const handleRequestLogin = () => {
    void navigate({ to: '/sign-in' })
  }

  const hasMore = templates.length < total

  return (
    <PublicLayout showMainContainer={false}>
      <main className='bg-background min-h-svh w-full max-w-[100vw] overflow-x-hidden'>
        {/* Page header */}
        <div className='from-muted/30 to-background bg-gradient-to-b px-4 pt-24 pb-8 text-center'>
          <h1 className='text-3xl font-bold tracking-tight'>
            {t('Image Generation')}
          </h1>
          <p className='text-muted-foreground mx-auto mt-3 max-w-xl text-sm leading-6'>
            {t(
              'Browse curated image prompts, reuse templates, and generate images with your account.'
            )}
          </p>
        </div>

        <div className='mx-auto max-w-screen-xl px-4 pb-16 md:px-6'>
          {/* Filters */}
          <div className='mb-6'>
            <TemplateFilters
              keyword={pendingKeyword}
              selectedTag={selectedTag}
              tags={tagsLoading ? [] : tags}
              onKeywordChange={setPendingKeyword}
              onSearch={handleSearch}
              onTagChange={handleTagChange}
              onClear={handleClear}
            />
          </div>

          {/* Main layout: list + sidebar */}
          <div className='flex flex-col gap-6 lg:flex-row lg:items-start'>
            {/* Template grid */}
            <div className='min-w-0 flex-1'>
              {loading && templates.length === 0 ? (
                <div className='flex justify-center py-20'>
                  <Loader2 className='text-muted-foreground size-6 animate-spin' />
                </div>
              ) : templates.length === 0 ? (
                <div className='text-muted-foreground py-20 text-center text-sm'>
                  {keyword || selectedTag
                    ? t('No matching prompts found')
                    : t('No prompt templates yet')}
                </div>
              ) : (
                <>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                    {templates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        onUsePrompt={handleUsePromptFromCard}
                        onDetail={handleDetail}
                      />
                    ))}
                  </div>

                  {hasMore && (
                    <div className='mt-8 flex justify-center'>
                      <Button
                        variant='outline'
                        disabled={loading}
                        onClick={handleLoadMore}
                        className='gap-2'
                      >
                        {loading && (
                          <Loader2 className='size-4 animate-spin' />
                        )}
                        {t('Load More')}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Generation panel */}
            <div className='w-full shrink-0 lg:sticky lg:top-20 lg:w-[320px]'>
              <GenerationPanel
                activePrompt={activePrompt}
                templateId={activeTemplateId}
                onRequestLogin={handleRequestLogin}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Detail dialog */}
      {detailLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30'>
          <Loader2 className='size-8 animate-spin text-white' />
        </div>
      )}
      <TemplateDetailDialog
        template={detailTemplate}
        open={detailOpen && !detailLoading}
        onClose={() => {
          setDetailOpen(false)
          setDetailTemplate(null)
        }}
        onUsePrompt={handleUsePromptFromDetail}
      />
    </PublicLayout>
  )
}
