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
import type { SphereKind } from '@/lib/dot-sphere/sphere'

export type SphereAttractor = {
  /** Target point in VIEWPORT (client) coordinates, e.g. bottom-center of a hovered tag. */
  x: number
  y: number
  /** Optional accent color (hex); the spot color shifts 30% toward it. */
  tint?: string
}

/**
 * hero: huge sphere whose top arc sits at ~55% of the container height.
 * inverted: arc lit from above, hanging from the top edge of the container.
 * mini: whole small sphere centered in its box.
 */
export type DotSphereVariant = SphereKind

export type DotSphereProps = {
  /** Dot spacing in CSS px. Default 9 (11 under 768px wide, 3.5 for mini). */
  gap?: number
  /** Follow the pointer and ripple on click. Default true. */
  interactive?: boolean
  /** Brightness multiplier. Default 1. */
  intensity?: number
  /** Default 'hero'. */
  variant?: DotSphereVariant
  attractTo?: SphereAttractor | null
  /** Hero only: where the top of the arc sits, as a fraction of container height. Default 0.55. */
  topRatio?: number
  className?: string
}

/** Props that can change without rebuilding the canvas. */
export type SphereLiveProps = {
  interactive: boolean
  intensity: number
  attractTo: SphereAttractor | null
}
