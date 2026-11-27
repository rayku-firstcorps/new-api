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
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getChannels, testChannel } from '@/features/channels/api'
import { getUserModels } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

const ENABLED_CHANNEL_STATUS = 1

type TestState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'ok' }
  | { kind: 'failed'; message: string }

interface StatTileProps {
  label: string
  value: number
}

function StatTile(props: StatTileProps) {
  return (
    <div className='bg-card rounded-xl border p-4'>
      <p className='text-muted-foreground text-xs'>{props.label}</p>
      <p className='text-2xl font-semibold tabular-nums'>{props.value}</p>
    </div>
  )
}

/** Admin Step 2: channel and model counts, with repair hints and an optional channel test. */
export function AdminReadinessStep() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [test, setTest] = useState<TestState>({ kind: 'idle' })

  const channelsQuery = useQuery({
    queryKey: ['onboarding', 'admin-channels'],
    queryFn: async () =>
      requireServerSuccess(await getChannels({ p: 1, page_size: 100 })),
    retry: false,
    staleTime: 0,
  })
  const modelsQuery = useQuery({
    queryKey: ['onboarding', 'user-models'],
    queryFn: async () => requireServerSuccess(await getUserModels()),
    retry: false,
    staleTime: 0,
  })

  if (channelsQuery.isLoading || modelsQuery.isLoading) {
    return (
      <p className='text-muted-foreground flex items-center gap-2 text-sm'>
        <Loader2 className='size-4 animate-spin' aria-hidden />
        {t('Checking channels and models...')}
      </p>
    )
  }

  const items = channelsQuery.data?.data?.items ?? []
  const channelCount = channelsQuery.data?.data?.total ?? items.length
  const enabled = items.filter(
    (channel) => channel.status === ENABLED_CHANNEL_STATUS
  )
  const modelCount = modelsQuery.data?.data?.length ?? 0
  const loadFailed = channelsQuery.isError || modelsQuery.isError

  const handleTest = async () => {
    const target = enabled[0]
    if (!target) return
    setTest({ kind: 'pending' })
    try {
      const result = await testChannel(target.id)
      if (result.success) {
        setTest({ kind: 'ok' })
        return
      }
      setTest({
        kind: 'failed',
        message: result.message || result.data?.error || '',
      })
    } catch {
      setTest({ kind: 'failed', message: '' })
    }
  }

  let repair = null
  if (loadFailed) {
    repair = (
      <Alert variant='destructive'>
        <TriangleAlert aria-hidden />
        <AlertTitle>{t('Could not load the channel status')}</AlertTitle>
        <AlertDescription>
          {t('Reload this page or check the Channels page directly.')}
        </AlertDescription>
      </Alert>
    )
  } else if (channelCount === 0) {
    repair = (
      <Alert variant='destructive'>
        <TriangleAlert aria-hidden />
        <AlertTitle>{t('No channel yet')}</AlertTitle>
        <AlertDescription>
          <p>{t('Add a channel first, then the models will show up here.')}</p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() =>
              void navigate({ to: '/onboarding', search: { step: 0 } })
            }
          >
            {t('Back to add a channel')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  } else if (modelCount === 0) {
    repair = (
      <Alert variant='destructive'>
        <TriangleAlert aria-hidden />
        <AlertTitle>{t('No models available yet')}</AlertTitle>
        <AlertDescription>
          <p>
            {t(
              'Make sure the channel is enabled, lists at least one model, and its group matches yours.'
            )}
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={() =>
              void navigate({
                to: '/channels',
                search: { onboarding: 'channel' },
              })
            }
          >
            {t('Open channels')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className='space-y-4'>
      <div className='grid gap-3 sm:grid-cols-3'>
        <StatTile label={t('Channels')} value={channelCount} />
        <StatTile label={t('Enabled channels')} value={enabled.length} />
        <StatTile label={t('Available models')} value={modelCount} />
      </div>
      {repair}
      {!repair && (
        <section
          aria-label={t('Channel connectivity')}
          className='bg-card space-y-3 rounded-xl border p-4'
        >
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-muted-foreground text-xs'>
              {t(
                'Optional: test the first enabled channel against its upstream.'
              )}
            </p>
            <Button
              type='button'
              variant='outline'
              onClick={handleTest}
              disabled={test.kind === 'pending' || enabled.length === 0}
            >
              {test.kind === 'pending' && (
                <Loader2 className='size-4 animate-spin' aria-hidden />
              )}
              {t('Test channel')}
            </Button>
          </div>
          {test.kind === 'ok' && (
            <Alert>
              <CheckCircle2 className='text-success' aria-hidden />
              <AlertTitle>{t('The channel responded')}</AlertTitle>
            </Alert>
          )}
          {test.kind === 'failed' && (
            <Alert variant='destructive'>
              <TriangleAlert aria-hidden />
              <AlertTitle>{t('The channel test failed')}</AlertTitle>
              {test.message && (
                <AlertDescription>{test.message}</AlertDescription>
              )}
            </Alert>
          )}
        </section>
      )}
    </div>
  )
}
