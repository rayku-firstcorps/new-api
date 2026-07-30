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
import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  confirmSSOAuthorize,
  denySSOAuthorize,
  getSSOAuthorizeInfo,
} from '@/features/system-settings/auth/sso-client/api'
import { getSelf } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

const authorizeSearchSchema = z.object({
  client_id: z.string().optional(),
  redirect_uri: z.string().optional(),
  state: z.string().optional(),
  scope: z.string().optional(),
})

export const Route = createFileRoute('/sso/authorize')({
  validateSearch: authorizeSearchSchema,
  beforeLoad: async ({ location }) => {
    const res = await getSelf().catch(() => null)
    if (!res?.success || !res.data) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }
    useAuthStore.getState().auth.setUser(res.data)
  },
  component: SSOAuthorizePage,
})

function SSOAuthorizePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const params = useMemo(
    () => ({
      client_id: search.client_id || '',
      redirect_uri: search.redirect_uri || '',
      scope: search.scope || 'profile access_token',
      state: search.state || '',
    }),
    [search.client_id, search.redirect_uri, search.scope, search.state]
  )

  const missingParams = !params.client_id || !params.redirect_uri

  const authorizeInfo = useQuery({
    queryKey: ['sso-authorize', params],
    enabled: !missingParams,
    queryFn: async () => {
      const res = await getSSOAuthorizeInfo({
        client_id: params.client_id,
        redirect_uri: params.redirect_uri,
        scope: params.scope,
      })
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to load authorization request')
      }
      return res.data
    },
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmSSOAuthorize(params),
    onSuccess: (res) => {
      if (res.success && res.data?.redirect_url) {
        window.location.href = res.data.redirect_url
        return
      }
      toast.error(res.message || t('Authorization failed'))
    },
    onError: (error: Error) => {
      toast.error(error.message || t('Authorization failed'))
    },
  })

  const denyMutation = useMutation({
    mutationFn: () => denySSOAuthorize(params),
    onSuccess: (res) => {
      if (res.success && res.data?.redirect_url) {
        window.location.href = res.data.redirect_url
        return
      }
      navigate({ to: '/dashboard' })
    },
    onError: (error: Error) => {
      toast.error(error.message || t('Failed to deny authorization'))
    },
  })

  useEffect(() => {
    if (missingParams) {
      toast.error(t('Invalid authorization request'))
    }
  }, [missingParams, t])

  const isPending = confirmMutation.isPending || denyMutation.isPending

  return (
    <main className='bg-background flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-lg'>
        <CardHeader>
          <div className='bg-primary/10 text-primary mb-2 flex h-10 w-10 items-center justify-center rounded-lg'>
            <ShieldCheck className='h-5 w-5' />
          </div>
          <CardTitle>{t('Authorize Application')}</CardTitle>
          <CardDescription>
            {t(
              'Review the request before allowing this application to access your new-api account.'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-5'>
          {missingParams ? (
            <div className='text-destructive text-sm'>
              {t('The authorization request is missing required parameters.')}
            </div>
          ) : authorizeInfo.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-5 w-2/3' />
              <Skeleton className='h-5 w-full' />
              <Skeleton className='h-5 w-4/5' />
            </div>
          ) : authorizeInfo.error ? (
            <div className='text-destructive text-sm'>
              {authorizeInfo.error.message}
            </div>
          ) : authorizeInfo.data ? (
            <>
              <div className='space-y-1'>
                <div className='text-muted-foreground text-xs'>
                  {t('Application')}
                </div>
                <div className='font-medium'>
                  {authorizeInfo.data.client.name}
                </div>
                <div className='text-muted-foreground font-mono text-xs'>
                  {authorizeInfo.data.client.client_id}
                </div>
              </div>

              <div className='space-y-1'>
                <div className='text-muted-foreground text-xs'>
                  {t('Signed in as')}
                </div>
                <div className='font-medium'>
                  {authorizeInfo.data.user.username}
                </div>
                <div className='text-muted-foreground text-xs'>
                  {t('User ID')}: {authorizeInfo.data.user.id}
                </div>
              </div>

              <div className='space-y-2'>
                <div className='text-muted-foreground text-xs'>
                  {t('Requested scopes')}
                </div>
                <div className='flex flex-wrap gap-2'>
                  {authorizeInfo.data.scope.map((scope) => (
                    <Badge key={scope} variant='secondary'>
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className='bg-muted/40 rounded-lg border p-3 text-sm'>
                {t(
                  'This application will receive a system management access token. It cannot directly call model APIs without a separate API key.'
                )}
              </div>
            </>
          ) : null}
        </CardContent>

        <CardFooter className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => denyMutation.mutate()}
            disabled={isPending || missingParams}
          >
            <X className='mr-1.5 h-4 w-4' />
            {t('Deny')}
          </Button>
          <Button
            onClick={() => confirmMutation.mutate()}
            disabled={
              isPending ||
              missingParams ||
              authorizeInfo.isLoading ||
              !!authorizeInfo.error
            }
          >
            <ShieldCheck className='mr-1.5 h-4 w-4' />
            {confirmMutation.isPending ? t('Authorizing...') : t('Authorize')}
          </Button>
        </CardFooter>
      </Card>
    </main>
  )
}
