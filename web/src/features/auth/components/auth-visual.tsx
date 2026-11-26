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
import { useReducedMotion } from 'motion/react'
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useTranslation } from 'react-i18next'

import type { SphereAttractor } from '@/components/dot-sphere'
import { MixedHeading } from '@/features/home/components/mixed-heading'
import {
  SpotlightCard,
  SpotlightGroup,
} from '@/features/home/components/spotlight-card'
import { useHomeCatalog } from '@/features/home/hooks/use-home-catalog'
import { useGatewayBaseUrl } from '@/hooks/use-gateway-base-url'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

const DotSphereCanvas = lazy(() =>
  import('@/components/dot-sphere').then((m) => ({
    default: m.DotSphereCanvas,
  }))
)

export type AuthVisualMode = 'sign-in' | 'sign-up' | 'forgot-password'

/** Default pole of the sphere arc, as a fraction of the panel height. */
const DEFAULT_TOP = 0.62
const MAX_TOP = 0.8
/** Approximate tag height and the minimum clearance around tags (px). */
const TAG_HEIGHT = 36
const CLEARANCE = 20
/** Idle float of the tags (translateY ±px). */
const FLOAT_AMPLITUDE = 6
/** Entrance stagger step (ms). */
const STAGGER = 80

type FloatingTag = {
  id: string
  label: string
  side: 'left' | 'right'
  /** Offset from `side` (CSS length): hugs the sphere on wide panels. */
  x: string
  /** Offset from the sphere's pole, as a fraction of the panel height. */
  top: number
  dot: string
  period: number
  phase: number
}

/** KuCode's featured-provider constellation, pulled in to fit a half-width panel. */
const TAGS: FloatingTag[] = [
  {
    id: 'openai',
    label: 'OpenAI GPT',
    side: 'right',
    x: 'max(9%, 50% - 270px)',
    top: -0.09,
    dot: 'var(--chart-3)',
    period: 6000,
    phase: 0,
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude',
    side: 'left',
    x: 'max(8%, 50% - 290px)',
    top: 0,
    dot: 'var(--chart-1)',
    period: 7000,
    phase: 2300,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    side: 'left',
    x: '46%',
    top: 0.1,
    dot: 'var(--chart-2)',
    period: 5200,
    phase: 4100,
  },
]
const HIGHEST_TAG = Math.min(0, ...TAGS.map((tag) => tag.top))

const TITLES: Record<AuthVisualMode, { lead: string; rest: string }> = {
  'sign-in': { lead: 'Welcome back.', rest: 'Your models are waiting.' },
  'sign-up': { lead: 'One key.', rest: 'Every frontier model.' },
  'forgot-password': { lead: 'Locked out?', rest: "We'll get you back in." },
}

const ENTER =
  'transition-[opacity,translate] duration-600 ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none'

function staggerDelay(step: number): CSSProperties {
  return { transitionDelay: `${step * STAGGER}ms` }
}

/**
 * Right-hand panel (>= 1024px), decorative: the dot sphere, a per-page title,
 * three floating provider tags (pointer hover pulls the sphere's light), the
 * sign-up base_url card and the catalog totals. The sphere's pole moves down so
 * the highest tag clears the title, and tags that would collide with the title
 * or the bottom block are not drawn.
 */
