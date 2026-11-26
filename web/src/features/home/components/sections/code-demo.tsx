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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'
import { CopyButton } from '@/components/copy-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGatewayBaseUrl } from '@/hooks/use-gateway-base-url'

import {
  buildCodeSamples,
  type CodeSample,
  type CodeSampleId,
} from '../../lib/code-samples'
import { highlight, TOKEN_CLASS } from '../../lib/highlight'
import { MixedHeading } from '../mixed-heading'
import { SectionShell } from '../section-shell'

function CodeBlock(props: { sample: CodeSample }) {
  // Tokens are keyed by their character offset in the sample, which is stable.
  const tokenLines = useMemo(() => {
    let offset = 0
    return highlight(props.sample.code, props.sample.language).map((line) => {
      const tokens = line.map((token) => {
        const keyed = { ...token, offset }
        offset += token.text.length
        return keyed
      })
      offset += 1
      return tokens
    })
  }, [props.sample])

  return (
    <pre
      tabIndex={0}
      aria-label={props.sample.filename}
      className='focus-visible:ring-ring/60 min-h-[18.5rem] overflow-x-auto py-4 font-mono text-[13px] leading-6 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset'
    >
      <code className='block w-max min-w-full'>
        {props.sample.lines.map((line, index) => (
          <span
            key={line.no}
            className={
              line.changed
                ? 'bg-primary/[0.07] flex pr-6 shadow-[inset_2px_0_0_var(--primary)]'
                : 'flex pr-6'
            }
          >
            <span
              aria-hidden='true'
              className='text-primary w-8 shrink-0 text-center select-none'
            >
              {line.changed ? '+' : ' '}
            </span>
            <span>
              {line.text === ''
                ? ' '
                : (tokenLines[index] ?? []).map((token) => (
                    <span
                      key={token.offset}
                      className={TOKEN_CLASS[token.type]}
                    >
                      {token.text}
                    </span>
                  ))}
            </span>
          </span>
        ))}
      </code>
    </pre>
  )
}

/**
 * "Keep your tools. Change one line." Copy and the real base URL on the left,
 * a tabbed code window with syntax colors on the right. Every URL comes from
 * server status.
 */
export function CodeDemo() {
  const { t } = useTranslation()
  const baseUrl = `${useGatewayBaseUrl()}/v1`
  const [activeId, setActiveId] = useState<CodeSampleId>('curl')
  const samples = useMemo(() => buildCodeSamples(baseUrl), [baseUrl])
  const activeSample =
    samples.find((sample) => sample.id === activeId) ?? samples[0]

  return (
    <SectionShell
      id='home-code'
      titleId='home-code-title'
      lead={t('Keep your tools.')}
      rest={t('Change one line.')}
      heading='custom'
    >
      <div className='grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16'>
        <AnimateInView className='min-w-0'>
          <MixedHeading
            id='home-code-title'
            lead={t('Keep your tools.')}
            rest={t('Change one line.')}
          />
          <p className='text-muted-foreground mt-6 max-w-md text-base leading-relaxed md:text-lg'>
            {t(
              'Point your existing OpenAI, Anthropic or Gemini client at this gateway. Call any model by name and use your API key.'
            )}
          </p>
          <div className='border-border bg-card text-muted-foreground mt-8 inline-flex max-w-full items-center gap-2.5 rounded-full border py-1 pr-1 pl-4 font-mono text-xs'>
            <span
              aria-hidden='true'
              className='bg-primary size-1.5 shrink-0 rounded-full shadow-[0_0_8px_1px_var(--primary)]'
            />
            <span className='min-w-0 truncate'>
              base_url = <span className='text-foreground'>{baseUrl}</span>
            </span>
            <CopyButton
              value={baseUrl}
              aria-label={t('Copy base URL')}
              tooltip={t('Copy base URL')}
              successTooltip={t('Base URL copied')}
              className='size-8 rounded-full'
              iconClassName='size-3.5'
            />
          </div>
        </AnimateInView>

        <AnimateInView delay={150} className='min-w-0'>
          <Tabs
            value={activeId}
            onValueChange={(value) => setActiveId(value as CodeSampleId)}
            className='border-border bg-card gap-0 overflow-hidden rounded-xl border shadow-[0_30px_80px_-30px_rgb(0_0_0/calc(0.8*var(--shadow-k)))]'
          >
            <div className='border-border bg-muted flex h-11 items-center gap-3 border-b px-4'>
              <div aria-hidden='true' className='flex shrink-0 gap-1.5'>
                <span className='bg-foreground/15 size-2.5 rounded-full' />
                <span className='bg-foreground/15 size-2.5 rounded-full' />
                <span className='bg-foreground/15 size-2.5 rounded-full' />
              </div>
              <span className='text-muted-foreground min-w-0 flex-1 truncate text-center font-mono text-xs'>
                {activeSample.filename}
              </span>
              <CopyButton
                value={activeSample.code}
                aria-label={t('Copy code')}
                tooltip={t('Copy code')}
                className='size-8 rounded-md'
                iconClassName='size-4'
              />
            </div>
            <div className='border-border border-b px-2'>
              <TabsList
                variant='line'
                aria-label={t('Code')}
                className='h-11 w-full min-w-0 justify-start overflow-x-auto'
              >
                {samples.map((sample) => (
                  <TabsTrigger
                    key={sample.id}
                    value={sample.id}
                    className='min-h-9 flex-none px-3 font-mono text-xs'
                  >
                    {sample.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {samples.map((sample) => (
              <TabsContent key={sample.id} value={sample.id}>
                <CodeBlock sample={sample} />
              </TabsContent>
            ))}
          </Tabs>
        </AnimateInView>
      </div>
    </SectionShell>
  )
}
