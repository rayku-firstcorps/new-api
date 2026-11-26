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
import { Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

type DocsCodeBlockProps = {
  /** File name or label shown in the header. */
  title: string
  code: string
}

/**
 * Code block with a file-name header and a copy button. Uses the shared
 * useCopyToClipboard hook directly rather than CopyButton because the docs
 * page keeps its original "Configuration copied" toast, and CopyButton runs
 * the hook with notifications turned off.
 */
export function DocsCodeBlock(props: DocsCodeBlockProps) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({
    successMessage: t('Configuration copied'),
  })
  const copied = copiedText === props.code

  return (
    <figure className='border-border bg-card w-full max-w-full min-w-0 overflow-hidden rounded-xl border'>
      <figcaption className='border-border bg-muted/30 flex h-10 items-center justify-between gap-2 border-b pr-1.5 pl-4'>
        <span className='text-muted-foreground min-w-0 truncate font-mono text-xs'>
          {props.title}
        </span>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          className='text-muted-foreground hover:text-foreground'
          aria-label={copied ? t('Copied') : t('Copy config')}
          onClick={() => void copyToClipboard(props.code)}
        >
          {copied ? (
            <Check className='text-success size-3.5' aria-hidden='true' />
          ) : (
            <Copy className='size-3.5' aria-hidden='true' />
          )}
        </Button>
      </figcaption>
      {/* Focusable so keyboard users can scroll long lines horizontally. */}
      <pre
        tabIndex={0}
        aria-label={props.title}
        className='focus-visible:ring-ring/60 max-w-full overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-6 outline-none focus-visible:ring-2 focus-visible:ring-inset'
      >
        <code>{props.code}</code>
      </pre>
    </figure>
  )
}
