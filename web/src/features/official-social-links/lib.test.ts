import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { normalizeOfficialSocialLinksForDisplay } from './lib'

describe('normalizeOfficialSocialLinksForDisplay', () => {
  test('filters unsafe, disabled, and unsupported links, then sorts by sort order', () => {
    const links: unknown = [
      {
        id: 'x-disabled',
        platform: 'x',
        label: 'X',
        url: 'https://x.com/example',
        enabled: false,
        sort: 10,
      },
      {
        id: 'telegram',
        platform: 'telegram',
        label: 'Telegram',
        url: 'https://t.me/example',
        enabled: true,
        sort: 20,
      },
      {
        id: 'instagram',
        platform: 'instagram',
        label: 'Instagram',
        url: 'https://www.instagram.com/example',
        enabled: true,
        sort: 30,
      },
      {
        id: 'http-url',
        platform: 'facebook',
        label: 'Facebook',
        url: 'http://www.facebook.com/example',
        enabled: true,
        sort: 5,
      },
      {
        id: 'script-url',
        platform: 'custom',
        label: 'Unsafe',
        url: 'javascript:alert(1)',
        enabled: true,
        sort: 1,
      },
      {
        id: 'unsupported',
        platform: 'discord',
        label: 'Discord',
        url: 'https://discord.gg/example',
        enabled: true,
        sort: 15,
      },
      {
        id: 'whatsapp',
        platform: 'whatsapp',
        label: 'WhatsApp',
        url: 'https://chat.whatsapp.com/example',
        enabled: true,
        sort: 10,
      },
    ]

    const normalized = normalizeOfficialSocialLinksForDisplay(links)

    assert.deepEqual(
      normalized.map((link) => link.id),
      ['whatsapp', 'telegram', 'instagram']
    )
  })

  test('returns an empty list when no valid links are configured', () => {
    assert.deepEqual(normalizeOfficialSocialLinksForDisplay([]), [])
    assert.deepEqual(normalizeOfficialSocialLinksForDisplay(undefined), [])
  })
})
