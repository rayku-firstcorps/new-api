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
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/ui/markdown'
import { getPublicPromotionByCode, recordPromotionClick } from '../api'
import {
  DEFAULT_PROMOTION_REWARD_BANNER,
  sanitizePromotionBannerHtml,
} from '../lib'
import type { PromotionLink, PromotionRewardBannerConfig } from '../types'

const DEFAULT_LANDING_MIN_WIDTH = 960
const DEFAULT_LANDING_MIN_HEIGHT = 720

function BannerContent({
  format,
  content,
}: {
  format: 'plain_text' | 'markdown' | 'html'
  content: string
}) {
  if (format === 'html') {
    const sanitized = sanitizePromotionBannerHtml(content)
    return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
  }

  if (format === 'markdown') {
    return <Markdown className='prose-sm max-w-none'>{content}</Markdown>
  }

  return <p className='text-sm leading-6 whitespace-pre-wrap'>{content}</p>
}

function getExplicitPromotionCode(): string {
  if (typeof window === 'undefined') return ''
  const params = new URLSearchParams(window.location.search)
  return (
    params.get('promo')?.trim() || params.get('promotion_code')?.trim() || ''
  )
}

export function PromotionLandingDialog() {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(false)
  const promoCode = useMemo(() => getExplicitPromotionCode(), [])

  const linkQuery = useQuery({
    queryKey: ['promotion-landing-link-public', promoCode],
    queryFn: async () => {
      if (!promoCode) return null
      const res = await getPublicPromotionByCode(promoCode)
      return (res.data || null) as PromotionLink | null
    },
    enabled: !!promoCode,
    retry: false,
  })

  const banner = useMemo<PromotionRewardBannerConfig>(() => {
    const link = linkQuery.data
    if (!link) {
      return DEFAULT_PROMOTION_REWARD_BANNER
    }
    return {
      title:
        link.landing_title ||
        link.name ||
        DEFAULT_PROMOTION_REWARD_BANNER.title,
      content_format:
        link.landing_content_format ||
        DEFAULT_PROMOTION_REWARD_BANNER.content_format,
      content: link.landing_content || DEFAULT_PROMOTION_REWARD_BANNER.content,
      image_url: link.landing_image_url || '',
      image_position:
        link.landing_image_position ||
        DEFAULT_PROMOTION_REWARD_BANNER.image_position,
      primary_button: link.landing_primary_button || '',
      secondary_button: link.landing_secondary_button || '',
    }
  }, [linkQuery.data])

  const popupMinWidth = Math.max(
    linkQuery.data?.landing_min_width || DEFAULT_LANDING_MIN_WIDTH,
    0
  )
  const popupMinHeight = Math.max(
    linkQuery.data?.landing_min_height || DEFAULT_LANDING_MIN_HEIGHT,
    0
  )
  const heroMinHeight = Math.max(Math.round(popupMinHeight * 0.62), 360)

  useEffect(() => {
    if (!promoCode || dismissed || !linkQuery.data) return
    recordPromotionClick(promoCode).catch(() => {
      // Keep popup usable even if attribution write fails.
    })
  }, [dismissed, linkQuery.data, promoCode])

  if (!promoCode || dismissed || linkQuery.isError || !linkQuery.data)
    return null

  return (
    <Dialog open onOpenChange={(open) => setDismissed(!open)}>
      <DialogContent
        className='dark:bg-background overflow-hidden border-amber-200/70 bg-white p-0 shadow-2xl dark:border-amber-800/50'
        style={{
          width: `min(${popupMinWidth}px, calc(100vw - 2rem))`,
          minWidth: `min(${popupMinWidth}px, calc(100vw - 2rem))`,
          minHeight: `min(${popupMinHeight}px, calc(100vh - 2rem))`,
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        <div
          className='rounded-inherit overflow-hidden'
          style={{
            minHeight: `min(${popupMinHeight}px, calc(100vh - 2rem))`,
          }}
        >
          <div
            className='bg-muted relative w-full overflow-hidden'
            style={{
              minHeight: `min(${heroMinHeight}px, 75vh)`,
            }}
          >
            {banner.image_url ? (
              <div className='absolute inset-0 flex items-center justify-center bg-black/5 dark:bg-black/20'>
                <img
                  src={banner.image_url}
                  alt={banner.title || t('Promotion image')}
                  className='h-full w-full object-fill object-center'
                />
              </div>
            ) : (
              <div className='dark:via-background dark:to-background absolute inset-0 flex h-full w-full items-center justify-center bg-linear-to-br from-amber-100 via-orange-50 to-white dark:from-amber-950/30'>
                <div className='bg-background/80 flex h-28 w-28 items-center justify-center rounded-3xl border border-amber-200/70 text-amber-700 shadow-sm dark:border-amber-800/50 dark:text-amber-300'>
                  <Gift className='h-12 w-12' />
                </div>
              </div>
            )}
            <div className='pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-black/50 to-transparent' />
          </div>

          <div className='space-y-5 p-6 md:p-8'>
            <DialogHeader className='space-y-3 text-left'>
              <DialogTitle className='text-foreground text-2xl leading-8 font-semibold md:text-3xl'>
                {banner.title || t('Welcome Gift for New Users')}
              </DialogTitle>
              <DialogDescription render={<div className='text-foreground' />}>
                <BannerContent
                  format={banner.content_format}
                  content={
                    banner.content || DEFAULT_PROMOTION_REWARD_BANNER.content
                  }
                />
              </DialogDescription>
            </DialogHeader>

            <div className='text-muted-foreground text-sm'>
              {t('Promotion Code')}:{' '}
              <span className='font-mono'>{promoCode}</span>
            </div>

            <div className='flex flex-wrap gap-3'>
              <Button
                size='lg'
                className='min-w-32'
                render={<Link to='/sign-up' search={{ promo: promoCode }} />}
              >
                {banner.primary_button || t('Get Started')}
              </Button>
              <Button
                variant='outline'
                size='lg'
                onClick={() => setDismissed(true)}
              >
                {banner.secondary_button || t('Later')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
