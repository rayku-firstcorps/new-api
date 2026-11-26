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
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'

import { getMinTopupAmount, getPaymentIcon } from '../../lib'
import type { PaymentMethod, TopupInfo, WaffoPayMethod } from '../../types'
import { PaymentMethodButton } from './payment-method-button'
import { RECHARGE_LABEL_CLASS } from './styles'

interface PaymentMethodsProps {
  topupInfo: TopupInfo | null
  topupAmount: number
  paymentLoading: string | null
  hasWaffoMethods: boolean
  onSelect: (method: PaymentMethod) => void
}

/** Standard payment methods from the top-up info, with the empty notice. */
export function PaymentMethods(props: PaymentMethodsProps) {
  const { t } = useTranslation()
  const methods = props.topupInfo?.pay_methods
  const hasMethods = Array.isArray(methods) && methods.length > 0

  return (
    <div className='space-y-2.5 sm:space-y-3'>
      <Label className={RECHARGE_LABEL_CLASS}>{t('Payment Method')}</Label>
      {hasMethods && (
        <div className='grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-3'>
          {methods.map((method) => {
            const minTopup = Math.max(
              method.min_topup || 0,
              getMinTopupAmount(props.topupInfo)
            )
            const disabled = minTopup > props.topupAmount
            return (
              <PaymentMethodButton
                key={method.type}
                name={method.name}
                icon={getPaymentIcon(
                  method.type,
                  'h-4 w-4',
                  method.icon,
                  method.name
                )}
                loading={props.paymentLoading === method.type}
                disabled={disabled || !!props.paymentLoading}
                disabledReason={
                  disabled
                    ? t('Minimum topup amount: {{amount}}', {
                        amount: minTopup,
                      })
                    : undefined
                }
                disabledLabel={
                  disabled ? `${t('Minimum:')} ${minTopup}` : undefined
                }
                onSelect={() => props.onSelect(method)}
              />
            )
          })}
        </div>
      )}
      {!hasMethods && !props.hasWaffoMethods && (
        <Alert>
          <AlertDescription>
            {t('No payment methods available. Please contact administrator.')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface WaffoMethodsProps {
  methods?: WaffoPayMethod[]
  minTopup?: number
  topupAmount: number
  paymentLoading: string | null
  onSelect: (method: WaffoPayMethod, index: number) => void
}

/** Waffo pay methods; shown only when Waffo top-up is enabled and configured. */
export function WaffoMethods(props: WaffoMethodsProps) {
  const { t } = useTranslation()

  return (
    <div className='space-y-2.5 sm:space-y-3'>
      <Label className={RECHARGE_LABEL_CLASS}>{t('Waffo Payment')}</Label>
      <div className='grid grid-cols-2 gap-1.5 sm:gap-3 lg:grid-cols-3'>
        {props.methods?.map((method, index) => {
          const loadingKey = `waffo-${index}`
          const methodKey = `${method.payMethodType ?? 'unknown'}-${method.payMethodName ?? method.name}`
          const waffoMin = props.minTopup || 0
          const belowMin = waffoMin > props.topupAmount
          const defaultIcon = method.icon ? (
            <img
              src={method.icon}
              alt={method.name}
              className='h-4 w-4 object-contain'
            />
          ) : (
            getPaymentIcon('waffo')
          )
          return (
            <PaymentMethodButton
              key={methodKey}
              name={method.name}
              icon={defaultIcon}
              loading={props.paymentLoading === loadingKey}
              disabled={belowMin || !!props.paymentLoading}
              disabledReason={
                belowMin
                  ? t('Minimum topup amount: {{amount}}', { amount: waffoMin })
                  : undefined
              }
              disabledLabel={
                belowMin ? `${t('Minimum:')} ${waffoMin}` : undefined
              }
              onSelect={() => props.onSelect(method, index)}
            />
          )
        })}
      </div>
    </div>
  )
}
