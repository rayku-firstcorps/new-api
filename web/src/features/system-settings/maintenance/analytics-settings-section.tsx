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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import * as z from 'zod'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  purgeExpiredAnalytics,
  rotateAnalyticsSecret,
} from '@/features/analytics/api'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber, formatTimestampToDate } from '@/lib/format'
import { handleServerError } from '@/lib/handle-server-error'
import { ROLE } from '@/lib/roles'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import {
  SettingsForm,
  SettingsFormGrid,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { safeNumberFieldProps } from '../utils/numeric-field'

type AnalyticsSettingsSectionProps = {
  defaultValues: {
    'analytics_setting.enabled': boolean
    'analytics_setting.sample_rate': number
    'analytics_setting.retention_days': number
    'analytics_setting.respect_dnt': boolean
    'analytics_setting.secret_rotated_at': number
  }
}

type AnalyticsFormValues = {
  enabled: boolean
  sample_rate: number
  retention_days: number
  respect_dnt: boolean
}

const OPTION_KEYS = {
  enabled: 'analytics_setting.enabled',
  sample_rate: 'analytics_setting.sample_rate',
  retention_days: 'analytics_setting.retention_days',
  respect_dnt: 'analytics_setting.respect_dnt',
} as const

export function AnalyticsSettingsSection(props: AnalyticsSettingsSectionProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const queryClient = useQueryClient()
  const updateOption = useUpdateOption()
  const isRoot = useAuthStore((s) => s.auth.user?.role) === ROLE.SUPER_ADMIN
  const collectTitleId = useId()
  const dataTitleId = useId()
  const [confirming, setConfirming] = useState<'rotate' | 'purge' | null>(null)

  const schema = useMemo(() => {
    const rateMessage = t(
      'The sample rate must be a whole number between 1 and 100'
    )
    const retentionMessage = t(
      'The retention period must be a whole number of days between 7 and 365'
    )
    return z.object({
      enabled: z.boolean(),
      sample_rate: z
        .number()
        .int(rateMessage)
        .min(1, rateMessage)
        .max(100, rateMessage),
      retention_days: z
        .number()
        .int(retentionMessage)
        .min(7, retentionMessage)
        .max(365, retentionMessage),
      respect_dnt: z.boolean(),
    })
  }, [t])

  const formDefaults = useMemo<AnalyticsFormValues>(
    () => ({
      enabled: props.defaultValues['analytics_setting.enabled'],
      sample_rate: props.defaultValues['analytics_setting.sample_rate'],
      retention_days: props.defaultValues['analytics_setting.retention_days'],
      respect_dnt: props.defaultValues['analytics_setting.respect_dnt'],
    }),
    [props.defaultValues]
  )
  const form = useForm<AnalyticsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: formDefaults,
  })

  useEffect(() => {
    form.reset(formDefaults)
  }, [formDefaults, form])

  const onSubmit = async (values: AnalyticsFormValues) => {
    const names = Object.keys(OPTION_KEYS) as (keyof typeof OPTION_KEYS)[]
    for (const name of names) {
      const key = OPTION_KEYS[name]
      if (values[name] === props.defaultValues[key]) continue
      await updateOption.mutateAsync({ key, value: values[name] })
    }
  }

  const rotateMutation = useMutation({
    mutationFn: async () => requireServerSuccess(await rotateAnalyticsSecret()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-options'] })
      setConfirming(null)
      toast.success(t('Analytics hash secret rotated'))
    },
    onError: (error: Error) =>
      handleServerError(error, t('Failed to rotate the anonymous hash secret')),
  })

  const purgeMutation = useMutation({
    mutationFn: async () => requireServerSuccess(await purgeExpiredAnalytics()),
    onSuccess: (res) => {
      setConfirming(null)
      if (res.data?.handled_by_ttl) {
        toast.success(
          t('Expired analytics data is removed by the database TTL')
        )
        return
      }
      toast.success(
        t('Deleted {{deleted}} expired analytics events.', {
          deleted: formatNumber(res.data?.deleted ?? 0, locale),
        })
      )
    },
    onError: (error: Error) =>
      handleServerError(error, t('Failed to delete expired analytics data')),
  })

  const rotatedAt = props.defaultValues['analytics_setting.secret_rotated_at']

  return (
    <SettingsSection title={t('Behavior Analytics')} className='gap-6'>
      <Form {...form}>
        <SettingsForm onSubmit={form.handleSubmit(onSubmit)}>
          <SettingsPageFormActions
            onSave={form.handleSubmit(onSubmit)}
            isSaving={updateOption.isPending}
            saveLabel='Save analytics settings'
          />
          <div
            role='group'
            aria-labelledby={collectTitleId}
            className='flex min-w-0 flex-col gap-4'
          >
            <h4 id={collectTitleId} className='font-medium'>
              {t('Collection')}
            </h4>
            <FormField
              control={form.control}
              name='enabled'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enable behavior analytics')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Records page views, feature usage and performance signals to understand how the console is used. It never collects conversation content, request bodies or plaintext user identity.'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </SettingsSwitchItem>
              )}
            />
            <SettingsFormGrid>
              <FormField
                control={form.control}
                name='sample_rate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Sampling rate (%)')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={1}
                        max={100}
                        step={1}
                        {...safeNumberFieldProps(field)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'The share of devices that report events, from 1 to 100. A device is either always sampled or never.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='retention_days'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Data retention (days)')}</FormLabel>
                    <FormControl>
                      <Input
                        type='number'
                        min={7}
                        max={365}
                        step={1}
                        {...safeNumberFieldProps(field)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'Analytics events older than this are deleted automatically. Between 7 and 365 days.'
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SettingsFormGrid>
            <FormField
              control={form.control}
              name='respect_dnt'
              render={({ field }) => (
                <SettingsSwitchItem>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Respect Do Not Track')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Skip tracking for browsers that send Do Not Track or Global Privacy Control signals.'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </SettingsSwitchItem>
              )}
            />
          </div>
        </SettingsForm>
      </Form>

      <Separator />

      <div
        role='group'
        aria-labelledby={dataTitleId}
        className='flex min-w-0 flex-col gap-4'
      >
        <div>
          <h4 id={dataTitleId} className='font-medium'>
            {t('Data management')}
          </h4>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Last anonymous hash secret rotation')}:{' '}
            {rotatedAt > 0 ? formatTimestampToDate(rotatedAt) : t('Never')}
          </p>
        </div>
        {isRoot ? (
          <div className='flex flex-wrap gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setConfirming('rotate')}
            >
              {t('Rotate anonymous hash secret')}
            </Button>
            <Button
              type='button'
              variant='destructive'
              onClick={() => setConfirming('purge')}
            >
              {t('Delete expired data now')}
            </Button>
          </div>
        ) : (
          <p className='text-muted-foreground text-sm'>
            {t('Only the super admin can rotate the secret or delete data.')}
          </p>
        )}
      </div>

      {isRoot && (
        <>
          <ConfirmDialog
            open={confirming === 'rotate'}
            onOpenChange={(open) => !open && setConfirming(null)}
            title={t('Rotate anonymous hash secret')}
            desc={t(
              'After rotation, the anonymous identifiers of signed-in users change, so cross-device association starts over from this moment. Historical events are kept but can no longer be linked to new ones.'
            )}
            confirmText={t('Rotate')}
            destructive
            isLoading={rotateMutation.isPending}
            handleConfirm={() => rotateMutation.mutate()}
          />
          <ConfirmDialog
            open={confirming === 'purge'}
            onOpenChange={(open) => !open && setConfirming(null)}
            title={t('Delete expired data now')}
            desc={t(
              'This permanently deletes analytics events older than the retention period. This action cannot be undone.'
            )}
            confirmText={t('Delete')}
            destructive
            isLoading={purgeMutation.isPending}
            handleConfirm={() => purgeMutation.mutate()}
          />
        </>
      )}
    </SettingsSection>
  )
}
