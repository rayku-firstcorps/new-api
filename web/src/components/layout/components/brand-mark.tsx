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
import { cn } from '@/lib/utils'

import { isKucodeMarkUrl } from '../lib/brand-mark-url'

const KUCODE_MARK_RING = Array.from({ length: 8 }, (_, index) => {
  const angle = (index * Math.PI) / 4 - Math.PI / 2
  return {
    cx: Number((12 + Math.cos(angle) * 7.5).toFixed(3)),
    cy: Number((12 + Math.sin(angle) * 7.5).toFixed(3)),
  }
})

type BrandMarkProps = {
  className?: string
}

/** The KuCode starburst mark (decorative, colored by `currentColor`). */
export function BrandMark(props: BrandMarkProps) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      aria-hidden='true'
      className={cn('text-foreground', props.className)}
    >
      <circle cx='12' cy='12' r='2.4' />
      {KUCODE_MARK_RING.map((point) => (
        <circle
          key={`${point.cx}:${point.cy}`}
          cx={point.cx}
          cy={point.cy}
          r='1.5'
        />
      ))}
    </svg>
  )
}

type BrandLogoImageProps = {
  src: string
  alt: string
  className?: string
  markClassName?: string
}

/** Renders the logo image, or the inline KuCode mark when `src` is that mark. */
export function BrandLogoImage(props: BrandLogoImageProps) {
  if (isKucodeMarkUrl(props.src)) {
    return <BrandMark className={cn('size-full', props.markClassName)} />
  }
  return <img src={props.src} alt={props.alt} className={props.className} />
}
