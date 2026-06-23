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
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/ui/markdown'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useAuthStore } from '@/stores/auth-store'
import { sanitizePromotionBannerHtml } from '@/features/promotions/lib'
import type { SplashAdConfig, SplashAdContentFormat } from '../types'
import {
  hasSplashAdShownToday,
  markSplashAdShownToday,
} from '../lib/storage'

const SKIP_COUNTDOWN_SECONDS = 3

function SplashContent({
  format,
  content,
}: {
  format: SplashAdContentFormat
  content: string
}) {
  if (!content) return null
  if (format === 'html') {
    const sanitized = sanitizePromotionBannerHtml(content)
    return <div dangerouslySetInnerHTML={{ __html: sanitized }} />
  }
  if (format === 'markdown') {
    return <Markdown className='prose-sm max-w-none'>{content}</Markdown>
  }
  return <p className='text-sm leading-6 whitespace-pre-wrap'>{content}</p>
}

/** Replace the {amount} placeholder with the configured reward amount. */
function fillAmount(text: string, amount: number): string {
  if (!text) return text
  // 金额为整数时不带小数（5 而非 5.00），非整数保留两位
  const display = Number.isInteger(amount) ? String(amount) : amount.toFixed(2)
  return text.replace(/\{amount\}/g, display)
}

/** Whether the splash ad is currently within its active time window. */
function isWithinWindow(config: SplashAdConfig): boolean {
  const now = Math.floor(Date.now() / 1000)
  if (config.start_time > 0 && now < config.start_time) return false
  if (config.end_time > 0 && now > config.end_time) return false
  return true
}

/**
 * Full-screen splash ad for unauthenticated visitors.
 * Shown at most once per device per day, skippable after a short countdown.
 */
export function SplashAdDialog() {
  const { t } = useTranslation()
  const { splashAd } = useSystemConfig()
  const { auth } = useAuthStore()
  const isAuthenticated = !!auth.user
  const location = useLocation()
  // 注册页强制展示（无视每日频控），保证拉新落地页一定能看到开屏
  const isSignUpPage = location.pathname.startsWith('/sign-up')

  // 配置是否符合展示条件（不含频控；频控在 effect 里单独判定，避免读写混在响应式依赖中）
  const configEligible = useMemo(() => {
    if (isAuthenticated) return false
    if (!splashAd || !splashAd.enabled) return false
    if (!isWithinWindow(splashAd)) return false
    if (!splashAd.image_url && !splashAd.content && !splashAd.title)
      return false
    return true
  }, [isAuthenticated, splashAd])

  const [open, setOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(SKIP_COUNTDOWN_SECONDS)

  // 决定是否真正展示：配置符合 → 打开。
  // 注册页(isSignUpPage)无视每日频控，必弹；其他页维持"每天一次"。
  useEffect(() => {
    if (!configEligible) return
    if (!isSignUpPage && hasSplashAdShownToday()) return
    markSplashAdShownToday()
    setOpen(true)
  }, [configEligible, isSignUpPage])

  // 跳过倒计时
  useEffect(() => {
    if (!open) return
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [open, secondsLeft])

  if (!open || !splashAd) return null

  const canSkipNow = secondsLeft <= 0

  return (
    <Dialog open onOpenChange={(next) => setOpen(next)}>
      <DialogContent
        showCloseButton={false}
        className='dark:bg-background overflow-hidden border-amber-200/70 bg-white p-0 shadow-2xl dark:border-amber-800/50'
        style={{
          width: 'min(640px, calc(100vw - 2rem))',
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        {/* 跳过按钮 + 倒计时 */}
        <button
          type='button'
          onClick={() => canSkipNow && setOpen(false)}
          disabled={!canSkipNow}
          className='absolute top-3 right-3 z-10 rounded-full bg-black/50 px-3 py-1 text-xs text-white transition hover:bg-black/70 disabled:cursor-default disabled:opacity-70'
        >
          {canSkipNow ? t('Skip') : t('Skip ({{n}}s)', { n: secondsLeft })}
        </button>

        <div className='rounded-inherit overflow-hidden'>
          {splashAd.image_url ? (
            <div className='bg-muted relative w-full overflow-hidden'>
              <img
                src={splashAd.image_url}
                alt={splashAd.title || t('Promotion image')}
                loading='lazy'
                className='h-auto max-h-[60vh] w-full object-contain'
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ) : null}

          <div className='space-y-5 p-6 md:p-8'>
            <DialogHeader className='space-y-3 text-left'>
              <DialogTitle className='text-foreground text-2xl leading-8 font-semibold md:text-3xl'>
                {fillAmount(splashAd.title, splashAd.reward_amount) ||
                  t('Welcome')}
              </DialogTitle>
              <DialogDescription render={<div className='text-foreground' />}>
                <SplashContent
                  format={splashAd.content_format}
                  content={fillAmount(splashAd.content, splashAd.reward_amount)}
                />
              </DialogDescription>
            </DialogHeader>

            <div className='flex flex-wrap gap-3'>
              <Button
                size='lg'
                className='min-w-32'
                onClick={() => setOpen(false)}
                render={<Link to={splashAd.cta_link || '/sign-up'} />}
              >
                {splashAd.cta_text || t('Sign Up for Free')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
