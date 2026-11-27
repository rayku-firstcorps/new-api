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
import { Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { readOnboardingFlags } from '@/features/onboarding/lib/availability'
import { useStatus } from '@/hooks/use-status'
import { toIntlLocale } from '@/i18n/languages'
import { formatQuotaWithCurrency } from '@/lib/currency'

/**
 * Gentle signup-bonus hint. Informational only: the server decides whether and
 * when the bonus is granted, and the text never reveals account state.
 */
export function SignupBonusHint() {
  const { t, i18n } = useTranslation()
  const { status } = useStatus()
  const flags = readOnboardingFlags(status)

  if (!flags.newUserQuotaEnabled || flags.newUserQuotaAmount <= 0) return null

  const amount = formatQuotaWithCurrency(flags.newUserQuotaAmount, {
    locale: toIntlLocale(i18n.resolvedLanguage || i18n.language),
  })

  return (
    <p className='bg-primary/5 text-primary flex items-center gap-2 rounded-lg px-3 py-2 text-sm'>
      <Gift className='size-4 shrink-0' aria-hidden />
      {flags.newUserQuotaRequireEmail
        ? t('Verify your email to get {{amount}} in free credits', { amount })
        : t('Sign up and get {{amount}} in free credits', { amount })}
    </p>
  )
}
