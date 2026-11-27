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
import type { OnboardingUseCase } from '@/features/auth/types'

/** Zero-based wizard step indexes. */
export const ONBOARDING_STEP = {
  USE_CASE: 0,
  CREDENTIALS: 1,
  CONNECT: 2,
} as const

/**
 * The API key chosen or created in Step 2.
 * `fullKey` is only ever held in component memory and is never persisted to
 * localStorage, the URL or router state.
 */
export interface OnboardingSelectedKey {
  id: number
  name: string
  /** Masked display value, e.g. `sk-abcd...wxyz`. */
  maskedKey: string
  /** Full plaintext key, memory only; fetched on demand via `fetchTokenKey`. */
  fullKey?: string
}

/** State shared between the wizard steps; Step 3 (P6) consumes useCase and selectedKey. */
export interface OnboardingWizardState {
  step: number
  useCase: OnboardingUseCase
  selectedKey: OnboardingSelectedKey | null
}

/** Props contract of the Step 3 component that P6 replaces. */
export interface OnboardingConnectStepProps {
  useCase: OnboardingUseCase
  selectedKey: OnboardingSelectedKey | null
}

/** Persisted onboarding progress (backend setting and local optimistic cache). */
export interface OnboardingProgress {
  completed: boolean
  dismissed: boolean
  useCase?: OnboardingUseCase
}
