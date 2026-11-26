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
import { Link, type LinkProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { MixedHeading } from '@/features/home/components/mixed-heading'

type AuthPageHeadingProps = {
  /** Foreground part of the h1. */
  lead: string
  /** Muted trailing part of the h1. */
  rest?: string
  /** Muted lines under the title. */
  children?: ReactNode
}

/** The auth page's only h1 in KuCode's two-tone style, with an optional subtitle. */
export function AuthPageHeading(props: AuthPageHeadingProps) {
  return (
    <div>
      <MixedHeading
        as='h1'
        lead={props.lead}
        rest={props.rest}
        className='text-[clamp(28px,3.2vw,36px)]'
      />
      {props.children && (
        <div className='text-muted-foreground mt-3 space-y-1 text-sm'>
          {props.children}
        </div>
      )}
    </div>
  )
}

type AuthSwitchPromptProps = {
  prompt: string
  linkLabel: string
  to: LinkProps['to']
}

/** Centered "Don't have an account? Sign up" line under an auth form. */
export function AuthSwitchPrompt(props: AuthSwitchPromptProps) {
  return (
    <p className='text-muted-foreground text-center text-sm'>
      {props.prompt}{' '}
      <AuthInlineLink to={props.to}>{props.linkLabel}</AuthInlineLink>
    </p>
  )
}

/** Underlined foreground link used inside auth copy (KuCode's switch-link look). */
export function AuthInlineLink(props: {
  to: LinkProps['to']
  children: ReactNode
}) {
  return (
    <Link
      to={props.to}
      className='text-foreground decoration-muted-foreground/60 hover:decoration-foreground focus-visible:ring-ring rounded-sm font-medium underline underline-offset-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
    >
      {props.children}
    </Link>
  )
}
