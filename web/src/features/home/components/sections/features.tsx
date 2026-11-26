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
import {
  Building2,
  ChartColumn,
  Plug,
  Receipt,
  Route,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

import { getDefaultFeatures } from '../../constants'
import { SectionShell } from '../section-shell'
import { SpotlightCard, SpotlightGroup } from '../spotlight-card'

interface FeaturesProps {
  className?: string
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  Route,
  ShieldCheck,
  Plug,
  Receipt,
  ChartColumn,
  Building2,
}

export function Features(props: FeaturesProps) {
  const { t } = useTranslation()
  const features = getDefaultFeatures(t)

  return (
    <SectionShell
      id='home-features'
      titleId='home-features-title'
      lead={t('Built for')}
      rest={t('production traffic')}
      className={props.className}
    >
      <SpotlightGroup>
        <ul className='grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3'>
          {features.map((feature, index) => {
            const Icon = FEATURE_ICONS[feature.iconName] ?? Route
            const titleId = `home-feature-${index}-title`
            return (
              <AnimateInView
                as='li'
                key={feature.iconName}
                delay={(index % 3) * 80}
                className='h-full min-w-0'
              >
                <SpotlightCard
                  focusable
                  role='group'
                  aria-labelledby={titleId}
                  className='h-full p-6 md:p-7'
                >
                  <span className='border-border bg-muted text-muted-foreground group-hover/spot:text-primary group-focus-visible/spot:text-primary flex size-10 items-center justify-center rounded-lg border transition-colors duration-300'>
                    <Icon
                      aria-hidden='true'
                      className='size-5'
                      strokeWidth={1.75}
                    />
                  </span>
                  <h3
                    id={titleId}
                    className='font-display mt-6 text-lg font-medium tracking-[-0.01em]'
                  >
                    {feature.title}
                  </h3>
                  <p className='text-muted-foreground mt-2 text-[15px] leading-relaxed text-pretty'>
                    {feature.description}
                  </p>
                </SpotlightCard>
              </AnimateInView>
            )
          })}
        </ul>
      </SpotlightGroup>
    </SectionShell>
  )
}
