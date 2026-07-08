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
import i18next from 'i18next'
import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import {
  calculateAmount,
  calculateStripeAmount,
  calculateAirwallexAmount,
  calculatePayssionAmount,
  calculateWaffoPancakeAmount,
  calculateAntomAmount,
  requestPayment,
  requestStripePayment,
  requestAirwallexPayment,
  requestPayssionPayment,
  requestAntomPayment,
  queryAntomPaymentStatus,
  isApiSuccess,
} from '../api'
import {
  getPayssionPaymentMethod,
  getAntomPaymentMethod,
  isAirwallexPayment,
  isAntomPayment,
  isPayssionPayment,
  isStripePayment,
  isWaffoPancakePayment,
  submitPaymentForm,
} from '../lib'

function getStringField(data: unknown, field: string): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const value = (data as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : null
}

// ============================================================================
// Payment Hook
// ============================================================================

const ANTOM_POLL_INTERVAL_MS = 6000
const ANTOM_MAX_POLL_ATTEMPTS = 15

export type PaymentConfirmationStatus =
  | 'idle'
  | 'waiting'
  | 'paid'
  | 'failed'
  | 'timeout'

export function usePayment() {
  const [amount, setAmount] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [confirmationStatus, setConfirmationStatus] =
    useState<PaymentConfirmationStatus>('idle')
  const [confirmationOrderId, setConfirmationOrderId] = useState<string | null>(
    null
  )
  const pollTimerRef = useRef<number | null>(null)
  const pollAttemptsRef = useRef(0)

  const stopPaymentConfirmation = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const resetPaymentConfirmation = useCallback(() => {
    stopPaymentConfirmation()
    pollAttemptsRef.current = 0
    setConfirmationOrderId(null)
    setConfirmationStatus('idle')
  }, [stopPaymentConfirmation])

  const startAntomPaymentConfirmation = useCallback(
    (orderId: string) => {
      stopPaymentConfirmation()
      pollAttemptsRef.current = 0
      setConfirmationOrderId(orderId)
      setConfirmationStatus('waiting')

      const poll = async () => {
        pollAttemptsRef.current += 1
        try {
          const res = await queryAntomPaymentStatus(orderId)
          if (res.data === 'paid') {
            stopPaymentConfirmation()
            setConfirmationStatus('paid')
            toast.success(i18next.t('Payment successful'))
            window.location.reload()
            return
          }
          if (res.data === 'failed') {
            stopPaymentConfirmation()
            setConfirmationStatus('failed')
            toast.error(i18next.t('Payment failed'))
            return
          }
        } catch {
          // Keep polling until the attempt budget is exhausted.
        }

        if (pollAttemptsRef.current >= ANTOM_MAX_POLL_ATTEMPTS) {
          stopPaymentConfirmation()
          setConfirmationStatus('timeout')
          toast.info(
            i18next.t(
              'Payment confirmation is still pending. Please refresh later.'
            )
          )
        }
      }

      void poll()
      pollTimerRef.current = window.setInterval(poll, ANTOM_POLL_INTERVAL_MS)
    },
    [stopPaymentConfirmation]
  )

  useEffect(() => {
    return () => stopPaymentConfirmation()
  }, [stopPaymentConfirmation])

  // Calculate payment amount
  const calculatePaymentAmount = useCallback(
    async (topupAmount: number, paymentType: string) => {
      try {
        setCalculating(true)

        const isStripe = isStripePayment(paymentType)
        const isAirwallex = isAirwallexPayment(paymentType)
        const isPayssion = isPayssionPayment(paymentType)
        const isPancake = isWaffoPancakePayment(paymentType)
        const isAntom = isAntomPayment(paymentType)
        let response
        if (isStripe) {
          response = await calculateStripeAmount({ amount: topupAmount })
        } else if (isAirwallex) {
          response = await calculateAirwallexAmount({ amount: topupAmount })
        } else if (isPayssion) {
          response = await calculatePayssionAmount({
            amount: topupAmount,
            payment_method: getPayssionPaymentMethod(paymentType),
          })
        } else if (isPancake) {
          response = await calculateWaffoPancakeAmount({ amount: topupAmount })
        } else if (isAntom) {
          const paymentMethodType = getAntomPaymentMethod(paymentType)
          response = await calculateAntomAmount({
            amount: topupAmount,
            ...(paymentMethodType ? { paymentMethodType } : {}),
          })
        } else {
          response = await calculateAmount({ amount: topupAmount })
        }

        if (isApiSuccess(response) && response.data) {
          const calculatedAmount = parseFloat(response.data)
          setAmount(calculatedAmount)
          return calculatedAmount
        }

        // Don't show error for calculation, just set to 0
        setAmount(0)
        return 0
      } catch (_error) {
        setAmount(0)
        return 0
      } finally {
        setCalculating(false)
      }
    },
    []
  )

  // Process payment
  const processPayment = useCallback(
    async (topupAmount: number, paymentType: string) => {
      try {
        setProcessing(true)

        const isStripe = isStripePayment(paymentType)
        const isAirwallex = isAirwallexPayment(paymentType)
        const isPayssion = isPayssionPayment(paymentType)
        const isAntom = isAntomPayment(paymentType)
        const amount = Math.floor(topupAmount)

        let response
        if (isStripe) {
          response = await requestStripePayment({
            amount,
            payment_method: 'stripe',
          })
        } else if (isAirwallex) {
          response = await requestAirwallexPayment({ amount })
        } else if (isPayssion) {
          response = await requestPayssionPayment({
            amount,
            payment_method: getPayssionPaymentMethod(paymentType),
          })
        } else if (isAntom) {
          const paymentMethodType = getAntomPaymentMethod(paymentType)
          response = await requestAntomPayment({
            amount,
            ...(paymentMethodType ? { paymentMethodType } : {}),
          })
        } else {
          response = await requestPayment({
            amount,
            payment_method: paymentType,
          })
        }

        if (!isApiSuccess(response)) {
          toast.error(response.message || i18next.t('Payment request failed'))
          return false
        }

        // Handle Stripe payment
        const stripePayLink = getStringField(response.data, 'pay_link')
        if (isStripe && stripePayLink) {
          window.open(stripePayLink, '_blank')
          toast.success(i18next.t('Redirecting to payment page...'))
          return true
        }

        if (isAirwallex && response.data) {
          const data = response.data
          const paymentUrl =
            typeof data === 'string'
              ? data
              : getStringField(data, 'payment_url') || ''
          if (paymentUrl) {
            window.open(paymentUrl, '_blank')
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
          }
        }

        if (isPayssion && response.data) {
          const data = response.data
          const paymentUrl =
            typeof data === 'string'
              ? data
              : getStringField(data, 'payment_url') || ''
          if (paymentUrl) {
            window.open(paymentUrl, '_blank')
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
          }
        }

        if (isAntom && response.data) {
          const data = response.data
          const paymentUrl =
            typeof data === 'string'
              ? data
              : getStringField(data, 'payment_url') || ''
          const orderId =
            typeof data === 'object' ? getStringField(data, 'order_id') : null
          if (paymentUrl) {
            window.open(paymentUrl, '_blank')
            toast.success(i18next.t('Redirecting to payment page...'))
            if (orderId) {
              startAntomPaymentConfirmation(orderId)
            }
            return true
          }
        }

        // Handle non-Stripe payment
        if (
          !isStripe &&
          !isAirwallex &&
          !isPayssion &&
          !isAntom &&
          response.data &&
          typeof response.data === 'object'
        ) {
          const url = (response as unknown as { url?: string }).url
          if (url) {
            submitPaymentForm(url, response.data)
            toast.success(i18next.t('Redirecting to payment page...'))
            return true
          }
        }

        return false
      } catch (_error) {
        toast.error(i18next.t('Payment request failed'))
        return false
      } finally {
        setProcessing(false)
      }
    },
    [startAntomPaymentConfirmation]
  )

  return {
    amount,
    calculating,
    processing,
    confirmationStatus,
    confirmationOrderId,
    calculatePaymentAmount,
    processPayment,
    setAmount,
    resetPaymentConfirmation,
  }
}
