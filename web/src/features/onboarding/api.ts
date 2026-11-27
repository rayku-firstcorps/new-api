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
import type {
  OnboardingUseCase,
  UpdateOnboardingRequest,
} from '@/features/auth/types'
import { api } from '@/lib/api'

export interface UpdateOnboardingResponse {
  success: boolean
  message?: string
  data?: {
    onboarding_completed?: boolean
    onboarding_dismissed?: boolean
    onboarding_use_case?: OnboardingUseCase | ''
  }
}

/** `PUT /api/user/onboarding`: partial update of the caller's onboarding state. */
export async function updateOnboarding(
  body: UpdateOnboardingRequest
): Promise<UpdateOnboardingResponse> {
  const res = await api.put('/api/user/onboarding', body)
  return res.data
}
