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
import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Code2,
  Copy,
  Globe2,
  MonitorUp,
  Network,
  Server,
  Sparkles,
  TerminalSquare,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { Button } from '@/components/ui/button'
import { PublicLayout } from '@/components/layout'

type ProtocolId = 'openai' | 'claude' | 'gemini' | 'faq'
type ClientId = 'codex' | 'cursor' | 'claude-code' | 'opencode' | 'cherry'

type ClientGuide = {
  id: ClientId
  protocol: ProtocolId
  name: string
  model: string
  icon: typeof TerminalSquare
  install: string
  verify: string
  configPath: string
  config: string
  run: string
  summary: string
}

const protocols: Array<{ id: ProtocolId; label: string }> = [
  { id: 'openai', label: 'OpenAI compatible' },
  { id: 'claude', label: 'Claude compatible' },
  { id: 'gemini', label: 'Gemini compatible' },
  { id: 'faq', label: 'FAQ' },
]

const clientGuides: ClientGuide[] = [
  {
    id: 'codex',
    protocol: 'openai',
    name: 'Codex',
    model: 'gpt-5.4',
    icon: TerminalSquare,
    install: 'npm install -g @openai/codex',
    verify: 'codex --version',
    configPath: 'C:\\Users\\<username>\\.codex\\config.toml',
    config: `model = "gpt-5.4"
model_provider = "new-api"
model_reasoning_effort = "high"

[model_providers.new-api]
name = "new-api"
base_url = "https://api.example.com/v1"
requires_openai_auth = true
wire_api = "responses"`,
    run: 'codex',
    summary: 'Use the OpenAI Responses route and set the base URL to the gateway /v1 endpoint.',
  },
  {
    id: 'cursor',
    protocol: 'openai',
    name: 'Cursor',
    model: 'gpt-5.4',
    icon: Code2,
    install: 'Open Settings -> Models -> Add custom OpenAI compatible provider',
    verify: 'Send a short chat message from Cursor',
    configPath: 'Cursor custom provider',
    config: `Provider name: new-api
Base URL: https://api.example.com/v1
API Key: sk-********************************
Model: gpt-5.4`,
    run: 'Choose the new-api provider in Cursor and start a chat.',
    summary: 'Use an OpenAI-compatible provider entry for editor chat and agent workflows.',
  },
  {
    id: 'claude-code',
    protocol: 'claude',
    name: 'Claude Code',
    model: 'claude-opus-4-7',
    icon: Sparkles,
    install: 'npm install -g @anthropic-ai/claude-code',
    verify: 'claude --version',
    configPath: 'C:\\Users\\<username>\\.claude\\settings.json',
    config: `{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.example.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-********************************",
    "ANTHROPIC_MODEL": "claude-opus-4-7",
    "CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS": "1"
  }
}`,
    run: 'claude',
    summary: 'Use the Anthropic Messages route and keep the base URL at the gateway root.',
  },
  {
    id: 'opencode',
    protocol: 'claude',
    name: 'OpenCode',
    model: 'claude-opus-4-6',
    icon: Bot,
    install: 'npm install -g opencode-ai',
    verify: 'opencode -v',
    configPath: 'C:\\Users\\<username>\\.config\\opencode\\opencode.json',
    config: `{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "new-api": {
      "npm": "@ai-sdk/anthropic",
      "name": "new-api",
      "options": {
        "baseURL": "https://api.example.com/v1",
        "apiKey": "sk-********************************"
      }
    }
  }
}`,
    run: 'opencode',
    summary: 'Use the Anthropic SDK provider and point it to the gateway route.',
  },
  {
    id: 'cherry',
    protocol: 'gemini',
    name: 'Cherry Studio',
    model: 'gemini-3.1-pro',
    icon: MonitorUp,
    install: 'Open Settings -> Model Provider -> Add custom Gemini provider',
    verify: 'Send a one-line test prompt in Cherry Studio',
    configPath: 'Cherry Studio provider settings',
    config: `Provider: new-api
API Type: Gemini
Base URL: https://api.example.com
API Key: sk-********************************
Model: gemini-3.1-pro`,
    run: 'Select the new-api Gemini provider and start a chat.',
    summary: 'Use the Gemini route for desktop clients that support custom Gemini endpoints.',
  },
]

const routeOptions = [
  {
    title: 'Primary route',
    url: 'api.example.com',
    description: 'Recommended for daily use',
    active: true,
  },
  {
    title: 'Overseas route',
    url: 'global-api.example.com',
    description: 'Use when the primary route is slow',
    active: false,
  },
  {
    title: 'CDN route',
    url: 'cdn-api.example.com',
    description: 'Use for static network acceleration',
    active: false,
  },
]

const faqItems = [
  {
    question: 'Which base URL should I use?',
    answer: 'OpenAI-compatible clients usually use /v1. Claude and Gemini clients usually use the gateway root unless the client asks for a versioned endpoint.',
  },
  {
    question: 'Where do I get the API key?',
    answer: 'Create a dedicated key in the console, then limit its group, quota, model permissions, and rate limits for CLI tools.',
  },
  {
    question: 'How do I verify the setup?',
    answer: 'Run one short request, then check usage logs for model, channel, status, and token usage.',
  },
]

