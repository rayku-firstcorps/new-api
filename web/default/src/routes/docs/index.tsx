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
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  GitBranch,
  KeyRound,
  Network,
  ServerCog,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PublicLayout } from '@/components/layout'

const sidebarSections = [
  { id: 'overview', key: 'CLI Agent Docs' },
  { id: 'gateway-setup', key: 'Gateway Setup' },
  { id: 'preflight', key: 'Preflight Checks' },
  { id: 'claude-code', key: 'Claude Code' },
  { id: 'gemini-cli', key: 'Gemini CLI' },
  { id: 'codex-cli', key: 'Codex CLI' },
  { id: 'cc-switch', key: 'CC Switch' },
  { id: 'troubleshooting', key: 'Troubleshooting' },
  { id: 'acceptance', key: 'Acceptance' },
]

const outcomeCards = [
  {
    title: '10-minute first connection',
    description:
      'Create one gateway key, set the correct base URL, and verify a real CLI request.',
    icon: Terminal,
  },
  {
    title: 'Unified keys and billing',
    description:
      'Route CLI traffic through the same quota, model permission, billing, and audit controls.',
    icon: KeyRound,
  },
  {
    title: 'Sticky routing for long sessions',
    description:
      'Use Channel Affinity templates to keep Claude Code and Codex sessions on stable upstream channels.',
    icon: GitBranch,
  },
]

const gatewaySteps = [
  {
    title: 'Configure upstream channels',
    description:
      'Enable Claude Messages, Gemini API, and OpenAI Responses capable channels for agent traffic.',
    icon: Network,
  },
  {
    title: 'Create model mappings',
    description:
      'Expose practical model names such as claude-*, gemini-*, and gpt-*-codex to developers.',
    icon: Bot,
  },
  {
    title: 'Issue a dedicated CLI key',
    description:
      'Use a separate group, quota, rate limit, and model allowlist for terminal agents.',
    icon: KeyRound,
  },
  {
    title: 'Enable Channel Affinity',
    description:
      'Append the built-in Claude CLI and Codex CLI templates before production rollout.',
    icon: GitBranch,
  },
]

const endpointRows = [
  {
    client: 'Claude Code',
    path: '/v1/messages',
    auth: 'x-api-key: sk-xxx',
    baseUrl: 'https://api.example.com',
  },
  {
    client: 'Gemini CLI',
    path: '/v1beta/models/{model}:generateContent',
    auth: 'x-goog-api-key: sk-xxx',
    baseUrl: 'https://api.example.com',
  },
  {
    client: 'Codex CLI',
    path: '/v1/responses',
    auth: 'Authorization: Bearer sk-xxx',
    baseUrl: 'https://api.example.com/v1',
  },
]

const toolSections = [
  {
    id: 'claude-code',
    title: 'Claude Code',
    description:
      'Claude Code uses the Anthropic Messages route. Set the base URL to the gateway root, without /v1.',
    install: 'npm install -g @anthropic-ai/claude-code',
    bash: `export ANTHROPIC_BASE_URL="https://api.example.com"
export ANTHROPIC_AUTH_TOKEN="sk-xxx"
export ANTHROPIC_MODEL="claude-3-7-sonnet-20250219-thinking"

claude`,
    powershell: `$env:ANTHROPIC_BASE_URL="https://api.example.com"
$env:ANTHROPIC_AUTH_TOKEN="sk-xxx"
$env:ANTHROPIC_MODEL="claude-3-7-sonnet-20250219-thinking"

claude`,
    persistLabel: '~/.claude/settings.json',
    persist: `{
  "env": {
    "ANTHROPIC_BASE_URL": "https://api.example.com",
    "ANTHROPIC_AUTH_TOKEN": "sk-xxx",
    "ANTHROPIC_MODEL": "claude-3-7-sonnet-20250219-thinking"
  }
}`,
    verify: 'Usage logs should show /v1/messages.',
  },
  {
    id: 'gemini-cli',
    title: 'Gemini CLI',
    description:
      'Gemini CLI uses the Gemini route. Set the gateway root as the base URL, without /v1beta.',
    install: 'npm install -g @google/gemini-cli',
    bash: `export GEMINI_API_KEY="sk-xxx"
export GOOGLE_GEMINI_BASE_URL="https://api.example.com"
export GEMINI_MODEL="gemini-2.5-flash"

gemini -p "Reply with OK"`,
    powershell: `$env:GEMINI_API_KEY="sk-xxx"
$env:GOOGLE_GEMINI_BASE_URL="https://api.example.com"
$env:GEMINI_MODEL="gemini-2.5-flash"

gemini -p "Reply with OK"`,
    persistLabel: '~/.gemini/.env',
    persist: `GEMINI_API_KEY=sk-xxx
GOOGLE_GEMINI_BASE_URL=https://api.example.com
GEMINI_MODEL=gemini-2.5-flash`,
    verify: 'Usage logs should show /v1beta/models/{model}:generateContent.',
  },
  {
    id: 'codex-cli',
    title: 'Codex CLI',
    description:
      'Codex CLI should use the OpenAI Responses protocol. Set the provider base URL to the gateway /v1 root.',
    install: 'npm i -g @openai/codex',
    bash: `export NEW_API_KEY="sk-xxx"
codex --profile newapi`,
    powershell: `$env:NEW_API_KEY="sk-xxx"
codex --profile newapi`,
    persistLabel: '~/.codex/config.toml',
    persist: `model = "gpt-5-codex"
model_provider = "newapi"

[model_providers.newapi]
name = "New API Gateway"
base_url = "https://api.example.com/v1"
wire_api = "responses"
env_key = "NEW_API_KEY"

[profiles.newapi]
model_provider = "newapi"
model = "gpt-5-codex"`,
    verify: 'Usage logs should show /v1/responses.',
  },
]

