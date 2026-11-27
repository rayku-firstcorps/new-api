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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CodeBlock } from '@/components/ai-elements/code-block'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import type { ToolCall } from '../../types'

type MessageToolCallsProps = {
  messageKey: string
  toolCalls: ToolCall[]
  // Results can be entered on the latest finished assistant turn only
  canSubmit: boolean
  onSubmit?: (results: Record<string, string>) => void
}

/**
 * The tool calls of an assistant turn. The playground runs no tool: on the
 * latest turn the user enters each result and sends them to continue.
 */
export function MessageToolCalls(props: MessageToolCallsProps) {
  const { t } = useTranslation()
  const [results, setResults] = useState<Record<string, string>>({})
  const pendingCalls = props.toolCalls.filter(
    (call) => call.result === undefined
  )
  const isComplete = pendingCalls.every(
    (call) => (results[String(call.index)] ?? '').trim() !== ''
  )

  return (
    <div className='flex w-full flex-col gap-2'>
      {props.toolCalls.map((call) => {
        const resultKey = String(call.index)
        const resultId = `tool-result-${props.messageKey}-${resultKey}`
        let parsedInput: unknown
        try {
          parsedInput = JSON.parse(call.arguments || '{}')
        } catch {
          parsedInput = undefined
        }

        let state: 'input-streaming' | 'input-available' | 'output-available' =
          'input-streaming'
        let statusLabel = t('Generating arguments')
        if (call.result !== undefined) {
          state = 'output-available'
          statusLabel = t('Result sent')
        } else if (props.canSubmit) {
          state = 'input-available'
          statusLabel = t('Awaiting result')
        }

        return (
          <Tool className='mb-0' defaultOpen key={resultKey}>
            <ToolHeader
              state={state}
              statusLabel={statusLabel}
              title={call.name || t('Tool call')}
              type={`tool-${call.name}`}
            />
            <ToolContent>
              {parsedInput === undefined ? (
                <div className='space-y-2 overflow-hidden p-4'>
                  <h4 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    {t('Parameters')}
                  </h4>
                  <CodeBlock code={call.arguments} language='json' />
                </div>
              ) : (
                <ToolInput input={parsedInput as Record<string, unknown>} />
              )}
              {call.result !== undefined && (
                <ToolOutput errorText={undefined} output={call.result} />
              )}
              {call.result === undefined && props.canSubmit && (
                <div className='space-y-2 px-4 pb-4'>
                  <label
                    className='text-muted-foreground text-xs font-medium'
                    htmlFor={resultId}
                  >
                    {t('Result for {{name}}', { name: call.name })}
                  </label>
                  <Textarea
                    className='font-mono text-xs'
                    id={resultId}
                    onChange={(event) =>
                      setResults((current) => ({
                        ...current,
                        [resultKey]: event.target.value,
                      }))
                    }
                    placeholder={t('Enter what the tool returned')}
                    value={results[resultKey] ?? ''}
                  />
                </div>
              )}
            </ToolContent>
          </Tool>
        )
      })}

      {props.canSubmit && pendingCalls.length > 0 && (
        <div className='flex items-center justify-end gap-3'>
          {!isComplete && (
            <span className='text-muted-foreground text-xs'>
              {t('Enter a result for every tool call')}
            </span>
          )}
          <Button
            disabled={!isComplete}
            onClick={() => props.onSubmit?.(results)}
            size='sm'
          >
            {t('Send tool results')}
          </Button>
        </div>
      )}
    </div>
  )
}
