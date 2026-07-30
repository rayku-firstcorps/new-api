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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  DEFAULT_ALLOWED_EMAIL_DOMAINS,
  DEFAULT_PROMOTION_REWARD_BANNER,
  isValidPromotionBannerImageUrl,
  normalizeEmailDomainsInput,
  sanitizePromotionBannerHtml,
} from '@/features/promotions/lib'
import type { PromotionRewardBannerConfig } from '@/features/promotions/types'

import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'

type PromotionRewardSectionProps = {
  defaultValues: {
    PromotionRewardAllowedEmailDomains: string
    PromotionRewardBanner: string
  }
}

function parseBannerConfig(value: string): PromotionRewardBannerConfig {
  if (!value.trim()) return DEFAULT_PROMOTION_REWARD_BANNER
  try {
    return {
      ...DEFAULT_PROMOTION_REWARD_BANNER,
      ...JSON.parse(value),
    }
  } catch {
    return DEFAULT_PROMOTION_REWARD_BANNER
  }
}

export function PromotionRewardSection({
  defaultValues,
}: PromotionRewardSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const initialDomains = useMemo(() => {
    const parsed = normalizeEmailDomainsInput(
      defaultValues.PromotionRewardAllowedEmailDomains
    )
    return parsed.length > 0 ? parsed : [...DEFAULT_ALLOWED_EMAIL_DOMAINS]
  }, [defaultValues.PromotionRewardAllowedEmailDomains])

  const initialBanner = useMemo(
    () => parseBannerConfig(defaultValues.PromotionRewardBanner),
    [defaultValues.PromotionRewardBanner]
  )

  const [domainsText, setDomainsText] = useState(initialDomains.join('\n'))
  const [banner, setBanner] =
    useState<PromotionRewardBannerConfig>(initialBanner)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDomainsText(initialDomains.join('\n'))
    setBanner(initialBanner)
  }, [initialBanner, initialDomains])

  const save = async () => {
    const domains = normalizeEmailDomainsInput(domainsText)
    if (!isValidPromotionBannerImageUrl(banner.image_url)) {
      return
    }

    const normalizedBanner = {
      ...banner,
      title: banner.title.trim(),
      content: banner.content.trim(),
      image_url: banner.image_url.trim(),
      primary_button: banner.primary_button.trim(),
      secondary_button: banner.secondary_button.trim(),
    }

    if (normalizedBanner.content_format === 'html') {
      normalizedBanner.content = sanitizePromotionBannerHtml(
        normalizedBanner.content
      )
    }

    setSaving(true)
    try {
      await updateOption.mutateAsync({
        key: 'PromotionRewardAllowedEmailDomains',
        value: domains.join('\n'),
      })
      await updateOption.mutateAsync({
        key: 'PromotionRewardBanner',
        value: JSON.stringify(normalizedBanner),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title={t('Promotion Reward Banner')}>
      <div className='grid gap-6'>
        <div className='grid gap-2'>
          <Label>{t('Promotion Reward Allowed Email Domains')}</Label>
          <Textarea
            rows={8}
            value={domainsText}
            onChange={(e) => setDomainsText(e.target.value)}
            placeholder={DEFAULT_ALLOWED_EMAIL_DOMAINS.join('\n')}
          />
          <p className='text-muted-foreground text-xs'>
            {t('One domain per line, duplicates will be removed automatically')}
          </p>
        </div>

        <div className='grid gap-4 rounded-xl border p-4'>
          <div className='grid gap-2'>
            <Label>{t('Title')}</Label>
            <Input
              value={banner.title}
              onChange={(e) =>
                setBanner((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div className='grid gap-2 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label>{t('Banner Content Format')}</Label>
              <Select
                value={banner.content_format}
                onValueChange={(value) =>
                  setBanner((prev) => ({
                    ...prev,
                    content_format:
                      value as PromotionRewardBannerConfig['content_format'],
                  }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='plain_text'>{t('Plain Text')}</SelectItem>
                  <SelectItem value='markdown'>{t('Markdown')}</SelectItem>
                  <SelectItem value='html'>{t('HTML')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label>{t('Banner Image Position')}</Label>
              <Select
                value={banner.image_position}
                onValueChange={(value) =>
                  setBanner((prev) => ({
                    ...prev,
                    image_position:
                      value as PromotionRewardBannerConfig['image_position'],
                  }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='left'>{t('Left')}</SelectItem>
                  <SelectItem value='right'>{t('Right')}</SelectItem>
                  <SelectItem value='top'>{t('Top')}</SelectItem>
                  <SelectItem value='background'>{t('Background')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='grid gap-2'>
            <Label>{t('Content')}</Label>
            <Textarea
              rows={8}
              value={banner.content}
              onChange={(e) =>
                setBanner((prev) => ({ ...prev, content: e.target.value }))
              }
            />
          </div>

          <div className='grid gap-2 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label>{t('Banner Image URL')}</Label>
              <Input
                value={banner.image_url}
                onChange={(e) =>
                  setBanner((prev) => ({ ...prev, image_url: e.target.value }))
                }
                placeholder='https://example.com/banner.png'
              />
              {!isValidPromotionBannerImageUrl(banner.image_url) && (
                <p className='text-destructive text-xs'>
                  {t('Unsupported banner image URL')}
                </p>
              )}
            </div>

            <div className='grid gap-2'>
              <Label>{t('Primary Button')}</Label>
              <Input
                value={banner.primary_button}
                onChange={(e) =>
                  setBanner((prev) => ({
                    ...prev,
                    primary_button: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className='grid gap-2'>
            <Label>{t('Secondary Button')}</Label>
            <Input
              value={banner.secondary_button}
              onChange={(e) =>
                setBanner((prev) => ({
                  ...prev,
                  secondary_button: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => {
              setDomainsText(DEFAULT_ALLOWED_EMAIL_DOMAINS.join('\n'))
              setBanner(DEFAULT_PROMOTION_REWARD_BANNER)
            }}
          >
            {t('Reset to default')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? t('Saving...') : t('Save changes')}
          </Button>
        </div>
      </div>
    </SettingsSection>
  )
}
