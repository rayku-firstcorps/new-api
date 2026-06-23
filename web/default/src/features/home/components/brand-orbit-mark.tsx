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

interface BrandOrbitMarkProps {
  className?: string
}

export function BrandOrbitMark(props: BrandOrbitMarkProps) {
  return (
    <svg
      aria-hidden
      viewBox='0 0 420 420'
      className={cn('text-[#c97955]', props.className)}
      fill='none'
    >
      <circle
        cx='210'
        cy='210'
        r='118'
        className='fill-current opacity-[0.045]'
      />
      <circle
        cx='210'
        cy='210'
        r='118'
        className='stroke-current opacity-35'
        strokeWidth='1.5'
      />
      <circle
        cx='210'
        cy='210'
        r='154'
        className='stroke-current opacity-20'
        strokeWidth='1'
      />
      <circle
        cx='210'
        cy='210'
        r='188'
        className='stroke-current opacity-10'
        strokeWidth='1'
      />
      <path
        d='M91 228c55-67 97-99 126-96 28 3 48 31 81 34 22 2 41-7 57-26'
        className='stroke-current opacity-45'
        strokeWidth='2'
        strokeLinecap='round'
      />
      <path
        d='M99 276c42-25 80-36 114-32 40 4 73 29 109 21'
        className='stroke-current opacity-25'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      <path
        d='M146 101c18 57 42 94 74 111 31 17 70 16 114 35'
        className='stroke-current opacity-25'
        strokeWidth='1.5'
        strokeLinecap='round'
      />
      {[
        [118, 226],
        [170, 148],
        [222, 211],
        [300, 169],
        [328, 261],
      ].map(([cx, cy], index) => (
        <g key={`${cx}-${cy}`}>
          <circle
            cx={cx}
            cy={cy}
            r={index === 2 ? '8' : '6'}
            className='fill-background stroke-current opacity-90'
            strokeWidth='1.5'
          />
          <circle
            cx={cx}
            cy={cy}
            r={index === 2 ? '18' : '14'}
            className='stroke-current opacity-15'
            strokeWidth='1'
          />
        </g>
      ))}
    </svg>
  )
}
