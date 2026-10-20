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
/** Empty disables the endpoint; null signals an invalid administrator input. */
export function normalizeMainlandBaseUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/[\\\s?#@]/.test(trimmed)) return null

  try {
    const url = new URL(
      trimmed.includes('://') ? trimmed : `https://${trimmed}`
    )
    const hostnamePattern =
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
    const authority = trimmed.replace(/^https:\/\//i, '').split('/')[0]
    if (
      url.protocol !== 'https:' ||
      !hostnamePattern.test(url.hostname) ||
      url.hostname.length > 253 ||
      url.username ||
      url.password ||
      authority.endsWith(':') ||
      url.port === '0'
    ) {
      return null
    }
    return url.href.replace(/\/+$/, '')
  } catch {
    return null
  }
}
