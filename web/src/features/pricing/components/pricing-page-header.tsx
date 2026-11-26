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

import { Badge } from '@/components/ui/badge'
import { HomeSphere } from '@/features/home/components/home-sphere'
import { MixedHeading } from '@/features/home/components/mixed-heading'

/**
 * Model Square header: eyebrow capsule, the page's only h1 and a subtitle. A
 * faint, non-interactive arc of the dot sphere sits behind it as decoration.
 */
export function PricingPageHeader() {
  const { t } = useTranslation()

  return (
    <header className='relative isolate overflow-hidden'>
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,transparent_38%,black_62%,black_80%,transparent)] opacity-80'
      >
        <HomeSphere
          variant='hero'
          interactive={false}
          intensity={0.5}
          topRatio={0.62}
        />
      </div>

      <div className='flex flex-col items-center pt-10 pb-8 text-center sm:pt-16 sm:pb-10'>
        <Badge
          variant='outline'
          className='bg-background/60 h-7 gap-2 px-3 tracking-wider uppercase backdrop-blur-sm'
        >
          <span aria-hidden className='bg-primary size-1.5 rounded-full' />
          {t('Model Square')}
        </Badge>
        <MixedHeading
          as='h1'
          lead={t('Every model.')}
          rest={t('One price list.')}
          className='mt-6 max-w-[880px] text-[clamp(32px,4.5vw,56px)]'
        />
        <p className='text-muted-foreground mt-4 max-w-[560px] text-[15px] leading-relaxed text-pretty sm:text-base'>
          {t(
            'Discover curated AI models, compare pricing and capabilities, and choose the right model for every scenario.'
          )}
        </p>
      </div>
    </header>
  )
}
