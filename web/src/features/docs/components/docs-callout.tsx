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
import type { LucideIcon } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type CalloutTone = 'note' | 'warning' | 'success'

const TONE_CLASS: Record<CalloutTone, string> = {
  note: 'border-border bg-muted/40 *:[svg]:text-muted-foreground!',
  warning: 'border-warning/30 bg-warning/5 *:[svg]:text-warning!',
  success: 'border-success/30 bg-success/5 *:[svg]:text-success!',
}

type DocsCalloutProps = {
  tone: CalloutTone
  icon: LucideIcon
  title?: string
  children: React.ReactNode
}

/**
 * Docs-style Note / Warning / Check box. Built on the shared Alert but with
 * role="note": it is static page content, not a live announcement. The icon
 * and title carry the meaning, so color is never the only signal.
 */
export function DocsCallout(props: DocsCalloutProps) {
  const Icon = props.icon

  return (
    <Alert
      role='note'
      className={cn(
        'rounded-xl px-4 py-3 has-[>svg]:gap-x-3',
        TONE_CLASS[props.tone]
      )}
    >
      <Icon aria-hidden='true' />
      {props.title ? (
        <AlertTitle className='text-foreground font-semibold'>
          {props.title}
        </AlertTitle>
      ) : null}
      <AlertDescription className='text-sm leading-6 text-pretty wrap-anywhere'>
        {props.children}
      </AlertDescription>
    </Alert>
  )
}
