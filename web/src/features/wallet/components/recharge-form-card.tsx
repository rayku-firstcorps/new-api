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
import { Receipt, WalletCards } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'

import type { PaymentConfirmationStatus } from '../hooks/use-payment'
import { formatCurrency, getMinTopupAmount } from '../lib'
import type {
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  CreemProduct,
  WaffoPayMethod,
} from '../types'
import { CreemProductsSection } from './creem-products-section'
import { PaymentConfirmationAlert } from './recharge/payment-confirmation-alert'
import { PaymentMethods, WaffoMethods } from './recharge/payment-methods'
import { PresetAmounts } from './recharge/preset-amounts'
import { RechargeSkeleton } from './recharge/recharge-skeleton'
import { RedemptionSection } from './recharge/redemption-section'
import { RECHARGE_LABEL_CLASS } from './recharge/styles'

interface RechargeFormCardProps {
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  paymentLoading: string | null
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  topupLink?: string
  loading?: boolean
  priceRatio?: number
  usdExchangeRate?: number
  onOpenBilling?: () => void
  creemProducts?: CreemProduct[]
  enableCreemTopup?: boolean
  onCreemProductSelect?: (product: CreemProduct) => void
  enableWaffoTopup?: boolean
  waffoPayMethods?: WaffoPayMethod[]
  waffoMinTopup?: number
  onWaffoMethodSelect?: (method: WaffoPayMethod, index: number) => void
  enableWaffoPancakeTopup?: boolean
  paymentConfirmationStatus?: PaymentConfirmationStatus
  paymentConfirmationOrderId?: string | null
  onResetPaymentConfirmation?: () => void
}

export function RechargeFormCard({
  topupInfo,
  presetAmounts,
  selectedPreset,
  onSelectPreset,
  topupAmount,
  onTopupAmountChange,
  paymentAmount,
  calculating,
  onPaymentMethodSelect,
  paymentLoading,
  redemptionCode,
  onRedemptionCodeChange,
  onRedeem,
  redeeming,
  topupLink,
  loading,
  priceRatio = 1,
  usdExchangeRate = 1,
  onOpenBilling,
  creemProducts,
  enableCreemTopup,
  onCreemProductSelect,
  enableWaffoTopup,
  waffoPayMethods,
  waffoMinTopup,
  onWaffoMethodSelect,
  enableWaffoPancakeTopup,
  paymentConfirmationStatus = 'idle',
  paymentConfirmationOrderId,
  onResetPaymentConfirmation,
}: RechargeFormCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState(topupAmount.toString())

  useEffect(() => {
    // Empty string must survive, otherwise the field can never be cleared
    setLocalAmount((prev) =>
      prev === '' && topupAmount === 0 ? prev : topupAmount.toString()
    )
  }, [topupAmount])

  const handleAmountChange = (value: string) => {
    setLocalAmount(value)
    const numValue = Number.parseInt(value) || 0
    if (numValue >= 0) {
      onTopupAmountChange(numValue)
    }
  }

  const hasConfigurableTopup =
    topupInfo?.enable_online_topup ||
    topupInfo?.enable_stripe_topup ||
    enableWaffoTopup ||
    enableWaffoPancakeTopup ||
    topupInfo?.enable_airwallex_topup ||
    topupInfo?.enable_payssion_topup ||
    topupInfo?.enable_antom_topup
  const hasAnyTopup = hasConfigurableTopup || enableCreemTopup
  const hasWaffoPaymentMethods =
    Array.isArray(waffoPayMethods) && waffoPayMethods.length > 0
  const minTopup = getMinTopupAmount(topupInfo)
  const redemptionEnabled = topupInfo?.enable_redemption !== false

  if (loading) return <RechargeSkeleton />

  return (
    <TitledCard
      title={t('Add Funds')}
      description={t('Choose an amount and payment method')}
      icon={<WalletCards className='h-4 w-4' />}
      iconTone='primary'
      disableHoverEffect
      action={
        onOpenBilling ? (
          <Button
            variant='outline'
            size='sm'
            onClick={onOpenBilling}
            className='w-full gap-2 sm:w-auto'
          >
            <Receipt className='h-4 w-4' />
            {t('Order History')}
          </Button>
        ) : null
      }
      contentClassName='space-y-4 sm:space-y-6'
    >
      {/* Online Topup Section */}
      {hasAnyTopup ? (
        <div className='space-y-4 sm:space-y-6'>
          <PaymentConfirmationAlert
            status={paymentConfirmationStatus}
            orderId={paymentConfirmationOrderId}
            onReset={onResetPaymentConfirmation}
          />

          {hasConfigurableTopup && (
            <>
              <PresetAmounts
                presetAmounts={presetAmounts}
                topupInfo={topupInfo}
                selectedPreset={selectedPreset}
                priceRatio={priceRatio}
                usdExchangeRate={usdExchangeRate}
                onSelectPreset={onSelectPreset}
              />

              <div className='space-y-2.5 sm:space-y-3'>
                <Label htmlFor='topup-amount' className={RECHARGE_LABEL_CLASS}>
                  {t('Custom Amount')}
                </Label>
                <div className='grid grid-cols-[minmax(0,1fr)_minmax(110px,0.55fr)] gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center'>
                  <Input
                    id='topup-amount'
                    type='number'
                    value={localAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    min={minTopup}
                    placeholder={t('Minimum {{amount}}', { amount: minTopup })}
                    className='h-9 text-base tabular-nums sm:h-10 sm:text-lg'
                  />
                  <div className='bg-muted/40 flex min-h-9 items-center justify-between gap-2 rounded-lg border px-3 lg:min-w-52'>
                    <span className='text-muted-foreground truncate text-xs'>
                      {t('Amount to pay:')}
                    </span>
                    {calculating ? (
                      <Skeleton className='h-5 w-16' />
                    ) : (
                      <span className='text-sm font-semibold tabular-nums'>
                        {formatCurrency(paymentAmount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <PaymentMethods
                topupInfo={topupInfo}
                topupAmount={topupAmount}
                paymentLoading={paymentLoading}
                hasWaffoMethods={hasWaffoPaymentMethods}
                onSelect={onPaymentMethodSelect}
              />

              {enableWaffoTopup &&
                hasWaffoPaymentMethods &&
                onWaffoMethodSelect && (
                  <WaffoMethods
                    methods={waffoPayMethods}
                    minTopup={waffoMinTopup}
                    topupAmount={topupAmount}
                    paymentLoading={paymentLoading}
                    onSelect={onWaffoMethodSelect}
                  />
                )}
            </>
          )}
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            {t(
              'Online topup is not enabled. Please use redemption code or contact administrator.'
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Creem Products Section */}
      {enableCreemTopup &&
        Array.isArray(creemProducts) &&
        creemProducts.length > 0 &&
        onCreemProductSelect && (
          <div className='space-y-2.5 border-t pt-4 sm:space-y-3 sm:pt-6'>
            <Label className={RECHARGE_LABEL_CLASS}>{t('Creem Payment')}</Label>
            <CreemProductsSection
              products={creemProducts}
              onProductSelect={onCreemProductSelect}
            />
          </div>
        )}

      <RedemptionSection
        enabled={redemptionEnabled}
        code={redemptionCode}
        onCodeChange={onRedemptionCodeChange}
        onRedeem={onRedeem}
        redeeming={redeeming}
        topupLink={topupLink}
      />
    </TitledCard>
  )
}
