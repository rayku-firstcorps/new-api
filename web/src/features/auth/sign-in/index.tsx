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
import { useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'

import { AuthLayout } from '../auth-layout'
import {
  AuthPageHeading,
  AuthSwitchPrompt,
} from '../components/auth-page-heading'
import { TermsFooter } from '../components/terms-footer'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { t } = useTranslation()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { status } = useStatus()
  const { systemName } = useSystemConfig()

  return (
    <AuthLayout mode='sign-in'>
      <div className='w-full space-y-8'>
        <AuthPageHeading lead={t('Sign in to')} rest={systemName}>
          <p>{t('Use your account to manage API keys, usage and billing.')}</p>
        </AuthPageHeading>

        <UserAuthForm redirectTo={redirect} />

        {!status?.self_use_mode_enabled &&
          status?.register_enabled !== false && (
            <AuthSwitchPrompt
              prompt={t("Don't have an account?")}
              linkLabel={t('Sign up')}
              to='/sign-up'
            />
          )}

        <TermsFooter
          variant='sign-in'
          status={status}
          className='text-center'
        />
      </div>
    </AuthLayout>
  )
}
