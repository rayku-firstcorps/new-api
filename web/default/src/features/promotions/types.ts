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

export const promotionLinkSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  channel_tag: z.string(),
  reward_quota: z.number(),
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
  reward_quota: z.number(),
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
  reward_quota: number
  max_registrations: number
  expires_at: number
  enabled: boolean
}
