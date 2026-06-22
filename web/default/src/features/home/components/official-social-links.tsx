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
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getOfficialSocialLabel,
  getOfficialSocialPlatformMeta,
  type OfficialSocialLink,
} from '@/features/official-social-links'

type OfficialSocialLinksProps = {
  links: OfficialSocialLink[]
}

export function OfficialSocialLinks({ links }: OfficialSocialLinksProps) {
  const { t } = useTranslation()

  if (links.length === 0) return null

  if (links.length === 1) {
    const link = links[0]
    const label = getOfficialSocialLabel(link)
    const { Icon } = getOfficialSocialPlatformMeta(link.platform)

    return (
      <Button
        variant='outline'
        className='border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-5 text-sm font-medium'
        render={<a href={link.url} target='_blank' rel='noopener noreferrer' />}
      >
        <Icon className='size-4' aria-hidden='true' />
        <span className='max-w-48 truncate'>
          {label || t('Join Official Community')}
        </span>
      </Button>
    )
  }

  return (
    <TooltipProvider>
      <div
        className='flex flex-wrap items-center justify-center gap-2'
        aria-label={t('Official Communities')}
      >
        {links.map((link, index) => {
          const label = getOfficialSocialLabel(link)
          const { Icon } = getOfficialSocialPlatformMeta(link.platform)
          const key = link.id || `${link.platform}-${link.url}-${index}`
          const button = (
            <Button
              variant='outline'
              size='icon'
              className='border-border/50 hover:border-border hover:bg-muted/50 rounded-lg'
              aria-label={label}
              render={
                <a href={link.url} target='_blank' rel='noopener noreferrer' />
              }
            >
              <Icon className='size-4' aria-hidden='true' />
            </Button>
          )

          return (
            <Tooltip key={key}>
              <TooltipTrigger render={button}></TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
