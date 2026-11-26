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
type DocsArticleHeaderProps = {
  eyebrow: React.ReactNode
  title: string
  lead?: string
  children?: React.ReactNode
}

/** Article header: eyebrow, the page's only h1, lead and optional metadata. */
export function DocsArticleHeader(props: DocsArticleHeaderProps) {
  return (
    <header className='border-border space-y-4 border-b pb-8'>
      <p className='text-primary text-sm font-medium'>{props.eyebrow}</p>
      <h1
        id='docs-title'
        className='font-display text-[clamp(28px,3.2vw,36px)] leading-[1.15] font-medium tracking-[-0.02em] text-balance wrap-anywhere'
      >
        {props.title}
      </h1>
      {props.lead ? (
        <p className='text-muted-foreground max-w-[65ch] text-base leading-7 text-pretty'>
          {props.lead}
        </p>
      ) : null}
      {props.children}
    </header>
  )
}
