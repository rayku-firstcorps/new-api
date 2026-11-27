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
import { Code2, FlaskConical, TerminalSquare } from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { OnboardingUseCase } from '@/features/auth/types'
import { cn } from '@/lib/utils'

import { isOnboardingUseCase } from '../lib/progress'

interface UseCaseStepProps {
  value: OnboardingUseCase
  onChange: (value: OnboardingUseCase) => void
  /** When false, card 1 describes generic client setup instead of CC Switch. */
  ccSwitchEnabled: boolean
}

interface UseCaseOption {
  value: OnboardingUseCase
  titleKey: string
  descriptionKey: string
  icon: ComponentType<{ className?: string }>
}

function getUseCaseOptions(ccSwitchEnabled: boolean): UseCaseOption[] {
  return [
    {
      value: 'coding',
      titleKey: 'AI coding / clients',
      descriptionKey: ccSwitchEnabled
        ? 'Claude Code, Codex, Gemini and CC Switch with one-click import.'
        : 'Connect Claude Code, Codex, Gemini or any other AI client.',
      icon: TerminalSquare,
    },
    {
      value: 'api',
      titleKey: 'Code / API integration',
      descriptionKey:
        'Use OpenAI or Anthropic SDKs, or curl, inside your own application.',
      icon: Code2,
    },
    {
      value: 'playground',
      titleKey: 'Try it online first',
      descriptionKey:
        'No local tools needed. Chat with models right in the Playground.',
      icon: FlaskConical,
    },
  ]
}

export function UseCaseStep(props: UseCaseStepProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-3'>
      <Label id='onboarding-use-case-label'>
        {t('How do you plan to use the platform?')}
      </Label>
      <RadioGroup
        value={props.value}
        onValueChange={(value) => {
          if (isOnboardingUseCase(value)) props.onChange(value)
        }}
        aria-labelledby='onboarding-use-case-label'
        className='grid gap-3 sm:grid-cols-3'
      >
        {getUseCaseOptions(props.ccSwitchEnabled).map((option) => (
          <Label
            key={option.value}
            htmlFor={`onboarding-use-case-${option.value}`}
            className={cn(
              'hover:border-primary/40 focus-within:border-primary/50 has-data-[checked]:border-primary has-data-[checked]:ring-primary/20 group bg-card border-muted flex cursor-pointer flex-col gap-3 rounded-xl border p-4 font-normal transition-all has-data-[checked]:ring-2'
            )}
          >
            <div className='flex items-start gap-3'>
              <RadioGroupItem
                id={`onboarding-use-case-${option.value}`}
                value={option.value}
                className='mt-1'
              />
              <div className='min-w-0'>
                <span className='block text-base leading-none font-semibold'>
                  {t(option.titleKey)}
                </span>
                <p className='text-muted-foreground mt-2 text-sm'>
                  {t(option.descriptionKey)}
                </p>
              </div>
              <option.icon className='text-muted-foreground/70 group-hover:text-primary group-has-data-[checked]:text-primary ml-auto size-5 shrink-0 transition' />
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  )
}
