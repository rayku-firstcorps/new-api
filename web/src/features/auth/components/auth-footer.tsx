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
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'

/**
 * One 12px line under the auth form: `© {year} {systemName}` and the legal
 * pages the admin has enabled (the same switches the consent checkbox uses).
 */
export function AuthFooter() {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()
  const { status } = useStatus()
  const links = [
    status?.user_agreement_enabled
      ? { href: '/user-agreement', label: t('User Agreement') }
      : null,
    status?.privacy_policy_enabled
      ? { href: '/privacy-policy', label: t('Privacy Policy') }
      : null,
  ].filter((link) => link !== null)

  return (
    <footer className='text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs sm:px-6 lg:px-10'>
      <p>
        © {new Date().getFullYear()} {systemName}
      </p>
      {links.length > 0 && (
        <ul aria-label={t('Legal')} className='flex flex-wrap items-center'>
          {links.map((link, index) => (
            <li key={link.href} className='flex items-center'>
              {index > 0 && (
                <span aria-hidden='true' className='px-2'>
                  ·
                </span>
              )}
              <a
                href={link.href}
                className='hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </footer>
  )
}
