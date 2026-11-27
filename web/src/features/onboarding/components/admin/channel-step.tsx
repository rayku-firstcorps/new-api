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
import { useNavigate } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

interface ProviderCard {
  id: string
  name: string
  descriptionKey: string
}

const PROVIDERS: ProviderCard[] = [
  { id: 'openai', name: 'OpenAI', descriptionKey: 'GPT and o-series models' },
  { id: 'anthropic', name: 'Anthropic', descriptionKey: 'Claude models' },
  { id: 'gemini', name: 'Gemini', descriptionKey: 'Google Gemini models' },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    descriptionKey: 'Many providers behind one key',
  },
  {
    id: 'custom',
    name: 'Custom',
    descriptionKey: 'Any OpenAI-compatible endpoint',
  },
]

/**
 * Admin Step 1: provider shortcuts. The channel form is a drawer bound to the
 * channels page state, so it is not embedded; the cards open `/channels` with
 * the create drawer and a way back (`/onboarding?step=1`). No secret is put in the URL.
 */
export function AdminChannelStep() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className='space-y-4'>
      <p className='text-muted-foreground text-sm'>
        {t(
          'The gateway needs at least one upstream channel before it can answer requests. Pick a provider to add your first one; you can come back here afterwards.'
        )}
      </p>
      <ul className='grid gap-3 sm:grid-cols-2'>
        {PROVIDERS.map((provider) => (
          <li key={provider.id}>
            <Button
              type='button'
              variant='outline'
              className='h-auto w-full justify-between gap-3 px-4 py-3 text-left'
              onClick={() =>
                void navigate({
                  to: '/channels',
                  search: { onboarding: 'channel', provider: provider.id },
                })
              }
            >
              <span className='min-w-0'>
                <span className='block font-medium'>
                  {provider.id === 'custom' ? t('Custom') : provider.name}
                </span>
                <span className='text-muted-foreground block text-xs font-normal text-wrap'>
                  {t(provider.descriptionKey)}
                </span>
              </span>
              <ArrowUpRight className='size-4 shrink-0' aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
      <p className='text-muted-foreground text-xs'>
        {t('Already added a channel? Continue to the next step.')}
      </p>
    </div>
  )
}
