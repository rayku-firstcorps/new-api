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
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getOfficialSocialLabel,
  getOfficialSocialPlatformMeta,
  isOfficialSocialPlatform,
  isSafeOfficialSocialUrl,
  OFFICIAL_SOCIAL_PLATFORM_META,
  parseOfficialSocialLinks,
  type OfficialSocialLink,
  type OfficialSocialPlatform,
} from '@/features/official-social-links'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type OfficialSocialLinksSectionProps = {
  data: string
}

type ValidationResult =
  | { ok: true; links: OfficialSocialLink[] }
  | { ok: false; message: string }

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `social-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createLink(sort: number): OfficialSocialLink {
  return {
    id: createId(),
    platform: 'telegram',
    label: 'Telegram',
    url: '',
    enabled: true,
    sort,
  }
}

function canonicalUrl(value: string) {
  const parsed = new URL(value.trim())
  parsed.hostname = parsed.hostname.toLowerCase()
  parsed.protocol = 'https:'
  return parsed.toString()
}

function validateLinks(
  links: OfficialSocialLink[],
  t: (key: string, options?: Record<string, unknown>) => string
): ValidationResult {
  const seenUrls = new Set<string>()

  const normalized = links
    .map((link, index) => ({
      ...link,
      id: link.id || createId(),
      platform: isOfficialSocialPlatform(link.platform)
        ? link.platform
        : ('custom' as const),
      label: link.label.trim(),
      url: link.url.trim(),
      sort: Number.isFinite(Number(link.sort)) ? Number(link.sort) : index + 1,
    }))
    .sort((a, b) => {
      if (a.sort === b.sort) return a.id.localeCompare(b.id || '')
      return a.sort - b.sort
    })

  for (const [index, link] of normalized.entries()) {
    if (!link.url && link.enabled) {
      return {
        ok: false,
        message: t('Community link is required for enabled entries'),
      }
    }

    if (link.url) {
      if (!isSafeOfficialSocialUrl(link.url)) {
        return {
          ok: false,
          message: t('Please enter a valid community link'),
        }
      }

      const canonical = canonicalUrl(link.url)
      if (seenUrls.has(canonical)) {
        return {
          ok: false,
          message: t('Community link URL must be unique'),
        }
      }
      seenUrls.add(canonical)
    }

    normalized[index] = {
      ...link,
      label: link.label || getOfficialSocialPlatformMeta(link.platform).label,
    }
  }

  return { ok: true, links: normalized }
}

export function OfficialSocialLinksSection({
  data,
}: OfficialSocialLinksSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()
  const [links, setLinks] = useState<OfficialSocialLink[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setLinks(parseOfficialSocialLinks(data))
    setHasChanges(false)
  }, [data])

  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        if (a.sort === b.sort) {
          return (a.id || '').localeCompare(b.id || '')
        }
        return a.sort - b.sort
      }),
    [links]
  )

  const updateLink = (
    id: string | undefined,
    patch: Partial<OfficialSocialLink>
  ) => {
    setLinks((prev) =>
      prev.map((link) => {
        if (link.id !== id) return link

        const next = { ...link, ...patch }
        if (patch.platform) {
          const meta = getOfficialSocialPlatformMeta(patch.platform)
          const previousDefault = getOfficialSocialPlatformMeta(
            link.platform
          ).label
          next.label =
            !link.label || link.label === previousDefault
              ? meta.label
              : link.label
        }
        return next
      })
    )
    setHasChanges(true)
  }

  const handleAdd = () => {
    const nextSort =
      sortedLinks.length > 0
        ? Math.max(...sortedLinks.map((item) => Number(item.sort) || 0)) + 10
        : 10
    setLinks((prev) => [...prev, createLink(nextSort)])
    setHasChanges(true)
  }

  const handleDelete = (id: string | undefined) => {
    setLinks((prev) => prev.filter((link) => link.id !== id))
    setHasChanges(true)
  }

  const handleMove = (id: string | undefined, direction: -1 | 1) => {
    const currentIndex = sortedLinks.findIndex((link) => link.id === id)
    const targetIndex = currentIndex + direction
    if (
      currentIndex < 0 ||
      targetIndex < 0 ||
      targetIndex >= sortedLinks.length
    ) {
      return
    }

    const current = sortedLinks[currentIndex]
    const target = sortedLinks[targetIndex]
    setLinks((prev) =>
      prev.map((link) => {
        if (link.id === current.id) return { ...link, sort: target.sort }
        if (link.id === target.id) return { ...link, sort: current.sort }
        return link
      })
    )
    setHasChanges(true)
  }

  const handleSave = async () => {
    const validation = validateLinks(links, t)
    if (!validation.ok) {
      toast.error(validation.message)
      return
    }

    try {
      await updateOption.mutateAsync({
        key: 'OfficialSocialLinks',
        value: JSON.stringify(validation.links),
      })
      setLinks(validation.links)
      setHasChanges(false)
      toast.success(t('Official communities saved successfully'))
    } catch {
      toast.error(t('Failed to save official communities'))
    }
  }

  return (
    <SettingsSection
      title={t('Official Communities')}
      description={t(
        'Configure official social and community links shown on the home page'
      )}
    >
      <TooltipProvider>
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center gap-2'>
            <Button onClick={handleAdd} size='sm'>
              <Plus className='mr-2 h-4 w-4' />
              {t('Add Community Link')}
            </Button>
            <Button
              onClick={handleSave}
              size='sm'
              variant='secondary'
              disabled={!hasChanges || updateOption.isPending}
            >
              <Save className='mr-2 h-4 w-4' />
              {updateOption.isPending ? t('Saving...') : t('Save Settings')}
            </Button>
          </div>

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='min-w-40'>
                    {t('Social Platform')}
                  </TableHead>
                  <TableHead className='min-w-44'>
                    {t('Display Name')}
                  </TableHead>
                  <TableHead className='min-w-72'>
                    {t('Community Link')}
                  </TableHead>
                  <TableHead className='w-24'>{t('Sort')}</TableHead>
                  <TableHead className='w-28'>{t('Enabled')}</TableHead>
                  <TableHead className='w-36'>{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-24 text-center'>
                      {t(
                        'No community links yet. Click "Add Community Link" to create one.'
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLinks.map((link, index) => {
                    const meta = getOfficialSocialPlatformMeta(link.platform)
                    const Icon = meta.Icon
                    const label = getOfficialSocialLabel(link)

                    return (
                      <TableRow key={link.id}>
                        <TableCell>
                          <Select
                            value={link.platform}
                            onValueChange={(value) =>
                              updateLink(link.id, {
                                platform: value as OfficialSocialPlatform,
                              })
                            }
                          >
                            <SelectTrigger className='w-full'>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              <SelectGroup>
                                {OFFICIAL_SOCIAL_PLATFORM_META.map((option) => {
                                  const OptionIcon = option.Icon
                                  return (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      <OptionIcon className='size-4' />
                                      {option.label}
                                    </SelectItem>
                                  )
                                })}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={link.label}
                            placeholder={meta.label}
                            onChange={(event) =>
                              updateLink(link.id, {
                                label: event.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Icon className='text-muted-foreground size-4 shrink-0' />
                            <Input
                              value={link.url}
                              placeholder={meta.placeholder}
                              onChange={(event) =>
                                updateLink(link.id, {
                                  url: event.target.value,
                                })
                              }
                            />
                            {isSafeOfficialSocialUrl(link.url) && (
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      size='icon-sm'
                                      variant='ghost'
                                      aria-label={t('Open in new tab')}
                                      render={
                                        <a
                                          href={link.url}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                        />
                                      }
                                    >
                                      <ExternalLink className='h-4 w-4' />
                                    </Button>
                                  }
                                ></TooltipTrigger>
                                <TooltipContent>
                                  {t('Open in new tab')}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type='number'
                            value={link.sort}
                            onChange={(event) =>
                              updateLink(link.id, {
                                sort: Number(event.target.value),
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-2'>
                            <Switch
                              checked={link.enabled}
                              onCheckedChange={(checked) =>
                                updateLink(link.id, { enabled: checked })
                              }
                            />
                            <span className='sr-only'>
                              {t('Enable This Link')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    size='icon-sm'
                                    variant='ghost'
                                    aria-label={t('Move up')}
                                    disabled={index === 0}
                                    onClick={() => handleMove(link.id, -1)}
                                  >
                                    <ArrowUp className='h-4 w-4' />
                                  </Button>
                                }
                              ></TooltipTrigger>
                              <TooltipContent>{t('Move up')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    size='icon-sm'
                                    variant='ghost'
                                    aria-label={t('Move down')}
                                    disabled={index === sortedLinks.length - 1}
                                    onClick={() => handleMove(link.id, 1)}
                                  >
                                    <ArrowDown className='h-4 w-4' />
                                  </Button>
                                }
                              ></TooltipTrigger>
                              <TooltipContent>{t('Move down')}</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    size='icon-sm'
                                    variant='ghost'
                                    aria-label={t('Delete')}
                                    onClick={() => handleDelete(link.id)}
                                  >
                                    <Trash2 className='h-4 w-4' />
                                  </Button>
                                }
                              ></TooltipTrigger>
                              <TooltipContent>{t('Delete')}</TooltipContent>
                            </Tooltip>
                          </div>
                          <span className='sr-only'>{label}</span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </TooltipProvider>
    </SettingsSection>
  )
}
