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
import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export interface CodeSnippet {
  id: string
  /** Tab label (language / client name). */
  label: string
  /** File-name style caption shown above the code. */
  title: string
  /** Text rendered on screen (e.g. with a masked key). */
  display: string
  /** Text placed on the clipboard; defaults to `display`. */
  copy?: string
}

export interface CodeSnippetTabsProps {
  snippets: readonly CodeSnippet[]
  /** Initially selected tab id; defaults to the first snippet. */
  defaultId?: string
  /** Disable copying, e.g. while the real key is still loading. */
  copyDisabled?: boolean
  className?: string
}

/**
 * Language tabs with scrollable (never truncated) code and a copy button.
 * The rendered text and the copied text can differ, so callers can show a
 * masked API key but copy the full one.
 */
export function CodeSnippetTabs(props: CodeSnippetTabsProps) {
  const { t } = useTranslation()
  const first = props.snippets[0]
  if (!first) return null

  return (
    <Tabs
      defaultValue={props.defaultId ?? first.id}
      className={props.className}
    >
      {props.snippets.length > 1 && (
        <TabsList className='h-auto max-w-full flex-wrap justify-start'>
          {props.snippets.map((snippet) => (
            <TabsTrigger key={snippet.id} value={snippet.id}>
              {snippet.label}
            </TabsTrigger>
          ))}
        </TabsList>
      )}
      {props.snippets.map((snippet) => (
        <TabsContent key={snippet.id} value={snippet.id}>
          <figure className='border-border bg-card w-full max-w-full min-w-0 overflow-hidden rounded-xl border'>
            <figcaption className='border-border bg-muted/30 flex h-10 items-center justify-between gap-2 border-b pr-1.5 pl-4'>
              <span className='text-muted-foreground min-w-0 truncate font-mono text-xs'>
                {snippet.title}
              </span>
              {props.copyDisabled ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-7'
                  disabled
                  aria-label={t('Copy code')}
                >
                  <Copy className='size-3.5' aria-hidden />
                </Button>
              ) : (
                <CopyButton
                  value={snippet.copy ?? snippet.display}
                  size='icon'
                  className='size-7'
                  iconClassName='size-3.5'
                  aria-label={t('Copy code')}
                />
              )}
            </figcaption>
            {/* Focusable so keyboard users can scroll long lines horizontally. */}
            <pre
              tabIndex={0}
              aria-label={snippet.title}
              className='focus-visible:ring-ring/60 max-w-full overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-6 outline-none focus-visible:ring-2 focus-visible:ring-inset'
            >
              <code>{snippet.display}</code>
            </pre>
          </figure>
        </TabsContent>
      ))}
    </Tabs>
  )
}
