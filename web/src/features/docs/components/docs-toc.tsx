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

import { cn } from '@/lib/utils'

import type { TocEntry } from '../lib/toc'

type DocsTocProps = {
  entries: TocEntry[]
  activeId?: string
}

/** "On this page" rail: in-page anchors with the current one marked. */
export function DocsToc(props: DocsTocProps) {
  const { t } = useTranslation()

  return (
    <nav aria-labelledby='docs-toc-title'>
      <p
        id='docs-toc-title'
        className='text-foreground mb-3 text-xs font-semibold'
      >
        {t('On this page')}
      </p>
      <ul className='border-border border-l'>
        {props.entries.map((entry) => {
          const active = entry.id === props.activeId
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'focus-visible:ring-ring/60 -ml-px block rounded-r-sm border-l py-1 pr-1 text-[13px] leading-5 transition-colors outline-none focus-visible:ring-2',
                  entry.depth === 3 ? 'pl-6' : 'pl-3',
                  active
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent'
                )}
              >
                {t(entry.label)}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
