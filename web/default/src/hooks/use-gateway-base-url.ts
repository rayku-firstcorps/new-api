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
import { useMemo } from 'react'
import { useStatus } from '@/hooks/use-status'
import type { SystemStatus } from '@/features/auth/types'

const FALLBACK_GATEWAY_BASE_URL = 'https://www.kudexapi.com'

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, '')
}

function getStatusServerAddress(status: SystemStatus | null) {
  const candidate =
    (status?.server_address as string | undefined) ??
    (status?.serverAddress as string | undefined) ??
    status?.data?.server_address ??
    (status?.data as Record<string, unknown> | undefined)?.serverAddress

  return typeof candidate === 'string' && candidate.trim()
    ? trimTrailingSlash(candidate)
    : ''
}

export function getCurrentGatewayBaseUrl() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return trimTrailingSlash(window.location.origin)
  }

  return FALLBACK_GATEWAY_BASE_URL
}

export function useGatewayBaseUrl() {
  const { status } = useStatus()

  return useMemo(() => {
    return getStatusServerAddress(status) || getCurrentGatewayBaseUrl()
  }, [status])
}
