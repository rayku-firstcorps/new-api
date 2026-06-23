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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SettingsSection } from '../components/settings-section'
import { useUpdateOption } from '../hooks/use-update-option'
import { sanitizePromotionBannerHtml } from '@/features/promotions/lib'
import {
  DEFAULT_SPLASH_AD_CONFIG,
  type SplashAdConfig,
  type SplashAdContentFormat,
} from '@/features/splash-ad/types'

type SplashAdSectionProps = {
  defaultValues: {
    SplashAdConfig: string
  }
}

function parseConfig(value: string): SplashAdConfig {
  if (!value.trim()) return { ...DEFAULT_SPLASH_AD_CONFIG }
  try {
    return { ...DEFAULT_SPLASH_AD_CONFIG, ...JSON.parse(value) }
  } catch {
    return { ...DEFAULT_SPLASH_AD_CONFIG }
  }
}

/** Unix seconds → value for <input type="datetime-local"> (local time). */
function unixToLocalInput(unix: number): string {
  if (!unix || unix <= 0) return ''
  const d = new Date(unix * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local string → Unix seconds (0 when empty). */
function localInputToUnix(value: string): number {
  if (!value) return 0
  const ms = new Date(value).getTime()
  if (Number.isNaN(ms)) return 0
  return Math.floor(ms / 1000)
}

export function SplashAdSection({ defaultValues }: SplashAdSectionProps) {
  const { t } = useTranslation()
  const updateOption = useUpdateOption()

  const initialConfig = useMemo(
    () => parseConfig(defaultValues.SplashAdConfig),
    [defaultValues.SplashAdConfig]
  )

  const [config, setConfig] = useState<SplashAdConfig>(initialConfig)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setConfig(initialConfig)
  }, [initialConfig])

  const save = async () => {
    const normalized: SplashAdConfig = {
      ...config,
      title: config.title.trim(),
      content: config.content.trim(),
      image_url: config.image_url.trim(),
      cta_text: config.cta_text.trim(),
      cta_link: config.cta_link.trim() || '/sign-up',
    }
    if (normalized.content_format === 'html') {
      normalized.content = sanitizePromotionBannerHtml(normalized.content)
    }

    setSaving(true)
    try {
      await updateOption.mutateAsync({
        key: 'SplashAdConfig',
        value: JSON.stringify(normalized),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection title={t('Splash Ad')}>
      <div className='grid gap-6'>
        <div className='flex items-center justify-between rounded-xl border p-4'>
          <div className='grid gap-1'>
            <Label>{t('Enable Splash Ad')}</Label>
            <p className='text-muted-foreground text-xs'>
              {t('Shown once per day to logged-out visitors only')}
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, enabled: checked }))
            }
          />
        </div>

        <div className='grid gap-4 rounded-xl border p-4'>
          <div className='grid gap-2'>
            <Label>{t('Title')}</Label>
            <Input
              value={config.title}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, title: e.target.value }))
              }
            />
          </div>

          <div className='grid gap-2'>
            <Label>{t('Banner Content Format')}</Label>
            <Select
              value={config.content_format}
              onValueChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  content_format: value as SplashAdContentFormat,
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
            <Label>{t('Content')}</Label>
            <Textarea
              rows={6}
              value={config.content}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, content: e.target.value }))
              }
            />
          </div>

          <div className='grid gap-2'>
            <Label>{t('Reward Amount')}</Label>
            <Input
              type='number'
              step='0.01'
              min={0}
              value={config.reward_amount}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  reward_amount:
                    e.target.value === '' ? 0 : e.currentTarget.valueAsNumber,
                }))
              }
              placeholder='5'
            />
            <p className='text-muted-foreground text-xs'>
              {t('Use {amount} in the title or content; it will be replaced with this value')}
            </p>
          </div>

          <div className='grid gap-2'>
            <Label>{t('Banner Image URL')}</Label>
            <Input
              value={config.image_url}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, image_url: e.target.value }))
              }
              placeholder='https://example.com/splash.png'
            />
          </div>

          <div className='grid gap-2 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label>{t('CTA Button Text')}</Label>
              <Input
                value={config.cta_text}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, cta_text: e.target.value }))
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label>{t('CTA Link')}</Label>
              <Input
                value={config.cta_link}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, cta_link: e.target.value }))
                }
                placeholder='/sign-up'
              />
            </div>
          </div>

          <div className='grid gap-2 md:grid-cols-2'>
            <div className='grid gap-2'>
              <Label>{t('Start Time')}</Label>
              <Input
                type='datetime-local'
                value={unixToLocalInput(config.start_time)}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    start_time: localInputToUnix(e.target.value),
                  }))
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label>{t('End Time')}</Label>
              <Input
                type='datetime-local'
                value={unixToLocalInput(config.end_time)}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    end_time: localInputToUnix(e.target.value),
                  }))
                }
              />
            </div>
          </div>
          <p className='text-muted-foreground text-xs'>
            {t('Leave time empty for no limit')}
          </p>
        </div>

        <div className='flex justify-end gap-2'>
          <Button
            variant='outline'
            onClick={() => setConfig({ ...DEFAULT_SPLASH_AD_CONFIG })}
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
