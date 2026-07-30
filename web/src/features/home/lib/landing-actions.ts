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
import { parseHeaderNavModulesFromStatus } from '@/lib/nav-modules'

type StatusRecord = Record<string, unknown> | null

export type LandingPrimaryAction = {
  label: 'Get Started' | 'Go to Dashboard' | 'Sign In'
  to: '/dashboard' | '/sign-up' | '/sign-in'
}

function readStatusValue(status: StatusRecord, key: string): unknown {
  if (!status) return undefined
  const directValue = status[key]
  if (directValue !== undefined) return directValue

  const data = status.data
  if (data && typeof data === 'object') {
    return (data as Record<string, unknown>)[key]
  }

  return undefined
}

function readStatusBoolean(
  status: StatusRecord,
  key: string,
  fallback: boolean
): boolean {
  const value = readStatusValue(status, key)
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }

  return fallback
}

export function isRegistrationAvailable(status: StatusRecord): boolean {
  const registerEnabled = readStatusBoolean(status, 'register_enabled', true)
  const passwordRegisterEnabled = readStatusBoolean(
    status,
    'password_register_enabled',
    true
  )
  const oauthRegisterEnabled = readStatusBoolean(
    status,
    'oauth_register_enabled',
    true
  )

  return registerEnabled && (passwordRegisterEnabled || oauthRegisterEnabled)
}

export function getLandingPrimaryAction(
  status: StatusRecord,
  isAuthenticated: boolean
): LandingPrimaryAction {
  if (isAuthenticated) {
    return { label: 'Go to Dashboard', to: '/dashboard' }
  }

  if (isRegistrationAvailable(status)) {
    return { label: 'Get Started', to: '/sign-up' }
  }

  return { label: 'Sign In', to: '/sign-in' }
}

export function getLandingDocsUrl(status: StatusRecord): string {
  const docsLink = readStatusValue(status, 'docs_link')
  return typeof docsLink === 'string' && docsLink.trim()
    ? docsLink
    : 'https://docs.newapi.pro'
}

export function isLandingPricingEnabled(status: StatusRecord): boolean {
  const modules = parseHeaderNavModulesFromStatus(status)
  const pricing = modules.pricing
  return Boolean(
    pricing &&
    typeof pricing === 'object' &&
    pricing.enabled &&
    !pricing.requireAuth
  )
}
