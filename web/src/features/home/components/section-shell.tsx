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
import type { ReactNode } from 'react'

import { AnimateInView } from '@/components/animate-in-view'
import { cn } from '@/lib/utils'

import { MixedHeading } from './mixed-heading'

interface SectionShellProps {
  id: string
  titleId: string
  lead: string
  rest?: string
  /** Optional line under the heading. */
  subtitle?: string
  /**
   * `center` (default) renders KuCode's centered heading block above the
   * content. `custom` renders no heading: the section places a
   * `MixedHeading` with `titleId` itself (the code demo's left column).
   */
  heading?: 'center' | 'custom'
  className?: string
  children: ReactNode
}

/**
 * Page-rhythm wrapper shared by the landing sections, with the KuCode section
 * heading: white lead, muted rest, centered above the content.
 */
export function SectionShell(props: SectionShellProps) {
  return (
    <section
      id={props.id}
      aria-labelledby={props.titleId}
      className={cn('home-section scroll-mt-24 px-5 sm:px-8', props.className)}
    >
      <div className='mx-auto max-w-7xl'>
        {props.heading === 'custom' ? null : (
          <AnimateInView className='mx-auto mb-14 max-w-4xl text-center md:mb-16'>
            <MixedHeading
              id={props.titleId}
              lead={props.lead}
              rest={props.rest}
            />
            {props.subtitle ? (
              <p className='text-muted-foreground mx-auto mt-5 max-w-xl text-base text-pretty md:text-lg'>
                {props.subtitle}
              </p>
            ) : null}
          </AnimateInView>
        )}
        {props.children}
      </div>
    </section>
  )
}
