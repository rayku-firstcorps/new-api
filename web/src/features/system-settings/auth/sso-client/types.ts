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
import * as z from 'zod'

export interface SSOClient {
  id: number
  name: string
  client_id: string
  client_secret?: string
  enabled: boolean
  redirect_uris: string[]
  allowed_scopes: string[]
  created_at?: number
  updated_at?: number
}

export const ssoClientFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  client_id: z.string().min(1, 'Client ID is required'),
  client_secret: z.string().optional().default(''),
  enabled: z.boolean().default(true),
  redirect_uris_text: z
    .string()
    .min(1, 'At least one redirect URI is required'),
  allowed_scopes_text: z.string().optional().default('profile access_token'),
})

export type SSOClientFormValues = z.infer<typeof ssoClientFormSchema>

export interface SSOAuthorizeInfo {
  client: {
    name: string
    client_id: string
  }
  scope: string[]
  user: {
    id: number
    username: string
    role: number
    group: string
  }
}

export interface SSOCreateEncryptedApiKeyRequest {
  client_id: string
  name: string
  group?: string
  models?: string[]
  unlimited_quota?: boolean
  remain_quota?: number
  expired_time?: number
  allow_ips?: string
  key_encryption: {
    alg: 'RSA-OAEP-SHA256'
    client_public_key: string
  }
}

export interface SSOEncryptedApiKey {
  alg: 'RSA-OAEP-SHA256'
  ciphertext: string
  aad: string
}

export interface SSOCreateEncryptedApiKeyResponse {
  encrypted_api_key: SSOEncryptedApiKey
  token: {
    id: number
    name: string
    group: string
    model_limits_enabled: boolean
    model_limits: string[]
    expired_time: number
    unlimited_quota: boolean
    remain_quota: number
  }
  user: {
    id: number
    username: string
    group: string
  }
  available_groups: Record<string, { desc: string; ratio: number | string }>
  available_models: string[]
}
