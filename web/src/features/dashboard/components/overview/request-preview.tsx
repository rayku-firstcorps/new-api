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
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Terminal, TerminalSquare } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CodeSnippetTabs,
  type CodeSnippet,
} from '@/components/code-snippet-tabs'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/icon-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  HeroSignal,
  RequestExample,
} from '@/features/dashboard/lib/setup-guide'
import { fetchTokenKey } from '@/features/keys/api'
import { CCSwitchDialog } from '@/features/keys/components/dialogs/cc-switch-dialog'
import { readOnboardingFlags } from '@/features/onboarding/lib/availability'
import { useStatus } from '@/hooks/use-status'
import { buildConnectSnippets } from '@/lib/connect-snippets'
import { MOTION_TRANSITION } from '@/lib/motion'

const CC_SWITCH_TAB = 'cc-switch'
const CHAT_COMPLETIONS_SUFFIX = /\/v1\/chat\/completions$/

export function RequestPreview(props: {
  example: RequestExample
  signals: HeroSignal[]
}) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const { status } = useStatus()
  const showCcSwitch =
    props.example.ready && readOnboardingFlags(status).ccSwitch
  const [ccSwitchOpen, setCcSwitchOpen] = useState(false)

  // The full key lives in query memory only (never persisted) and is dropped on unmount.
  const fullKeyQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'full-key', props.example.keyId],
    queryFn: async () => {
      const result = await fetchTokenKey(props.example.keyId as number)
      return result.success && result.data?.key ? `sk-${result.data.key}` : ''
    },
    enabled: Boolean(props.example.ready && props.example.keyId),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    meta: { errorToast: false },
  })
  const fullKey = fullKeyQuery.data || undefined

  const snippets = useMemo<CodeSnippet[]>(() => {
    const all = buildConnectSnippets({
      baseUrl: props.example.endpoint.replace(CHAT_COMPLETIONS_SUFFIX, ''),
      model: props.example.model,
      displayKey: props.example.displayKey,
      copyKey: fullKey,
    })
    return all.filter((item) => item.id === 'curl' || item.id === 'python')
  }, [
    fullKey,
    props.example.displayKey,
    props.example.endpoint,
    props.example.model,
  ])

  const copyDisabled = !props.example.ready || !fullKey

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
      transition={MOTION_TRANSITION.slow}
      className='bg-background relative min-w-0 overflow-hidden rounded-xl border p-3'
    >
      {!shouldReduceMotion && (
        <motion.div
          className='via-foreground/30 pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent to-transparent'
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden='true'
        />
      )}
      <div className='flex items-center justify-between gap-3 border-b pb-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <IconBadge tone='neutral'>
            <TerminalSquare />
          </IconBadge>
          <div className='min-w-0'>
            <div className='line-clamp-1 text-sm font-medium'>
              {t('First API request')}
            </div>
            <div className='text-muted-foreground line-clamp-1 text-xs'>
              {props.example.ready
                ? props.example.keyName
                : t('Create an API key to unlock the real request')}
            </div>
          </div>
        </div>
        {!props.example.ready && (
          <Button size='sm' variant='outline' render={<Link to='/keys' />}>
            {t('Create API Key')}
          </Button>
        )}
      </div>

      <Tabs
        defaultValue={showCcSwitch ? CC_SWITCH_TAB : 'curl'}
        className='my-3 min-w-0'
      >
        <TabsList className='h-auto max-w-full flex-wrap justify-start'>
          {showCcSwitch && (
            <TabsTrigger value={CC_SWITCH_TAB}>{t('CC Switch')}</TabsTrigger>
          )}
          {snippets.map((snippet) => (
            <TabsTrigger key={snippet.id} value={snippet.id}>
              {snippet.id === 'python' ? 'Python' : snippet.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {showCcSwitch && (
          <TabsContent value={CC_SWITCH_TAB}>
            <div className='bg-muted/30 flex flex-col items-start gap-2 rounded-xl border p-3'>
              <p className='text-muted-foreground text-xs'>
                {t('Your gateway address and API key are filled in for you.')}
              </p>
              <Button
                size='sm'
                disabled={!fullKey}
                onClick={() => setCcSwitchOpen(true)}
              >
                <Terminal data-icon='inline-start' />
                {t('Import to CC Switch')}
              </Button>
            </div>
          </TabsContent>
        )}
        {snippets.map((snippet) => (
          <TabsContent key={snippet.id} value={snippet.id}>
            <CodeSnippetTabs snippets={[snippet]} copyDisabled={copyDisabled} />
          </TabsContent>
        ))}
      </Tabs>

      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <Button
          size='sm'
          variant='outline'
          render={
            <Link to='/playground' search={{ model: props.example.model }} />
          }
        >
          {t('Test in Playground')}
        </Button>
        <Button size='sm' variant='ghost' render={<Link to='/docs' />}>
          {t('Open the full setup guide')}
        </Button>
      </div>

      <div className='grid gap-2'>
        {props.signals.map((signal) => {
          const Icon = signal.icon
          return (
            <div
              key={signal.label}
              className='bg-muted/40 flex items-center justify-between gap-3 rounded-lg px-3 py-2'
            >
              <span className='flex min-w-0 items-center gap-2'>
                <IconBadge tone='neutral' size='xs'>
                  <Icon />
                </IconBadge>
                <span className='line-clamp-1 text-xs font-medium'>
                  {signal.label}
                </span>
              </span>
              <span className='text-muted-foreground shrink-0 text-xs'>
                {signal.value}
              </span>
            </div>
          )
        })}
      </div>

      {showCcSwitch && (
        <CCSwitchDialog
          open={ccSwitchOpen}
          onOpenChange={setCcSwitchOpen}
          tokenKey={fullKey ?? ''}
        />
      )}
    </motion.div>
  )
}
