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
import {
  CheckCircle2,
  Clipboard,
  Clock3,
  CreditCard,
  Layers3,
  Plug,
  ReceiptText,
  WalletCards,
} from 'lucide-react'
import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface HomeDashboardPreviewProps {
  className?: string
}

// Demo-only preview values. Do not treat these as real account data.
const demoModels = ['ChatGPT', 'Claude', 'Gemini', 'DeepSeek']
const demoApps = ['Cherry Studio', 'Open WebUI', 'LobeChat', 'ChatBox']

export function HomeDashboardPreview(props: HomeDashboardPreviewProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'border-border/70 bg-background/95 text-foreground w-full max-w-[560px] overflow-hidden rounded-xl border shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:bg-neutral-950/90 dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)]',
        props.className
      )}
    >
      <div className='border-border/60 bg-muted/20 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5'>
        <div className='min-w-0'>
          <p className='text-xs font-semibold tracking-[0.18em] text-neutral-500 uppercase dark:text-neutral-400'>
            {t('Console preview')}
          </p>
          <h2 className='mt-1 truncate text-sm font-semibold sm:text-base'>
            {t('Models, apps, balance, and usage')}
          </h2>
        </div>
        <div className='border-border/60 bg-background flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium text-emerald-700 dark:bg-neutral-900 dark:text-emerald-300'>
          <CheckCircle2 className='size-3.5' />
          <span>{t('Stable')}</span>
        </div>
      </div>

      <div className='space-y-5 p-4 sm:p-5'>
        <div className='grid gap-3 sm:grid-cols-3'>
          <Metric
            icon={<WalletCards className='size-4' />}
            label={t('Current Balance')}
            value='$2.40'
            helper={t('Demo balance')}
          />
          <Metric
            icon={<ReceiptText className='size-4' />}
            label={t('Monthly Usage')}
            value='$0.69'
            helper={t('1,284 requests')}
          />
          <Metric
            icon={<CreditCard className='size-4' />}
            label={t('Example Request Cost')}
            value='$0.0021'
            helper={t('Per-use preview')}
          />
        </div>

        <div className='grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
          <div className='space-y-4'>
            <PreviewGroup
              icon={<Layers3 className='size-4' />}
              title={t('Frequently Used Models')}
            >
              <div className='flex flex-wrap gap-2'>
                {demoModels.map((model) => (
                  <span
                    key={model}
                    className='border-border/60 bg-muted/30 rounded-md border px-2.5 py-1 text-xs font-medium'
                  >
                    {model}
                  </span>
                ))}
              </div>
            </PreviewGroup>

            <PreviewGroup
              icon={<Plug className='size-4' />}
              title={t('Connected Applications')}
            >
              <div className='grid grid-cols-2 gap-2'>
                {demoApps.map((app) => (
                  <div
                    key={app}
                    className='border-border/50 flex min-h-8 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs'
                  >
                    <span className='size-1.5 shrink-0 rounded-full bg-teal-500' />
                    <span className='min-w-0 truncate'>{app}</span>
                  </div>
                ))}
              </div>
            </PreviewGroup>
          </div>

          <div className='space-y-3'>
            <PreviewGroup
              icon={<Clock3 className='size-4' />}
              title={t('Recent Request Status')}
            >
              <div className='space-y-2'>
                <StatusRow label={t('Succeeded')} value='99.8%' />
                <StatusRow label={t('Queued')} value={t('Low')} />
                <StatusRow label={t('Stable')} value={t('Online')} />
              </div>
            </PreviewGroup>

            <div className='border-border/60 bg-muted/20 flex min-h-14 items-center justify-between gap-3 rounded-lg border px-3 py-2.5'>
              <div className='min-w-0'>
                <p className='text-xs font-semibold'>
                  {t('Connection Config')}
                </p>
                <p className='text-muted-foreground mt-0.5 truncate text-[11px]'>
                  {t('Copy settings without exposing keys')}
                </p>
              </div>
              <div className='border-border/70 bg-background flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium dark:bg-neutral-900'>
                <Clipboard className='size-3.5' />
                <span>{t('Copy config')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric(props: {
  icon: ReactNode
  label: string
  value: string
  helper: string
}) {
  return (
    <div className='border-border/60 bg-muted/20 min-w-0 rounded-lg border p-3'>
      <div className='text-muted-foreground mb-3 flex items-center gap-2 text-xs'>
        {props.icon}
        <span className='min-w-0 truncate'>{props.label}</span>
      </div>
      <p className='text-lg font-bold tabular-nums'>{props.value}</p>
      <p className='text-muted-foreground mt-1 truncate text-[11px]'>
        {props.helper}
      </p>
    </div>
  )
}

function PreviewGroup(props: {
  icon: ReactNode
  title: string
  children: ReactNode
}) {
  return (
    <div className='min-w-0'>
      <div className='text-muted-foreground mb-2 flex items-center gap-2 text-xs font-semibold'>
        {props.icon}
        <span>{props.title}</span>
      </div>
      {props.children}
    </div>
  )
}

function StatusRow(props: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between gap-3 text-xs'>
      <div className='flex min-w-0 items-center gap-2'>
        <span className='size-1.5 shrink-0 rounded-full bg-emerald-500' />
        <span className='truncate'>{props.label}</span>
      </div>
      <span className='text-muted-foreground shrink-0 font-medium'>
        {props.value}
      </span>
    </div>
  )
}
