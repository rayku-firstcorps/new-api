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
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { BrandLogoImage } from '@/components/layout/components/brand-mark'
import { ThemeSwitch } from '@/components/theme-switch'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

/** Top bar of the auth pages: brand (links home) and "Back to Home" + theme switch. */
export function AuthHeader() {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <header className='flex h-[72px] shrink-0 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10'>
      <Link
        to='/'
        className='focus-visible:ring-ring flex min-w-0 items-center gap-2 rounded-md transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-2'
      >
        <div className='relative size-7 shrink-0'>
          {loading ? (
            <Skeleton className='absolute inset-0 rounded-full' />
          ) : (
            <BrandLogoImage
              src={logo}
              alt={t('Logo')}
              className='size-7 rounded-full object-cover'
            />
          )}
        </div>
        {loading ? (
          <Skeleton className='h-6 w-24' />
        ) : (
          <span className='truncate text-lg font-medium tracking-tight'>
            {systemName}
          </span>
        )}
      </Link>
      <div className='flex items-center gap-1 sm:gap-3'>
        <Link
          to='/'
          className='text-muted-foreground hover:text-foreground focus-visible:ring-ring group inline-flex items-center gap-1.5 rounded-md text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
        >
          <ArrowLeft
            aria-hidden='true'
            className='size-4 transition-transform motion-safe:group-hover:-translate-x-0.5'
          />
          {t('Back to Home')}
        </Link>
        <ThemeSwitch />
      </div>
    </header>
  )
}
