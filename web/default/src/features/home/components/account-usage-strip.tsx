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
import { Activity, Boxes, KeyRound, PlugZap, WalletCards } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

const accountItems = [
  {
    key: 'balance',
    title: 'Balance',
    value: '$2.40',
    detail: 'Recharge entry ready',
    icon: WalletCards,
    meter: 'w-3/5',
  },
  {
    key: 'usage',
    title: 'Usage',
    value: '128',
    detail: 'Requests today',
    icon: Activity,
    meter: 'w-2/5',
  },
  {
    key: 'models',
    title: 'Models',
    value: '42',
    detail: 'Available demo models',
    icon: Boxes,
    meter: 'w-4/5',
  },
  {
    key: 'apps',
    title: 'Apps',
    value: '6',
    detail: 'Connected tool types',
    icon: PlugZap,
    meter: 'w-1/2',
  },
  {
    key: 'keys',
    title: 'Keys',
    value: 'Active',
    detail: 'Scoped access control',
    icon: KeyRound,
    meter: 'w-5/6',
  },
]

export function AccountUsageStrip() {
  const { t } = useTranslation()

  return (
    <section
      id='home-account'
      className='relative z-10 px-4 py-16 sm:px-6 md:py-24'
    >
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
          <div className='max-w-2xl'>
            <p className='text-muted-foreground mb-3 text-xs font-medium uppercase'>
              {t('Account visibility')}
            </p>
            <h2 className='text-3xl leading-[1.08] font-bold md:text-4xl'>
              {t('One account keeps usage visible')}
            </h2>
          </div>
          <p className='text-muted-foreground max-w-md text-sm leading-relaxed'>
            {t(
              'Demo values show the shape of the console: balance, usage, models, apps, and keys stay in one account view.'
            )}
          </p>
        </AnimateInView>

        <div className='border-border/70 bg-background/90 grid gap-0 overflow-hidden rounded-[18px] border sm:grid-cols-2 lg:grid-cols-5 dark:bg-neutral-950/40'>
          {accountItems.map((item, index) => {
            const Icon = item.icon
            return (
              <AnimateInView
                key={item.key}
                delay={index * 60}
                className='border-border/60 min-h-36 border-b p-5 sm:border-r lg:border-b-0'
              >
                <div className='mb-5 flex items-center justify-between gap-3'>
                  <span className='border-border/60 bg-muted/25 flex size-9 items-center justify-center rounded-xl border'>
                    <Icon className='size-4 text-[#c97955]' />
                  </span>
                  <span className='bg-muted/35 text-muted-foreground rounded-full px-2 py-1 text-[11px]'>
                    {t('demo')}
                  </span>
                </div>
                <p className='text-muted-foreground text-xs'>{t(item.title)}</p>
                <p className='mt-1 text-xl font-semibold tabular-nums'>
                  {t(item.value)}
                </p>
                <div className='bg-muted mt-4 h-1.5 overflow-hidden rounded-full'>
                  <div
                    className={`h-full rounded-full bg-[#c97955] ${item.meter}`}
                  />
                </div>
                <p className='text-muted-foreground mt-3 text-xs'>
                  {t(item.detail)}
                </p>
              </AnimateInView>
            )
          })}
        </div>
      </div>
    </section>
  )
}
