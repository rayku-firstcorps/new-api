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

import { AnimateInView } from '@/components/animate-in-view'

import {
  FALLBACK_PROVIDERS,
  type HomeCatalogSummary,
} from '../../lib/catalog-summary'
import { HowItWorksDiagram } from '../how-it-works-diagram'
import { SectionShell } from '../section-shell'

const DIAGRAM_TARGETS = 5

interface HowItWorksProps {
  catalog: HomeCatalogSummary | null
}

/** Routing diagram (real providers when the catalog is public) plus three steps. */
export function HowItWorks(props: HowItWorksProps) {
  const { t } = useTranslation()
  const targets = props.catalog
    ? props.catalog.providers.slice(0, DIAGRAM_TARGETS)
    : FALLBACK_PROVIDERS
  const steps = [
    {
      title: t('Send request'),
      description: t('Call the gateway with the SDK you already use.'),
    },
    {
      title: t('Router picks a channel'),
      description: t(
        'Priority, weight and channel health decide where each request goes.'
      ),
    },
    {
      title: t('Best response returned'),
      description: t('Streamed back in the exact format your SDK expects.'),
    },
  ]

  return (
    <SectionShell
      id='home-how-it-works'
      titleId='home-steps-title'
      lead={t('One request in.')}
      rest={t('The best answer out.')}
    >
      {/* One reveal for the whole diagram: per-node transforms would skew the measured SVG paths. */}
      <AnimateInView delay={120} className='mt-4'>
        <HowItWorksDiagram targets={targets} />
      </AnimateInView>

      <ol
        aria-label={t('How a request is routed')}
        className='mt-20 grid gap-4 md:mt-28 md:grid-cols-3 md:gap-5'
      >
        {steps.map((step, index) => (
          <AnimateInView
            key={step.title}
            as='li'
            delay={index * 90}
            className='border-border bg-card min-w-0 rounded-xl border p-6 md:p-7'
          >
            <span aria-hidden='true' className='text-primary font-mono text-sm'>
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className='font-display mt-4 text-lg font-medium tracking-[-0.01em]'>
              {step.title}
            </h3>
            <p className='text-muted-foreground mt-2 text-[15px] leading-relaxed text-pretty'>
              {step.description}
            </p>
          </AnimateInView>
        ))}
      </ol>
    </SectionShell>
  )
}
