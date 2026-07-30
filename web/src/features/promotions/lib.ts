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
import DOMPurify from 'dompurify'

import type {
  PromotionActivityType,
  PromotionRewardBannerConfig,
  PromotionRewardStatus,
} from './types'

export const DEFAULT_TRIAL_COUPON_AMOUNT = 5

export const DEFAULT_ALLOWED_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  '163.com',
  '126.com',
  'yeah.net',
  'qq.com',
  'foxmail.com',
  'yahoo.com',
  'yahoo.co.jp',
] as const

export const DEFAULT_PROMOTION_REWARD_BANNER: PromotionRewardBannerConfig = {
  title: 'Bind a common email to claim your 5 trial coupon',
  content_format: 'plain_text',
  content: 'Bind a common email to claim your 5 trial coupon',
  image_url: '',
  image_position: 'right',
  primary_button: '',
  secondary_button: '',
}

export function getPromotionActivityLabel(activityType: PromotionActivityType) {
  switch (activityType) {
    case 'trial_coupon':
      return 'Registration Trial Coupon'
    case 'none':
      return 'Tracking Only'
    default:
      return 'Registration Quota Reward'
  }
}

export function getPromotionRewardStatusLabel(
  rewardStatus: PromotionRewardStatus
) {
  switch (rewardStatus) {
    case 'pending_email':
      return 'Pending Email Binding'
    case 'none':
      return 'No Reward'
    default:
      return 'Granted'
  }
}

export function normalizeEmailDomainsInput(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    ),
  ]
}

export function isValidPromotionBannerImageUrl(value: string) {
  if (!value) return true
  return value.startsWith('https://') || value.startsWith('/')
}

export function sanitizePromotionBannerHtml(value: string) {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'ul',
      'ol',
      'li',
      'a',
      'span',
      'div',
      'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe'],
  })
}
