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
import { Link } from '@tanstack/react-router'
import { ClipboardCheck, Lightbulb, Server, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { GUIDE_STEP_TITLES, type ClientGuide } from '../lib/guides'
import { STEPS_ANCHOR, stepAnchor } from '../lib/toc'
import { DocsArticleHeader } from './docs-article-header'
import { DocsCallout } from './docs-callout'
import { DocsCodeBlock } from './docs-code-block'
import { ANCHOR_SCROLL_MARGIN, DocsStep, DocsSteps } from './docs-steps'

type GuideArticleProps = {
  guide: ClientGuide
  gatewayBaseUrl: string
}

const SECTION_HEADING_CLASS = cn(
  ANCHOR_SCROLL_MARGIN,
  'font-display text-xl leading-7 font-medium tracking-[-0.01em]'
)

/** The guide: header, illustration, tip and warning, then six steps. */
export function GuideArticle(props: GuideArticleProps) {
  const { t } = useTranslation()
  const guide = props.guide

  return (
    <article aria-labelledby='docs-title' className='min-w-0'>
      <DocsArticleHeader
        eyebrow={
          <>
            <span className='sr-only'>{t('Current guide')}: </span>
            {t(guide.protocolLabel)}
          </>
        }
        title={`${guide.name} · ${guide.model}`}
        lead={t(guide.summary)}
      >
        <div className='flex min-w-0 flex-wrap items-center gap-2'>
          <Badge variant='outline' className='h-6 px-2.5'>
            <span className='text-muted-foreground font-normal'>
              {t('Model')}
            </span>
            <span className='font-mono'>{guide.model}</span>
          </Badge>
          <Badge variant='outline' className='h-6 max-w-full min-w-0 px-2.5'>
            <Server aria-hidden='true' className='text-muted-foreground' />
            <span className='min-w-0 truncate font-mono'>
              {props.gatewayBaseUrl}
            </span>
          </Badge>
        </div>
      </DocsArticleHeader>

      {/* Decorative: the steps below carry all the information. Each theme
          gets its own artwork; the hidden one is lazy and never fetched. */}
      <figure className='border-border bg-card mt-8 overflow-hidden rounded-2xl border'>
        <img
          src={guide.illustration.light}
          alt=''
          width={1520}
          height={792}
          loading='lazy'
          decoding='async'
          data-theme-variant='light'
          className='block h-auto w-full dark:hidden'
        />
        <img
          src={guide.illustration.dark}
          alt=''
          width={1520}
          height={792}
          loading='lazy'
          decoding='async'
          data-theme-variant='dark'
          className='hidden h-auto w-full dark:block'
        />
      </figure>

      <div className='mt-6 space-y-4'>
        <DocsCallout tone='note' icon={Lightbulb} title={t('Tip')}>
          {t(guide.consoleTip.text)}{' '}
          <Link to={guide.consoleTip.to}>{t(guide.consoleTip.linkLabel)}</Link>
        </DocsCallout>
        <DocsCallout
          tone='warning'
          icon={ShieldAlert}
          title={t('Before publishing')}
        >
          {t('Never publish real API keys in docs, repos, or screenshots.')}
        </DocsCallout>
      </div>

      <section aria-labelledby={STEPS_ANCHOR} className='mt-12 space-y-6'>
        <h2 id={STEPS_ANCHOR} className={SECTION_HEADING_CLASS}>
          {t('Steps')}
        </h2>
        <DocsSteps>
          <DocsStep
            index={1}
            id={stepAnchor(1)}
            title={t(GUIDE_STEP_TITLES[0])}
          >
            <DocsCodeBlock title='install' code={guide.install} />
          </DocsStep>
          <DocsStep
            index={2}
            id={stepAnchor(2)}
            title={t(GUIDE_STEP_TITLES[1])}
          >
            <DocsCodeBlock title='verify' code={guide.verify} />
          </DocsStep>
          <DocsStep
            index={3}
            id={stepAnchor(3)}
            title={t(GUIDE_STEP_TITLES[2])}
          >
            <DocsCodeBlock title={guide.configPath} code={guide.configPath} />
          </DocsStep>
          <DocsStep
            index={4}
            id={stepAnchor(4)}
            title={t(GUIDE_STEP_TITLES[3])}
          >
            <DocsCodeBlock title={guide.configPath} code={guide.config} />
          </DocsStep>
          <DocsStep
            index={5}
            id={stepAnchor(5)}
            title={t(GUIDE_STEP_TITLES[4])}
          >
            <DocsCodeBlock title='run' code={guide.run} />
          </DocsStep>
          <DocsStep
            index={6}
            id={stepAnchor(6)}
            title={t(GUIDE_STEP_TITLES[5])}
          >
            <DocsCallout tone='success' icon={ClipboardCheck}>
              {t(
                'The log should include the user key, model, upstream channel, status, and token usage.'
              )}
            </DocsCallout>
          </DocsStep>
        </DocsSteps>
      </section>
    </article>
  )
}