function CodePanel({
  title,
  code,
  className,
}: {
  title: string
  code: string
  className?: string
}) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({
    successMessage: t('Configuration copied'),
  })
  const copied = copiedText === code

  return (
    <div
      className={cn(
        'border-border/80 bg-muted/25 w-full max-w-full min-w-0 overflow-hidden rounded-xl border',
        className
      )}
    >
      <div className='border-border/70 bg-background/80 flex h-10 items-center justify-between border-b px-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <span className='size-2.5 rounded-full bg-red-300' />
          <span className='size-2.5 rounded-full bg-amber-300' />
          <span className='size-2.5 rounded-full bg-emerald-300' />
          <span className='text-muted-foreground truncate pl-1 text-xs'>
            {title}
          </span>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          className='text-muted-foreground size-7 rounded-md'
          aria-label={t('Copy config')}
          onClick={() => void copyToClipboard(code)}
        >
          {copied ? (
            <CheckCircle2 className='size-3.5 text-emerald-600' />
          ) : (
            <Copy className='size-3.5' />
          )}
        </Button>
      </div>
      <pre className='max-w-full overflow-x-auto px-4 py-4 text-[13px] leading-7'>
        <code>{code}</code>
      </pre>
    </div>
  )
}

function StepRow({
  index,
  title,
  children,
}: {
  index: number
  title: string
  children?: React.ReactNode
}) {
  const { t } = useTranslation()

  return (
    <div className='grid gap-3 sm:grid-cols-[2rem_minmax(0,1fr)]'>
      <div className='border-border bg-background text-muted-foreground flex size-8 items-center justify-center rounded-full border text-sm font-semibold'>
        {index}
      </div>
      <div className='min-w-0 space-y-3 pt-1'>
        <p className='text-sm leading-6 font-medium'>{t(title)}</p>
        {children}
      </div>
    </div>
  )
}

function RouteSelector() {
  const { t } = useTranslation()

  return (
    <aside className='space-y-3'>
      <div className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
        {t('Route selection')}
      </div>
      <div className='grid gap-3 lg:block lg:space-y-3'>
        {routeOptions.map((route) => (
          <button
            key={route.title}
            type='button'
            className={cn(
              'border-border bg-background hover:border-primary/40 relative w-full rounded-xl border p-4 text-left transition-colors',
              route.active &&
                'border-emerald-400 bg-emerald-50/70 shadow-[0_0_0_1px_rgba(52,211,153,0.18)] dark:bg-emerald-950/20'
            )}
          >
            {route.active ? (
              <span className='absolute top-3 right-3 size-2 rounded-full bg-emerald-500' />
            ) : null}
            <div className='text-sm font-semibold'>{t(route.title)}</div>
            <div className='text-muted-foreground mt-1 text-xs'>
              {route.url}
            </div>
            <div className='text-muted-foreground/80 mt-3 text-xs leading-5'>
              {t(route.description)}
            </div>
          </button>
        ))}
      </div>
    </aside>
  )
}

function GuideBody({ guide }: { guide: ClientGuide }) {
  const { t } = useTranslation()

  return (
    <div className='max-w-full min-w-0 space-y-7 overflow-hidden'>
      <div className='border-border/70 bg-background w-full max-w-full min-w-0 rounded-xl border p-5'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <div className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
              {t('Current guide')}
            </div>
            <h1 className='mt-2 break-words text-2xl font-semibold tracking-tight md:text-3xl'>
              {guide.name} · {guide.model}
            </h1>
            <p className='text-muted-foreground mt-3 max-w-2xl break-words text-sm leading-7'>
              {t(guide.summary)}
            </p>
          </div>
          <div className='border-border/70 bg-muted/30 flex max-w-full min-w-0 items-center gap-2 self-start rounded-full border px-3 py-2 text-xs font-medium'>
            <Server className='size-3.5 text-emerald-600' />
            <span className='min-w-0 truncate'>https://api.example.com</span>
          </div>
        </div>
      </div>

      <div className='max-w-full min-w-0 space-y-7 overflow-hidden'>
        <StepRow index={1} title='Install or update the client.'>
          <CodePanel title='install' code={guide.install} />
        </StepRow>
        <StepRow index={2} title='Run the version command to confirm the client is available.'>
          <CodePanel title='verify' code={guide.verify} />
        </StepRow>
        <StepRow
          index={3}
          title='Open the configuration file and create the directory first if it does not exist.'
        >
          <CodePanel title={guide.configPath} code={guide.configPath} />
        </StepRow>
        <StepRow index={4} title='Write the following configuration and save the file.'>
          <CodePanel title={guide.configPath} code={guide.config} />
        </StepRow>
        <StepRow index={5} title='Start the client and send one short message.'>
          <CodePanel title='run' code={guide.run} />
        </StepRow>
        <StepRow index={6} title='Check usage logs and confirm the request route is recorded.'>
          <div className='border-border/70 bg-emerald-50/60 flex max-w-full min-w-0 items-start gap-3 rounded-xl border p-4 text-sm leading-6 dark:bg-emerald-950/20'>
            <ClipboardCheck className='mt-0.5 size-4 shrink-0 text-emerald-600' />
            <span className='min-w-0 break-words'>
              {t(
                'The log should include the user key, model, upstream channel, status, and token usage.'
              )}
            </span>
          </div>
        </StepRow>
      </div>
    </div>
  )
}

