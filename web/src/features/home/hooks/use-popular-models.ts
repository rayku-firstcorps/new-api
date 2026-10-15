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

import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import { getPricing } from '@/features/pricing/api'
import type { PricingModel } from '@/features/pricing/types'
import { requireServerSuccess } from '@/lib/server-error-message'

const NO_MODELS: PricingModel[] = []
export const POPULAR_MODEL_LIMIT = 3

/**
 * Pick the highest-traffic catalog models without exposing private request
 * counts. Vendor and group ratio are joined like the pricing page does so the
 * displayed prices match it.
 */
export function usePopularModels(
  enabled: boolean,
  limit = POPULAR_MODEL_LIMIT
): PricingModel[] {
  const pricing = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => requireServerSuccess(await getPricing()),
    staleTime: 5 * 60 * 1000,
    retry: false,
    meta: { errorToast: false },
    enabled,
  })
  const performance = useQuery({
    queryKey: ['perf-metrics-summary', 24],
    queryFn: async () => requireServerSuccess(await getPerfMetricsSummary(24)),
    staleTime: 60 * 1000,
    retry: false,
    meta: { errorToast: false },
    enabled,
  })

  return useMemo(() => {
    if (!enabled || !pricing.isSuccess || !performance.isSuccess) {
      return NO_MODELS
    }
    const models = pricing.data.data
    const rankedModels = performance.data.data?.models
    if (!Array.isArray(models) || !Array.isArray(rankedModels)) {
      return NO_MODELS
    }

    const vendors = new Map(
      (pricing.data.vendors ?? []).map((vendor) => [vendor.id, vendor])
    )
    const catalog = new Map(models.map((model) => [model.model_name, model]))
    const picked: PricingModel[] = []
    const seen = new Set<string>()
    // QuerySummaryAll orders by request count descending and omits zero-traffic
    // models. Counts are deliberately not serialized; preserve the server order.
    for (const entry of rankedModels) {
      if (picked.length >= limit) break
      if (!entry.model_name?.trim() || seen.has(entry.model_name)) continue
      const model = catalog.get(entry.model_name)
      if (!model) continue
      seen.add(entry.model_name)
      const vendor = model.vendor_id ? vendors.get(model.vendor_id) : undefined
      picked.push({
        ...model,
        vendor_name: vendor?.name ?? model.vendor_name,
        vendor_icon: vendor?.icon ?? model.vendor_icon,
        group_ratio: pricing.data.group_ratio,
      })
    }
    return picked.length > 0 ? picked : NO_MODELS
  }, [
    enabled,
    limit,
    pricing.isSuccess,
    pricing.data,
    performance.isSuccess,
    performance.data,
  ])
}
