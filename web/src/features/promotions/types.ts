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
import { z } from 'zod'

export const promotionActivityTypeSchema = z.enum([
  'quota_reward',
  'trial_coupon',
  'none',
])

export const promotionRewardStatusSchema = z.enum([
  'pending_email',
  'granted',
  'none',
])

export const promotionLinkSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  channel_tag: z.string(),
  landing_title: z.string().default(''),
  landing_content_format: z
    .enum(['plain_text', 'markdown', 'html'])
    .default('plain_text'),
  landing_content: z.string().default(''),
  landing_image_url: z.string().default(''),
  landing_image_position: z
    .enum(['left', 'right', 'top', 'background'])
    .default('right'),
  landing_min_width: z.number().default(960),
  landing_min_height: z.number().default(720),
  landing_primary_button: z.string().default(''),
  landing_secondary_button: z.string().default(''),
  activity_type: promotionActivityTypeSchema.default('quota_reward'),
  reward_quota: z.number(),
  trial_coupon_quota: z.number().default(0),
  first_topup_reward_quota: z.number().default(0),
  first_topup_min_amount: z.number().default(0),
  first_topup_count: z.number().default(0),
  enabled: z.boolean(),
  clicks: z.number(),
  registrations: z.number(),
  max_registrations: z.number(),
  expires_at: z.number(),
  created_by: z.number(),
  created_at: z.number().optional(),
  updated_at: z.number().optional(),
})

export type PromotionLink = z.infer<typeof promotionLinkSchema>

export const promotionRegistrationSchema = z.object({
  id: z.number(),
  promotion_link_id: z.number(),
  code: z.string(),
  channel_tag: z.string(),
  user_id: z.number(),
  username: z.string(),
  activity_type: promotionActivityTypeSchema.default('quota_reward'),
  reward_status: promotionRewardStatusSchema.default('granted'),
  reward_quota: z.number(),
  granted_quota: z.number().default(0),
  granted_at: z.number().default(0),
  ip: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.number().optional(),
})

export type PromotionRegistration = z.infer<typeof promotionRegistrationSchema>

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface GetPromotionsParams {
  p?: number
  page_size?: number
  keyword?: string
  channel_tag?: string
  activity_type?: PromotionActivityType | 'all'
}

export interface GetPromotionsResponse {
  success: boolean
  message?: string
  data?: {
    items: PromotionLink[]
    total: number
    page: number
    page_size: number
  }
}

export interface GetPromotionRegistrationsResponse {
  success: boolean
  message?: string
  data?: {
    items: PromotionRegistration[]
    total: number
    page: number
    page_size: number
  }
}

export interface PromotionFormData {
  id?: number
  code: string
  name: string
  channel_tag: string
  landing_title: string
  landing_content_format: 'plain_text' | 'markdown' | 'html'
  landing_content: string
  landing_image_url: string
  landing_image_position: 'left' | 'right' | 'top' | 'background'
  landing_min_width: number
  landing_min_height: number
  landing_primary_button: string
  landing_secondary_button: string
  activity_type: PromotionActivityType
  reward_quota: number
  trial_coupon_quota: number
  first_topup_reward_quota: number
  first_topup_min_amount: number
  max_registrations: number
  expires_at: number
  enabled: boolean
}

export type PromotionActivityType = z.infer<typeof promotionActivityTypeSchema>
export type PromotionRewardStatus = z.infer<typeof promotionRewardStatusSchema>

export interface PromotionRewardBannerConfig {
  title: string
  content_format: 'plain_text' | 'markdown' | 'html'
  content: string
  image_url: string
  image_position: 'left' | 'right' | 'top' | 'background'
  primary_button: string
  secondary_button: string
}

export interface PromotionRewardInfo {
  has_pending_reward: boolean
  activity_type: PromotionActivityType
  reward_status: PromotionRewardStatus
  reward_quota: number
  reward_amount: number
  requires_email_binding: boolean
  email_bound: boolean
  email_domain_allowed: boolean
  allowed_email_domains: string[]
  banner?: PromotionRewardBannerConfig
  promotion_code?: string
  channel_tag?: string
}

export interface PromotionRewardClaimResult {
  reward_status: PromotionRewardStatus
  granted_quota: number
  granted_amount: number
  granted_at: number
}
