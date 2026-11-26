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
import { DirectionProvider as BaseDirectionProvider } from '@base-ui/react/direction-provider'
import { createContext, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { type Direction, directionForLanguage } from '@/lib/theme-direction'

type DirectionContextType = {
  dir: Direction
}

const DirectionContext = createContext<DirectionContextType | null>(null)

/** Text direction follows the interface language; it is not a user setting. */
export function DirectionProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation()
  const dir = directionForLanguage(i18n.resolvedLanguage || i18n.language)

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir)
  }, [dir])

  return (
    <DirectionContext value={{ dir }}>
      <BaseDirectionProvider direction={dir}>{children}</BaseDirectionProvider>
    </DirectionContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDirection() {
  const context = useContext(DirectionContext)
  if (!context) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return context
}
