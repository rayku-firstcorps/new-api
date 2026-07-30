import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import type { ImageGenerationTag } from '../types'

interface Props {
  keyword: string
  selectedTag: string
  tags: ImageGenerationTag[]
  onKeywordChange: (v: string) => void
  onSearch: () => void
  onTagChange: (tag: string) => void
  onClear: () => void
}

export function TemplateFilters({
  keyword,
  selectedTag,
  tags,
  onKeywordChange,
  onSearch,
  onTagChange,
  onClear,
}: Props) {
  const { t } = useTranslation()
  const hasCriteria = keyword.trim() !== '' || selectedTag !== ''

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className='space-y-3'>
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2' />
          <Input
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('Search prompts, categories or titles...')}
            className='pl-9'
          />
        </div>
        <Button onClick={onSearch}>{t('Search')}</Button>
        {hasCriteria && (
          <Button
            variant='ghost'
            size='icon'
            onClick={onClear}
            aria-label={t('Clear')}
          >
            <X className='size-4' />
          </Button>
        )}
      </div>

      <div className='-mx-1 flex flex-wrap gap-1.5 px-1'>
        <button
          type='button'
          onClick={() => onTagChange('')}
          className={cn(
            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
            selectedTag === ''
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
          )}
        >
          {t('All')}
        </button>
        {tags.map((tag) => (
          <button
            key={tag.name}
            type='button'
            onClick={() => onTagChange(tag.name)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selectedTag === tag.name
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
            )}
          >
            {tag.name}
            <span className='ml-1 opacity-60'>{tag.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
