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
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Copy, Shuffle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

export type ExternalBalanceApiSettingsValues = {
  ExternalBalanceApiEnabled: boolean
  ExternalBalanceApiKey: string
  ExternalBalanceApiKeyNext: string
  ExternalBalanceApiAllowQuery: boolean
  ExternalBalanceApiAllowDeduct: boolean
  ExternalBalanceApiMaxDeductQuota: number
  ExternalBalanceApiAllowedIPs: string
}

type Props = {
  defaultValues: ExternalBalanceApiSettingsValues
}

function generateApiKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `ebk_${crypto.randomUUID().replaceAll('-', '')}`
  }
  return `ebk_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function maskApiKey(key: string) {
  const trimmed = key.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '****'
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`
}
export function ExternalBalanceApiSection(props: Props) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [loading, setLoading] = useState(false)
  const [generatedKey, setGeneratedKey] = useState('')

  const form = useForm<ExternalBalanceApiSettingsValues>({
    defaultValues: props.defaultValues,
  })

  useEffect(() => {
    form.reset(props.defaultValues)
  }, [props.defaultValues, form])

  const currentValues = form.watch()
  const hasAnyKey = useMemo(
    () =>
      Boolean(
        currentValues.ExternalBalanceApiKey.trim() ||
          currentValues.ExternalBalanceApiKeyNext.trim()
      ),
    [currentValues.ExternalBalanceApiKey, currentValues.ExternalBalanceApiKeyNext]
  )

  const save = async () => {
    const values = form.getValues()
    const updates: Array<{ key: string; value: string | boolean | number }> = [
      {
        key: 'ExternalBalanceApiEnabled',
        value: values.ExternalBalanceApiEnabled,
      },
      {
        key: 'ExternalBalanceApiAllowQuery',
        value: values.ExternalBalanceApiAllowQuery,
      },
      {
        key: 'ExternalBalanceApiAllowDeduct',
        value: values.ExternalBalanceApiAllowDeduct,
      },
      {
        key: 'ExternalBalanceApiMaxDeductQuota',
        value: values.ExternalBalanceApiMaxDeductQuota,
      },
      {
        key: 'ExternalBalanceApiAllowedIPs',
        value: values.ExternalBalanceApiAllowedIPs.trim(),
      },
    ]

    if (values.ExternalBalanceApiKey.trim()) {
      updates.push({
        key: 'ExternalBalanceApiKey',
        value: values.ExternalBalanceApiKey.trim(),
      })
    }
    if (values.ExternalBalanceApiKeyNext.trim()) {
      updates.push({
        key: 'ExternalBalanceApiKeyNext',
        value: values.ExternalBalanceApiKeyNext.trim(),
      })
    }

    setLoading(true)
    try {
      for (const update of updates) {
        await updateOption.mutateAsync(update)
      }
      toast.success(t('Updated successfully'))
    } catch {
      toast.error(t('Update failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    const key = generateApiKey()
    setGeneratedKey(key)
    form.setValue('ExternalBalanceApiKey', key, { shouldDirty: true })
    toast.success(t('New API key generated'))
  }

  const handleCopy = async () => {
    const key = generatedKey || form.getValues('ExternalBalanceApiKey')
    if (!key) {
      toast.error(t('No API key to copy'))
      return
    }
    await navigator.clipboard.writeText(key)
    toast.success(t('API key copied'))
  }

  return (
    <SettingsSection
      title={t('External Balance API')}
      description={t(
        'Configure the independent service key used for external quota queries and deductions'
      )}
    >
      <div className='rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950 dark:text-amber-100'>
        {t(
          'This key is not echoed back by the server. Leave the field empty to keep the existing saved key.'
        )}
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='flex items-center gap-3 rounded-lg border p-4'>
          <Switch
            checked={currentValues.ExternalBalanceApiEnabled}
            onCheckedChange={(value) =>
              form.setValue('ExternalBalanceApiEnabled', value, {
                shouldDirty: true,
              })
            }
          />
          <div className='space-y-0.5'>
            <Label className='text-base'>{t('Enable External Balance API')}</Label>
            <p className='text-muted-foreground text-sm'>
              {t('Allow independent service access to balance operations')}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3 rounded-lg border p-4'>
          <Switch
            checked={currentValues.ExternalBalanceApiAllowQuery}
            onCheckedChange={(value) =>
              form.setValue('ExternalBalanceApiAllowQuery', value, {
                shouldDirty: true,
              })
            }
          />
          <div className='space-y-0.5'>
            <Label className='text-base'>{t('Allow balance query')}</Label>
            <p className='text-muted-foreground text-sm'>
              {t('Permit GET /api/external/balance/user')}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3 rounded-lg border p-4'>
          <Switch
            checked={currentValues.ExternalBalanceApiAllowDeduct}
            onCheckedChange={(value) =>
              form.setValue('ExternalBalanceApiAllowDeduct', value, {
                shouldDirty: true,
              })
            }
          />
          <div className='space-y-0.5'>
            <Label className='text-base'>{t('Allow balance deduction')}</Label>
            <p className='text-muted-foreground text-sm'>
              {t('Permit POST /api/external/balance/deduct')}
            </p>
          </div>
        </div>

        <div className='grid gap-1.5'>
          <Label>{t('Single deduction max quota')}</Label>
          <Input
            type='number'
            min={0}
            step={1}
            value={currentValues.ExternalBalanceApiMaxDeductQuota}
            onChange={(event) =>
              form.setValue(
                'ExternalBalanceApiMaxDeductQuota',
                event.target.valueAsNumber || 0,
                { shouldDirty: true }
              )
            }
          />
          <p className='text-muted-foreground text-xs'>
            {t('0 means unlimited')}
          </p>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <div className='grid gap-1.5'>
          <Label>{t('Current API key')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Leave blank to keep the existing key')}
            {...form.register('ExternalBalanceApiKey')}
          />
        </div>
        <div className='grid gap-1.5'>
          <Label>{t('Next API key')}</Label>
          <Input
            type='password'
            autoComplete='new-password'
            placeholder={t('Optional rotation key')}
            {...form.register('ExternalBalanceApiKeyNext')}
          />
        </div>
      </div>

      <div className='grid gap-1.5'>
        <Label>{t('IP allowlist')}</Label>
        <Textarea
          rows={3}
          placeholder='192.168.1.10,10.0.0.0/8'
          {...form.register('ExternalBalanceApiAllowedIPs')}
        />
        <p className='text-muted-foreground text-xs'>
          {t('Comma-separated IPs or CIDR ranges. Leave empty for no restriction.')}
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' onClick={handleGenerate}>
          <Shuffle className='mr-2 h-4 w-4' />
          {t('Generate new API key')}
        </Button>
        <Button type='button' variant='outline' onClick={handleCopy}>
          <Copy className='mr-2 h-4 w-4' />
          {t('Copy generated key')}
        </Button>
      </div>

      {generatedKey ? (
        <div className='rounded-md border bg-muted/40 p-3 text-sm'>
          <div className='text-muted-foreground mb-1'>{t('Generated key')}</div>
          <div className='font-mono break-all'>{generatedKey}</div>
        </div>
      ) : currentValues.ExternalBalanceApiKey.trim() ? (
        <div className='rounded-md border bg-muted/40 p-3 text-sm'>
          <div className='text-muted-foreground mb-1'>{t('Current key')}</div>
          <div className='font-mono break-all'>
            {maskApiKey(currentValues.ExternalBalanceApiKey)}
          </div>
        </div>
      ) : null}

      <Separator />

      <Button onClick={save} disabled={loading || updateOption.isPending}>
        {loading || updateOption.isPending ? t('Saving...') : t('Save Changes')}
      </Button>

      <div className='text-muted-foreground text-xs'>
        {hasAnyKey
          ? t('One or both keys are configured. Rotate by placing the next key here first.')
          : t('Configure at least one API key before enabling external calls.')}
      </div>
    </SettingsSection>
  )
}
