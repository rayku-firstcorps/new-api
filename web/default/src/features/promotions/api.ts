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
import { api } from '@/lib/api'
import type {
  ApiResponse,
  GetPromotionRegistrationsResponse,
  GetPromotionsParams,
  GetPromotionsResponse,
  PromotionFormData,
  PromotionLink,
} from './types'

export async function getPromotions(
  params: GetPromotionsParams = {}
): Promise<GetPromotionsResponse> {
  const res = await api.get('/api/promotion', { params })
  return res.data
}

export async function getPromotion(
  id: number
): Promise<ApiResponse<PromotionLink>> {
  const res = await api.get(`/api/promotion/${id}`)
  return res.data
}

export async function createPromotion(
  data: PromotionFormData
): Promise<ApiResponse<PromotionLink>> {
  const res = await api.post('/api/promotion', data)
  return res.data
}

export async function updatePromotion(
  id: number,
  data: PromotionFormData
): Promise<ApiResponse<PromotionLink>> {
  const res = await api.put(`/api/promotion/${id}`, data)
  return res.data
}

export async function enablePromotion(
  id: number
): Promise<ApiResponse<PromotionLink>> {
  const res = await api.post(`/api/promotion/${id}/enable`)
  return res.data
}

export async function disablePromotion(
  id: number
): Promise<ApiResponse<PromotionLink>> {
  const res = await api.post(`/api/promotion/${id}/disable`)
  return res.data
}

export async function deletePromotion(id: number): Promise<ApiResponse<void>> {
  const res = await api.delete(`/api/promotion/${id}`)
  return res.data
}

export async function getPromotionRegistrations(
  id: number,
  params: { p?: number; page_size?: number } = {}
): Promise<GetPromotionRegistrationsResponse> {
  const res = await api.get(`/api/promotion/${id}/registrations`, { params })
  return res.data
}

export async function recordPromotionClick(code: string): Promise<ApiResponse> {
  const res = await api.post('/api/promotion/click', { code })
  return res.data
}
