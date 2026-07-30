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
import {
  BarChart3,
  BookOpen,
  Code2,
  FileClock,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { Button } from '@/components/ui/button'

const capabilities = [
  {
    icon: Code2,
    label: 'OpenAI-compatible endpoints',
  },
  { icon: KeyRound, label: 'API key management' },
  { icon: FileClock, label: 'Request logs' },
  { icon: BarChart3, label: 'Usage and cost records' },
  { icon: ShieldCheck, label: 'Rate limits and access control' },
]

const INTERNAL_DOCS_ROUTE = '/docs'

export function DeveloperAccess() {
  const { t } = useTranslation()

  return (
    <section
      id='home-developers'
      className='border-border/40 relative z-10 border-t px-4 py-20 sm:px-6 md:py-28'
    >
      <div className='mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start'>
        <AnimateInView>
          <p className='text-muted-foreground mb-3 text-xs font-medium uppercase'>
            {t('Developer access')}
          </p>
          <h2 className='text-3xl leading-[1.08] font-bold md:text-4xl'>
            {t('Developer access when you need it')}
          </h2>
          <p className='text-muted-foreground mt-4 max-w-xl text-base leading-relaxed'>
            {t(
              'Compatible APIs, keys, logs, and cost records remain available for deeper integrations without turning the homepage into an API reference.'
            )}
          </p>
          <Button
            variant='outline'
            className='mt-7 h-10 rounded-lg px-4'
            render={<Link to={INTERNAL_DOCS_ROUTE} />}
          >
            <BookOpen className='size-4' />
            {t('Developer Docs')}
          </Button>
        </AnimateInView>

        <AnimateInView delay={100} className='grid gap-4 sm:grid-cols-2'>
          <div className='border-border/70 bg-background/90 rounded-[18px] border p-5 dark:bg-neutral-950/40'>
            <p className='mb-4 text-sm font-semibold'>
              {t('Endpoint settings')}
            </p>
            <div className='space-y-2 font-mono text-[12px] leading-6'>
              {[
                ['endpoint', '/v1/chat/completions'],
                ['header', 'Authorization: Bearer sk-***'],
                ['model', 'provider/model-name'],
              ].map(([key, value]) => (
                <div
                  key={key}
                  className='bg-muted/30 grid grid-cols-[68px_minmax(0,1fr)] gap-3 rounded-lg px-3 py-2'
                >
                  <span className='text-muted-foreground'>{key}</span>
                  <span className='truncate'>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className='border-border/70 bg-background/90 rounded-[18px] border p-5 dark:bg-neutral-950/40'>
            <p className='mb-4 text-sm font-semibold'>
              {t('Operational controls')}
            </p>
            <div className='space-y-3'>
              {capabilities.map((capability) => {
                const Icon = capability.icon
                return (
                  <div
                    key={capability.label}
                    className='flex min-w-0 items-center gap-3 text-sm'
                  >
                    <span className='border-border/60 bg-muted/25 flex size-8 shrink-0 items-center justify-center rounded-lg border'>
                      <Icon className='size-4 text-[#c97955]' />
                    </span>
                    <span className='min-w-0'>{t(capability.label)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
