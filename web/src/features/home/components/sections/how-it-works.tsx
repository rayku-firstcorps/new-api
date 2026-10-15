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
import { BarChart3, ClipboardList, LogIn, PlugZap } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimateInView } from '@/components/animate-in-view'

export function HowItWorks() {
  const { t } = useTranslation()

  const steps = [
    {
      num: '1',
      title: t('Create an account'),
      desc: t('Sign up and enter the console.'),
      icon: <LogIn className='size-6' strokeWidth={1.5} />,
    },
    {
      num: '2',
      title: t('Get connection settings'),
      desc: t('Create a token and choose available models or plans.'),
      icon: <ClipboardList className='size-6' strokeWidth={1.5} />,
    },
    {
      num: '3',
      title: t('Paste into your AI tool'),
      desc: t(
        'Use the configuration in Cherry Studio, Open WebUI, LobeChat, or another supported client.'
      ),
      icon: <PlugZap className='size-6' strokeWidth={1.5} />,
    },
    {
      num: '4',
      title: t('Track usage and cost'),
      desc: t('Check balance, request records, and cost details anytime.'),
      icon: <BarChart3 className='size-6' strokeWidth={1.5} />,
    },
  ]

  return (
    <section
      id='home-how-it-works'
      aria-labelledby='home-steps-title'
      className='home-section border-border border-t px-5 sm:px-8'
    >
      <div className='mx-auto max-w-7xl'>
        <AnimateInView className='mb-10 md:mb-14'>
          <p className='text-primary mb-4 flex items-center gap-3 text-xs font-semibold tracking-widest uppercase'>
            <span className='home-section-number' aria-hidden='true'>
              02 /
            </span>
            {t('How It Works')}
          </p>
          <h2
            id='home-steps-title'
            className='text-3xl font-semibold tracking-tight text-balance md:text-4xl'
          >
            {t('Four steps to start using AI tools')}
          </h2>
        </AnimateInView>

        <ol className='grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10'>
          {steps.map((step, i) => (
            <AnimateInView
              key={step.num}
              as='li'
              delay={i * 120}
              animation='fade-up'
              className='home-step relative flex min-w-0 flex-col border-t pt-6'
            >
              <div
                className='mb-6 flex items-center justify-between'
                aria-hidden='true'
              >
                <div className='text-primary flex size-10 items-center justify-center'>
                  {step.icon}
                </div>
                <span className='home-step-number font-mono text-3xl'>
                  0{step.num}
                </span>
              </div>
              <h3 className='mb-2 text-base font-semibold'>{step.title}</h3>
              <p className='text-muted-foreground max-w-sm text-sm leading-7'>
                {step.desc}
              </p>
            </AnimateInView>
          ))}
        </ol>
      </div>
    </section>
  )
}
