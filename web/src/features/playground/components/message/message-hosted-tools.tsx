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

import { CodeBlock } from '@/components/ai-elements/code-block'
import { Source } from '@/components/ai-elements/sources'
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/components/ai-elements/tool'

import type { HostedToolActivity, HostedToolResult } from '../../lib'
import type { MessageSource } from '../../types'

type MessageHostedToolsProps = {
  activities: HostedToolActivity[]
  // The turn is still streaming, so a call without a result is running
  isPending: boolean
}

// The input field that names what a hosted call works on
const INPUT_SUMMARY_FIELDS = ['query', 'url', 'command', 'code', 'path']

function parseInput(input: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(input || '{}')
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function HostedToolOutput(props: { result: HostedToolResult }) {
  const { t } = useTranslation()
  const result = props.result

  if (result.kind === 'error') {
    return (
      <ToolOutput
        errorText={t('The tool returned an error: {{code}}', {
          code: result.errorCode,
        })}
        output={undefined}
      />
    )
  }

  if (result.kind === 'other') {
    return <ToolOutput errorText={undefined} output={result.content} />
  }

  let links: MessageSource[] = []
  if (result.kind === 'search') links = result.results
  if (result.kind === 'fetch') links = [result.page]

  return (
    <div className='space-y-2 p-4'>
      <h4 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
        {t('Result')}
      </h4>
      {result.kind === 'code' ? (
        <div className='space-y-2'>
          {result.stdout && <CodeBlock code={result.stdout} language='text' />}
          {result.stderr && <CodeBlock code={result.stderr} language='text' />}
          {result.returnCode !== null && (
            <p className='text-muted-foreground text-xs'>
              {t('Exit code: {{code}}', { code: result.returnCode })}
            </p>
          )}
        </div>
      ) : (
        <div className='text-primary flex flex-col gap-2 text-xs'>
          {links.length === 0 && (
            <p className='text-muted-foreground'>{t('No results')}</p>
          )}
          {links.map((link) => (
            <Source href={link.href} key={link.href} title={link.title} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Hosted tool calls of an assistant turn (web search, web fetch, code
 * execution). The upstream runs them; the card shows what was searched,
 * fetched or run and what came back.
 */
export function MessageHostedTools(props: MessageHostedToolsProps) {
  const { t } = useTranslation()
  const toolLabels: Record<string, string> = {
    web_search: t('Web search'),
    web_fetch: t('Web fetch'),
    code_execution: t('Code execution'),
    bash_code_execution: t('Code execution'),
    text_editor_code_execution: t('Code execution'),
    code_interpreter: t('Code execution'),
  }

  return (
    <div className='flex w-full flex-col gap-2'>
      {props.activities.map((activity) => {
        const input = parseInput(activity.input)
        const summaryField = INPUT_SUMMARY_FIELDS.find(
          (field) => typeof input?.[field] === 'string'
        )
        const summary = summaryField ? String(input?.[summaryField]) : ''
        const label = toolLabels[activity.name] ?? activity.name
        const title = summary ? `${label}: ${summary}` : label

        let state: 'input-available' | 'output-available' | 'output-error' =
          'input-available'
        let statusLabel = props.isPending ? undefined : t('Not finished')
        if (activity.result?.kind === 'error') {
          state = 'output-error'
          statusLabel = undefined
        } else if (activity.result) {
          state = 'output-available'
          statusLabel = undefined
        }

        return (
          <Tool className='mb-0' key={activity.id}>
            <ToolHeader
              state={state}
              statusLabel={statusLabel}
              title={title}
              type={`tool-${activity.name}`}
            />
            <ToolContent>
              {input ? (
                <ToolInput input={input} />
              ) : (
                <div className='space-y-2 overflow-hidden p-4'>
                  <h4 className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                    {t('Parameters')}
                  </h4>
                  <CodeBlock code={activity.input} language='json' />
                </div>
              )}
              {activity.result && <HostedToolOutput result={activity.result} />}
            </ToolContent>
          </Tool>
        )
      })}
    </div>
  )
}
