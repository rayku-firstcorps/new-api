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
import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { isKucodeMarkUrl } from '../lib/brand-mark-url'
import { FOCUS_RING } from '../lib/public-chrome'
import { BrandMark } from './brand-mark'

interface HeaderLogoProps {
  src: string
  alt?: string
  loading: boolean
  logoLoaded: boolean
  className?: string
}

/**
 * Logo component for header with loading state
 * Shows image only when fully loaded for smooth UX
 */
export function HeaderLogo({
  src,
  alt = 'logo',
  loading,
  logoLoaded,
  className,
}: HeaderLogoProps) {
  if (isKucodeMarkUrl(src)) {
    return (
      <BrandMark
        className={cn(
          'size-6 transition-opacity duration-200',
          !loading && logoLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        'h-6 w-6 rounded-full transition-opacity duration-200',
        !loading && logoLoaded ? 'opacity-100' : 'opacity-0',
        className
      )}
    />
  )
}

interface PublicBrandLinkProps {
  to: string
  name: string
  src: string
  loading: boolean
  logoLoaded: boolean
  /** Replaces the configured logo (used by pages that pass their own mark). */
  customLogo?: ReactNode
  onClick?: () => void
  className?: string
}

/**
 * Brand mark + system name as a home link: the one brand lockup the public
 * top bar and its mobile drawer both render (KuCode `Logo`).
 */
export function PublicBrandLink(props: PublicBrandLinkProps) {
  let mark: ReactNode = (
    <HeaderLogo
      src={props.src}
      loading={props.loading}
      logoLoaded={props.logoLoaded}
      className='size-full rounded-md object-contain'
    />
  )
  if (props.customLogo) mark = props.customLogo
  if (props.loading) mark = <Skeleton className='size-full rounded-md' />

  return (
    <Link
      to={props.to}
      onClick={props.onClick}
      className={cn(
        'text-foreground group inline-flex min-w-0 items-center gap-2 rounded-md text-[18px] font-medium tracking-[-0.01em]',
        FOCUS_RING,
        props.className
      )}
    >
      <span className='flex size-5 shrink-0 items-center justify-center'>
        {mark}
      </span>
      {props.loading ? (
        <Skeleton className='h-4 w-16' />
      ) : (
        <span className='max-w-48 truncate' title={props.name}>
          {props.name}
        </span>
      )}
    </Link>
  )
}