function FaqBody() {
  const { t } = useTranslation()

  return (
    <div className='space-y-4'>
      {faqItems.map((item) => (
        <details
          key={item.question}
          className='border-border/70 bg-background group rounded-xl border p-5'
        >
          <summary className='flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold'>
            {t(item.question)}
            <ChevronDown className='text-muted-foreground size-4 transition-transform group-open:rotate-180' />
          </summary>
          <p className='text-muted-foreground mt-3 text-sm leading-7'>
            {t(item.answer)}
          </p>
        </details>
      ))}
    </div>
  )
}

function DocsPage() {
  const { t } = useTranslation()
  const [activeProtocol, setActiveProtocol] = useState<ProtocolId>('openai')
  const [activeClientId, setActiveClientId] = useState<ClientId>('codex')

  const visibleClients = useMemo(
    () => clientGuides.filter((client) => client.protocol === activeProtocol),
    [activeProtocol]
  )
  const activeGuide =
    visibleClients.find((client) => client.id === activeClientId) ||
    visibleClients[0]

  const selectProtocol = (protocol: ProtocolId) => {
    setActiveProtocol(protocol)
    const firstClient = clientGuides.find((client) => client.protocol === protocol)
    if (firstClient) {
      setActiveClientId(firstClient.id)
    }
  }

  return (
    <PublicLayout showMainContainer={false}>
      <main className='bg-background min-h-svh w-full max-w-[100vw] overflow-x-hidden pt-16'>
        <div className='border-border/70 bg-background/95 sticky top-16 z-30 border-b backdrop-blur-xl'>
          <div className='mx-auto flex max-w-7xl min-w-0 flex-col gap-4 px-4 py-4 md:px-6'>
            <div className='-mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0'>
              {protocols.map((protocol) => (
                <button
                  key={protocol.id}
                  type='button'
                  onClick={() => selectProtocol(protocol.id)}
                  className={cn(
                    'h-10 shrink-0 rounded-none border-b-2 px-4 text-sm font-semibold transition-colors',
                    activeProtocol === protocol.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t(protocol.label)}
                </button>
              ))}
            </div>

            {activeProtocol !== 'faq' ? (
              <div className='flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center'>
                <div className='flex items-center gap-3'>
                  <span className='text-muted-foreground text-sm'>
                    {t('Model')}
                  </span>
                  <button
                    type='button'
                    className='border-border bg-background inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm'
                  >
                    {activeGuide?.model}
                    <ChevronDown className='text-muted-foreground size-3.5' />
                  </button>
                </div>

                <div className='flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center'>
                  <span className='text-muted-foreground shrink-0 text-sm'>
                    {t('Client')}
                  </span>
                  <div className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0'>
                    {visibleClients.map((client) => {
                      const Icon = client.icon
                      return (
                        <button
                          key={client.id}
                          type='button'
                          onClick={() => setActiveClientId(client.id)}
                          className={cn(
                            'border-border bg-background inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                            activeGuide?.id === client.id &&
                              'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                          )}
                        >
                          <Icon className='size-3.5' />
                          {client.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className='mx-auto grid w-full max-w-7xl min-w-0 gap-8 px-4 py-8 md:px-6 lg:grid-cols-[minmax(0,1fr)_220px]'>
          <article className='w-full max-w-full min-w-0 overflow-hidden'>
            {activeProtocol === 'faq' || !activeGuide ? (
              <FaqBody />
            ) : (
              <GuideBody guide={activeGuide} />
            )}
          </article>

          <div className='lg:sticky lg:top-40 lg:self-start'>
            <RouteSelector />
            <div className='border-border/70 bg-muted/25 mt-5 rounded-xl border p-4 text-sm leading-6'>
              <div className='flex items-center gap-2 font-semibold'>
                <Network className='size-4 text-emerald-600' />
                {t('Route rule')}
              </div>
              <p className='text-muted-foreground mt-2 text-xs leading-5'>
                {t(
                  'Use /v1 for OpenAI-compatible clients. Use the gateway root for Claude and Gemini clients unless the client requires a versioned URL.'
                )}
              </p>
            </div>
            <div className='border-border/70 bg-muted/25 mt-3 rounded-xl border p-4 text-sm leading-6'>
              <div className='flex items-center gap-2 font-semibold'>
                <Globe2 className='size-4 text-emerald-600' />
                {t('Before publishing')}
              </div>
              <p className='text-muted-foreground mt-2 text-xs leading-5'>
                {t('Never publish real API keys in docs, repos, or screenshots.')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}

export const Route = createFileRoute('/docs/')({
  component: DocsPage,
})
