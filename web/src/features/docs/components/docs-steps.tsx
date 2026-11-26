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
/** Scroll offset for anchors: the fixed header, plus the mobile docs bar. */
export const ANCHOR_SCROLL_MARGIN = 'scroll-mt-36 lg:scroll-mt-24'

/** Numbered steps joined by a vertical rule. */
export function DocsSteps(props: { children: React.ReactNode }) {
  return <ol className='list-none'>{props.children}</ol>
}

type DocsStepProps = {
  /** 1-based number shown in the circle. */
  index: number
  id: string
  title: string
  children?: React.ReactNode
}

export function DocsStep(props: DocsStepProps) {
  return (
    <li className='group/step relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 pb-9 last:pb-0'>
      <span
        aria-hidden='true'
        className='bg-border absolute top-10 bottom-2 left-4 w-px -translate-x-1/2 group-last/step:hidden'
      />
      <span
        aria-hidden='true'
        className='border-border bg-background text-foreground relative flex size-8 items-center justify-center rounded-full border font-mono text-sm font-medium'
      >
        {props.index}
      </span>
      <div className='min-w-0 space-y-3 pt-1'>
        <h3
          id={props.id}
          className={`${ANCHOR_SCROLL_MARGIN} text-[15px] leading-6 font-semibold text-pretty`}
        >
          {props.title}
        </h3>
        {props.children}
      </div>
    </li>
  )
}
