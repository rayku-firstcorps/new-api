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
import { CheckCircle2, Loader2, Send, XCircle } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import {
  sendTestChatCompletion,
  type TestFailureKind,
  type TestRequestResult,
} from '../lib/test-request'

interface FailureCopy {
  title: string
  hint: string
}

const FAILURE_COPY: Record<TestFailureKind, FailureCopy> = {
  invalid_key: {
    title: 'The API key was rejected',
    hint: 'Go back one step and create or pick another key.',
  },
  insufficient_quota: {
    title: 'Not enough balance',
    hint: 'Top up your balance, then send the test again.',
  },
  model_unavailable: {
    title: 'This model is not available',
    hint: 'Pick another model above, or ask the administrator to enable one for your group.',
  },
  rate_limited: {
    title: 'Too many requests',
    hint: 'Wait a moment and send the test again.',
  },
  network: {
    title: 'Could not reach the gateway',
    hint: 'Check your connection and try again.',
  },
  unknown: {
    title: 'The test request failed',
    hint: 'Check the details below or look at your usage logs.',
  },
}

interface TestRequestBlockProps {
  /** Full `sk-...` key, memory only. Undefined while it is still loading. */
  apiKey?: string
  model: string
  /** Self-use sites have no wallet, so a quota failure must not point at top-up. */
  selfUseMode?: boolean
  /** Called once per successful test. */
  onSuccess: () => void
}

/**
 * Sends one minimal chat completion with the user's own key through the
 * regular relay and reports success/failure, latency and a reply preview.
 */
export function TestRequestBlock(props: TestRequestBlockProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<TestRequestResult | null>(null)
  const inFlightRef = useRef(false)

  const handleSend = async () => {
    if (!props.apiKey || !props.model || inFlightRef.current) return
    inFlightRef.current = true
    setPending(true)
    try {
      const outcome = await sendTestChatCompletion({
        apiKey: props.apiKey,
        model: props.model,
      })
      setResult(outcome)
      if (outcome.ok) props.onSuccess()
    } finally {
      inFlightRef.current = false
      setPending(false)
    }
  }

  const failure = result && !result.ok ? FAILURE_COPY[result.kind] : null

  return (
    <section
      aria-label={t('Test request')}
      className='bg-card space-y-3 rounded-xl border p-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='text-sm font-semibold'>{t('Try it right here')}</h3>
          <p className='text-muted-foreground text-xs'>
            {t(
              'Sends one short message with your key. It uses a tiny amount of balance.'
            )}
          </p>
        </div>
        <Button
          type='button'
          onClick={handleSend}
          disabled={pending || !props.apiKey || !props.model}
        >
          {pending ? (
            <Loader2 className='size-4 animate-spin' aria-hidden />
          ) : (
            <Send className='size-4' aria-hidden />
          )}
          {t('Send test request')}
        </Button>
      </div>

      {result?.ok && (
        <Alert>
          <CheckCircle2 className='text-success' aria-hidden />
          <AlertTitle>{t('Your first request worked')}</AlertTitle>
          <AlertDescription>
            <p>{t('Responded in {{ms}} ms', { ms: result.latencyMs })}</p>
            <p className='text-foreground mt-1 font-mono text-xs break-words'>
              {result.reply || t('The reply had no text.')}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {result && !result.ok && failure && (
        <Alert variant='destructive'>
          <XCircle aria-hidden />
          <AlertTitle>{t(failure.title)}</AlertTitle>
          <AlertDescription>
            <p>
              {t(
                result.kind === 'insufficient_quota' && props.selfUseMode
                  ? 'Ask the administrator to raise your quota, then send the test again.'
                  : failure.hint
              )}
            </p>
            {result.detail && (
              <p className='mt-1 font-mono text-xs break-words'>
                {result.detail}
              </p>
            )}
            {result.kind === 'insufficient_quota' && !props.selfUseMode && (
              <Button
                variant='outline'
                size='sm'
                className='mt-2'
                render={<Link to='/wallet' />}
              >
                {t('Top up')}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </section>
  )
}
