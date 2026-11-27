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
import { Navigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StepNavigation } from '@/components/wizard/step-navigation'
import { WizardShell, type WizardStep } from '@/components/wizard/wizard-shell'
import type { OnboardingUseCase } from '@/features/auth/types'
import { DASHBOARD_DEFAULT_SECTION } from '@/features/dashboard/section-registry'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useAuthStore } from '@/stores/auth-store'

import { ConnectStep } from './components/connect-step'
import { CredentialsStep } from './components/credentials-step'
import { UseCaseStep } from './components/use-case-step'
import { useOnboardingProgress } from './hooks/use-onboarding-progress'
import {
  isUserOnboardingAvailable,
  readOnboardingFlags,
} from './lib/availability'
import { readUserOnboardingSetting } from './lib/progress'
import {
  ONBOARDING_STEP,
  type OnboardingSelectedKey,
  type OnboardingWizardState,
} from './types'

const STEPS: WizardStep[] = [
  {
    titleKey: 'Choose how to use',
    descriptionKey: 'Tell us what you want to do',
  },
  {
    titleKey: 'Credits & API key',
    descriptionKey: 'Get a key you can use right away',
  },
  {
    titleKey: 'Connect & test',
    descriptionKey: 'Make your first request',
  },
]

const CARD_TITLES = [
  'How do you plan to use the platform?',
  'Prepare credits and an API key',
  'Connect and make your first call',
]

/**
 * User First Setup wizard (`/onboarding`).
 *
 * Extension points: Step 3 is `components/connect-step.tsx` and receives
 * `{ useCase, selectedKey }` from this component's `OnboardingWizardState`.
 */
export function OnboardingWizard() {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const { status } = useStatus()
  const user = useAuthStore((state) => state.auth.user)
  const progress = useOnboardingProgress()
  const flags = readOnboardingFlags(status)

  const [state, setState] = useState<OnboardingWizardState>(() => ({
    step: ONBOARDING_STEP.USE_CASE,
    useCase: readUserOnboardingSetting(user).useCase ?? 'coding',
    selectedKey: null,
  }))
  const [finishing, setFinishing] = useState(false)
  const navigateToOverview = (
    <Navigate
      to='/dashboard/$section'
      params={{ section: DASHBOARD_DEFAULT_SECTION }}
      replace
    />
  )

  // Status is cached from the first paint; only redirect once it is known.
  if (status && !isUserOnboardingAvailable(flags, user)) {
    return navigateToOverview
  }

  const setUseCase = (useCase: OnboardingUseCase) =>
    setState((prev) => ({ ...prev, useCase }))
  const setSelectedKey = (selectedKey: OnboardingSelectedKey) =>
    setState((prev) => ({ ...prev, selectedKey }))
  const goToStep = (step: number) => setState((prev) => ({ ...prev, step }))

  const handleNext = () => {
    if (state.step === ONBOARDING_STEP.USE_CASE) {
      void progress.saveUseCase(state.useCase)
    }
    goToStep(state.step + 1)
  }

  const handleSkip = async () => {
    await progress.skip()
    setFinishing(true)
  }

  const handleFinish = async () => {
    setFinishing(true)
    await progress.complete(state.useCase)
  }

  if (finishing) return navigateToOverview

  return (
    <WizardShell
      steps={STEPS}
      currentStep={state.step}
      title={t('Welcome to {{name}}', { name: systemName })}
      description={t('Three quick steps to make your first AI request')}
      cardTitle={t(CARD_TITLES[state.step])}
      logo={logo}
      brandLoading={loading}
      onSkip={handleSkip}
      skipLabel={t('Skip, go to console')}
      footer={
        <StepNavigation
          currentStep={state.step}
          totalSteps={STEPS.length}
          onBack={() => goToStep(state.step - 1)}
          onNext={handleNext}
          onSubmit={handleFinish}
          submitLabel={t('Finish and open console')}
        />
      }
    >
      {state.step === ONBOARDING_STEP.USE_CASE && (
        <UseCaseStep
          value={state.useCase}
          onChange={setUseCase}
          ccSwitchEnabled={flags.ccSwitch}
        />
      )}
      {state.step === ONBOARDING_STEP.CREDENTIALS && (
        <CredentialsStep
          flags={flags}
          useCase={state.useCase}
          selectedKey={state.selectedKey}
          onSelectKey={setSelectedKey}
        />
      )}
      {state.step === ONBOARDING_STEP.CONNECT && (
        <ConnectStep
          useCase={state.useCase}
          selectedKey={state.selectedKey}
          flags={flags}
          onBack={() => goToStep(ONBOARDING_STEP.CREDENTIALS)}
        />
      )}
    </WizardShell>
  )
}
