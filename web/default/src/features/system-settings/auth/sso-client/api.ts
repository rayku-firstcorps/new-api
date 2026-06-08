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
  SSOAuthorizeInfo,
  SSOClient,
  SSOCreateEncryptedApiKeyRequest,
  SSOCreateEncryptedApiKeyResponse,
} from './types'

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export async function getSSOClients(): Promise<ApiResponse<SSOClient[]>> {
  const res = await api.get('/api/sso-client/')
  return res.data
}

export async function createSSOClient(
  data: Omit<SSOClient, 'id' | 'created_at' | 'updated_at'>
): Promise<ApiResponse<SSOClient>> {
  const res = await api.post('/api/sso-client/', data)
  return res.data
}

export async function updateSSOClient(
  id: number,
  data: Partial<SSOClient>
): Promise<ApiResponse<SSOClient>> {
  const res = await api.put(`/api/sso-client/${id}`, data)
  return res.data
}

export async function deleteSSOClient(id: number): Promise<ApiResponse> {
  const res = await api.delete(`/api/sso-client/${id}`)
  return res.data
}

export async function getSSOAuthorizeInfo(params: {
  client_id: string
  redirect_uri: string
  scope?: string
}): Promise<ApiResponse<SSOAuthorizeInfo>> {
  const res = await api.get('/api/sso/authorize', { params })
  return res.data
}

export async function confirmSSOAuthorize(data: {
  client_id: string
  redirect_uri: string
  state?: string
  scope?: string
}): Promise<ApiResponse<{ redirect_url: string; expires_at: number }>> {
  const res = await api.post('/api/sso/authorize', data)
  return res.data
}

export async function denySSOAuthorize(data: {
  client_id: string
  redirect_uri: string
  state?: string
  scope?: string
}): Promise<ApiResponse<{ redirect_url: string }>> {
  const res = await api.post('/api/sso/deny', data)
  return res.data
}

export async function createSSOEncryptedApiKey(
  data: SSOCreateEncryptedApiKeyRequest,
  accessToken: string,
  userId: number
): Promise<ApiResponse<SSOCreateEncryptedApiKeyResponse>> {
  const res = await api.post('/api/sso/api-key', data, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'New-Api-User': String(userId),
    },
  })
  return res.data
}
