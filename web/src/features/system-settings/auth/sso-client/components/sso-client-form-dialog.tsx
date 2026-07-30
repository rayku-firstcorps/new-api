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
import { useEffect } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import {
  useCreateSSOClient,
  useUpdateSSOClient,
} from '../hooks/use-sso-client-mutations'
import {
  ssoClientFormSchema,
  type SSOClient,
  type SSOClientFormValues,
} from '../types'

type SSOClientFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: SSOClient | null
}

function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function scopesToArray(value: string): string[] {
  return value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function SSOClientFormDialog(props: SSOClientFormDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!props.client
  const createClient = useCreateSSOClient()
  const updateClient = useUpdateSSOClient()

  const form = useForm<SSOClientFormValues>({
    resolver: zodResolver(
      ssoClientFormSchema
    ) as unknown as Resolver<SSOClientFormValues>,
    defaultValues: {
      name: '',
      client_id: '',
      client_secret: '',
      enabled: true,
      redirect_uris_text: '',
      allowed_scopes_text: 'profile access_token',
    },
  })

  useEffect(() => {
    if (props.open && props.client) {
      form.reset({
        name: props.client.name,
        client_id: props.client.client_id,
        client_secret: '',
        enabled: props.client.enabled,
        redirect_uris_text: props.client.redirect_uris.join('\n'),
        allowed_scopes_text:
          props.client.allowed_scopes.join(' ') || 'profile access_token',
      })
    } else if (props.open && !props.client) {
      form.reset({
        name: '',
        client_id: '',
        client_secret: '',
        enabled: true,
        redirect_uris_text: '',
        allowed_scopes_text: 'profile access_token',
      })
    }
  }, [form, props.client, props.open])

  const onSubmit = async (values: SSOClientFormValues) => {
    const payload = {
      name: values.name,
      client_id: values.client_id,
      client_secret: values.client_secret,
      enabled: values.enabled,
      redirect_uris: linesToArray(values.redirect_uris_text),
      allowed_scopes: scopesToArray(values.allowed_scopes_text),
    }

    if (isEditing && props.client) {
      const res = await updateClient.mutateAsync({
        id: props.client.id,
        data: payload,
      })
      if (res.success) props.onOpenChange(false)
    } else {
      const res = await createClient.mutateAsync(payload)
      if (res.success) props.onOpenChange(false)
    }
  }

  const isPending = createClient.isPending || updateClient.isPending

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('Edit SSO Application') : t('Add SSO Application')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'Configure an application that can request user-approved new-api access tokens.'
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-5'>
            <FormField
              control={form.control}
              name='enabled'
              render={({ field }) => (
                <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                  <div className='space-y-0.5'>
                    <FormLabel className='text-base'>{t('Enabled')}</FormLabel>
                    <FormDescription>
                      {t(
                        'Allow this application to request user authorization'
                      )}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Application Name')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('e.g. Desktop Client')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='client_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Client ID')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='your-client-id'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='client_secret'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Client Secret')}</FormLabel>
                  <FormControl>
                    <Input
                      type='password'
                      placeholder={
                        isEditing
                          ? t('Leave empty to keep existing secret')
                          : t('Client secret')
                      }
                      autoComplete='new-password'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='redirect_uris_text'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Redirect URIs')}</FormLabel>
                  <FormControl>
                    <Textarea
                      className='min-h-[92px] font-mono text-xs'
                      placeholder='https://your-app.example.com/new-api/callback'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('One exact redirect URI per line.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='allowed_scopes_text'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Allowed Scopes')}</FormLabel>
                  <FormControl>
                    <Input placeholder='profile access_token' {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('Space-separated scopes this application may request.')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => props.onOpenChange(false)}
                disabled={isPending}
              >
                {t('Cancel')}
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending
                  ? t('Saving...')
                  : isEditing
                    ? t('Update Application')
                    : t('Create Application')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
