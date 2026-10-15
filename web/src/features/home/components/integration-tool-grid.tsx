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
import { Bot } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

import { HomeBrandIcon } from './home-brand-icon'

const tiles = [
  { name: 'OpenAI', brand: 'OpenAI' },
  { name: 'Claude', brand: 'Claude' },
  { name: 'Gemini', brand: 'Gemini' },
  { name: 'DeepSeek', brand: 'DeepSeek' },
  { name: 'Codex CLI', brand: 'Codex' },
  { name: 'Claude Code', brand: 'Claude Code' },
  { name: 'Cherry Studio', brand: 'Cherry Studio' },
  { name: 'Open WebUI', icon: Bot },
] as const

export function IntegrationToolGrid() {
  const { t } = useTranslation()

  return (
    <section
      id='home-tools'
      aria-labelledby='home-tools-title'
      className='home-section scroll-mt-24 px-5 sm:px-8'
    >
      <div className='mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-16'>
        <AnimateInView>
          <p className='text-primary mb-4 flex items-center gap-3 text-xs font-semibold tracking-widest uppercase'>
            <span className='home-section-number' aria-hidden='true'>
              01 /
            </span>
            {t('Unified setup')}
          </p>
          <h2
            id='home-tools-title'
            className='text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl'
          >
            {t('One endpoint for the AI tools you already use')}
          </h2>
          <p className='text-muted-foreground mt-5 max-w-md text-sm leading-7 text-pretty'>
            {t(
              'Connect once through new-api, then use leading models from your favorite AI tools.'
            )}
          </p>
        </AnimateInView>
        <AnimateInView delay={100}>
          <ul className='home-tools-grid grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {tiles.map((tile) => {
              const Icon = 'icon' in tile ? tile.icon : null
              return (
                <li
                  key={tile.name}
                  className='home-tool-tile flex min-w-0 flex-col items-center justify-center gap-4 rounded-xl border px-3 py-7 text-center'
                >
                  <span className='home-tool-icon flex size-11 items-center justify-center rounded-xl'>
                    {'brand' in tile ? (
                      <HomeBrandIcon brand={tile.brand} />
                    ) : null}
                    {Icon ? (
                      <Icon
                        className='size-6'
                        strokeWidth={1.5}
                        aria-hidden='true'
                      />
                    ) : null}
                  </span>
                  <p className='text-xs font-medium wrap-break-word'>
                    {tile.name}
                  </p>
                </li>
              )
            })}
          </ul>
        </AnimateInView>
      </div>
    </section>
  )
}
