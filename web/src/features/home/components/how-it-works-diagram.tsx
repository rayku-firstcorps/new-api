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
import { AppWindow } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import { useInView } from '../hooks/use-in-view'
import type { HomeProvider } from '../lib/catalog-summary'
import {
  isSameGeometry,
  measureDiagram,
  type DiagramGeometry,
} from '../lib/diagram-geometry'
import { HomeSphere } from './home-sphere'
import { ProviderMark } from './provider-mark'

const CYCLE_MS = 2500

/** A light dot that travels along a path: a near-zero dash moved via dashoffset. */
const DOT_DASH = '0.4 200'
const DOT_HIDDEN_START = 2
const DOT_HIDDEN_END = -101

const GLOW_FILTER =
  'drop-shadow(0 0 4px color-mix(in srgb, var(--primary) 55%, transparent))'

interface HowItWorksDiagramProps {
  /** Providers shown on the right side, top to bottom. */
  targets: HomeProvider[]
}

/**
 * Your app -> router (mini dot sphere) -> providers. The connector paths are
 * measured from the live DOM so they stay aligned at every width; the light
 * dot cycles through the targets while visible and is static under reduced
 * motion.
 */
export function HowItWorksDiagram(props: HowItWorksDiagramProps) {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()
  const reduced = useReducedMotion() ?? false
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<HTMLDivElement>(null)
  const sphereRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLLIElement | null)[]>([])
  const inDotRef = useRef<SVGGElement>(null)
  const outDotRef = useRef<SVGGElement>(null)
  const highlightRef = useRef<SVGPathElement>(null)

  const targets = props.targets
  const [geom, setGeom] = useState<DiagramGeometry | null>(null)
  const [selected, setSelected] = useState(0)
  const inView = useInView(containerRef, { once: false, rootMargin: '0px' })

  const update = useCallback(() => {
    const container = containerRef.current
    const app = appRef.current
    const sphere = sphereRef.current
    const nodes = nodeRefs.current.filter(
      (node): node is HTMLLIElement => node !== null
    )
    if (!container || !app || !sphere || nodes.length !== targets.length) return
    const next = measureDiagram(container, app, sphere, nodes)
    setGeom((prev) => (isSameGeometry(prev, next) ? prev : next))
  }, [targets.length])

  // Re-measure whenever the container or any node changes size.
  useLayoutEffect(() => {
    update()
    const observer = new ResizeObserver(() => update())
    const observed = [
      containerRef.current,
      appRef.current,
      sphereRef.current,
      ...nodeRefs.current,
    ]
    observed.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [update])

  // Cycle the selected target while visible; static under reduced motion.
  useEffect(() => {
    if (reduced || !inView || targets.length < 2) return
    const id = window.setInterval(
      () => setSelected((current) => (current + 1) % targets.length),
      CYCLE_MS
    )
    return () => window.clearInterval(id)
  }, [reduced, inView, targets.length])

  // Light dot: app -> router (first 40%), then router -> selected target.
  useEffect(() => {
    if (reduced || !geom) return
    const inDot = inDotRef.current
    const outDot = outDotRef.current
    if (!inDot || !outDot || typeof inDot.animate !== 'function') return
    const opts: KeyframeAnimationOptions = {
      duration: CYCLE_MS,
      iterations: Infinity,
    }
    const anims = [
      inDot.animate(
        [
          {
            strokeDashoffset: DOT_HIDDEN_START,
            easing: 'cubic-bezier(0.45,0,0.55,1)',
          },
          { strokeDashoffset: DOT_HIDDEN_END, offset: 0.38 },
          { strokeDashoffset: DOT_HIDDEN_END },
        ],
        opts
      ),
      outDot.animate(
        [
          { strokeDashoffset: DOT_HIDDEN_START },
          {
            strokeDashoffset: DOT_HIDDEN_START,
            offset: 0.42,
            easing: 'cubic-bezier(0.45,0,0.55,1)',
          },
          { strokeDashoffset: DOT_HIDDEN_END, offset: 0.95 },
          { strokeDashoffset: DOT_HIDDEN_END },
        ],
        opts
      ),
    ]
    const highlight = highlightRef.current
    if (highlight) {
      anims.push(
        highlight.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 450,
          easing: 'ease-out',
        })
      )
    }
    if (!inView) anims.forEach((anim) => anim.pause())
    return () => anims.forEach((anim) => anim.cancel())
  }, [selected, geom, reduced, inView])

  const selectedPath = geom?.outbound[selected]
  const routerLabel = t('{{name}} Router', { name: systemName })

  return (
    <figure
      aria-label={t(
        'Diagram: your app sends each request to the {{router}}, which routes it to one of {{targets}}.',
        {
          router: routerLabel,
          targets: targets.map((target) => target.name).join(', '),
        }
      )}
      className='mx-auto max-w-[980px]'
    >
      <div
        ref={containerRef}
        className='relative flex flex-col gap-10 md:flex-row md:items-center md:justify-between md:gap-6'
      >
        {geom ? (
          <svg
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 h-full w-full overflow-visible'
            viewBox={`0 0 ${geom.w} ${geom.h}`}
            fill='none'
          >
            <path
              d={geom.inbound}
              className='stroke-primary/45'
              strokeWidth={1.25}
            />
            {geom.outbound.map((d, index) => (
              <path
                key={targets[index]?.id ?? index}
                d={d}
                className='stroke-foreground/10'
                strokeWidth={1.25}
              />
            ))}
            {selectedPath ? (
              <path
                key={`hl-${selected}`}
                ref={highlightRef}
                d={selectedPath}
                className='stroke-primary/80'
                strokeWidth={1.5}
                style={{ filter: GLOW_FILTER }}
              />
            ) : null}
            {!reduced && selectedPath ? (
              <>
                <g
                  ref={inDotRef}
                  strokeDasharray={DOT_DASH}
                  strokeDashoffset={DOT_HIDDEN_START}
                  strokeLinecap='round'
                >
                  <path
                    d={geom.inbound}
                    pathLength={100}
                    className='stroke-primary/30'
                    strokeWidth={10}
                  />
                  <path
                    d={geom.inbound}
                    pathLength={100}
                    className='stroke-primary'
                    strokeWidth={4.5}
                  />
                </g>
                <g
                  ref={outDotRef}
                  strokeDasharray={DOT_DASH}
                  strokeDashoffset={DOT_HIDDEN_START}
                  strokeLinecap='round'
                >
                  <path
                    d={selectedPath}
                    pathLength={100}
                    className='stroke-primary/30'
                    strokeWidth={10}
                  />
                  <path
                    d={selectedPath}
                    pathLength={100}
                    className='stroke-primary'
                    strokeWidth={4.5}
                  />
                </g>
              </>
            ) : null}
          </svg>
        ) : null}

        {/* Your app */}
        <div
          ref={appRef}
          className='border-border bg-card relative z-10 flex w-fit items-center gap-3 rounded-xl border px-4 py-3 md:w-40'
        >
          <span className='border-border bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg border'>
            <AppWindow
              aria-hidden='true'
              className='size-4'
              strokeWidth={1.75}
            />
          </span>
          <span className='text-[15px] font-medium'>{t('Your App')}</span>
        </div>

        {/* Router */}
        <div className='relative z-10 flex items-center gap-4 md:flex-col md:gap-0'>
          <div
            ref={sphereRef}
            className='bg-background relative size-22 shrink-0 rounded-full shadow-[0_0_48px_-8px_color-mix(in_srgb,var(--primary)_35%,transparent)] md:size-28'
          >
            <HomeSphere variant='mini' interactive={false} gap={4} />
          </div>
          <span className='font-display text-base font-medium whitespace-nowrap md:absolute md:top-full md:left-1/2 md:mt-3 md:-translate-x-1/2'>
            {routerLabel}
          </span>
        </div>

        {/* Targets */}
        <ul className='relative z-10 flex flex-col gap-3 pl-28 md:w-56 md:pl-0'>
          {targets.map((target, index) => {
            const on = index === selected
            return (
              <li
                key={target.id}
                ref={(el) => {
                  nodeRefs.current[index] = el
                }}
                className={cn(
                  'bg-card flex items-center gap-3 rounded-xl border px-4 py-3 transition-[border-color,box-shadow] duration-500 motion-reduce:transition-none',
                  on
                    ? 'border-primary/50 shadow-[0_0_24px_-6px_color-mix(in_srgb,var(--primary)_35%,transparent)]'
                    : 'border-border'
                )}
              >
                <span
                  className={cn(
                    'transition-colors duration-500',
                    on ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  <ProviderMark provider={target} size={18} />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-[15px] font-medium transition-colors duration-500',
                    on ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {target.name}
                </span>
                <span
                  aria-hidden='true'
                  className={cn(
                    'size-1.5 shrink-0 rounded-full transition-[background-color,box-shadow] duration-500',
                    on
                      ? 'bg-primary shadow-[0_0_8px_1px_var(--primary)]'
                      : 'bg-muted-foreground/50'
                  )}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </figure>
  )
}
