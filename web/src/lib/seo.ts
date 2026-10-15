const INDEXABLE_PATHS = new Set([
  '/',
  '/about',
  '/docs',
  '/image-generation',
  '/pricing',
  '/privacy-policy',
  '/rankings',
  '/user-agreement',
])

export type RouteSeo = {
  canonicalUrl: string
  robots: 'index, follow' | 'noindex, nofollow'
}

export function getRouteSeo(pathname: string, origin: string): RouteSeo {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  const isPricingDetail = normalizedPath.startsWith('/pricing/')
  const indexable = INDEXABLE_PATHS.has(normalizedPath) || isPricingDetail

  return {
    canonicalUrl: `${origin.replace(/\/+$/, '')}${normalizedPath}`,
    robots: indexable ? 'index, follow' : 'noindex, nofollow',
  }
}
