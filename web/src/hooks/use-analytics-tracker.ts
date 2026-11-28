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
import { useLocation, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

import { useStatus } from '@/hooks/use-status'
import {
  flushAnalytics,
  initAnalytics,
  isAnalyticsActive,
  startRuntimeErrorListeners,
  startWebVitals,
  templateRoute,
  trackPageLeave,
  trackPageView,
  trackVital,
} from '@/lib/analytics'
import { referrerHostFromUrl } from '@/lib/analytics/sanitize'
import { useAuthStore } from '@/stores/auth-store'

const MAX_DURATION_MS = 3_600_000

interface PageVisit {
  pathname: string
  route: string
  startedAt: number
  activeMs: number
  visibleSince: number | null
  /** True once a hide/unload leave was sent and the page has not become visible again. */
  closed: boolean
}

function isVisible(): boolean {
  return document.visibilityState === 'visible'
}

function activeSoFar(visit: PageVisit, now: number): number {
  const running = visit.visibleSince === null ? 0 : now - visit.visibleSince
  return visit.activeMs + running
}

function sendLeave(
  visit: PageVisit,
  reason: 'navigate' | 'hide' | 'unload'
): void {
  const now = performance.now()
  const durationMs = Math.min(
    Math.round(now - visit.startedAt),
    MAX_DURATION_MS
  )
  const activeMs = Math.min(Math.round(activeSoFar(visit, now)), durationMs)
  trackPageLeave({ routePath: visit.route, durationMs, activeMs, reason })
}

/**
 * Mounts the behavior analytics SDK: status-driven init, route enter/leave
 * pairs, visibility-based active time, web vitals and runtime error listeners.
 */
export function useAnalyticsTracker(): void {
  const { status } = useStatus()
  const pathname = useLocation({ select: (l) => l.pathname })
  const router = useRouter()
  const isAuth = useAuthStore((s) => Boolean(s.auth.user))
  const visitRef = useRef<PageVisit | null>(null)
  const referrerSentRef = useRef(false)
  const isAuthRef = useRef(isAuth)
  isAuthRef.current = isAuth

  const enabled = status?.analytics_enabled
  const sampleRate = status?.analytics_sample_rate
  const respectDnt = status?.analytics_respect_dnt

  useEffect(() => {
    initAnalytics({
      analytics_enabled: enabled,
      analytics_sample_rate: sampleRate,
      analytics_respect_dnt: respectDnt,
    })
    if (!isAnalyticsActive()) {
      visitRef.current = null
      return
    }
    const stopVitals = startWebVitals()
    const stopErrors = startRuntimeErrorListeners()
    return () => {
      stopVitals()
      stopErrors()
    }
  }, [enabled, sampleRate, respectDnt])

  useEffect(() => {
    if (!isAnalyticsActive()) return
    const current = visitRef.current
    if (current?.pathname === pathname) return

    if (current && !current.closed) sendLeave(current, 'navigate')
    let referrerHost: string | undefined
    if (!referrerSentRef.current) {
      referrerSentRef.current = true
      referrerHost = referrerHostFromUrl(document.referrer) || undefined
    }
    const route = templateRoute(pathname)
    trackPageView({
      routePath: route,
      fromRoute: current?.route || undefined,
      referrerHost,
      isAuth: isAuthRef.current,
    })
    const now = performance.now()
    visitRef.current = {
      pathname,
      route,
      startedAt: now,
      activeMs: 0,
      visibleSince: isVisible() ? now : null,
      closed: false,
    }
  }, [pathname, enabled, sampleRate, respectDnt])

  useEffect(() => {
    let navStartedAt: number | null = null
    const stopBefore = router.subscribe('onBeforeNavigate', (event) => {
      if (event.pathChanged) navStartedAt = performance.now()
    })
    const stopResolved = router.subscribe('onResolved', (event) => {
      if (!event.pathChanged || navStartedAt === null) return
      trackVital(
        'vital.route_change',
        Math.round(performance.now() - navStartedAt)
      )
      navStartedAt = null
    })
    return () => {
      stopBefore()
      stopResolved()
    }
  }, [router])

  useEffect(() => {
    const onVisibilityChange = () => {
      const visit = visitRef.current
      if (!visit || !isAnalyticsActive()) return
      const now = performance.now()
      if (!isVisible()) {
        if (visit.closed) return
        visit.activeMs = activeSoFar(visit, now)
        visit.visibleSince = null
        sendLeave(visit, 'hide')
        visit.closed = true
        return
      }
      // Returning to the page starts a fresh visit of the same route.
      visit.startedAt = now
      visit.activeMs = 0
      visit.visibleSince = now
      visit.closed = false
    }
    const onPageHide = () => {
      const visit = visitRef.current
      if (!visit || visit.closed || !isAnalyticsActive()) return
      sendLeave(visit, 'unload')
      visit.closed = true
      flushAnalytics({ unload: true })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [])
}
