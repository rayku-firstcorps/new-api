import { describe, expect, test } from 'vitest'

import { getRouteSeo } from '../seo'

describe('getRouteSeo', () => {
  test('allows indexing for public content and strips trailing slashes', () => {
    expect(getRouteSeo('/docs/', 'https://example.com/')).toEqual({
      canonicalUrl: 'https://example.com/docs',
      robots: 'index, follow',
    })
    expect(getRouteSeo('/pricing/gpt-5', 'https://example.com').robots).toBe(
      'index, follow'
    )
  })

  test('prevents indexing for authenticated and operational routes', () => {
    expect(getRouteSeo('/dashboard', 'https://example.com')).toEqual({
      canonicalUrl: 'https://example.com/dashboard',
      robots: 'noindex, nofollow',
    })
    expect(getRouteSeo('/oauth/github', 'https://example.com').robots).toBe(
      'noindex, nofollow'
    )
  })
})
