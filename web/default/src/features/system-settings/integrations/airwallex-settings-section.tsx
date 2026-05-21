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
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

export interface AirwallexSettingsValues {
  AirwallexEnabled: boolean
  AirwallexClientId: string
  AirwallexApiKey: string
  AirwallexWebhookSecret: string
  AirwallexSandbox: boolean
  AirwallexCurrency: string
  AirwallexUnitPrice: number
  AirwallexMinTopUp: number
}

interface Props {
  defaultValues: AirwallexSettingsValues
}

export function AirwallexSettingsSection(props: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)

  const form = useForm<AirwallexSettingsValues>({
    defaultValues: props.defaultValues,
  })

  useEffect(() => {
    const currentValues = form.getValues()
    form.reset({
      ...props.defaultValues,
      AirwallexApiKey:
        props.defaultValues.AirwallexApiKey || currentValues.AirwallexApiKey,
      AirwallexWebhookSecret:
        props.defaultValues.AirwallexWebhookSecret ||
        currentValues.AirwallexWebhookSecret,
    })
  }, [props.defaultValues, form])

  const handleSave = async () => {
    setLoading(true)
    try {
      const values = form.getValues()
      const options: { key: string; value: string }[] = [
        { key: 'AirwallexEnabled', value: String(values.AirwallexEnabled) },
        { key: 'AirwallexSandbox', value: String(values.AirwallexSandbox) },
        { key: 'AirwallexClientId', value: values.AirwallexClientId || '' },
        { key: 'AirwallexCurrency', value: values.AirwallexCurrency || 'USD' },
        {
          key: 'AirwallexUnitPrice',
          value: String(values.AirwallexUnitPrice || 1),
        },
        {
          key: 'AirwallexMinTopUp',
          value: String(values.AirwallexMinTopUp || 1),
        },
      ]

      if (values.AirwallexApiKey) {
        options.push({ key: 'AirwallexApiKey', value: values.AirwallexApiKey })
      }
      if (values.AirwallexWebhookSecret) {
        options.push({
          key: 'AirwallexWebhookSecret',
          value: values.AirwallexWebhookSecret,
        })
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
      title={t('Airwallex Payment Gateway')}
      description={t('Configure Airwallex hosted payment link integration')}
    >
      <Alert>
        <AlertDescription className='text-xs'>
          {t(
            'Create API credentials in Airwallex and configure the webhook URL: <ServerAddress>/api/airwallex/webhook'
          )}
        </AlertDescription>
      </Alert>

      <div className='grid grid-cols-2 gap-4'>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('AirwallexEnabled')}
            onCheckedChange={(value) =>
              form.setValue('AirwallexEnabled', value)
            }
          />
          <Label>{t('Enable Airwallex')}</Label>
        </div>
        <div className='flex items-center gap-2'>
          <Switch
            checked={form.watch('AirwallexSandbox')}
            onCheckedChange={(value) =>
              form.setValue('AirwallexSandbox', value)
            }
          />
          <Label>{t('Sandbox mode')}</Label>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Client ID')}</Label>
          <Input autoComplete='off' {...form.register('AirwallexClientId')} />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('API Key')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Enter new key to update')}
            {...form.register('AirwallexApiKey')}
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Webhook Secret')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Enter webhook secret')}
            {...form.register('AirwallexWebhookSecret')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Currency')}</Label>
          <Input {...form.register('AirwallexCurrency')} />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Unit price (USD)')}</Label>
          <Input
            type='number'
            step={0.01}
            min={0}
            {...form.register('AirwallexUnitPrice')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Minimum top-up quantity')}</Label>
          <Input
            type='number'
            min={1}
            {...form.register('AirwallexMinTopUp')}
          />
        </div>
      </div>

      <Button onClick={handleSave} disabled={loading}>
        {loading ? t('Saving...') : t('Save Airwallex settings')}
      </Button>
    </SettingsSection>
  )
}
