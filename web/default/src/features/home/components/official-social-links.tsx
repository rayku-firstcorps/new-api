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
  type OfficialSocialPlatform,
} from '@/features/official-social-links'

type OfficialSocialLinksProps = {
  links: OfficialSocialLink[]
}

const socialButtonBaseClass =
  'h-9 min-w-0 rounded-full border px-3.5 text-xs font-semibold shadow-none'

const socialButtonToneByPlatform: Record<OfficialSocialPlatform, string> = {
  telegram:
    'border-sky-200 bg-sky-100 text-sky-800 hover:border-sky-300 hover:bg-sky-200 dark:border-sky-200 dark:bg-sky-100 dark:text-sky-900 dark:hover:bg-sky-200',
  whatsapp:
    'border-emerald-200 bg-emerald-100 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-200 dark:border-emerald-200 dark:bg-emerald-100 dark:text-emerald-900 dark:hover:bg-emerald-200',
  facebook:
    'border-blue-200 bg-blue-100 text-blue-800 hover:border-blue-300 hover:bg-blue-200 dark:border-blue-200 dark:bg-blue-100 dark:text-blue-900 dark:hover:bg-blue-200',
  instagram:
    'border-pink-200 bg-pink-100 text-pink-800 hover:border-pink-300 hover:bg-pink-200 dark:border-pink-200 dark:bg-pink-100 dark:text-pink-900 dark:hover:bg-pink-200',
  x: 'border-neutral-200 bg-neutral-100 text-neutral-800 hover:border-neutral-300 hover:bg-neutral-200 dark:border-neutral-200 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200',
  vk: 'border-sky-200 bg-sky-100 text-sky-800 hover:border-sky-300 hover:bg-sky-200 dark:border-sky-200 dark:bg-sky-100 dark:text-sky-900 dark:hover:bg-sky-200',
  custom:
    'border-slate-200 bg-slate-100 text-slate-800 hover:border-slate-300 hover:bg-slate-200 dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200',
}

export function OfficialSocialLinks(props: OfficialSocialLinksProps) {
  const { t } = useTranslation()

  if (props.links.length === 0) return null

  return (
    <TooltipProvider>
      <div
        className='flex max-w-full flex-wrap items-center justify-center gap-2'
        aria-label={t('Official Communities')}
      >
        {props.links.map((link, index) => {
          const label = getOfficialSocialLabel(link)
          const { Icon } = getOfficialSocialPlatformMeta(link.platform)
          const key = link.id || `${link.platform}-${link.url}-${index}`
          const button = (
            <Button
              className={`${socialButtonBaseClass} ${socialButtonToneByPlatform[link.platform]}`}
              aria-label={label}
              title={label}
              render={
                <a href={link.url} target='_blank' rel='noopener noreferrer' />
              }
            >
              <Icon className='size-4' aria-hidden='true' />
              <span className='max-w-28 truncate sm:max-w-36'>{label}</span>
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