const troubleshootingRows = [
  {
    error: '401 / token invalid',
    cause: 'The API key is wrong, disabled, expired, or not loaded by the shell.',
    fix: 'Re-copy the gateway key and verify the active environment variable.',
  },
  {
    error: '404 /v1/v1/...',
    cause: 'The base URL already contains an API version and the client appended another one.',
    fix: 'Use the root URL for Claude and Gemini, and the /v1 URL for Codex.',
  },
  {
    error: 'Gemini still calls Google',
    cause: 'The custom Gemini base URL is missing or overridden by an older local env file.',
    fix: 'Check the current shell and ~/.gemini/.env before restarting Gemini CLI.',
  },
  {
    error: 'Stream disconnected',
    cause: 'The upstream channel is unstable or a long session switched channels mid-task.',
    fix: 'Enable Channel Affinity and review upstream health in the channel list.',
  },
]

const acceptanceItems = [
  'Claude Code completes one request through /v1/messages.',
  'Gemini CLI completes one request through /v1beta/models/{model}:generateContent.',
  'Codex CLI completes one request through /v1/responses.',
  'Usage logs record user key, model, channel, tokens, and status.',
  'Channel Affinity keeps repeated agent turns on a successful upstream channel.',
]

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className='bg-muted/60 border-border/70 overflow-x-auto rounded-lg border p-4 text-xs leading-relaxed'>
      <code>{children}</code>
    </pre>
  )
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  const { t } = useTranslation()

  return (
    <div className='space-y-2'>
      {eyebrow && (
        <div className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
          {t(eyebrow)}
        </div>
      )}
      <h2 className='text-2xl font-semibold tracking-tight'>{t(title)}</h2>
      {description && (
        <p className='text-muted-foreground max-w-3xl leading-7'>
          {t(description)}
        </p>
      )}
    </div>
  )
}

