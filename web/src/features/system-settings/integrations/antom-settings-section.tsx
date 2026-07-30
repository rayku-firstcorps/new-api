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

export interface AntomSettingsValues {
  AntomEnabled: boolean
  AntomClientId: string
  AntomMerchantPrivateKey: string
  AntomPublicKey: string
  AntomSandbox: boolean
  AntomCurrency: string
  AntomUnitPrice: number
  AntomMinTopUp: number
  AntomPaymentMethods: string
}

interface Props {
  defaultValues: AntomSettingsValues
}

export function AntomSettingsSection(props: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)

  const form = useForm<AntomSettingsValues>({
    defaultValues: props.defaultValues,
  })

  useEffect(() => {
    const currentValues = form.getValues()
    form.reset({
      ...props.defaultValues,
      AntomMerchantPrivateKey:
        props.defaultValues.AntomMerchantPrivateKey ||
        currentValues.AntomMerchantPrivateKey,
      AntomPublicKey:
        props.defaultValues.AntomPublicKey || currentValues.AntomPublicKey,
    })
  }, [props.defaultValues, form])

  const handleSave = async () => {
    setLoading(true)
    try {
      const values = form.getValues()
      const options: { key: string; value: string }[] = [
        { key: 'AntomEnabled', value: String(values.AntomEnabled) },
        { key: 'AntomSandbox', value: String(values.AntomSandbox) },
        { key: 'AntomClientId', value: values.AntomClientId || '' },
        { key: 'AntomCurrency', value: values.AntomCurrency || 'CNY' },
        { key: 'AntomUnitPrice', value: String(values.AntomUnitPrice || 1) },
        { key: 'AntomMinTopUp', value: String(values.AntomMinTopUp || 1) },
        {
          key: 'AntomPaymentMethods',
          value: values.AntomPaymentMethods || '[]',
        },
      ]

      if (values.AntomMerchantPrivateKey) {
        options.push({
          key: 'AntomMerchantPrivateKey',
          value: values.AntomMerchantPrivateKey,
        })
      }
      if (values.AntomPublicKey) {
        options.push({ key: 'AntomPublicKey', value: values.AntomPublicKey })
      }

      for (const option of options) {
        await updateOption.mutateAsync(option)
      }
      toast.success(t('Updated successfully'))
    } catch {
      toast.error(t('Update failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SettingsSection
      title={t('Antom Payment Gateway')}
      description={t(
        'Configure Antom (Alipay Global) cashier payment integration'
      )}
    >
      <Alert>
        <AlertDescription className='text-xs'>
          {t(
            'Create API credentials in Antom Dashboard and configure the webhook URL: <ServerAddress>/api/antom/webhook'
          )}
        </AlertDescription>
      </Alert>

      <div className='grid grid-cols-2 gap-4'>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('AntomEnabled')}
            onCheckedChange={(value) => form.setValue('AntomEnabled', value)}
          />
          <Label>{t('Enable Antom')}</Label>
        </div>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('AntomSandbox')}
            onCheckedChange={(value) => form.setValue('AntomSandbox', value)}
          />
          <Label>{t('Sandbox mode')}</Label>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Client ID')}</Label>
          <Input autoComplete='off' {...form.register('AntomClientId')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Currency')}</Label>
          <Input {...form.register('AntomCurrency')} />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Merchant Private Key')}</Label>
          <Textarea
            className='font-mono text-xs'
            rows={3}
            placeholder={t('Enter merchant private key')}
            {...form.register('AntomMerchantPrivateKey')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Antom Public Key')}</Label>
          <Textarea
            className='font-mono text-xs'
            rows={3}
            placeholder={t('Enter Antom public key')}
            {...form.register('AntomPublicKey')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Default unit price')}</Label>
          <Input
            type='number'
            step={0.01}
            min={0}
            {...form.register('AntomUnitPrice')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Minimum top-up quantity')}</Label>
          <Input type='number' min={1} {...form.register('AntomMinTopUp')} />
        </div>
      </div>

      <div className='grid gap-1.5'>
        <Label>{t('Payment Methods (JSON)')}</Label>
        <Textarea
          className='font-mono text-xs'
          rows={4}
          placeholder='[{"name":"Alipay CN","type":"ALIPAY_CN","currency":"CNY"},{"name":"Alipay HK","type":"ALIPAY_HK","currency":"HKD","exchange_rate":1.1}]'
          {...form.register('AntomPaymentMethods')}
        />
        <p className='text-muted-foreground text-xs'>
          {t(
            'Leave empty to show a single Antom entry. Configure specific methods as JSON array with name, type, optional currency, exchange_rate, or unit_price fields.'
          )}
        </p>
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? t('Saving...') : t('Save Antom settings')}
      </Button>
    </SettingsSection>
  )
}
