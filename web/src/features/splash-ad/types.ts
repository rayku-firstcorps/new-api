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

export type SplashAdContentFormat = 'plain_text' | 'markdown' | 'html'

/** Splash ad config — mirrors backend model.SplashAdConfig (JSON). */
export interface SplashAdConfig {
  enabled: boolean
  image_url: string
  title: string
  content_format: SplashAdContentFormat
  content: string
  cta_text: string
  cta_link: string
  /** Reward amount (currency face value) for the {amount} placeholder in title/content */
  reward_amount: number
  /** Unix seconds, 0 = no limit */
  start_time: number
  /** Unix seconds, 0 = no limit */
  end_time: number
}

export const DEFAULT_SPLASH_AD_CONFIG: SplashAdConfig = {
  enabled: false,
  image_url: '',
  title: '',
  content_format: 'plain_text',
  content: '',
  cta_text: '立即免费注册',
  cta_link: '/sign-up',
  reward_amount: 0,
  start_time: 0,
  end_time: 0,
}

/**
 * Parse the raw SplashAdConfig JSON string from /api/status into a typed config.
 * Returns null on empty/invalid input.
 */
export function parseSplashAdConfig(raw: unknown): SplashAdConfig | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SplashAdConfig>
    return { ...DEFAULT_SPLASH_AD_CONFIG, ...parsed }
  } catch {
    return null
  }
}