function DocsPage() {
  const { t } = useTranslation()

  return (
    <PublicLayout showMainContainer={false}>
      <main className='mx-auto grid w-full max-w-7xl grid-cols-1 gap-8 px-4 pt-24 pb-16 md:px-6 lg:grid-cols-[230px_minmax(0,1fr)_230px]'>
        <aside className='hidden lg:block'>
          <nav className='sticky top-24 space-y-1'>
            {sidebarSections.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className='text-muted-foreground hover:bg-muted hover:text-foreground block rounded-md px-3 py-2 text-sm transition-colors'
              >
                {t(item.key)}
              </a>
            ))}
          </nav>
        </aside>

        <article className='min-w-0 space-y-10'>
          <section id='overview' className='space-y-6 scroll-mt-24'>
            <div className='space-y-4'>
              <Badge variant='secondary' className='gap-1.5'>
                <Terminal className='size-3' />
                {t('CLI Agent Access Guide')}
              </Badge>
              <div className='space-y-3'>
                <h1 className='max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl'>
                  {t('Connect Claude Code, Gemini CLI, and Codex CLI')}
                </h1>
                <p className='text-muted-foreground max-w-3xl text-base leading-7 md:text-lg'>
                  {t(
                    'Use this gateway as the single entry point for terminal AI agents, with unified keys, billing, rate limits, logs, and upstream routing.'
                  )}
                </p>
              </div>
              <div className='flex flex-wrap gap-3'>
                <Button render={<a href='#gateway-setup' />}>
                  {t('Start with gateway setup')}
                  <ArrowRight className='size-4' />
                </Button>
                <Button variant='outline' render={<Link to='/dashboard' />}>
                  {t('Open Console')}
                </Button>
              </div>
            </div>
            <div className='grid gap-3 md:grid-cols-3'>
              {outcomeCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.title} className='rounded-lg'>
                    <CardHeader>
                      <div className='bg-muted mb-2 flex size-9 items-center justify-center rounded-md'>
                        <Icon className='size-4' />
                      </div>
                      <CardTitle>{t(card.title)}</CardTitle>
                      <CardDescription>{t(card.description)}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </section>

          <Separator />

          <section id='gateway-setup' className='space-y-5 scroll-mt-24'>
            <SectionHeader
              eyebrow='Admin workflow'
              title='Gateway Setup'
              description='Prepare channels, model mappings, developer keys, and sticky routing before sharing CLI snippets with users.'
            />
            <div className='grid gap-3 md:grid-cols-2'>
              {gatewaySteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <Card key={step.title} className='rounded-lg'>
                    <CardHeader>
                      <div className='bg-muted mb-2 flex size-9 items-center justify-center rounded-md'>
                        <Icon className='size-4' />
                      </div>
                      <CardTitle>
                        {index + 1}. {t(step.title)}
                      </CardTitle>
                      <CardDescription>{t(step.description)}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Client')}</TableHead>
                    <TableHead>{t('Gateway Path')}</TableHead>
                    <TableHead>{t('Auth Header')}</TableHead>
                    <TableHead>{t('Base URL Rule')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpointRows.map((row) => (
                    <TableRow key={row.client}>
                      <TableCell className='font-medium'>{row.client}</TableCell>
                      <TableCell>
                        <code className='text-xs'>{row.path}</code>
                      </TableCell>
                      <TableCell>
                        <code className='text-xs'>{row.auth}</code>
                      </TableCell>
                      <TableCell>
                        <code className='text-xs'>{row.baseUrl}</code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section id='preflight' className='space-y-5 scroll-mt-24'>
            <SectionHeader
              eyebrow='Developer check'
              title='Preflight Checks'
              description='Verify the gateway key and route before opening a long-running CLI agent session.'
            />
            <div className='grid gap-4 xl:grid-cols-3'>
              <div className='space-y-2'>
                <h3 className='font-medium'>{t('OpenAI Responses')}</h3>
                <CodeBlock>{`curl "$NEW_API_BASE_URL/v1/responses" \\
  -H "Authorization: Bearer $NEW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5-codex","input":"Reply with OK."}'`}</CodeBlock>
              </div>
              <div className='space-y-2'>
                <h3 className='font-medium'>{t('Claude Messages')}</h3>
                <CodeBlock>{`curl "$NEW_API_BASE_URL/v1/messages" \\
  -H "x-api-key: $NEW_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"claude-3-7-sonnet-20250219-thinking","max_tokens":64,"messages":[{"role":"user","content":"Reply with OK."}]}'`}</CodeBlock>
              </div>
              <div className='space-y-2'>
                <h3 className='font-medium'>{t('Gemini Generate Content')}</h3>
                <CodeBlock>{`curl "$NEW_API_BASE_URL/v1beta/models/gemini-2.5-flash:generateContent" \\
  -H "x-goog-api-key: $NEW_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"contents":[{"parts":[{"text":"Reply with OK."}]}]}'`}</CodeBlock>
              </div>
            </div>
          </section>

          {toolSections.map((tool) => (
            <section key={tool.id} id={tool.id} className='space-y-5 scroll-mt-24'>
              <SectionHeader
                eyebrow='CLI setup'
                title={tool.title}
                description={tool.description}
              />
              <div className='grid gap-4 xl:grid-cols-2'>
                <Card className='rounded-lg'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Code2 className='size-4' />
                      {t('Install')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock>{tool.install}</CodeBlock>
                  </CardContent>
                </Card>
                <Card className='rounded-lg'>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <ClipboardCheck className='size-4' />
                      {t('Expected log route')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className='text-muted-foreground text-sm'>
                      {t(tool.verify)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className='grid gap-4 xl:grid-cols-2'>
                <div className='space-y-2'>
                  <h3 className='font-medium'>Bash</h3>
                  <CodeBlock>{tool.bash}</CodeBlock>
                </div>
                <div className='space-y-2'>
                  <h3 className='font-medium'>PowerShell</h3>
                  <CodeBlock>{tool.powershell}</CodeBlock>
                </div>
              </div>
              <div className='space-y-2'>
                <h3 className='font-medium'>
                  {t('Persistent config')}: <code>{tool.persistLabel}</code>
                </h3>
                <CodeBlock>{tool.persist}</CodeBlock>
              </div>
            </section>
          ))}

          <section id='cc-switch' className='space-y-5 scroll-mt-24'>
            <SectionHeader
              eyebrow='Config switching'
              title='CC Switch'
              description='Use CC Switch style tools to manage multiple local profiles while the gateway remains the billing and audit boundary.'
            />
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Provider Field')}</TableHead>
                    <TableHead>Claude Code</TableHead>
                    <TableHead>Gemini CLI</TableHead>
                    <TableHead>Codex CLI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>{t('Base URL')}</TableCell>
                    <TableCell>
                      <code className='text-xs'>https://api.example.com</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>https://api.example.com</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>https://api.example.com/v1</code>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('API Key')}</TableCell>
                    <TableCell>
                      <code className='text-xs'>sk-xxx</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>sk-xxx</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>sk-xxx</code>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('Model')}</TableCell>
                    <TableCell>
                      <code className='text-xs'>claude-*</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>gemini-*</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>gpt-*-codex</code>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>{t('Config target')}</TableCell>
                    <TableCell>
                      <code className='text-xs'>~/.claude/settings.json</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>~/.gemini/.env</code>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>~/.codex/config.toml</code>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <Card className='rounded-lg'>
                <CardHeader>
                  <CardTitle>{t('Direct config mode')}</CardTitle>
                  <CardDescription>
                    {t(
                      'Switch the profile, then restart the active Claude, Gemini, or Codex session.'
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className='rounded-lg'>
                <CardHeader>
                  <CardTitle>{t('Local router mode')}</CardTitle>
                  <CardDescription>
                    {t(
                      'Point each CLI to a local 127.0.0.1 route, then let CC Switch forward to the gateway upstream.'
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>

          <section id='troubleshooting' className='space-y-5 scroll-mt-24'>
            <SectionHeader
              eyebrow='Operations'
              title='Troubleshooting'
              description='Most CLI connection failures come from key loading, duplicated URL versions, or upstream route mismatch.'
            />
            <div className='overflow-x-auto rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Error')}</TableHead>
                    <TableHead>{t('Likely cause')}</TableHead>
                    <TableHead>{t('Fix')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {troubleshootingRows.map((row) => (
                    <TableRow key={row.error}>
                      <TableCell className='font-medium'>
                        <code className='text-xs'>{row.error}</code>
                      </TableCell>
                      <TableCell>{t(row.cause)}</TableCell>
                      <TableCell>{t(row.fix)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section id='acceptance' className='space-y-5 scroll-mt-24'>
            <SectionHeader
              eyebrow='Release checklist'
              title='Acceptance'
              description='Use this checklist before publishing the tutorial to users or support teams.'
            />
            <div className='grid gap-3'>
              {acceptanceItems.map((item) => (
                <div
                  key={item}
                  className='border-border flex items-start gap-3 rounded-lg border p-4'
                >
                  <CheckCircle2 className='text-primary mt-0.5 size-4 shrink-0' />
                  <span className='text-sm'>{t(item)}</span>
                </div>
              ))}
            </div>
          </section>
        </article>

        <aside className='hidden xl:block'>
          <div className='sticky top-24 space-y-3 text-sm'>
            <div className='text-muted-foreground flex items-center gap-2 font-medium'>
              <BookOpen className='size-4' />
              {t('On this page')}
            </div>
            <div className='border-border space-y-2 border-l pl-4'>
              {sidebarSections.slice(1).map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className='text-muted-foreground hover:text-foreground block transition-colors'
                >
                  {t(item.key)}
                </a>
              ))}
            </div>
            <div className='bg-muted/50 space-y-2 rounded-lg p-3'>
              <div className='flex items-center gap-2 font-medium'>
                <ServerCog className='size-4' />
                {t('Gateway base')}
              </div>
              <code className='text-muted-foreground block text-xs'>
                https://api.example.com
              </code>
              <code className='text-muted-foreground block text-xs'>
                https://api.example.com/v1
              </code>
            </div>
            <div className='bg-muted/50 space-y-2 rounded-lg p-3'>
              <div className='flex items-center gap-2 font-medium'>
                <ShieldCheck className='size-4' />
                {t('Safety note')}
              </div>
              <p className='text-muted-foreground text-xs leading-5'>
                {t('Never publish real API keys in docs, repos, or screenshots.')}
              </p>
            </div>
            <div className='bg-muted/50 space-y-2 rounded-lg p-3'>
              <div className='flex items-center gap-2 font-medium'>
                <TriangleAlert className='size-4' />
                {t('Common pitfall')}
              </div>
              <p className='text-muted-foreground text-xs leading-5'>
                {t('Do not add /v1 to Claude or Gemini base URLs.')}
              </p>
            </div>
            <div className='bg-muted/50 space-y-2 rounded-lg p-3'>
              <div className='flex items-center gap-2 font-medium'>
                <Wrench className='size-4' />
                {t('Need deeper specs?')}
              </div>
              <p className='text-muted-foreground text-xs leading-5'>
                {t(
                  'See the AI CLI Agent access tutorial PRD in the docs directory.'
                )}
              </p>
            </div>
          </div>
        </aside>
      </main>
    </PublicLayout>
  )
}

export const Route = createFileRoute('/docs/')({
  component: DocsPage,
})
