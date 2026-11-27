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
import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { getUserModels } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { useOnboardingProgress } from '../hooks/use-onboarding-progress'
import type { OnboardingFlags } from '../lib/availability'
import { pickRecommendedModel } from '../lib/models'
import type { OnboardingConnectStepProps } from '../types'
import { ApiConnect } from './api-connect'
import { CodingConnect } from './coding-connect'
import { ModelField } from './model-field'
import { PlaygroundConnect } from './playground-connect'

type ConnectStepProps = OnboardingConnectStepProps & {
  flags: OnboardingFlags
  /** Returns to Step 2 (used when no key has been selected yet). */
  onBack: () => void
}

/**
 * Step 3: connection guide for the chosen use case. The full key arrives as
 * `selectedKey.fullKey` and is only used for in-memory rendering, copying and
 * the test request.
 */
export function ConnectStep(props: ConnectStepProps) {
  const { t } = useTranslation()
  const progress = useOnboardingProgress()
  const [pickedModel, setPickedModel] = useState('')

  const modelsQuery = useQuery({
    queryKey: ['onboarding', 'user-models'],
    queryFn: async () => requireServerSuccess(await getUserModels()),
    staleTime: 5 * 60 * 1000,
  })
  const models = modelsQuery.data?.data ?? []
  const model = pickedModel || pickRecommendedModel(models, props.useCase)
  const selectedKey = props.selectedKey

  if (!selectedKey) {
    return (
      <Alert data-use-case={props.useCase}>
        <KeyRound aria-hidden />
        <AlertTitle>{t('Create an API key first')}</AlertTitle>
        <AlertDescription>
          <p>
            {t(
              'The examples need an API key. Go back one step to create or pick one.'
            )}
          </p>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='mt-2'
            onClick={props.onBack}
          >
            {t('Back to API key')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className='space-y-4' data-use-case={props.useCase}>
      <p className='text-muted-foreground text-sm'>
        {t('Using key')}:{' '}
        <span className='text-foreground'>{selectedKey.name}</span>{' '}
        <code className='text-xs'>{selectedKey.maskedKey}</code>
      </p>

      {props.useCase !== 'coding' && (
        <ModelField models={models} value={model} onChange={setPickedModel} />
      )}

      {props.useCase === 'coding' && (
        <CodingConnect
          selectedKey={selectedKey}
          ccSwitchEnabled={props.flags.ccSwitch}
          model={model}
        />
      )}
      {props.useCase === 'api' && (
        <ApiConnect
          flags={props.flags}
          selectedKey={selectedKey}
          model={model}
          onTestSuccess={() => void progress.complete(props.useCase)}
        />
      )}
      {props.useCase === 'playground' && (
        <PlaygroundConnect selectedKey={selectedKey} model={model} />
      )}
    </div>
  )
}
