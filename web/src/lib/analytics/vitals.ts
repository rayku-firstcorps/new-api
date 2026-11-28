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

/**
 * Web vitals collection. Only the collection functions live here; mounting
 * them is done by the app (see startWebVitals in index.ts). Each metric is
 * reported at most once per page load.
 */
import type { NavType } from './whitelist'

export type VitalReporter = (
  name: 'vital.fcp' | 'vital.lcp' | 'vital.ttfb',
  durationMs: number,
  navType?: NavType
) => void

const reported = new Set<string>()

function navigationEntry(): PerformanceNavigationTiming | undefined {
  if (typeof performance === 'undefined') return undefined
  const entries = performance.getEntriesByType?.('navigation') ?? []
  return entries[0] as PerformanceNavigationTiming | undefined
}

function currentNavType(): NavType {
  const type = navigationEntry()?.type
  if (type === 'reload' || type === 'back_forward') return type
  return 'navigate'
}

function reportOnce(
  report: VitalReporter,
  name: 'vital.fcp' | 'vital.lcp' | 'vital.ttfb',
  value: number
): void {
  if (reported.has(name)) return
  reported.add(name)
  report(name, Math.round(value), currentNavType())
}

function observe(
  type: string,
  onEntries: (entries: PerformanceEntryList) => void
): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') return null
  try {
    const observer = new PerformanceObserver((list) =>
      onEntries(list.getEntries())
    )
    observer.observe({ type, buffered: true })
    return observer
  } catch {
    return null
  }
}

/** Starts FCP / LCP / TTFB collection and returns a cleanup function. */
export function observeWebVitals(report: VitalReporter): () => void {
  const cleanups: Array<() => void> = []

  const nav = navigationEntry()
  if (nav && nav.responseStart > 0) {
    reportOnce(report, 'vital.ttfb', nav.responseStart)
  }

  const paint = observe('paint', (entries) => {
    const fcp = entries.find((e) => e.name === 'first-contentful-paint')
    if (fcp) reportOnce(report, 'vital.fcp', fcp.startTime)
  })

  let lcpValue = -1
  const lcp = observe('largest-contentful-paint', (entries) => {
    const last = entries.at(-1)
    if (last) lcpValue = last.startTime
  })
  const finishLcp = () => {
    if (lcpValue >= 0) reportOnce(report, 'vital.lcp', lcpValue)
  }
  const onHidden = () => {
    if (document.visibilityState === 'hidden') finishLcp()
  }
  if (lcp) {
    document.addEventListener('visibilitychange', onHidden)
    window.addEventListener('pagehide', finishLcp)
    window.addEventListener('pointerdown', finishLcp, { once: true })
    window.addEventListener('keydown', finishLcp, { once: true })
    cleanups.push(() => {
      document.removeEventListener('visibilitychange', onHidden)
      window.removeEventListener('pagehide', finishLcp)
      window.removeEventListener('pointerdown', finishLcp)
      window.removeEventListener('keydown', finishLcp)
    })
  }

  return () => {
    paint?.disconnect()
    lcp?.disconnect()
    for (const cleanup of cleanups) cleanup()
  }
}

export function __resetVitalsForTests(): void {
  reported.clear()
}
