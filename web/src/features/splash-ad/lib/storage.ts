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
 * Splash ad frequency control: show at most once per device per day.
 */

const STORAGE_KEY = 'splash_ad_shown_date'

/**
 * Whether the splash ad has already been shown today on this device.
 * On localStorage error (e.g. private mode) returns true → degrade to "do not show",
 * so the splash never blocks site entry.
 */
export function hasSplashAdShownToday(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return false
    return stored === new Date().toDateString()
  } catch {
    return true
  }
}

/**
 * Record that the splash ad has been shown today.
 */
export function markSplashAdShownToday(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, new Date().toDateString())
  } catch {
    /* ignore localStorage errors (private mode etc.) */
  }
}
