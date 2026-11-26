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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getPricing } from '@/features/pricing/api'
import { useStatus } from '@/hooks/use-status'
import { requireServerSuccess } from '@/lib/server-error-message'

import {
  summarizeCatalog,
  type HomeCatalogSummary,
} from '../lib/catalog-summary'
import {
  isLandingPricingEnabled,
  type LandingStatus,
} from '../lib/landing-actions'

/**
 * Provider row and totals for the landing page. It reuses the public pricing
 * query (same key and function as the pricing page), so the page makes no
 * extra request, and it stays disabled while pricing is hidden. `active`
 * is false while an admin custom home page is shown.
 */
export function useHomeCatalog(
  isAuthenticated: boolean,
  active: boolean
): HomeCatalogSummary | null {
  const { status, loading, error } = useStatus()
  const showPricing = isLandingPricingEnabled(status as LandingStatus)
  const enabled =
    active &&
    Boolean(status) &&
    !loading &&
    !error &&
    showPricing &&
    !isAuthenticated
  const pricing = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => requireServerSuccess(await getPricing()),
    staleTime: 5 * 60 * 1000,
    retry: false,
    meta: { errorToast: false },
    enabled,
  })

  return useMemo(() => {
    if (!enabled || !pricing.isSuccess) return null
    const models = pricing.data.data
    if (!Array.isArray(models) || models.length === 0) return null
    const summary = summarizeCatalog(models, pricing.data.vendors ?? [])
    return summary.modelCount > 0 ? summary : null
  }, [enabled, pricing.isSuccess, pricing.data])
}
