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
import { createSSOEncryptedApiKey } from './api'
import type {
  SSOCreateEncryptedApiKeyRequest,
  SSOCreateEncryptedApiKeyResponse,
} from './types'

export type CreateSSOApiKeyOptions = Omit<
  SSOCreateEncryptedApiKeyRequest,
  'key_encryption'
> & {
  accessToken: string
  userId: number
}

export type CreateSSOApiKeyResult = SSOCreateEncryptedApiKeyResponse & {
  apiKey: string
}

const rsaAlg: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes))
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function generateEncryptionKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(rsaAlg, true, ['encrypt', 'decrypt'])
}

async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const spki = await crypto.subtle.exportKey('spki', publicKey)
  return bytesToBase64Url(spki)
}

async function decryptApiKey(
  privateKey: CryptoKey,
  encrypted: SSOCreateEncryptedApiKeyResponse['encrypted_api_key']
): Promise<string> {
  if (encrypted.alg !== 'RSA-OAEP-SHA256') {
    throw new Error(
      `Unsupported API key encryption algorithm: ${encrypted.alg}`
    )
  }
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP',
      label: new TextEncoder().encode(encrypted.aad),
    },
    privateKey,
    base64UrlToBuffer(encrypted.ciphertext)
  )
  return new TextDecoder().decode(plaintext)
}

export async function createAndDecryptSSOApiKey(
  options: CreateSSOApiKeyOptions
): Promise<CreateSSOApiKeyResult> {
  const keyPair = await generateEncryptionKeyPair()
  const clientPublicKey = await exportPublicKey(keyPair.publicKey)

  const res = await createSSOEncryptedApiKey(
    {
      client_id: options.client_id,
      name: options.name,
      group: options.group,
      models: options.models,
      unlimited_quota: options.unlimited_quota,
      remain_quota: options.remain_quota,
      expired_time: options.expired_time,
      allow_ips: options.allow_ips,
      key_encryption: {
        alg: 'RSA-OAEP-SHA256',
        client_public_key: clientPublicKey,
      },
    },
    options.accessToken,
    options.userId
  )

  if (!res.success || !res.data) {
    throw new Error(res.message || 'Failed to create encrypted API key')
  }

  const apiKey = await decryptApiKey(
    keyPair.privateKey,
    res.data.encrypted_api_key
  )
  return {
    ...res.data,
    apiKey,
  }
}
