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

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  buildHeroProviders,
  type HomeCatalogSummary,
} from '../lib/catalog-summary'
import { ProviderMark } from './provider-mark'

interface HeroLogoRowProps {
  catalog: HomeCatalogSummary | null
}

/**
 * Monochrome provider logos under the hero copy. Each logo links to the
 * providers section and names its model count in a tooltip (also on keyboard
 * focus). The row shows every catalog provider (no cap; the row wraps), then
 * KuCode's provider marks up to `HERO_MIN_LOGOS` (`buildHeroProviders`). The
 * totals beside it always come from the catalog alone.
 */
export function HeroLogoRow(props: HeroLogoRowProps) {
  const { t } = useTranslation()
  const providers = buildHeroProviders(props.catalog?.providers ?? [])

  return (
    <div className='flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2'>
      <ul
        aria-label={t('Model providers')}
        className='flex flex-wrap items-center justify-center gap-0.5 sm:gap-1'
      >
        {providers.map((provider) => (
          <li key={provider.id}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <a
                    href={props.catalog ? '#home-providers' : '#home-features'}
                    aria-label={provider.name}
                    className='text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:ring-ring/60 focus-visible:ring-offset-background flex size-7 items-center justify-center rounded-full transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:size-8'
                  />
                }
              >
                <ProviderMark provider={provider} size={18} />
              </TooltipTrigger>
              <TooltipContent>
                <span className='font-medium'>{provider.name}</span>
                {provider.modelCount > 0 ? (
                  <span className='text-muted-foreground'>
                    {t('{{count}} models', { count: provider.modelCount })}
                  </span>
                ) : null}
              </TooltipContent>
            </Tooltip>
          </li>
        ))}
      </ul>
      {props.catalog ? (
        <>
          <span
            aria-hidden='true'
            className='bg-border hidden h-4 w-px sm:block'
          />
          <span className='text-muted-foreground text-[13px]'>
            {t('{{models}} models from {{providers}} providers', {
              models: props.catalog.modelCount,
              providers: props.catalog.providerCount,
            })}
          </span>
        </>
      ) : null}
    </div>
  )
}
