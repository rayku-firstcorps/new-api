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
import { Trans, useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  calculatePresetPricing,
  formatCurrency,
  getDiscountLabel,
} from '../../lib'
import type { PresetAmount, TopupInfo } from '../../types'
import { RECHARGE_LABEL_CLASS } from './styles'

interface PresetAmountsProps {
  presetAmounts: PresetAmount[]
  topupInfo: TopupInfo | null
  selectedPreset: number | null
  priceRatio: number
  usdExchangeRate: number
  onSelectPreset: (preset: PresetAmount) => void
}

/** Preset amount tiles with their discount and the price to pay. */
export function PresetAmounts(props: PresetAmountsProps) {
  const { t } = useTranslation()

  if (props.presetAmounts.length === 0) return null

  return (
    <div className='space-y-2.5 sm:space-y-3'>
      <Label className={RECHARGE_LABEL_CLASS}>{t('Amount')}</Label>
      <div className='grid grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-4'>
        {props.presetAmounts.map((preset) => {
          const discount =
            preset.discount || props.topupInfo?.discount?.[preset.value] || 1.0
          const { displayValue, actualPrice, savedAmount, hasDiscount } =
            calculatePresetPricing(
              preset.value,
              props.priceRatio,
              discount,
              props.usdExchangeRate
            )
          const selected = props.selectedPreset === preset.value
          return (
            <Button
              key={preset.value}
              variant='outline'
              aria-pressed={selected}
              className={cn(
                'bg-card flex min-h-16 flex-col items-start rounded-lg px-3 py-2.5 text-left whitespace-normal sm:min-h-[72px] sm:p-4',
                selected
                  ? 'border-primary bg-primary/10 dark:bg-primary/10'
                  : 'hover:border-primary/50'
              )}
              onClick={() => props.onSelectPreset(preset)}
            >
              <div className='flex w-full items-center justify-between'>
                <div className='text-base font-semibold tabular-nums sm:text-lg'>
                  {formatNumber(displayValue)}
                </div>
                {hasDiscount && (
                  <div className='text-success text-xs font-medium'>
                    {getDiscountLabel(discount, t)}
                  </div>
                )}
              </div>
              <div className='text-muted-foreground mt-1.5 w-full text-xs sm:mt-2'>
                {hasDiscount && savedAmount > 0 ? (
                  <Trans
                    t={t}
                    i18nKey='Pay {{amount}} <savings>• Save {{saved}}</savings>'
                    values={{
                      amount: formatCurrency(actualPrice),
                      saved: formatCurrency(savedAmount),
                    }}
                    components={{
                      savings: <span className='text-success' />,
                    }}
                  />
                ) : (
                  t('Pay {{amount}}', { amount: formatCurrency(actualPrice) })
                )}
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
