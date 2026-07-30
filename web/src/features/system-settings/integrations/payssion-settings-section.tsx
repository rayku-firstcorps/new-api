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
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { formatJsonForEditor, getJsonError } from './utils'

export interface PayssionSettingsValues {
  PayssionEnabled: boolean
  PayssionApiKey: string
  PayssionWebhookSecret: string
  PayssionCurrency: string
  PayssionUnitPrice: number
  PayssionMinTopUp: number
  PayssionPaymentMethods: string
}

interface Props {
  defaultValues: PayssionSettingsValues
}

function normalizePaymentMethods(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return '[]'
  return formatJsonForEditor(trimmed)
}

export function PayssionSettingsSection(props: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)

  const form = useForm<PayssionSettingsValues>({
    defaultValues: {
      ...props.defaultValues,
      PayssionPaymentMethods: normalizePaymentMethods(
        props.defaultValues.PayssionPaymentMethods
      ),
    },
  })

  useEffect(() => {
    const currentValues = form.getValues()
    form.reset({
      ...props.defaultValues,
      PayssionApiKey:
        props.defaultValues.PayssionApiKey || currentValues.PayssionApiKey,
      PayssionWebhookSecret:
        props.defaultValues.PayssionWebhookSecret ||
        currentValues.PayssionWebhookSecret,
      PayssionPaymentMethods: normalizePaymentMethods(
        props.defaultValues.PayssionPaymentMethods
      ),
    })
    setJsonError(null)
  }, [props.defaultValues, form])

  const handleSave = async () => {
    const values = form.getValues()
    const paymentMethods = normalizePaymentMethods(
      values.PayssionPaymentMethods
    )
    const methodsError = getJsonError(paymentMethods, (parsed) =>
      Array.isArray(parsed)
    )

    if (methodsError) {
      setJsonError(methodsError)
      toast.error(t('Payssion payment methods must be a JSON array'))
      return
    }

    setJsonError(null)
    setLoading(true)

    try {
      const options: { key: string; value: string }[] = [
        { key: 'PayssionEnabled', value: String(values.PayssionEnabled) },
        {
          key: 'PayssionCurrency',
          value: values.PayssionCurrency.trim() || 'USD',
        },
        {
          key: 'PayssionUnitPrice',
          value: String(values.PayssionUnitPrice || 1),
        },
        {
          key: 'PayssionMinTopUp',
          value: String(values.PayssionMinTopUp || 1),
        },
        { key: 'PayssionPaymentMethods', value: paymentMethods },
      ]

      if (values.PayssionApiKey.trim()) {
        options.push({
          key: 'PayssionApiKey',
          value: values.PayssionApiKey.trim(),
        })
      }

      if (values.PayssionWebhookSecret.trim()) {
        options.push({
          key: 'PayssionWebhookSecret',
          value: values.PayssionWebhookSecret.trim(),
        })
      }

      for (const option of options) {
        await updateOption.mutateAsync(option)
      }

      form.setValue('PayssionPaymentMethods', paymentMethods)
      toast.success(t('Updated successfully'))
    } catch {
      toast.error(t('Update failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsSection
      title={t('Payssion Gateway')}
      description={t('Configuration for Payssion payment integration')}
    >
      <Alert>
        <AlertDescription className='text-xs'>
          {t(
            'Create Payssion API credentials and configure the webhook URL: <ServerAddress>/api/payssion/webhook'
          )}
        </AlertDescription>
      </Alert>

      <div className='flex items-center gap-2'>
        <Switch
          checked={form.watch('PayssionEnabled')}
          onCheckedChange={(value) => form.setValue('PayssionEnabled', value)}
        />
        <Label>{t('Enable Payssion')}</Label>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Payssion API key')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Enter new key to update')}
            {...form.register('PayssionApiKey')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Payssion webhook secret')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Enter webhook secret')}
            {...form.register('PayssionWebhookSecret')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='grid gap-1.5'>
          <Label>{t('Payssion currency')}</Label>
          <Input {...form.register('PayssionCurrency')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Payssion unit price')}</Label>
          <Input
            type='number'
            step={0.01}
            min={0}
            {...form.register('PayssionUnitPrice', { valueAsNumber: true })}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Payssion minimum top-up')}</Label>
          <Input
            type='number'
            min={1}
            {...form.register('PayssionMinTopUp', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className='grid gap-1.5'>
        <Label>{t('Payssion payment methods')}</Label>
        <Textarea
          rows={8}
          className='font-mono text-xs'
          placeholder='[{"name":"GCash","type":"gcash_ph","currency":"PHP","icon":""}]'
          {...form.register('PayssionPaymentMethods')}
        />
        <p className='text-muted-foreground text-xs'>
          {t(
            'Configure Payssion methods as a JSON array. The type value is sent to Payssion as payment_method.'
          )}
        </p>
        {jsonError ? (
          <p className='text-destructive text-xs'>{jsonError}</p>
        ) : null}
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? t('Saving...') : t('Save Payssion settings')}
      </Button>
    </SettingsSection>
  )
}
