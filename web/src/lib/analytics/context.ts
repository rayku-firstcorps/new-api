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
 * Anonymous identifiers and coarse environment buckets. Nothing here reads
 * hardware, canvas or font data, and the raw user agent never leaves this
 * module: it is only used locally to pick an enum value.
 */
import i18n from 'i18next'
import { nanoid } from 'nanoid'

import { normalizeInterfaceLanguage } from '@/i18n/languages'
import { THEME_STORAGE_KEYS } from '@/lib/theme-storage'

import type {
  AnalyticsLang,
  AnalyticsTheme,
  BrowserFamily,
  ClientType,
  OsFamily,
  ViewportBucket,
} from './whitelist'

const DEVICE_KEY = 'newapi:analytics:device_id'
const SESSION_KEY = 'newapi:analytics:session'
const SESSION_IDLE_MS = 30 * 60 * 1000
const ID_RE = /^[A-Za-z0-9_-]{16,32}$/

let memoryDeviceId: string | null = null
let memorySession: { id: string; touchedAt: number } | null = null

export function generateId(): string {
  return nanoid(21)
}

/** Deterministic 0..99 bucket (FNV-1a) used for sampling. */
export function sampleBucket(id: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash % 100
}

function readStorage(kind: 'local' | 'session', key: string): string | null {
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage
    return store.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(
  kind: 'local' | 'session',
  key: string,
  value: string
): void {
  try {
    const store = kind === 'local' ? window.localStorage : window.sessionStorage
    store.setItem(key, value)
  } catch {
    // Storage unavailable: the in-memory copy keeps the page consistent.
  }
}

/** The persisted device id, or null when this browser has none yet. */
export function loadDeviceId(): string | null {
  const stored = readStorage('local', DEVICE_KEY)
  if (stored && ID_RE.test(stored)) return stored
  return memoryDeviceId
}

export function persistDeviceId(id: string): void {
  memoryDeviceId = id
  writeStorage('local', DEVICE_KEY, id)
}

/** Current session id; rotates after 30 minutes without activity. */
export function touchSession(now: number = Date.now()): string {
  let current = memorySession
  const stored = readStorage('session', SESSION_KEY)
  if (stored) {
    const cut = stored.lastIndexOf('.')
    const id = stored.slice(0, cut)
    const touchedAt = Number(stored.slice(cut + 1))
    if (cut > 0 && ID_RE.test(id) && Number.isFinite(touchedAt)) {
      current = { id, touchedAt }
    }
  }
  if (!current || now - current.touchedAt > SESSION_IDLE_MS) {
    current = { id: generateId(), touchedAt: now }
  }
  current = { id: current.id, touchedAt: now }
  memorySession = current
  writeStorage('session', SESSION_KEY, `${current.id}.${now}`)
  return current.id
}

interface ElectronWindow {
  electron?: { isElectron?: boolean }
}

export function detectClientType(): ClientType {
  if ((window as unknown as ElectronWindow).electron?.isElectron === true) {
    return 'electron_desktop'
  }
  const ua = navigator.userAgent || ''
  const touchPoints = navigator.maxTouchPoints || 0
  const isIpadOs = /Macintosh/.test(ua) && touchPoints > 1
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || isIpadOs) return 'web_tablet'
  if (/Android/i.test(ua)) {
    return /Mobile/i.test(ua) ? 'web_mobile' : 'web_tablet'
  }
  if (/iPhone|iPod|Mobile|Windows Phone/i.test(ua)) return 'web_mobile'
  return 'web_desktop'
}

export function detectOsFamily(): OsFamily {
  const ua = navigator.userAgent || ''
  if (/Android/i.test(ua)) return 'android'
  const isIpadOs = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1
  if (/iPhone|iPad|iPod/i.test(ua) || isIpadOs) return 'ios'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos'
  if (/CrOS/i.test(ua)) return 'other'
  if (/Linux|X11/i.test(ua)) return 'linux'
  return 'other'
}

export function detectBrowserFamily(): BrowserFamily {
  const ua = navigator.userAgent || ''
  if (
    (window as unknown as ElectronWindow).electron?.isElectron === true ||
    /Electron\//.test(ua)
  ) {
    return 'electron'
  }
  if (/Edg(e|A|iOS)?\//.test(ua)) return 'edge'
  if (/Firefox\/|FxiOS\//.test(ua)) return 'firefox'
  if (/Chrome\/|CriOS\/|Chromium\//.test(ua)) return 'chrome'
  if (/Safari\//.test(ua)) return 'safari'
  return 'other'
}

export function viewportBucket(width: number): ViewportBucket {
  if (width < 640) return 'xs'
  if (width < 768) return 'sm'
  if (width < 1024) return 'md'
  if (width < 1280) return 'lg'
  if (width < 1536) return 'xl'
  return '2xl'
}

export function detectLang(): AnalyticsLang {
  const code = normalizeInterfaceLanguage(
    i18n.resolvedLanguage || i18n.language
  )
  if (code === 'zhCN') return 'zh'
  if (code === 'zhTW') return 'zh-TW'
  return code as AnalyticsLang
}

/** The stored preference (not the resolved one); defaults to "system". */
export function detectTheme(): AnalyticsTheme {
  const stored = readStorage('local', THEME_STORAGE_KEYS.mode)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

export interface AnalyticsContext {
  device_id: string
  session_id: string
  client_type: ClientType
  os_family: OsFamily
  browser_family: BrowserFamily
  viewport_bucket: ViewportBucket
  lang: AnalyticsLang
  theme: AnalyticsTheme
  tz_offset: number
}

export function buildContext(deviceId: string): AnalyticsContext {
  return {
    device_id: deviceId,
    session_id: touchSession(),
    client_type: detectClientType(),
    os_family: detectOsFamily(),
    browser_family: detectBrowserFamily(),
    viewport_bucket: viewportBucket(window.innerWidth),
    lang: detectLang(),
    theme: detectTheme(),
    tz_offset: new Date().getTimezoneOffset() || 0,
  }
}

export function __resetContextForTests(): void {
  memoryDeviceId = null
  memorySession = null
}
