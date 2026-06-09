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
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnDef,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Gift, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatTimestampToDate } from '@/lib/format'
import {
  useSystemConfigStore,
  DEFAULT_CURRENCY_CONFIG,
} from '@/stores/system-config-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DateTimePicker } from '@/components/datetime-picker'
import { CopyButton } from '@/components/copy-button'
import { SectionPageLayout } from '@/components/layout'
import {
  createPromotion,
  deletePromotion,
  disablePromotion,
  enablePromotion,
  getPromotionRegistrations,
  getPromotions,
  updatePromotion,
} from './api'
import {
  DEFAULT_TRIAL_COUPON_AMOUNT,
  getPromotionActivityLabel,
  getPromotionRewardStatusLabel,
} from './lib'
import type {
  PromotionActivityType,
  PromotionFormData,
  PromotionLink,
  PromotionRegistration,
} from './types'

const ACTIVITY_OPTIONS: PromotionActivityType[] = [
  'quota_reward',
  'trial_coupon',
  'none',
]

function PromotionDrawer({
  open,
  onOpenChange,
  currentRow,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: PromotionLink
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const quotaPerUnit = useSystemConfigStore(
    (s) =>
      s.config.currency?.quotaPerUnit ?? DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  )

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [channelTag, setChannelTag] = useState('')
  const [activityType, setActivityType] =
    useState<PromotionActivityType>('quota_reward')
  const [landingTitle, setLandingTitle] = useState('')
  const [landingContentFormat, setLandingContentFormat] = useState<
    'plain_text' | 'markdown' | 'html'
  >('plain_text')
  const [landingContent, setLandingContent] = useState('')
  const [landingImageUrl, setLandingImageUrl] = useState('')
  const [landingImagePosition, setLandingImagePosition] = useState<
    'left' | 'right' | 'top' | 'background'
  >('right')
  const [landingMinWidth, setLandingMinWidth] = useState(960)
  const [landingMinHeight, setLandingMinHeight] = useState(720)
  const [landingPrimaryButton, setLandingPrimaryButton] = useState('')
  const [landingSecondaryButton, setLandingSecondaryButton] = useState('')
  const [rewardAmount, setRewardAmount] = useState(10)
  const [trialCouponAmount, setTrialCouponAmount] = useState(
    DEFAULT_TRIAL_COUPON_AMOUNT
  )
  const [firstTopupRewardAmount, setFirstTopupRewardAmount] = useState(0)
  const [firstTopupMinAmount, setFirstTopupMinAmount] = useState(0)
  const [maxRegistrations, setMaxRegistrations] = useState(0)
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(undefined)
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (currentRow) {
      setCode(currentRow.code)
      setName(currentRow.name)
      setChannelTag(currentRow.channel_tag)
      setLandingTitle(currentRow.landing_title ?? '')
      setLandingContentFormat(
        currentRow.landing_content_format ?? 'plain_text'
      )
      setLandingContent(currentRow.landing_content ?? '')
      setLandingImageUrl(currentRow.landing_image_url ?? '')
      setLandingImagePosition(currentRow.landing_image_position ?? 'right')
      setLandingMinWidth(currentRow.landing_min_width ?? 960)
      setLandingMinHeight(currentRow.landing_min_height ?? 720)
      setLandingPrimaryButton(currentRow.landing_primary_button ?? '')
      setLandingSecondaryButton(currentRow.landing_secondary_button ?? '')
      setActivityType(currentRow.activity_type ?? 'quota_reward')
      setRewardAmount((currentRow.reward_quota ?? 0) / quotaPerUnit)
      setTrialCouponAmount(
        (currentRow.trial_coupon_quota || 5 * quotaPerUnit) / quotaPerUnit
      )
      setFirstTopupRewardAmount(
        (currentRow.first_topup_reward_quota ?? 0) / quotaPerUnit
      )
      setFirstTopupMinAmount(currentRow.first_topup_min_amount ?? 0)
      setMaxRegistrations(currentRow.max_registrations)
      setExpiresAt(
        currentRow.expires_at ? new Date(currentRow.expires_at * 1000) : undefined
      )
      setEnabled(currentRow.enabled)
      return
    }
    setCode('')
    setName('')
    setChannelTag('')
    setLandingTitle('')
    setLandingContentFormat('plain_text')
    setLandingContent('')
    setLandingImageUrl('')
    setLandingImagePosition('right')
    setLandingMinWidth(960)
    setLandingMinHeight(720)
    setLandingPrimaryButton('')
    setLandingSecondaryButton('')
    setActivityType('quota_reward')
    setRewardAmount(10)
    setTrialCouponAmount(DEFAULT_TRIAL_COUPON_AMOUNT)
    setFirstTopupRewardAmount(0)
    setFirstTopupMinAmount(0)
    setMaxRegistrations(0)
    setExpiresAt(undefined)
    setEnabled(true)
  }, [currentRow, open, quotaPerUnit])

  const handleSubmit = async () => {
    const payload: PromotionFormData = {
      code: code.trim(),
      name: name.trim(),
      channel_tag: channelTag.trim(),
      landing_title: landingTitle.trim(),
      landing_content_format: landingContentFormat,
      landing_content: landingContent.trim(),
      landing_image_url: landingImageUrl.trim(),
      landing_image_position: landingImagePosition,
      landing_min_width: Math.max(0, Math.round(landingMinWidth || 0)),
      landing_min_height: Math.max(0, Math.round(landingMinHeight || 0)),
      landing_primary_button: landingPrimaryButton.trim(),
      landing_secondary_button: landingSecondaryButton.trim(),
      activity_type: activityType,
      reward_quota:
        activityType === 'quota_reward'
          ? Math.round(rewardAmount * quotaPerUnit)
          : 0,
      trial_coupon_quota:
        activityType === 'trial_coupon'
          ? Math.round(trialCouponAmount * quotaPerUnit)
          : 0,
      first_topup_reward_quota: Math.round(
        firstTopupRewardAmount * quotaPerUnit
      ),
      first_topup_min_amount: firstTopupMinAmount,
      max_registrations: maxRegistrations,
      expires_at: expiresAt ? Math.floor(expiresAt.getTime() / 1000) : 0,
      enabled,
    }

    if (!payload.code || !payload.name || !payload.channel_tag) {
      toast.error(t('Please fill in the required fields'))
      return
    }

    setSaving(true)
    try {
      const res = currentRow
        ? await updatePromotion(currentRow.id, payload)
        : await createPromotion(payload)
      if (res.success) {
        toast.success(t('Saved successfully'))
        onOpenChange(false)
        onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl'>
        <DialogHeader>
          <DialogTitle>
            {currentRow ? t('Update Promotion Link') : t('Create Promotion Link')}
          </DialogTitle>
          <DialogDescription>
            {t('Manage registration attribution links and reward quotas')}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-code'>{t('Promotion Code')}</Label>
            <Input
              id='promotion-code'
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-name'>{t('Name')}</Label>
            <Input
              id='promotion-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-channel-tag'>{t('Channel Tag')}</Label>
            <Input
              id='promotion-channel-tag'
              value={channelTag}
              onChange={(e) => setChannelTag(e.target.value)}
            />
          </div>
          <div className='grid gap-2'>
            <Label>{t('Activity Type')}</Label>
            <Select
              value={activityType}
              onValueChange={(value) =>
                setActivityType(value as PromotionActivityType)
              }
            >
              <SelectTrigger className='w-full'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(getPromotionActivityLabel(item))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='grid gap-2 md:col-span-2'>
            <Label htmlFor='promotion-landing-title'>
              {t('Landing Popup Title')}
            </Label>
            <Input
              id='promotion-landing-title'
              value={landingTitle}
              onChange={(e) => setLandingTitle(e.target.value)}
              placeholder={name || t('Promotion title')}
            />
          </div>

          <div className='grid gap-2'>
            <Label>{t('Landing Content Format')}</Label>
            <Select
              value={landingContentFormat}
              onValueChange={(value) =>
                setLandingContentFormat(value as 'plain_text' | 'markdown' | 'html')
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
            <Label>{t('Landing Image Position')}</Label>
            <Select
              value={landingImagePosition}
              onValueChange={(value) =>
                setLandingImagePosition(
                  value as 'left' | 'right' | 'top' | 'background'
                )
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

          <div className='grid gap-2 md:col-span-2'>
            <Label htmlFor='promotion-landing-content'>
              {t('Landing Popup Content')}
            </Label>
            <Textarea
              id='promotion-landing-content'
              rows={6}
              value={landingContent}
              onChange={(e) => setLandingContent(e.target.value)}
            />
          </div>

          <div className='grid gap-2 md:col-span-2'>
            <Label htmlFor='promotion-landing-image-url'>
              {t('Landing Popup Image URL')}
            </Label>
            <Input
              id='promotion-landing-image-url'
              value={landingImageUrl}
              onChange={(e) => setLandingImageUrl(e.target.value)}
              placeholder='https://example.com/banner.png'
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='promotion-landing-min-width'>
              {t('Landing Popup Min Width (px)')}
            </Label>
            <Input
              id='promotion-landing-min-width'
              type='number'
              min='0'
              step='1'
              value={landingMinWidth}
              onChange={(e) => setLandingMinWidth(Number(e.target.value || 0))}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='promotion-landing-min-height'>
              {t('Landing Popup Min Height (px)')}
            </Label>
            <Input
              id='promotion-landing-min-height'
              type='number'
              min='0'
              step='1'
              value={landingMinHeight}
              onChange={(e) => setLandingMinHeight(Number(e.target.value || 0))}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='promotion-landing-primary-button'>
              {t('Landing Primary Button')}
            </Label>
            <Input
              id='promotion-landing-primary-button'
              value={landingPrimaryButton}
              onChange={(e) => setLandingPrimaryButton(e.target.value)}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='promotion-landing-secondary-button'>
              {t('Landing Secondary Button')}
            </Label>
            <Input
              id='promotion-landing-secondary-button'
              value={landingSecondaryButton}
              onChange={(e) => setLandingSecondaryButton(e.target.value)}
            />
          </div>

          {activityType === 'quota_reward' && (
            <div className='grid gap-2'>
              <Label htmlFor='promotion-reward-amount'>
                {t('Registration Reward')}
              </Label>
              <Input
                id='promotion-reward-amount'
                type='number'
                step='0.01'
                value={rewardAmount}
                onChange={(e) => setRewardAmount(Number(e.target.value || 0))}
              />
              <p className='text-muted-foreground text-xs'>
                {t('0 means no registration reward')}
              </p>
            </div>
          )}

          {activityType === 'trial_coupon' && (
            <div className='grid gap-2'>
              <Label htmlFor='promotion-trial-coupon-amount'>
                {t('Trial Coupon Amount')}
              </Label>
              <Input
                id='promotion-trial-coupon-amount'
                type='number'
                step='0.01'
                value={trialCouponAmount}
                onChange={(e) =>
                  setTrialCouponAmount(Number(e.target.value || 0))
                }
              />
            </div>
          )}

          <div className='grid gap-2'>
            <Label htmlFor='promotion-first-topup-reward-amount'>
              {t('First Topup Reward')}
            </Label>
            <Input
              id='promotion-first-topup-reward-amount'
              type='number'
              step='0.01'
              value={firstTopupRewardAmount}
              onChange={(e) =>
                setFirstTopupRewardAmount(Number(e.target.value || 0))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-first-topup-min-amount'>
              {t('First Topup Min Amount')}
            </Label>
            <Input
              id='promotion-first-topup-min-amount'
              type='number'
              value={firstTopupMinAmount}
              onChange={(e) =>
                setFirstTopupMinAmount(Number(e.target.value || 0))
              }
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-max-registrations'>
              {t('Max Registrations')}
            </Label>
            <Input
              id='promotion-max-registrations'
              type='number'
              value={maxRegistrations}
              onChange={(e) => setMaxRegistrations(Number(e.target.value || 0))}
            />
          </div>
          <div className='grid gap-2'>
            <Label>{t('Expires At')}</Label>
            <DateTimePicker
              value={expiresAt}
              onChange={setExpiresAt}
              placeholder={t('Never')}
            />
          </div>
        </div>
        <label className='flex items-center gap-2 text-sm'>
          <Checkbox
            checked={enabled}
            onCheckedChange={(value) => setEnabled(!!value)}
          />
          {t('Enabled')}
        </label>
        <div className='flex justify-end gap-2'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t('Saving...') : t('Save changes')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RegistrationsDialog({
  promotion,
  open,
  onOpenChange,
}: {
  promotion: PromotionLink | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const quotaPerUnit = useSystemConfigStore(
    (s) =>
      s.config.currency?.quotaPerUnit ?? DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  )
  const { data, isLoading } = useQuery({
    queryKey: ['promotion-registrations', promotion?.id],
    queryFn: async () => {
      if (!promotion) return [] as PromotionRegistration[]
      const res = await getPromotionRegistrations(promotion.id, {
        p: 1,
        page_size: 50,
      })
      return res.data?.items || []
    },
    enabled: open && !!promotion,
  })

  const columns = useMemo<ColumnDef<PromotionRegistration>[]>(
    () => [
      { accessorKey: 'username', header: t('User') },
      { accessorKey: 'channel_tag', header: t('Channel Tag') },
      {
        accessorKey: 'activity_type',
        header: t('Activity Type'),
        cell: ({ row }) => t(getPromotionActivityLabel(row.original.activity_type)),
      },
      {
        accessorKey: 'reward_status',
        header: t('Reward Status'),
        cell: ({ row }) => t(getPromotionRewardStatusLabel(row.original.reward_status)),
      },
      {
        accessorKey: 'granted_quota',
        header: t('Granted Reward'),
        cell: ({ row }) =>
          `${((row.original.granted_quota || row.original.reward_quota || 0) / quotaPerUnit).toFixed(2)}`,
      },
      {
        accessorKey: 'granted_at',
        header: t('Granted At'),
        cell: ({ row }) =>
          row.original.granted_at
            ? formatTimestampToDate(row.original.granted_at)
            : '-',
      },
      {
        accessorKey: 'created_at',
        header: t('Registration Time'),
        cell: ({ row }) =>
          row.original.created_at ? formatTimestampToDate(row.original.created_at) : '-',
      },
      { accessorKey: 'ip', header: 'IP' },
      { accessorKey: 'user_agent', header: 'User Agent' },
    ],
    [quotaPerUnit, t]
  )

  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl'>
        <DialogHeader>
          <DialogTitle>{t('Registration Details')}</DialogTitle>
          <DialogDescription>{promotion?.code || ''}</DialogDescription>
        </DialogHeader>
        <div className='max-h-[70vh] overflow-auto rounded-lg border'>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>{t('Loading...')}</TableCell>
                </TableRow>
              ) : (data || []).length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    {t('No registration details found')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Promotions() {
  const { t } = useTranslation()
  const quotaPerUnit = useSystemConfigStore(
    (s) =>
      s.config.currency?.quotaPerUnit ?? DEFAULT_CURRENCY_CONFIG.quotaPerUnit
  )
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [refreshTick, setRefreshTick] = useState(0)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<PromotionLink | null>(null)
  const [registrationsOpen, setRegistrationsOpen] = useState(false)
  const [registrationRow, setRegistrationRow] = useState<PromotionLink | null>(
    null
  )
  const [keyword, setKeyword] = useState('')
  const [channelTag, setChannelTag] = useState('')
  const [activityType, setActivityType] = useState<'all' | PromotionActivityType>(
    'all'
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'promotions',
      pagination.pageIndex,
      pagination.pageSize,
      keyword,
      channelTag,
      activityType,
      refreshTick,
    ],
    queryFn: async () => {
      const res = await getPromotions({
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
        keyword: keyword || undefined,
        channel_tag: channelTag || undefined,
        activity_type: activityType === 'all' ? undefined : activityType,
      })
      return {
        items: res.data?.items || [],
        total: res.data?.total || 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const columns = useMemo<ColumnDef<PromotionLink>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('Name'),
      },
      {
        accessorKey: 'code',
        header: t('Promotion Code'),
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <span className='font-mono text-xs'>{row.original.code}</span>
            <CopyButton
              value={row.original.code}
              tooltip={t('Copy promotion code')}
            />
          </div>
        ),
      },
      {
        accessorKey: 'channel_tag',
        header: t('Channel Tag'),
      },
      {
        accessorKey: 'activity_type',
        header: t('Activity Type'),
        cell: ({ row }) => t(getPromotionActivityLabel(row.original.activity_type)),
      },
      {
        id: 'registration_reward',
        header: t('Registration Reward'),
        cell: ({ row }) => {
          if (row.original.activity_type === 'trial_coupon') {
            return `${((row.original.trial_coupon_quota || 0) / quotaPerUnit).toFixed(2)}`
          }
          if (row.original.activity_type === 'quota_reward') {
            return `${((row.original.reward_quota || 0) / quotaPerUnit).toFixed(2)}`
          }
          return '0'
        },
      },
      {
        accessorKey: 'clicks',
        header: t('Clicks'),
      },
      {
        accessorKey: 'registrations',
        header: t('Registrations'),
      },
      {
        accessorKey: 'first_topup_reward_quota',
        header: t('First Topup Reward'),
        cell: ({ row }) =>
          row.original.first_topup_reward_quota
            ? `${(row.original.first_topup_reward_quota / quotaPerUnit).toFixed(2)}`
            : '0',
      },
      {
        accessorKey: 'first_topup_count',
        header: t('First Topup Count'),
      },
      {
        accessorKey: 'expires_at',
        header: t('Expires At'),
        cell: ({ row }) =>
          row.original.expires_at === 0
            ? t('Never')
            : formatTimestampToDate(row.original.expires_at),
      },
      {
        accessorKey: 'enabled',
        header: t('Status'),
        cell: ({ row }) => (
          <Badge variant={row.original.enabled ? 'default' : 'secondary'}>
            {row.original.enabled ? t('Enabled') : t('Disabled')}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: t('Actions'),
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-2'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setEditingRow(row.original)
                setDrawerOpen(true)
              }}
            >
              {t('Edit')}
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setRegistrationRow(row.original)
                setRegistrationsOpen(true)
              }}
            >
              {t('Registration Details')}
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={async () => {
                await (row.original.enabled
                  ? disablePromotion(row.original.id)
                  : enablePromotion(row.original.id))
                setRefreshTick((value) => value + 1)
              }}
            >
              {row.original.enabled ? t('Disable') : t('Enable')}
            </Button>
            <Button
              size='sm'
              variant='destructive'
              onClick={async () => {
                await deletePromotion(row.original.id)
                setRefreshTick((value) => value + 1)
              }}
            >
              {t('Delete')}
            </Button>
          </div>
        ),
      },
    ],
    [quotaPerUnit, t]
  )

  const table = useReactTable({
    data: data?.items || [],
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total || 0) / pagination.pageSize),
  })

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>{t('Promotion Links')}</SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <Button
            onClick={() => {
              setEditingRow(null)
              setDrawerOpen(true)
            }}
          >
            <Gift className='mr-2 h-4 w-4' />
            {t('Create Promotion Link')}
          </Button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <div className='space-y-4'>
            <div className='flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center'>
              <div className='relative flex-1'>
                <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                <Input
                  className='pl-9'
                  placeholder={t('Search by name or code')}
                  value={keyword}
                  onChange={(e) => {
                    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                    setKeyword(e.target.value)
                  }}
                />
              </div>
              <Input
                className='sm:w-56'
                placeholder={t('Channel Tag')}
                value={channelTag}
                onChange={(e) => {
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                  setChannelTag(e.target.value)
                }}
              />
              <Select
                value={activityType}
                onValueChange={(value) => {
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                  setActivityType(value as 'all' | PromotionActivityType)
                }}
              >
                <SelectTrigger className='w-full sm:w-64'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>{t('All')}</SelectItem>
                  {ACTIVITY_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(getPromotionActivityLabel(item))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='rounded-xl border'>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading || isFetching ? (
                    <TableRow>
                      <TableCell colSpan={columns.length}>{t('Loading...')}</TableCell>
                    </TableRow>
                  ) : table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        {t('No Promotion Links Found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className='flex items-center justify-between text-sm'>
              <div className='text-muted-foreground'>
                {t('Registrations')}: {data?.total || 0}
              </div>
              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={pagination.pageIndex === 0}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      pageIndex: Math.max(prev.pageIndex - 1, 0),
                    }))
                  }
                >
                  {t('Previous')}
                </Button>
                <span>
                  {pagination.pageIndex + 1} /{' '}
                  {Math.max(Math.ceil((data?.total || 0) / pagination.pageSize), 1)}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={
                    pagination.pageIndex + 1 >=
                    Math.max(Math.ceil((data?.total || 0) / pagination.pageSize), 1)
                  }
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      pageIndex: prev.pageIndex + 1,
                    }))
                  }
                >
                  {t('Next')}
                </Button>
              </div>
            </div>
          </div>
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <PromotionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        currentRow={editingRow || undefined}
        onSaved={() => setRefreshTick((value) => value + 1)}
      />
      <RegistrationsDialog
        promotion={registrationRow}
        open={registrationsOpen}
        onOpenChange={setRegistrationsOpen}
      />
    </>
  )
}
