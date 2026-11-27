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

import { Button } from '@/components/ui/button'

import type { OnboardingSelectedKey } from '../types'

interface PlaygroundConnectProps {
  selectedKey: OnboardingSelectedKey
  model: string
}

/**
 * Use case "playground": shows the chosen key and model, then opens the
 * playground. Only the model is passed along; the key never leaves memory.
 */
export function PlaygroundConnect(props: PlaygroundConnectProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-label={t('Try it in the playground')}
      className='bg-card space-y-3 rounded-xl border p-4'
    >
      <h3 className='text-sm font-semibold'>{t('Try it in the playground')}</h3>
      <dl className='grid gap-2 text-sm sm:grid-cols-2'>
        <div>
          <dt className='text-muted-foreground text-xs'>{t('API key')}</dt>
          <dd>
            {props.selectedKey.name}{' '}
            <code className='text-muted-foreground text-xs'>
              {props.selectedKey.maskedKey}
            </code>
          </dd>
        </div>
        <div>
          <dt className='text-muted-foreground text-xs'>
            {t('Recommended model')}
          </dt>
          <dd>{props.model || t('No models found')}</dd>
        </div>
      </dl>
      <Button
        render={
          <Link
            to='/playground'
            search={props.model ? { model: props.model } : {}}
          />
        }
      >
        {t('Open the playground')}
      </Button>
    </section>
  )
}
