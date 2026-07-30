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
import { Link2 } from 'lucide-react'
import type { IconType } from 'react-icons'
import {
  FaFacebookF,
  FaInstagram,
  FaTelegram,
  FaVk,
  FaWhatsapp,
  FaXTwitter,
} from 'react-icons/fa6'

import type { OfficialSocialLink, OfficialSocialPlatform } from './types'

type PlatformMeta = {
  value: OfficialSocialPlatform
  label: string
  placeholder: string
  Icon: IconType | typeof Link2
}

export const OFFICIAL_SOCIAL_PLATFORM_META: PlatformMeta[] = [
  {
    value: 'telegram',
    label: 'Telegram',
    placeholder: 'https://t.me/example',
    Icon: FaTelegram,
  },
  {
    value: 'whatsapp',
    label: 'WhatsApp',
    placeholder: 'https://chat.whatsapp.com/example',
    Icon: FaWhatsapp,
  },
  {
    value: 'facebook',
    label: 'Facebook',
    placeholder: 'https://www.facebook.com/example',
    Icon: FaFacebookF,
  },
  {
    value: 'instagram',
    label: 'Instagram',
    placeholder: 'https://www.instagram.com/example',
    Icon: FaInstagram,
  },
  {
    value: 'x',
    label: 'X',
    placeholder: 'https://x.com/example',
    Icon: FaXTwitter,
  },
  {
    value: 'vk',
    label: 'VK',
    placeholder: 'https://vk.com/example',
    Icon: FaVk,
  },
  {
    value: 'custom',
    label: 'Custom',
    placeholder: 'https://example.com/community',
    Icon: Link2,
  },
]

const PLATFORM_META_BY_VALUE = new Map(
  OFFICIAL_SOCIAL_PLATFORM_META.map((item) => [item.value, item])
)

export function isOfficialSocialPlatform(
  value: unknown
): value is OfficialSocialPlatform {
  return (
    typeof value === 'string' &&
    PLATFORM_META_BY_VALUE.has(
      value.trim().toLowerCase() as OfficialSocialPlatform
    )
  )
}

export function getOfficialSocialPlatformMeta(platform: string) {
  return (
    PLATFORM_META_BY_VALUE.get(
      platform.trim().toLowerCase() as OfficialSocialPlatform
    ) ?? PLATFORM_META_BY_VALUE.get('custom')!
  )
}

export function getOfficialSocialLabel(
  link: Pick<OfficialSocialLink, 'label' | 'platform'>
) {
  return (
    link.label?.trim() || getOfficialSocialPlatformMeta(link.platform).label
  )
}

export function isSafeOfficialSocialUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim())
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.trim() !== '' &&
      parsed.username === '' &&
      parsed.password === ''
    )
  } catch {
    return false
  }
}

export function parseOfficialSocialLinks(raw: string): OfficialSocialLink[] {
  try {
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []

    return parsed.map((item, index) => {
      const platform = isOfficialSocialPlatform(item?.platform)
        ? (String(item.platform).trim().toLowerCase() as OfficialSocialPlatform)
        : 'custom'

      return {
        id: String(item?.id || `${platform}-${Date.now()}-${index}`),
        platform,
        label: String(item?.label || '').trim(),
        url: String(item?.url || '').trim(),
        enabled:
          typeof item?.enabled === 'boolean'
            ? item.enabled
            : item?.enabled !== false,
        sort:
          typeof item?.sort === 'number' && Number.isFinite(item.sort)
            ? item.sort
            : (index + 1) * 10,
      }
    })
  } catch {
    return []
  }
}

export function normalizeOfficialSocialLinksForDisplay(
  links: unknown
): OfficialSocialLink[] {
  if (!Array.isArray(links)) return []

  const normalized = links.map((item, index) => {
    if (!item || typeof item !== 'object') return null
    const record = item as Record<string, unknown>
    if (!isOfficialSocialPlatform(record.platform)) return null

    const url = String(record.url || '').trim()
    if (!url || !isSafeOfficialSocialUrl(url)) return null

    const platform = record.platform
      .trim()
      .toLowerCase() as OfficialSocialPlatform
    const sort =
      typeof record.sort === 'number' && Number.isFinite(record.sort)
        ? record.sort
        : (index + 1) * 10

    return {
      id: String(record.id || `${platform}-${index}`),
      platform,
      label: String(record.label || '').trim(),
      url,
      enabled: record.enabled === true,
      sort,
    }
  })

  return normalized
    .filter((item): item is NonNullable<(typeof normalized)[number]> =>
      Boolean(item && item.enabled)
    )
    .sort((a, b) => {
      if (a.sort === b.sort) return a.platform.localeCompare(b.platform)
      return a.sort - b.sort
    })
}
