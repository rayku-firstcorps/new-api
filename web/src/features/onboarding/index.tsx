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
import { useSearch } from '@tanstack/react-router'

import { useAuthStore } from '@/stores/auth-store'

import { AdminOnboardingWizard } from './admin-onboarding-wizard'
import { isOnboardingAdmin } from './lib/availability'
import { OnboardingWizard } from './onboarding-wizard'

/** Route body: the wizard inside the authenticated layout needs its own scroll container. */
export function OnboardingPage() {
  const user = useAuthStore((state) => state.auth.user)
  const search = useSearch({ strict: false }) as { step?: number }

  return (
    <div className='h-full overflow-y-auto'>
      {isOnboardingAdmin(user) ? (
        <AdminOnboardingWizard initialStep={search.step} />
      ) : (
        <OnboardingWizard />
      )}
    </div>
  )
}
