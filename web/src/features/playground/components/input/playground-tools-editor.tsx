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

import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { parseToolDefinitions } from '../../lib'

const TOOLS_PLACEHOLDER = `[
  {
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "Get the current weather in a city",
      "parameters": {
        "type": "object",
        "properties": { "city": { "type": "string" } },
        "required": ["city"]
      }
    }
  }
]`

type PlaygroundToolsEditorProps = {
  disabled?: boolean
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  onValueChange: (value: string) => void
  value: string
}

/** Tool definitions JSON for function calling, validated as it is typed. */
export function PlaygroundToolsEditor(props: PlaygroundToolsEditorProps) {
  const { t } = useTranslation()
  const parsed = parseToolDefinitions(props.value)
  const error = props.enabled ? parsed.error : null
  const toolCount = parsed.tools?.length ?? 0

  return (
    <div
      className={cn(
        'border-border/70 bg-background/60 grid gap-2 rounded-lg border p-3 transition-opacity',
        (!props.enabled || props.disabled) && 'opacity-55'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <div className='flex min-w-0 items-center gap-2'>
            <label
              className='truncate text-sm leading-5 font-medium'
              htmlFor='playground-tools'
            >
              {t('Tools')}
            </label>
            <Badge
              className='h-5 shrink-0 px-1.5 font-mono text-[11px]'
              variant='outline'
            >
              {toolCount}
            </Badge>
          </div>
          <p className='text-muted-foreground text-xs leading-4'>
            {t(
              'Function definitions for chat and Claude models. You enter each tool result yourself.'
            )}
          </p>
        </div>

        <Switch
          aria-label={t('Enable {{parameter}}', { parameter: t('Tools') })}
          checked={props.enabled}
          disabled={props.disabled}
          onCheckedChange={props.onEnabledChange}
          size='sm'
        />
      </div>

      <Textarea
        aria-describedby={error ? 'playground-tools-error' : undefined}
        aria-invalid={error ? true : undefined}
        className='max-h-64 min-h-24 font-mono text-xs'
        disabled={props.disabled || !props.enabled}
        id='playground-tools'
        onChange={(event) => props.onValueChange(event.target.value)}
        placeholder={TOOLS_PLACEHOLDER}
        spellCheck={false}
        value={props.value}
      />
      {error && (
        <p className='text-destructive text-xs' id='playground-tools-error'>
          {t(error.key, error.values)}
        </p>
      )}
    </div>
  )
}
