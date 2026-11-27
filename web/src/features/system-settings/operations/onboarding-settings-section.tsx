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
import { useTranslation } from 'react-i18next'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

import {
  SettingsControlChildren,
  SettingsControlGroup,
  SettingsForm,
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import { SettingsPageFormActions } from '../components/settings-page-context'
import { SettingsSection } from '../components/settings-section'
import { useSettingsForm } from '../hooks/use-settings-form'
import { useUpdateOption } from '../hooks/use-update-option'

const onboardingSchema = z.object({
  onboarding_setting: z.object({
    enabled: z.boolean(),
    auto_open_on_first_login: z.boolean(),
    allow_inline_test_request: z.boolean(),
    show_cc_switch: z.boolean(),
    admin_guide_enabled: z.boolean(),
  }),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>
type OnboardingChildName =
  | 'onboarding_setting.auto_open_on_first_login'
  | 'onboarding_setting.allow_inline_test_request'
  | 'onboarding_setting.show_cc_switch'
  | 'onboarding_setting.admin_guide_enabled'

type OnboardingSettingsSectionProps = {
  defaultValues: Record<
    'onboarding_setting.enabled' | OnboardingChildName,
    boolean
  >
}

export function OnboardingSettingsSection(
  props: OnboardingSettingsSectionProps
) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const nestedDefaults: OnboardingFormValues = {
    onboarding_setting: {
      enabled: props.defaultValues['onboarding_setting.enabled'],
      auto_open_on_first_login:
        props.defaultValues['onboarding_setting.auto_open_on_first_login'],
      allow_inline_test_request:
        props.defaultValues['onboarding_setting.allow_inline_test_request'],
      show_cc_switch: props.defaultValues['onboarding_setting.show_cc_switch'],
      admin_guide_enabled:
        props.defaultValues['onboarding_setting.admin_guide_enabled'],
    },
  }

  const { form, handleSubmit, isSubmitting } =
    useSettingsForm<OnboardingFormValues>({
      resolver: zodResolver(onboardingSchema),
      defaultValues: nestedDefaults,
      onSubmit: async (_data, changedFields) => {
        for (const [key, value] of Object.entries(changedFields)) {
          await updateOption.mutateAsync({ key, value: value as boolean })
        }
      },
    })

  const masterEnabled = form.watch('onboarding_setting.enabled')

  const childSwitches: ReadonlyArray<{
    name: OnboardingChildName
    label: string
    description: string
  }> = [
    {
      name: 'onboarding_setting.auto_open_on_first_login',
      label: t('Open the guide automatically on first login'),
      description: t(
        'When off, new users only see the Quick Start entry in the sidebar and Overview.'
      ),
    },
    {
      name: 'onboarding_setting.allow_inline_test_request',
      label: t('Allow sending a test request in the guide'),
      description: t(
        'Shows the Send test request button in the guide. Turn off if you do not want test calls generated from it.'
      ),
    },
    {
      name: 'onboarding_setting.show_cc_switch',
      label: t('Show CC Switch one-click import'),
      description: t(
        'Highlights CC Switch in the guide and in the Overview code preview.'
      ),
    },
    {
      name: 'onboarding_setting.admin_guide_enabled',
      label: t('Admin first-run channel guide'),
      description: t(
        'Guides administrators through adding a channel when no upstream channel exists yet.'
      ),
    },
  ]

  return (
    <SettingsSection title={t('User Onboarding')}>
      <Form {...form}>
        <SettingsForm onSubmit={handleSubmit}>
          <SettingsPageFormActions
            onSave={handleSubmit}
            isSaving={updateOption.isPending || isSubmitting}
          />
          <SettingsControlGroup>
            <FormField
              control={form.control}
              name='onboarding_setting.enabled'
              render={({ field }) => (
                <SettingsSwitchItem className='py-0'>
                  <SettingsSwitchContent>
                    <FormLabel>{t('Enable user onboarding')}</FormLabel>
                    <FormDescription>
                      {t(
                        'When off, the First Setup guide and its entry points are hidden and users go straight to Overview. The options below keep their values.'
                      )}
                    </FormDescription>
                  </SettingsSwitchContent>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </SettingsSwitchItem>
              )}
            />
            <SettingsControlChildren className='space-y-1'>
              {childSwitches.map((item) => (
                <FormField
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  render={({ field }) => (
                    <SettingsSwitchItem>
                      <SettingsSwitchContent>
                        <FormLabel>{item.label}</FormLabel>
                        <FormDescription>{item.description}</FormDescription>
                      </SettingsSwitchContent>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!masterEnabled}
                        />
                      </FormControl>
                    </SettingsSwitchItem>
                  )}
                />
              ))}
            </SettingsControlChildren>
          </SettingsControlGroup>
        </SettingsForm>
      </Form>
    </SettingsSection>
  )
}
