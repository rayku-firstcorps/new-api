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
    <section className='border-border/40 relative z-10 border-t px-6 py-24 md:py-32'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-16 text-center md:mb-20'>
          <p className='text-muted-foreground mb-3 text-xs font-medium tracking-widest uppercase'>
            {t('How It Works')}
          </p>
          <h2 className='text-2xl font-bold tracking-tight md:text-3xl'>
            {t('Four steps to start using AI tools')}
          </h2>
        </AnimateInView>

        <div className='grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6'>
          {steps.map((step, i) => (
            <AnimateInView
              key={step.num}
              delay={i * 120}
              animation='fade-up'
              className='relative flex min-w-0 flex-col items-center text-center'
            >
              <div className='relative mb-6'>
                <div className='text-muted-foreground border-border/50 bg-muted/30 flex size-16 items-center justify-center rounded-2xl border transition-colors'>
                  {step.icon}
                </div>
                <div className='bg-foreground text-background absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full text-xs font-bold'>
                  {step.num}
                </div>
              </div>
              <h3 className='mb-2 text-base font-semibold'>{step.title}</h3>
              <p className='text-muted-foreground max-w-[260px] text-sm leading-relaxed'>
                {step.desc}
              </p>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
