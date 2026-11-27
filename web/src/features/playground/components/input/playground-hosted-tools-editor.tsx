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

import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

import { getSupportedHostedTools, HOSTED_TOOL_KEYS } from '../../lib'
import type { HostedToolKey, HostedToolsRoute } from '../../types'

type PlaygroundHostedToolsEditorProps = {
  disabled?: boolean
  onChange: (value: HostedToolKey[]) => void
  hostedToolsRoute: HostedToolsRoute
  value: HostedToolKey[]
}

/**
 * Switches for the tools the upstream runs itself. A tool the selected
 * model's request format cannot carry stays off and says why; its saved
 * choice is kept for models that support it.
 */
export function PlaygroundHostedToolsEditor(
  props: PlaygroundHostedToolsEditorProps
) {
  const { t } = useTranslation()
  const supported = getSupportedHostedTools(props.hostedToolsRoute)
  const labels: Record<HostedToolKey, { title: string; description: string }> =
    {
      web_search: {
        title: t('Web search'),
        description: t('Search the web and cite the pages used'),
      },
      web_fetch: {
        title: t('Web fetch'),
        description: t('Read pages whose URLs appear in the conversation'),
      },
      code_execution: {
        title: t('Code execution'),
        description: t('Run code in the provider sandbox'),
      },
    }

  const toggle = (key: HostedToolKey, checked: boolean) => {
    const next = props.value.filter((item) => item !== key)
    props.onChange(checked ? [...next, key] : next)
  }

  return (
    <div
      className={cn(
        'border-border/70 bg-background/60 grid gap-3 rounded-lg border p-3 transition-opacity',
        props.disabled && 'opacity-55'
      )}
    >
      <div className='space-y-1'>
        <div className='text-sm leading-5 font-medium'>{t('Hosted tools')}</div>
        <p className='text-muted-foreground text-xs leading-4'>
          {t(
            'Run by the model provider. Web search and code execution may be billed per use.'
          )}
        </p>
      </div>

      {HOSTED_TOOL_KEYS.map((key) => {
        const isSupported = supported.includes(key)
        const descriptionId = `playground-hosted-${key}-description`
        return (
          <div
            className={cn(
              'flex items-start justify-between gap-3',
              !isSupported && 'opacity-60'
            )}
            key={key}
          >
            <div className='min-w-0 space-y-0.5'>
              <div className='text-sm leading-5'>{labels[key].title}</div>
              <p
                className='text-muted-foreground text-xs leading-4'
                id={descriptionId}
              >
                {isSupported
                  ? labels[key].description
                  : t('Not available for this model')}
              </p>
            </div>
            <Switch
              aria-describedby={descriptionId}
              aria-label={labels[key].title}
              checked={isSupported && props.value.includes(key)}
              disabled={props.disabled || !isSupported}
              onCheckedChange={(checked) => toggle(key, checked)}
              size='sm'
            />
          </div>
        )
      })}
    </div>
  )
}
