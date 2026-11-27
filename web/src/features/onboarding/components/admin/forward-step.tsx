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
import { useState } from 'react'

import { getUserModels } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { useOnboardingProgress } from '../../hooks/use-onboarding-progress'
import type { OnboardingFlags } from '../../lib/availability'
import { pickRecommendedModel } from '../../lib/models'
import type { OnboardingSelectedKey } from '../../types'
import { ApiKeyBlock } from '../api-key-block'
import { ModelField } from '../model-field'
import { TestRequestBlock } from '../test-request-block'

interface AdminForwardStepProps {
  flags: OnboardingFlags
  selectedKey: OnboardingSelectedKey | null
  onSelectKey: (key: OnboardingSelectedKey) => void
}

/** Admin Step 3: the user wizard's key block and test request, run against the new channel. */
export function AdminForwardStep(props: AdminForwardStepProps) {
  const progress = useOnboardingProgress()
  const [pickedModel, setPickedModel] = useState('')
  const modelsQuery = useQuery({
    queryKey: ['onboarding', 'user-models'],
    queryFn: async () => requireServerSuccess(await getUserModels()),
    staleTime: 5 * 60 * 1000,
  })
  const models = modelsQuery.data?.data ?? []
  const model = pickedModel || pickRecommendedModel(models, 'api')

  return (
    <div className='space-y-4'>
      <ApiKeyBlock
        useCase='api'
        selectedKey={props.selectedKey}
        onSelect={props.onSelectKey}
      />
      {props.selectedKey && (
        <ModelField models={models} value={model} onChange={setPickedModel} />
      )}
      {props.selectedKey && props.flags.inlineTest && (
        <TestRequestBlock
          apiKey={props.selectedKey.fullKey}
          model={model}
          selfUseMode={props.flags.selfUseMode}
          onSuccess={() => void progress.complete('api')}
        />
      )}
    </div>
  )
}
