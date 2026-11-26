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
export type Direction = 'ltr' | 'rtl'

// Languages written right to left. None of the interface languages is one
// today; the check keeps direction tied to the language if one is added.
const RTL_LANGUAGES = new Set(['ar', 'fa', 'he', 'ur'])

/** Text direction follows the interface language; it is not a user setting. */
export function directionForLanguage(language?: string | null): Direction {
  const base = (language ?? '').toLowerCase().split(/[-_]/)[0]
  return RTL_LANGUAGES.has(base) ? 'rtl' : 'ltr'
}
