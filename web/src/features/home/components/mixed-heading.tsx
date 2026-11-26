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
import { cn } from '@/lib/utils'

interface MixedHeadingProps {
  id?: string
  /** Leading part, rendered in the foreground color. */
  lead: string
  /** Optional trailing part, rendered muted. */
  rest?: string
  /** `p` for decorative, non-heading titles (e.g. the auth side panel). */
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
}

/** Heading in KuCode's white/grey mixed style (sections, page and auth titles). */
export function MixedHeading(props: MixedHeadingProps) {
  const Tag = props.as ?? 'h2'

  return (
    <Tag
      id={props.id}
      className={cn(
        'font-display text-[clamp(30px,4.2vw,48px)] leading-[1.1] font-medium tracking-[-0.03em] text-balance wrap-anywhere',
        props.className
      )}
    >
      <span className='text-foreground'>{props.lead}</span>
      {props.rest ? (
        <>
          {' '}
          <span className='text-muted-foreground'>{props.rest}</span>
        </>
      ) : null}
    </Tag>
  )
}
