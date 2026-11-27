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
import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useChannels } from '@/features/channels/components/channels-provider'

const route = getRouteApi('/_authenticated/channels/')

/**
 * Shown on `/channels` when the admin First Setup wizard sent the admin here.
 * Opens the create drawer once and offers a way back to the wizard's
 * "check models" step. Must render inside `ChannelsProvider`.
 */
export function ChannelsReturnBanner() {
  const { t } = useTranslation()
  const search = route.useSearch()
  const { setOpen } = useChannels()
  const navigate = route.useNavigate()
  const opened = useRef(false)
  const active = search.onboarding === 'channel'

  useEffect(() => {
    if (!active || opened.current) return
    opened.current = true
    setOpen('create-channel')
  }, [active, setOpen])

  if (!active) return null

  return (
    <div
      role='region'
      aria-label={t('First Setup')}
      className='bg-card fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-xl border p-3 shadow-lg'
    >
      <p className='text-sm'>
        {t('First Setup: add a channel, then return to check your models.')}
      </p>
      <Button
        type='button'
        size='sm'
        onClick={() =>
          void navigate({ to: '/onboarding', search: { step: 1 } })
        }
      >
        {t('Return to First Setup')}
      </Button>
    </div>
  )
}
