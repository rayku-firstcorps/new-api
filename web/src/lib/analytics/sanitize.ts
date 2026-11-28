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
 * Client side sanitizing. The server (service/analytics_sanitize.go and
 * service/analytics_whitelist.go) applies the same rules again; this module is
 * the first line of the privacy red lines (no query/hash, no ids in paths, no
 * free text, no error.message).
 */
import { nanoid } from 'nanoid'

import { EVENT_WHITELIST, type PropRule } from './whitelist'

const MAX_SEGMENTS = 8
const MAX_ROUTE_LENGTH = 128
const MAX_PROPS_BYTES = 512
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const ALL_DIGITS_RE = /^[0-9]+$/
const HEX_RE = /^[0-9a-fA-F]+$/
const SAFE_SEGMENT_RE = /^[A-Za-z0-9_-]+$/
const ERROR_NAME_RE = /^[A-Za-z][A-Za-z0-9_]{0,31}$/
const HOST_RE = /^[a-z0-9.-]{1,128}$/
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/

function isIdSegment(segment: string): boolean {
  if (ALL_DIGITS_RE.test(segment)) return true
  if (UUID_RE.test(segment)) return true
  if (segment.length >= 16 && HEX_RE.test(segment)) return true
  if (!SAFE_SEGMENT_RE.test(segment)) return true
  return (
    segment.length >= 20 && /[0-9]/.test(segment) && /[A-Za-z]/.test(segment)
  )
}

/**
 * Turn a pathname into a low-cardinality template. "" means drop.
 * Identical to service.TemplateAnalyticsRoute on the server.
 */
export function templateRoute(input: string): string {
  if (typeof input !== 'string') return ''
  const cut = input.search(/[?#]/)
  const path = cut === -1 ? input : input.slice(0, cut)
  if (!path.startsWith('/')) return ''

  const segments = path.split('/').filter((s) => s !== '')
  if (segments.length > MAX_SEGMENTS) return ''

  const result = `/${segments.map((s) => (isIdSegment(s) ? ':id' : s)).join('/')}`
  return result.length > MAX_ROUTE_LENGTH ? '' : result
}

/**
 * Reduce a request URL (relative or absolute) to a templated /api/ path.
 * Returns "" when it cannot be reduced.
 */
export function templateApiRoute(url: string, base?: string): string {
  if (typeof url !== 'string' || url === '') return ''
  try {
    const origin =
      base ??
      (typeof location === 'undefined' ? 'http://localhost' : location.origin)
    return templateRoute(new URL(url, origin).pathname)
  } catch {
    return ''
  }
}

/** Hostname of document.referrer, "" when absent, same-site or invalid. */
export function referrerHostFromUrl(referrer: string): string {
  if (!referrer) return ''
  try {
    return sanitizeReferrerHost(new URL(referrer).hostname)
  } catch {
    return ''
  }
}

export function sanitizeReferrerHost(host: unknown): string {
  if (typeof host !== 'string') return ''
  const value = host.toLowerCase()
  if (!HOST_RE.test(value) || IPV4_RE.test(value)) return ''
  if (typeof location !== 'undefined' && value === location.hostname) return ''
  return value
}

export function errorNameOf(error: unknown): string {
  if (error === null || typeof error !== 'object') return 'NonError'
  const candidate = error as { name?: unknown; message?: unknown }
  const looksLikeError =
    error instanceof Error ||
    (typeof candidate.name === 'string' &&
      typeof candidate.message === 'string')
  if (!looksLikeError) return 'NonError'
  const name = candidate.name
  return typeof name === 'string' && ERROR_NAME_RE.test(name) ? name : 'Unknown'
}

function clampInt(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(Math.max(Math.round(value), 0), max)
}

type PropValue = string | number | boolean

function sanitizePropValue(
  rule: PropRule,
  value: unknown
): PropValue | undefined {
  switch (rule.type) {
    case 'bool':
      return typeof value === 'boolean' ? value : undefined
    case 'int':
      return typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= rule.min &&
        value <= rule.max
        ? value
        : undefined
    case 'enum':
      return typeof value === 'string' && rule.values.includes(value)
        ? value
        : undefined
    case 'errorName':
      return typeof value === 'string' && ERROR_NAME_RE.test(value)
        ? value
        : 'Unknown'
    case 'apiRoute': {
      if (typeof value !== 'string') return undefined
      const route = templateApiRoute(value)
      return route.startsWith('/api/') ? route : undefined
    }
  }
}

/** Keep only listed keys with valid values; keys are emitted sorted. */
export function sanitizeProps(
  rules: Record<string, PropRule>,
  raw: Record<string, unknown> | undefined
): Record<string, PropValue> {
  const out: Record<string, PropValue> = {}
  if (!raw) return out
  for (const key of Object.keys(rules).sort()) {
    if (!Object.hasOwn(raw, key)) continue
    const value = sanitizePropValue(rules[key], raw[key])
    if (value !== undefined) out[key] = value
  }
  return out
}

export interface RawAnalyticsEvent {
  routePath?: string
  fromRoute?: string
  referrerHost?: string
  durationMs?: number
  statusCode?: number
  props?: Record<string, unknown>
}

export interface WireEvent {
  event_id: string
  event_type: string
  event_name: string
  route_path?: string
  from_route?: string
  referrer_host?: string
  duration_ms?: number
  status_code?: number
  props?: Record<string, PropValue>
}

/** Build the wire event, or null when it must be dropped. */
export function buildEvent(
  eventType: string,
  eventName: string,
  raw: RawAnalyticsEvent
): WireEvent | null {
  const spec = EVENT_WHITELIST[`${eventType}|${eventName}`]
  if (!spec) return null

  const routePath = templateRoute(raw.routePath ?? '')
  if (spec.routeRequired && routePath === '') return null

  const props = sanitizeProps(spec.props, raw.props)
  // Hard rule: tracking calls must never be able to reach the analytics API.
  const apiRoute = props.api_route
  if (typeof apiRoute === 'string' && apiRoute.startsWith('/api/analytics/')) {
    return null
  }

  const event: WireEvent = {
    event_id: nanoid(21),
    event_type: eventType,
    event_name: eventName,
  }
  if (routePath !== '') event.route_path = routePath

  if (spec.navFields) {
    const from = templateRoute(raw.fromRoute ?? '')
    if (from !== '') event.from_route = from
    const host = sanitizeReferrerHost(raw.referrerHost)
    if (host !== '') event.referrer_host = host
  }
  if (spec.durationMax !== undefined) {
    event.duration_ms = clampInt(raw.durationMs, spec.durationMax)
  }
  if (spec.status) {
    const status = clampInt(raw.statusCode, 599)
    event.status_code = status
  }
  if (
    Object.keys(props).length > 0 &&
    JSON.stringify(props).length <= MAX_PROPS_BYTES
  ) {
    event.props = props
  }
  return event
}
