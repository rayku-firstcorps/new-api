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
import { DASHBOARD_DEFAULT_SECTION } from '@/features/dashboard/section-registry'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { trackFeature } from '@/lib/analytics'
import { useAuthStore } from '@/stores/auth-store'

import { AdminChannelStep } from './components/admin/channel-step'
import { AdminForwardStep } from './components/admin/forward-step'
import { AdminReadinessStep } from './components/admin/readiness-step'
import { useOnboardingProgress } from './hooks/use-onboarding-progress'
import {
  isAdminOnboardingAvailable,
  readOnboardingFlags,
} from './lib/availability'
import type { OnboardingSelectedKey } from './types'

const ADMIN_ONBOARDING_STEP = {
  CHANNEL: 0,
  READINESS: 1,
  FORWARD: 2,
} as const

const STEPS: WizardStep[] = [
  {
    titleKey: 'Add a channel',
    descriptionKey: 'Connect your first upstream provider',
  },
  {
    titleKey: 'Check models',
    descriptionKey: 'Confirm models are ready',
  },
  {
    titleKey: 'Test forwarding',
    descriptionKey: 'Create a key and send a request',
  },
]

const CARD_TITLES = [
  'Add your first upstream channel',
  'Check available models and connectivity',
  'Create a key and test forwarding',
]

interface AdminOnboardingWizardProps {
  /** Step to resume at (from `/onboarding?step=`), clamped to the valid range. */
  initialStep?: number
}

/**
 * Admin First Setup wizard (`/onboarding` for administrators). Progress is
 * shared with the user wizard through `useOnboardingProgress`.
 */
export function AdminOnboardingWizard(props: AdminOnboardingWizardProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()
  const { status } = useStatus()
  const user = useAuthStore((state) => state.auth.user)
  const progress = useOnboardingProgress()
  const flags = readOnboardingFlags(status)

  const [step, setStep] = useState(() =>
    Math.min(
      Math.max(props.initialStep ?? ADMIN_ONBOARDING_STEP.CHANNEL, 0),
      STEPS.length - 1
    )
  )
  const [selectedKey, setSelectedKey] = useState<OnboardingSelectedKey | null>(
    null
  )
  const [finishing, setFinishing] = useState(false)

  const navigateToOverview = (
    <Navigate
      to='/dashboard/$section'
      params={{ section: DASHBOARD_DEFAULT_SECTION }}
      replace
    />
  )

  if (status && !isAdminOnboardingAvailable(flags, user)) {
    return navigateToOverview
  }
  if (finishing) return navigateToOverview

  const handleSkip = async () => {
    trackFeature('onboarding.skip', { step })
    await progress.skip()
    setFinishing(true)
  }
  const handleFinish = async () => {
    trackFeature('onboarding.step_complete', { step })
    setFinishing(true)
    await progress.complete('api')
  }

  return (
    <WizardShell
      steps={STEPS}
      currentStep={step}
      title={t('Welcome to {{name}}', { name: systemName })}
      description={t('Set up your first channel and make a test request')}
      cardTitle={t(CARD_TITLES[step])}
      logo={logo}
      brandLoading={loading}
      onSkip={handleSkip}
      skipLabel={t('Skip, go to console')}
      footer={
        <StepNavigation
          currentStep={step}
          totalSteps={STEPS.length}
          onBack={() => setStep(step - 1)}
          onNext={() => {
            trackFeature('onboarding.step_complete', { step })
            setStep(step + 1)
          }}
          onSubmit={handleFinish}
          submitLabel={t('Finish and open console')}
        />
      }
    >
      {step === ADMIN_ONBOARDING_STEP.CHANNEL && <AdminChannelStep />}
      {step === ADMIN_ONBOARDING_STEP.READINESS && <AdminReadinessStep />}
      {step === ADMIN_ONBOARDING_STEP.FORWARD && (
        <AdminForwardStep
          flags={flags}
          selectedKey={selectedKey}
          onSelectKey={setSelectedKey}
        />
      )}
    </WizardShell>
  )
}
