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
  Bot,
  BrainCircuit,
  CheckCircle2,
  Code2,
  Copy,
  Gem,
  MonitorUp,
  Sparkles,
  TerminalSquare,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { useGatewayBaseUrl } from '@/hooks/use-gateway-base-url'
import { useSystemConfig } from '@/hooks/use-system-config'
import { Button } from '@/components/ui/button'

interface HomeIntegrationPreviewProps {
  className?: string
}

const clients = [
  { name: 'Codex', meta: 'OpenAI workflow', icon: TerminalSquare },
  { name: 'Claude Code', meta: 'Claude Messages', icon: Code2 },
  { name: 'OpenCode', meta: 'Local agent', icon: Bot },
  { name: 'Cherry Studio', meta: 'Desktop client', icon: MonitorUp },
]

const models = [
  { name: 'OpenAI', meta: 'GPT 5.2', icon: BrainCircuit },
  { name: 'Claude', meta: 'Claude Opus 4.7', icon: Sparkles },
  { name: 'Gemini', meta: 'Gemini 3.1 Pro', icon: Gem },
  { name: 'DeepSeek', meta: 'DeepSeek R2', icon: Bot },
]

function CopyButton({ configText }: { configText: string }) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({
    successMessage: t('Configuration copied'),
  })
  const copied = copiedText === configText

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon-sm'
      className='text-muted-foreground hover:text-foreground size-7 rounded-md'
      aria-label={t('Copy config')}
      onClick={() => void copyToClipboard(configText)}
    >
      {copied ? (
        <CheckCircle2 className='size-3.5 text-emerald-600 dark:text-emerald-400' />
      ) : (
        <Copy className='size-3.5' />
      )}
    </Button>
  )
}

export function HomeIntegrationPreview(props: HomeIntegrationPreviewProps) {
  const { t } = useTranslation()
  const { systemName } = useSystemConfig()
  const gatewayBaseUrl = useGatewayBaseUrl()
  const gatewayV1Url = `${gatewayBaseUrl}/v1`
  const configText = `base_url: ${gatewayV1Url}
api_key: sk-********************************
model: claude-sonnet-4-5`

  return (
    <div
      className={cn(
        'border-border/70 bg-background/95 w-full overflow-hidden rounded-[22px] border shadow-[0_30px_100px_rgba(15,23,42,0.10)] dark:bg-neutral-950/90 dark:shadow-[0_30px_100px_rgba(0,0,0,0.35)]',
        props.className
      )}
    >
      <div className='border-border/60 bg-muted/20 flex h-10 items-center justify-between border-b px-4'>
        <div className='flex items-center gap-1.5'>
          <span className='size-2.5 rounded-full bg-red-300' />
          <span className='size-2.5 rounded-full bg-amber-300' />
          <span className='size-2.5 rounded-full bg-emerald-300' />
        </div>
        <span className='text-muted-foreground max-w-[12rem] truncate text-xs font-medium'>
          {systemName}
        </span>
      </div>

      <div
        className='relative min-h-[440px] px-5 py-7 sm:px-8'
        style={{
          backgroundImage:
            'radial-gradient(color-mix(in oklch, var(--border) 65%, transparent) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      >
        <div
          aria-hidden
          className='absolute top-1/2 right-[27%] left-[27%] hidden h-px bg-[#f05a53]/25 md:block'
        />
        <div
          aria-hidden
          className='absolute top-[24%] bottom-[24%] left-1/2 hidden w-px bg-[#f05a53]/15 md:block'
        />

        <div className='grid gap-5 md:grid-cols-[1fr_180px_1fr] md:items-center'>
          <div className='grid gap-3'>
            {clients.map((client) => {
              const Icon = client.icon
              return (
                <div
                  key={client.name}
                  className='border-border/70 bg-background/95 flex min-h-16 items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm dark:bg-neutral-950/95'
                >
                  <div className='min-w-0'>
                    <p className='text-muted-foreground text-[11px] font-medium uppercase'>
                      {t('Client')}
                    </p>
                    <p className='truncate text-sm font-semibold'>
                      {client.name}
                    </p>
                    <p className='text-muted-foreground truncate text-xs'>
                      {client.meta}
                    </p>
                  </div>
                  <span className='border-border/60 bg-muted/25 flex size-9 shrink-0 items-center justify-center rounded-xl border'>
                    <Icon className='size-4 text-[#f05a53]' />
                  </span>
                </div>
              )
            })}
          </div>

          <div className='relative flex justify-center py-2 md:py-0'>
            <div className='border-border/70 bg-background flex size-28 flex-col items-center justify-center rounded-[24px] border shadow-[0_18px_50px_rgba(240,90,83,0.18)] dark:bg-neutral-950'>
              <span className='mb-2 rounded-full bg-[#f05a53]/10 px-2 py-1 text-[10px] font-semibold tracking-[0.18em] text-[#f05a53] uppercase'>
                {t('Gateway base')}
              </span>
              <span className='flex size-9 items-center justify-center rounded-xl bg-[#f05a53] text-sm font-bold text-white'>
                N
              </span>
              <span className='mt-2 max-w-24 truncate text-sm font-semibold'>
                {systemName}
              </span>
            </div>
          </div>

          <div className='grid gap-3'>
            {models.map((model) => {
              const Icon = model.icon
              return (
                <div
                  key={model.name}
                  className='border-border/70 bg-background/95 flex min-h-16 items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm dark:bg-neutral-950/95'
                >
                  <div className='min-w-0'>
                    <p className='text-muted-foreground text-[11px] font-medium uppercase'>
                      {t('Model')}
                    </p>
                    <p className='truncate text-sm font-semibold'>
                      {model.name}
                    </p>
                    <p className='text-muted-foreground truncate text-xs'>
                      {model.meta}
                    </p>
                  </div>
                  <span className='border-border/60 bg-muted/25 flex size-9 shrink-0 items-center justify-center rounded-xl border'>
                    <Icon className='size-4 text-[#f05a53]' />
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className='border-border/70 bg-background/95 mt-5 flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 dark:bg-neutral-950/95'>
          <div className='min-w-0 font-mono text-xs'>
            <span className='text-muted-foreground'>base_url</span>
            <span className='mx-2 text-[#f05a53]'>/</span>
            <span className='truncate'>{gatewayV1Url}</span>
          </div>
          <CopyButton configText={configText} />
        </div>
      </div>
    </div>
  )
}
