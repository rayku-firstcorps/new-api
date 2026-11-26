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
import '@/styles/auth.css'
import { useMediaQuery } from '@/hooks/use-media-query'

import { AuthFooter } from './components/auth-footer'
import { AuthHeader } from './components/auth-header'
import { AuthVisual, type AuthVisualMode } from './components/auth-visual'
import { AuthVisualStrip } from './components/auth-visual-strip'

type AuthLayoutProps = {
  children: React.ReactNode
  /** Picks the side panel's title (and the base_url card on sign-up). Default `sign-in`. */
  mode?: AuthVisualMode
}

/** Split layout breakpoint (Tailwind `lg`). */
const SPLIT_QUERY = '(min-width: 1024px)'

/**
 * Auth shell: two 50% columns from 1024px (header, form and footer on the
 * left, sphere panel on the right; the left column scrolls on its own), a
 * single column with a decorative sphere band below. Only one sphere canvas is
 * mounted at a time.
 */
export function AuthLayout(props: AuthLayoutProps) {
  const split = useMediaQuery(SPLIT_QUERY)

  return (
    <div className='bg-background flex min-h-svh flex-col lg:grid lg:h-svh lg:grid-cols-2 lg:overflow-hidden'>
      <div className='flex min-h-svh min-w-0 flex-col lg:h-svh lg:min-h-0 lg:overflow-y-auto'>
        <AuthHeader />
        {!split && <AuthVisualStrip />}
        <main className='flex flex-1 flex-col px-4 pt-2 pb-8 sm:px-6 lg:px-10 lg:py-8'>
          <div className='auth-form mx-auto my-auto flex w-full max-w-[400px] flex-col justify-center'>
            {props.children}
          </div>
        </main>
        <AuthFooter />
      </div>
      {split && <AuthVisual mode={props.mode ?? 'sign-in'} />}
    </div>
  )
}
