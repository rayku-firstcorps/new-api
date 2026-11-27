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
import { Link } from '@tanstack/react-router'
import { CheckCircle2, Gift, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'

import type { OnboardingFlags } from '../lib/availability'

interface QuotaBlockProps {
  flags: OnboardingFlags
  quota: number
  /** `new_user_quota_rewarded` from `/api/user/self`. */
  rewarded: boolean
  emailBound: boolean
  onBindEmail: () => void
}

/**
 * Step 2 block A. Never blocks the flow: every state allows creating a key first.
 * The client-side state only picks which hint to show; the bonus itself is
 * granted and enforced by the server.
 */
export function QuotaBlock(props: QuotaBlockProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)

  if (props.flags.selfUseMode) return null

  if (props.quota > 0) {
    return (
      <section
        aria-label={t('Account balance')}
        className='border-success/40 bg-success/5 flex flex-wrap items-center gap-3 rounded-xl border p-4'
      >
        <CheckCircle2 className='text-success size-5 shrink-0' aria-hidden />
        <p className='min-w-0 flex-1 text-sm font-semibold'>
          {t('Available balance')}:{' '}
          {formatQuotaWithCurrency(props.quota, { locale })}
        </p>
        {props.rewarded && (
          <Badge variant='secondary'>{t('Includes signup bonus')}</Badge>
        )}
      </section>
    )
  }

  const claimable =
    props.flags.newUserQuotaEnabled &&
    props.flags.newUserQuotaRequireEmail &&
    props.flags.newUserQuotaAmount > 0 &&
    !props.emailBound

  if (claimable) {
    return (
      <section
        aria-label={t('Account balance')}
        className='border-primary/40 bg-primary/5 flex flex-wrap items-center gap-3 rounded-xl border p-4'
      >
        <Gift className='text-primary size-5 shrink-0' aria-hidden />
        <p className='min-w-0 flex-1 text-sm font-semibold'>
          {t('Bind your email to claim {{amount}} free credits', {
            amount: formatQuotaWithCurrency(props.flags.newUserQuotaAmount, {
              locale,
            }),
          })}
        </p>
        <Button type='button' size='sm' onClick={props.onBindEmail}>
          {t('Bind email')}
        </Button>
      </section>
    )
  }

  return (
    <section
      aria-label={t('Account balance')}
      className='bg-muted/40 flex flex-wrap items-center gap-3 rounded-xl border p-4'
    >
      <Info className='text-muted-foreground size-5 shrink-0' aria-hidden />
      <p className='text-muted-foreground min-w-0 flex-1 text-sm'>
        {t(
          'Your balance is 0. You can create a key now and add credits later.'
        )}
      </p>
      <Button
        type='button'
        size='sm'
        variant='outline'
        render={<Link to='/wallet' />}
      >
        {t('Add credits')}
      </Button>
      <Button
        type='button'
        size='sm'
        variant='ghost'
        render={<Link to='/wallet' />}
      >
        {t('Redeem a code')}
      </Button>
    </section>
  )
}
