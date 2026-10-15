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
import { Bot, Network } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { useGatewayBaseUrl } from '@/hooks/use-gateway-base-url'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import { HomeBrandIcon } from './home-brand-icon'

interface HomeIntegrationPreviewProps {
  className?: string
}

const clients = [
  { name: 'Codex', brand: 'Codex' },
  { name: 'Claude Code', brand: 'Claude Code' },
  { name: 'OpenCode', icon: Bot },
  { name: 'Cherry Studio', brand: 'Cherry Studio' },
] as const

const models = ['OpenAI', 'Claude', 'Gemini', 'DeepSeek'] as const

export function HomeIntegrationPreview(props: HomeIntegrationPreviewProps) {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()
  const gatewayBaseUrl = useGatewayBaseUrl()
  const gatewayV1Url = `${gatewayBaseUrl}/v1`
  const configText = `base_url: ${gatewayV1Url}
api_key: sk-********************************
model: claude-sonnet-4-5`

  return (
    <div
      className={cn(
        'home-network overflow-hidden rounded-2xl border',
        props.className
      )}
    >
      <div className='border-border flex min-h-12 items-center justify-between gap-3 border-b px-5'>
        <div className='flex gap-1.5' aria-hidden='true'>
          <span className='bg-muted-foreground/50 size-2 rounded-full' />
          <span className='bg-muted-foreground/50 size-2 rounded-full' />
          <span className='bg-primary size-2 rounded-full' />
        </div>
        <span className='text-muted-foreground text-xs'>
          {t('Unified setup')}
        </span>
        <Network className='text-primary size-4' aria-hidden='true' />
      </div>

      <div className='relative px-4 py-7 sm:px-6 sm:py-9'>
        <div className='home-network-grid'>
          <div className='min-w-0'>
            <p className='text-muted-foreground mb-4 text-[10px] tracking-widest uppercase'>
              {t('Client')}
            </p>
            <ul className='grid gap-3'>
              {clients.map((client) => {
                const Icon = 'icon' in client ? client.icon : null
                return (
                  <li
                    key={client.name}
                    className='home-network-node flex min-h-14 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-3'
                  >
                    {'brand' in client ? (
                      <HomeBrandIcon brand={client.brand} />
                    ) : null}
                    {Icon ? (
                      <Icon
                        className='text-primary size-4 shrink-0'
                        aria-hidden='true'
                      />
                    ) : null}
                    <span className='min-w-0 text-xs font-medium wrap-break-word'>
                      {client.name}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className='home-network-hub relative flex min-w-0 flex-col items-center justify-center gap-3 self-center text-center'>
            <div
              className='home-connection home-connection-in'
              aria-hidden='true'
            />
            <div
              className='home-connection home-connection-out'
              aria-hidden='true'
            />
            <div className='home-hub-icon relative flex size-14 items-center justify-center rounded-2xl border sm:size-16'>
              <Network className='size-7' aria-hidden='true' />
            </div>
            <p className='max-w-full text-xs font-semibold wrap-anywhere'>
              {systemName}
            </p>
            <p className='text-muted-foreground max-w-full text-[10px] leading-4'>
              {t('Gateway base')}
            </p>
          </div>

          <div className='min-w-0'>
            <p className='text-muted-foreground mb-4 text-[10px] tracking-widest uppercase'>
              {t('Model')}
            </p>
            <ul className='grid gap-3'>
              {models.map((model) => (
                <li
                  key={model}
                  className='home-network-node flex min-h-14 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-3'
                >
                  <HomeBrandIcon brand={model} />
                  <span className='min-w-0 text-xs font-medium wrap-break-word'>
                    {model}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className='home-endpoint mt-7 flex min-w-0 items-center gap-3 rounded-xl border p-3'>
          <div className='min-w-0 flex-1 font-mono text-xs leading-6'>
            <p className='text-muted-foreground'>base_url</p>
            <p className='wrap-anywhere'>{gatewayV1Url}</p>
          </div>
          <CopyButton
            value={configText}
            aria-label={t('Copy config')}
            tooltip={t('Copy config')}
            successTooltip={t('Configuration copied')}
            className='size-11 rounded-lg'
            iconClassName='size-4'
          />
        </div>
      </div>
    </div>
  )
}
