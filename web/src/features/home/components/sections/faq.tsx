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
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Markdown } from '@/components/ui/markdown'
import { useFAQ } from '@/features/dashboard/hooks/use-status-data'

import { SectionShell } from '../section-shell'

/**
 * Native details/summary accordion fed by the admin-configured FAQ (the same
 * `faq` list in /api/status the dashboard reads). Height animates via
 * ::details-content where supported. Not rendered when there are no entries.
 */
export function FAQ() {
  const { t } = useTranslation()
  const { items } = useFAQ()
  const entries = items.filter((item) => item.question && item.answer)

  if (entries.length === 0) return null

  return (
    <SectionShell
      id='home-faq'
      titleId='home-faq-title'
      lead={t('Questions,')}
      rest={t('answered')}
    >
      <div className='border-border mx-auto max-w-[792px] border-t'>
        {entries.map((item, index) => (
          <AnimateInView
            key={item.id ?? `faq-${index}`}
            delay={Math.min(index, 6) * 60}
          >
            <details className='group border-border border-b [interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-clip details-content:transition-[height,content-visibility] details-content:[transition-behavior:allow-discrete] details-content:duration-300 open:details-content:h-auto motion-reduce:details-content:transition-none'>
              <summary className='font-display focus-visible:ring-ring/60 focus-visible:ring-offset-background flex cursor-pointer list-none items-center justify-between gap-6 rounded-md py-5 text-left text-base font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none md:py-6 md:text-lg [&::-webkit-details-marker]:hidden'>
                <span className='min-w-0 wrap-anywhere'>{item.question}</span>
                <span
                  aria-hidden='true'
                  className='border-border text-muted-foreground group-open:border-primary/50 group-open:text-primary grid size-8 shrink-0 place-items-center rounded-full border transition-[rotate,color,border-color] duration-300 group-open:rotate-45 motion-reduce:transition-none'
                >
                  <Plus className='size-4' strokeWidth={2} />
                </span>
              </summary>
              <Markdown className='text-muted-foreground pr-12 pb-6 text-[15px] leading-relaxed'>
                {item.answer}
              </Markdown>
            </details>
          </AnimateInView>
        ))}
      </div>
    </SectionShell>
  )
}
