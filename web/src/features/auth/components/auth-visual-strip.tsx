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
import { lazy, Suspense } from 'react'

const DotSphereCanvas = lazy(() =>
  import('@/components/dot-sphere').then((m) => ({
    default: m.DotSphereCanvas,
  }))
)

/** Decorative 120px sphere band shown above the form below 1024px. */
export function AuthVisualStrip() {
  return (
    <div
      aria-hidden='true'
      className='pointer-events-none relative isolate h-[120px] shrink-0 overflow-hidden'
    >
      <Suspense fallback={null}>
        <DotSphereCanvas
          variant='hero'
          interactive={false}
          topRatio={0.34}
          intensity={0.85}
        />
      </Suspense>
      <div className='to-background absolute inset-x-0 bottom-0 h-16 bg-linear-to-b from-transparent' />
    </div>
  )
}
