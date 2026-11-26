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
import type { SphereThemeTokens } from '@/lib/dot-sphere/palette'

/** Reads the theme tokens the sphere palette can follow (hex values only; null otherwise). */
export function readSphereThemeTokens(): SphereThemeTokens {
  if (typeof document === 'undefined') return {}
  const style = getComputedStyle(document.documentElement)
  return {
    primary: style.getPropertyValue('--primary'),
    foreground: style.getPropertyValue('--foreground'),
  }
}
