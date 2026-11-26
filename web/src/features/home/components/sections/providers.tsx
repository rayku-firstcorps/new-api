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
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

import {
  buildMarqueeProviders,
  type HomeCatalogSummary,
} from '../../lib/catalog-summary'
import { ProviderCard } from '../provider-card'
import { ProvidersMarquee } from '../providers-marquee'
import { SectionShell } from '../section-shell'
import { SpotlightGroup } from '../spotlight-card'

const FEATURED_PROVIDERS = 3
const MAX_MARQUEE_PROVIDERS = 24

interface ProvidersProps {
  catalog: HomeCatalogSummary | null
}

/**
 * Featured provider cards plus a marquee of the rest, built from the public
 * pricing catalog (names, monochrome marks, model counts and sample models are
 * computed). The marquee is always shown: when the catalog has few or no other
 * vendors it is filled with well-known provider marks (no model data).
 */
export function Providers(props: ProvidersProps) {
  const { t } = useTranslation()

  const providers = props.catalog?.providers ?? []
  const featured = providers.slice(0, FEATURED_PROVIDERS)
  const others = providers.slice(FEATURED_PROVIDERS)
  const catalogMarquee = others.slice(0, MAX_MARQUEE_PROVIDERS)
  const marquee = buildMarqueeProviders(
    catalogMarquee,
    providers,
    MAX_MARQUEE_PROVIDERS
  )

  return (
    <SectionShell
      id='home-providers'
      titleId='home-providers-title'
      lead={t('Frontier models.')}
      rest={t('One endpoint.')}
      subtitle={t(
        'Use each provider through its own native protocol, or call any model through any SDK.'
      )}
    >
      {featured.length > 0 ? (
        <SpotlightGroup className='mb-14 md:mb-16'>
          <ul
            aria-label={t('Featured providers')}
            className='grid gap-4 md:grid-cols-3 md:gap-5'
          >
            {featured.map((provider, index) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                index={index}
              />
            ))}
          </ul>
        </SpotlightGroup>
      ) : null}

      <AnimateInView delay={200}>
        <ProvidersMarquee
          providers={marquee}
          moreCount={others.length - catalogMarquee.length}
        />
      </AnimateInView>

      <AnimateInView delay={260} className='mt-10 text-center'>
        <Link
          to='/pricing'
          className='text-muted-foreground hover:text-foreground focus-visible:ring-ring/60 focus-visible:ring-offset-background inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none'
        >
          {t('View all models →')}
        </Link>
      </AnimateInView>
    </SectionShell>
  )
}
