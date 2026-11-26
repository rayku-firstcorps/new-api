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
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

import type { HomeProtocol, HomeProvider } from '../lib/catalog-summary'
import { ProviderMark } from './provider-mark'
import { SpotlightCard } from './spotlight-card'

interface ProviderCardProps {
  provider: HomeProvider
  index: number
}

/** Featured provider: mark, name, model count, sample models, native APIs. */
export function ProviderCard(props: ProviderCardProps) {
  const { t } = useTranslation()
  const provider = props.provider
  const titleId = `home-provider-${provider.id}-title`
  const protocolLabels: Record<HomeProtocol, string> = {
    openai: t('Native OpenAI API'),
    anthropic: t('Native Anthropic API'),
    gemini: t('Native Gemini API'),
  }

  return (
    <AnimateInView as='li' delay={props.index * 90} className='h-full min-w-0'>
      <SpotlightCard
        focusable
        role='group'
        aria-labelledby={titleId}
        className='flex h-full flex-col p-6 lg:p-7'
      >
        <div className='flex items-center gap-3'>
          <span className='border-border bg-muted text-muted-foreground group-hover/spot:text-foreground group-focus-visible/spot:text-foreground flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors duration-300'>
            <ProviderMark provider={provider} size={22} />
          </span>
          <div className='min-w-0'>
            <h3
              id={titleId}
              className='font-display truncate text-xl font-medium tracking-[-0.01em]'
            >
              {provider.name}
            </h3>
            <p className='text-muted-foreground text-sm'>
              {t('{{count}} models', { count: provider.modelCount })}
            </p>
          </div>
        </div>

        {provider.modelNames.length > 0 ? (
          <ul
            aria-label={t('Representative models')}
            className='mt-6 flex flex-wrap gap-2'
          >
            {provider.modelNames.map((name) => (
              <li
                key={name}
                className='border-border bg-muted text-foreground/85 max-w-full truncate rounded-full border px-2.5 py-1 font-mono text-[11.5px] leading-none'
              >
                {name}
              </li>
            ))}
          </ul>
        ) : null}

        {provider.protocols.length > 0 ? (
          <div className='mt-auto pt-6'>
            <ul className='border-border space-y-1.5 border-t pt-5'>
              {provider.protocols.map((protocol) => (
                <li key={protocol} className='text-muted-foreground text-sm'>
                  {protocolLabels[protocol]}
                  <Check
                    aria-hidden='true'
                    className='text-primary ml-1.5 inline-block size-4 -translate-y-px align-middle'
                    strokeWidth={2.5}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SpotlightCard>
    </AnimateInView>
  )
}