export function AuthVisual(props: { mode: AuthVisualMode }) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion() ?? false
  const catalog = useHomeCatalog(false, true)
  const gatewayBaseUrl = useGatewayBaseUrl()
  const rootRef = useRef<HTMLElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [sphereTop, setSphereTop] = useState(DEFAULT_TOP)
  /** Comma-joined ids of the tags that fit (a string keeps re-renders to real changes). */
  const [fitting, setFitting] = useState(() =>
    TAGS.map((tag) => tag.id).join(',')
  )
  const [attractor, setAttractor] = useState<SphereAttractor | null>(null)
  const title = TITLES[props.mode]
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)

  useEffect(() => {
    const root = rootRef.current
    const head = headRef.current
    const bottom = bottomRef.current
    if (!root || !head || !bottom) return
    const update = () => {
      const rect = root.getBoundingClientRect()
      if (!rect.height) return
      const headBottom = head.getBoundingClientRect().bottom - rect.top
      const bottomTop = bottom.getBoundingClientRect().top - rect.top
      const ratio = Math.min(
        MAX_TOP,
        Math.max(
          DEFAULT_TOP,
          (headBottom + CLEARANCE) / rect.height - HIGHEST_TAG
        )
      )
      const pole = ratio * rect.height
      const ids = TAGS.filter((tag) => {
        const top = pole + tag.top * rect.height
        return (
          top >= headBottom + CLEARANCE &&
          top + TAG_HEIGHT <= bottomTop - CLEARANCE
        )
      }).map((tag) => tag.id)
      setSphereTop(Math.round(ratio * 1000) / 1000)
      setFitting(ids.join(','))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(root)
    observer.observe(head)
    observer.observe(bottom)
    return () => observer.disconnect()
  }, [])

  const visible = new Set(fitting.split(','))

  return (
    <aside
      ref={rootRef}
      aria-hidden='true'
      className='border-border bg-card relative isolate h-svh min-w-0 overflow-hidden border-l'
    >
      <div className='pointer-events-none absolute inset-0 -z-10'>
        <Suspense fallback={null}>
          <DotSphereCanvas
            variant='hero'
            interactive
            attractTo={attractor}
            topRatio={sphereTop}
          />
        </Suspense>
      </div>
      <div className='to-card pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[30%] min-h-40 bg-linear-to-b from-transparent' />

      <div
        ref={headRef}
        className='absolute inset-x-0 top-[22%] -translate-y-1/2 px-10'
      >
        <div className={ENTER}>
          <MixedHeading
            as='p'
            lead={t(title.lead)}
            rest={t(title.rest)}
            className='mx-auto max-w-[440px] text-center text-[clamp(28px,3vw,40px)] leading-[1.1]'
          />
        </div>
      </div>

      {TAGS.map((tag, index) => {
        if (!visible.has(tag.id)) return null
        return (
          <div
            key={tag.id}
            className={cn('absolute z-10', ENTER)}
            style={{
              top: `${(sphereTop + tag.top) * 100}%`,
              [tag.side]: tag.x,
              ...staggerDelay(2 + index),
            }}
          >
            <ProviderTag
              tag={tag}
              float={!reduced}
              onHoverChange={(element) => {
                if (!element) {
                  setAttractor(null)
                  return
                }
                const rect = element.getBoundingClientRect()
                setAttractor({ x: rect.left + rect.width / 2, y: rect.bottom })
              }}
            />
          </div>
        )
      })}

      <div
        ref={bottomRef}
        className='absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-10 pb-10'
      >
        {props.mode === 'sign-up' && (
          <SpotlightGroup className={cn('w-full max-w-[400px]', ENTER)}>
            <SpotlightCard className='overflow-hidden py-3 shadow-[0_12px_32px_rgb(0_0_0/calc(0.35*var(--shadow-k)))]'>
              <p className='text-[13px]'>
                <span className='text-foreground block px-4 font-medium'>
                  {t('Change one line.')}
                </span>
                <code className='bg-primary/[0.07] mt-2 block truncate px-4 py-1 font-mono text-xs leading-5 shadow-[inset_2px_0_0_var(--primary)]'>
                  <span className='text-muted-foreground'>base_url</span>
                  <span className='text-muted-foreground'> = </span>
                  <span className='text-primary'>
                    &quot;{gatewayBaseUrl}/v1&quot;
                  </span>
                </code>
              </p>
            </SpotlightCard>
          </SpotlightGroup>
        )}
        {catalog && (
          <p
            className={cn(
              'text-muted-foreground text-[13px] tabular-nums',
              ENTER
            )}
            style={staggerDelay(5)}
          >
            {t('{{models}} models from {{providers}} providers', {
              models: formatNumber(catalog.modelCount, locale),
              providers: formatNumber(catalog.providerCount, locale),
            })}
          </p>
        )}
      </div>
    </aside>
  )
}

/**
 * KuCode's capsule tag (uppercase label, colored dot with a glow) with an idle
 * float. Decorative: it only reports pointer hover so the sphere can light up
 * under it.
 */
function ProviderTag(props: {
  tag: FloatingTag
  float: boolean
  onHoverChange: (element: HTMLElement | null) => void
}) {
  const floatRef = useRef<HTMLDivElement>(null)
  const period = props.tag.period
  const phase = props.tag.phase

  useEffect(() => {
    const element = floatRef.current
    if (!element || !props.float) return
    const animation = element.animate(
      [
        { transform: `translateY(${-FLOAT_AMPLITUDE}px)` },
        { transform: `translateY(${FLOAT_AMPLITUDE}px)` },
      ],
      {
        duration: period / 2,
        delay: -phase,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
      }
    )
    return () => animation.cancel()
  }, [props.float, period, phase])

  return (
    <div ref={floatRef}>
      <span
        className='border-border bg-card/80 hover:border-input inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-medium tracking-wide whitespace-nowrap uppercase backdrop-blur transition-colors'
        onPointerEnter={(event) => props.onHoverChange(event.currentTarget)}
        onPointerLeave={() => props.onHoverChange(null)}
      >
        <span
          className='size-1.5 shrink-0 rounded-full'
          style={{
            backgroundColor: props.tag.dot,
            boxShadow: `0 0 8px 1px ${props.tag.dot}`,
          }}
        />
        {props.tag.label}
      </span>
    </div>
  )
}
