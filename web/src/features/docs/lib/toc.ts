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
import { GUIDE_STEP_TITLES } from './guides'

/** One "On this page" entry. `label` is an i18n key; depth 3 is indented. */
export type TocEntry = { id: string; label: string; depth: 2 | 3 }

export const STEPS_ANCHOR = 'steps'

/** Anchor of a guide step; `index` is 1-based like the visible step number. */
export function stepAnchor(index: number) {
  return `step-${index}`
}

/**
 * Anchors of the guide in reading order: the steps section, then each step.
 * The article renders the same ids.
 */
export function buildGuideToc(): TocEntry[] {
  return [
    { id: STEPS_ANCHOR, label: 'Steps', depth: 2 },
    ...GUIDE_STEP_TITLES.map((title, index) => ({
      id: stepAnchor(index + 1),
      label: title,
      depth: 3 as const,
    })),
  ]
}
