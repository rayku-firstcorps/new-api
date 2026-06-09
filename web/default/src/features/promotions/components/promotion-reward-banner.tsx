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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { Gift, Mail, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { getSelf } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Markdown } from '@/components/ui/markdown'
import { claimSelfPromotionReward, getSelfPromotionReward } from '../api'
import {
  DEFAULT_PROMOTION_REWARD_BANNER,
  getPromotionRewardStatusLabel,
  sanitizePromotionBannerHtml,
} from '../lib'

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

export function PromotionRewardBanner() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.auth.setUser)
  const [dismissed, setDismissed] = useState(false)
  const [claiming, setClaiming] = useState(false)

  const rewardQuery = useQuery({
    queryKey: ['self-promotion-reward'],
    queryFn: getSelfPromotionReward,
    staleTime: 60 * 1000,
  })

  useEffect(() => {
    setDismissed(false)
  }, [rewardQuery.data?.data?.promotion_code, rewardQuery.data?.data?.reward_status])

  const reward = rewardQuery.data?.data
  const banner = reward?.banner ?? DEFAULT_PROMOTION_REWARD_BANNER

  const shouldShow =
    rewardQuery.data?.success &&
    reward?.has_pending_reward &&
    reward?.activity_type === 'trial_coupon' &&
    reward?.reward_status === 'pending_email' &&
    !dismissed

  const primaryLabel = useMemo(() => {
    if (banner.primary_button) return banner.primary_button
    if (!reward?.email_bound) return t('Bind email to claim trial coupon')
    return t('Claim Trial Coupon')
  }, [banner.primary_button, reward?.email_bound, t])

  const secondaryLabel = banner.secondary_button || t('Later')

  const helperText = useMemo(() => {
    if (!reward) return ''
    if (!reward.email_bound) {
      return t('Pending Email Binding')
    }
    if (!reward.email_domain_allowed) {
      return t(
        'Bind Gmail, iCloud, Outlook, 163, QQ, Hotmail or another eligible email to claim your trial coupon'
      )
    }
    return t(getPromotionRewardStatusLabel(reward.reward_status))
  }, [reward, t])

  const handleRefreshUser = async () => {
    const self = await getSelf().catch(() => null)
    if (self?.success && self.data) {
      setUser(self.data)
    }
  }

  const handlePrimaryAction = async () => {
    if (!reward) return
    if (!reward.email_bound) {
      await router.navigate({ to: '/profile' })
      return
    }

    setClaiming(true)
    try {
      const res = await claimSelfPromotionReward()
      if (res.success) {
        toast.success(t('Granted Reward'))
        await Promise.all([
          rewardQuery.refetch(),
          handleRefreshUser(),
          queryClient.invalidateQueries({ queryKey: ['status'] }),
        ])
      }
    } finally {
      setClaiming(false)
    }
  }

  if (!shouldShow || !reward) return null

  return (
    <Dialog open={shouldShow} onOpenChange={(open) => setDismissed(!open)}>
      <DialogContent className='max-w-xl overflow-hidden border-amber-200/70 bg-linear-to-br from-amber-50 via-white to-sky-50 p-0 shadow-xl dark:border-amber-800/50 dark:from-amber-950/20 dark:via-background dark:to-sky-950/20'>
        <div className='p-6'>
          <div className='flex items-start gap-4'>
            <div className='bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl'>
              {reward.email_bound ? (
                <Gift className='h-5 w-5' />
              ) : (
                <Mail className='h-5 w-5' />
              )}
            </div>
            <div className='min-w-0 flex-1 space-y-4'>
              <DialogHeader className='space-y-2 text-left'>
                <div className='flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300'>
                  <Sparkles className='h-4 w-4' />
                  {t('Registration Trial Coupon')}
                </div>
                <DialogTitle className='text-xl leading-7 font-semibold text-foreground'>
                  {banner.title || t('Bind email to claim trial coupon')}
                </DialogTitle>
                <DialogDescription asChild>
                  <div>
                    <BannerContent
                      format={banner.content_format}
                      content={
                        banner.content || DEFAULT_PROMOTION_REWARD_BANNER.content
                      }
                    />
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
                <span>
                  {t('Trial Coupon Amount')}: {reward.reward_amount}
                </span>
                <span>·</span>
                <span>{helperText}</span>
              </div>

              {!reward.email_domain_allowed &&
                reward.allowed_email_domains.length > 0 && (
                  <div className='text-muted-foreground text-xs'>
                    {t('Eligible email domains')}:&nbsp;
                    {reward.allowed_email_domains.join(', ')}
                  </div>
                )}

              <div className='flex flex-wrap gap-2'>
                <Button onClick={handlePrimaryAction} disabled={claiming}>
                  {claiming ? t('Saving...') : primaryLabel}
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setDismissed(true)}
                  disabled={claiming}
                >
                  {secondaryLabel}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
