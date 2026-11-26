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

import { getUptimeStatus } from '@/features/dashboard/api'
import { useStatus } from '@/hooks/use-status'

import { summarizeUptime, type FooterHealth } from './footer-columns'

/**
 * Real service health for the footer status line, from the same public
 * `/api/uptime/status` endpoint the dashboard Uptime panel reads. Returns null
 * while loading, when Uptime Kuma is disabled or not configured, or on error,
 * so the footer never claims a state it cannot back.
 */
export function useFooterHealth(): FooterHealth | null {
  const { status } = useStatus()
  const enabled = Boolean(status) && status?.uptime_kuma_enabled !== false
  const query = useQuery({
    queryKey: ['public-footer', 'uptime-status'],
    queryFn: getUptimeStatus,
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    meta: { errorToast: false },
  })
  if (!enabled) return null
  return summarizeUptime(query.data?.data)
}
