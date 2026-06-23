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
/**
 * Utilities for managing authentication-related browser storage
 */

// ============================================================================
// LocalStorage Keys
// ============================================================================

const STORAGE_KEYS = {
  USER_ID: 'uid',
  AFFILIATE: 'aff',
  PROMOTION: 'promotion_source',
  REGISTRATION_SOURCE: 'registration_source',
  STATUS: 'status',
} as const

export type PromotionSourceRecord = {
  code: string
  source_param: 'promo' | 'promotion_code'
  landing_path: string
  created_at: number
}

// ============================================================================
// User ID Storage
// ============================================================================

/**
 * Save user ID to localStorage
 */
export function saveUserId(userId: number | string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEYS.USER_ID, String(userId))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save user ID:', error)
  }
}

/**
 * Get user ID from localStorage
 */
export function getUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEYS.USER_ID)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get user ID:', error)
    return null
  }
}

/**
 * Remove user ID from localStorage
 */
export function removeUserId(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEYS.USER_ID)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove user ID:', error)
  }
}

// ============================================================================
// Affiliate Code Storage
// ============================================================================

/**
 * Get affiliate code from localStorage
 */
export function getAffiliateCode(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(STORAGE_KEYS.AFFILIATE) ?? ''
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get affiliate code:', error)
    return ''
  }
}

/**
 * Save affiliate code to localStorage
 */
export function saveAffiliateCode(code: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEYS.AFFILIATE, code)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save affiliate code:', error)
  }
}

// ============================================================================
// Registration Source Storage (utm_source from external ad placements)
// ============================================================================

/**
 * Get registration source (channel / utm_source) from localStorage
 */
export function getRegistrationSource(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(STORAGE_KEYS.REGISTRATION_SOURCE) ?? ''
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get registration source:', error)
    return ''
  }
}

/**
 * Save registration source (channel / utm_source) to localStorage.
 * First-touch wins: keep the earliest source unless it is empty.
 */
export function saveRegistrationSource(source: string): void {
  if (typeof window === 'undefined') return
  try {
    const normalized = source.trim()
    if (!normalized) return
    // 不覆盖已有来源，保留首次触点（first-touch attribution）
    const existing = window.localStorage.getItem(STORAGE_KEYS.REGISTRATION_SOURCE)
    if (existing && existing.trim()) return
    window.localStorage.setItem(STORAGE_KEYS.REGISTRATION_SOURCE, normalized.slice(0, 64))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save registration source:', error)
  }
}

/**
 * Get promotion code from structured storage.
 */
export function getPromotionCode(): string {
  if (typeof window === 'undefined') return ''
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PROMOTION)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PromotionSourceRecord>
      if (!isPromotionSourceParam(parsed.source_param)) {
        return ''
      }
      if (typeof parsed.code === 'string' && parsed.code.trim()) {
        return parsed.code.trim()
      }
    }
  } catch {
    // ignore structured storage parse errors
  }

  return ''
}

/**
 * Save promotion code with source metadata.
 */
export function savePromotionCode(
  code: string,
  sourceParam: PromotionSourceRecord['source_param'],
  landingPath: string
): void {
  if (typeof window === 'undefined') return
  try {
    const normalized = code.trim()
    if (!normalized) return

    const record: PromotionSourceRecord = {
      code: normalized,
      source_param: sourceParam,
      landing_path: landingPath || window.location.pathname || '/',
      created_at: Date.now(),
    }
    window.localStorage.setItem(STORAGE_KEYS.PROMOTION, JSON.stringify(record))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save promotion code:', error)
  }
}

function isPromotionSourceParam(
  sourceParam: unknown
): sourceParam is PromotionSourceRecord['source_param'] {
  return sourceParam === 'promo' || sourceParam === 'promotion_code'
}

/**
 * Get structured promotion source record
 */
export function getPromotionSourceRecord(): PromotionSourceRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.PROMOTION)
    if (!raw) return null

    const parsed = JSON.parse(raw) as Partial<PromotionSourceRecord>
    if (!parsed.code) return null
    if (!isPromotionSourceParam(parsed.source_param)) return null

    return {
      code: String(parsed.code),
      source_param: parsed.source_param,
      landing_path: String(parsed.landing_path ?? '/'),
      created_at: Number(parsed.created_at ?? Date.now()),
    }
  } catch {
    return null
  }
}
