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
 * Batching and delivery. Must not import `@/lib/http-client`: that module
 * reports failed requests through this SDK and would recurse.
 *
 * Identity: the dashboard session is an in-memory Bearer token and the server
 * reads identity only from the Authorization header, so `fetch(keepalive)` is
 * the primary transport. `sendBeacon` cannot set headers, so a beacon batch is
 * always anonymous (counted in PV and device UV, not in actor UV).
 *
 * Each queued event remembers the user who was signed in when it happened. A
 * batch only carries the current Bearer when it belongs to that same user, so
 * events from before sign-in (or from a previous account) stay anonymous.
 */
import { getFreshAuthHeaders } from '@/lib/auth-session'
import { useAuthStore } from '@/stores/auth-store'

import { buildContext } from './context'
import type { WireEvent } from './sanitize'

export const ANALYTICS_ENDPOINT = '/api/analytics/events'
export const QUEUE_LIMIT = 100
export const FLUSH_THRESHOLD = 20
export const FLUSH_INTERVAL_MS = 5000
const MAX_BATCH_EVENTS = 50
const MAX_BATCH_BYTES = 30000
// Skip the Authorization header when the token is about to expire, because the
// server answers 401 to an expired Bearer and the whole batch would be lost.
const MIN_TOKEN_LIFE_SECONDS = 5

interface QueuedEvent {
  event: WireEvent
  // Signed-in user id when the event was recorded; null when anonymous.
  owner: number | null
}

let queue: QueuedEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let deviceId: string | null = null
let inflight: Promise<void> = Promise.resolve()

export function setTransportDevice(id: string | null): void {
  deviceId = id
  if (id === null) clearQueue()
}

export function clearQueue(): void {
  queue = []
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
}

export function queueSize(): number {
  return queue.length
}

export function enqueueEvent(event: WireEvent): void {
  if (deviceId === null) return
  queue.push({ event, owner: useAuthStore.getState().auth.user?.id ?? null })
  if (queue.length > QUEUE_LIMIT) queue.shift()

  if (queue.length >= FLUSH_THRESHOLD) {
    flushQueue()
    return
  }
  if (timer === null) {
    timer = setTimeout(() => flushQueue(), FLUSH_INTERVAL_MS)
  }
}

/** Leading run of events from one owner, at most 50 events / 30KB. */
function takeBatch(): { events: WireEvent[]; owner: number | null } {
  const owner = queue[0].owner
  let size = 1
  while (
    size < queue.length &&
    size < MAX_BATCH_EVENTS &&
    queue[size].owner === owner
  ) {
    size++
  }
  const events = queue.splice(0, size).map((item) => item.event)
  while (events.length > 1 && JSON.stringify(events).length > MAX_BATCH_BYTES) {
    queue.unshift({ event: events.pop() as WireEvent, owner })
  }
  return { events, owner }
}

function unloadAuthHeaders(): Record<string, string> {
  const auth = useAuthStore.getState().auth
  const now = Math.floor(Date.now() / 1000)
  if (
    auth.accessToken &&
    auth.accessExpiresAt &&
    auth.accessExpiresAt > now + MIN_TOKEN_LIFE_SECONDS
  ) {
    return { Authorization: `Bearer ${auth.accessToken}` }
  }
  return {}
}

async function regularAuthHeaders(): Promise<Record<string, string>> {
  // Anonymous visitors never trigger a refresh call.
  if (!useAuthStore.getState().auth.accessToken) return {}
  try {
    const headers = await getFreshAuthHeaders()
    return headers.Authorization ? { Authorization: headers.Authorization } : {}
  } catch {
    return {}
  }
}

function supportsKeepalive(): boolean {
  return (
    typeof fetch === 'function' &&
    typeof Request !== 'undefined' &&
    'keepalive' in Request.prototype
  )
}

async function send(
  batch: WireEvent[],
  id: string,
  unload: boolean,
  owner: number | null
): Promise<void> {
  const body = JSON.stringify({ ...buildContext(id), events: batch })
  try {
    if (!supportsKeepalive()) {
      if (typeof navigator.sendBeacon === 'function') {
        navigator.sendBeacon(
          ANALYTICS_ENDPOINT,
          new Blob([body], { type: 'text/plain' })
        )
      }
      return
    }
    const sameUser =
      owner !== null && useAuthStore.getState().auth.user?.id === owner
    let auth: Record<string, string> = {}
    if (sameUser) {
      auth = unload ? unloadAuthHeaders() : await regularAuthHeaders()
    }
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...auth },
      body,
    })
  } catch {
    // Failures (401, 429, offline) silently drop the batch: no retry, no log.
  }
}

/** Send everything queued, in batches of at most 50 events / 30KB. */
export function flushQueue(opts?: { unload?: boolean }): void {
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  const id = deviceId
  if (id === null) {
    queue = []
    return
  }
  const unload = opts?.unload === true
  while (queue.length > 0) {
    const { events, owner } = takeBatch()
    inflight = Promise.all([inflight, send(events, id, unload, owner)]).then(
      () => undefined
    )
  }
}

/** Resolves when every flush started so far has finished (tests). */
export function whenFlushed(): Promise<void> {
  return inflight
}

export function __resetTransportForTests(): void {
  clearQueue()
  deviceId = null
  inflight = Promise.resolve()
}
