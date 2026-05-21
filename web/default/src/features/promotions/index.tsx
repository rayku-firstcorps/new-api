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
  type SortingState,
  type VisibilityState,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { formatTimestampToDate } from '@/lib/format'
import { useSystemConfigStore, DEFAULT_CURRENCY_CONFIG } from '@/stores/system-config-store'
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
import { CopyButton } from '@/components/copy-button'
import { DataTablePage } from '@/components/data-table'
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
import type {
  PromotionFormData,
  PromotionLink,
  PromotionRegistration,
} from './types'

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
  const quotaPerUnit = useSystemConfigStore((s) => s.config.currency?.quotaPerUnit ?? DEFAULT_CURRENCY_CONFIG.quotaPerUnit)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [channelTag, setChannelTag] = useState('')
  const [rewardAmount, setRewardAmount] = useState(10)
  const [firstTopupRewardAmount, setFirstTopupRewardAmount] = useState(0)
  const [firstTopupMinAmount, setFirstTopupMinAmount] = useState(0)
  const [maxRegistrations, setMaxRegistrations] = useState(0)
  const [expiresAt, setExpiresAt] = useState(0)
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (currentRow) {
      setCode(currentRow.code)
      setName(currentRow.name)
      setChannelTag(currentRow.channel_tag)
      setRewardAmount(currentRow.reward_quota / quotaPerUnit)
      setFirstTopupRewardAmount((currentRow.first_topup_reward_quota ?? 0) / quotaPerUnit)
      setFirstTopupMinAmount(currentRow.first_topup_min_amount ?? 0)
      setMaxRegistrations(currentRow.max_registrations)
      setExpiresAt(currentRow.expires_at)
      setEnabled(currentRow.enabled)
      return
    }
    setCode('')
    setName('')
    setChannelTag('')
    setRewardAmount(10)
    setFirstTopupRewardAmount(0)
    setFirstTopupMinAmount(0)
    setMaxRegistrations(0)
    setExpiresAt(0)
    setEnabled(true)
  }, [currentRow, open])

  const handleSubmit = async () => {
    const payload: PromotionFormData = {
      code: code.trim(),
      name: name.trim(),
      channel_tag: channelTag.trim(),
      reward_quota: Math.round(rewardAmount * quotaPerUnit),
      first_topup_reward_quota: Math.round(firstTopupRewardAmount * quotaPerUnit),
      first_topup_min_amount: firstTopupMinAmount,
      max_registrations: maxRegistrations,
      expires_at: expiresAt,
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
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {currentRow
              ? t('Update Promotion Link')
              : t('Create Promotion Link')}
          </DialogTitle>
          <DialogDescription>
            {t('Manage registration attribution links and reward quotas')}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-3'>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-code'>{t('Promotion Code')}</Label>
            <Input
              id='promotion-code'
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t('Promotion Code')}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-name'>{t('Name')}</Label>
            <Input
              id='promotion-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Name')}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-channel-tag'>{t('Channel Tag')}</Label>
            <Input
              id='promotion-channel-tag'
              value={channelTag}
              onChange={(e) => setChannelTag(e.target.value)}
              placeholder={t('Channel Tag')}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-reward-amount'>
              {t('Reward Amount')} (¥)
            </Label>
            <Input
              id='promotion-reward-amount'
              type='number'
              step='0.01'
              value={rewardAmount}
              onChange={(e) => setRewardAmount(Number(e.target.value || 0))}
              placeholder='10'
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-first-topup-reward-amount'>
              {t('First Topup Amount')} (¥)
            </Label>
            <Input
              id='promotion-first-topup-reward-amount'
              type='number'
              step='0.01'
              value={firstTopupRewardAmount}
              onChange={(e) =>
                setFirstTopupRewardAmount(Number(e.target.value || 0))
              }
              placeholder='0'
            />
            <p className='text-muted-foreground text-xs'>
              {t('0 means first topup reward is disabled')}
            </p>
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-first-topup-min-amount'>
              {t('First Topup Min Amount')} (¥)
            </Label>
            <Input
              id='promotion-first-topup-min-amount'
              type='number'
              value={firstTopupMinAmount}
              onChange={(e) =>
                setFirstTopupMinAmount(Number(e.target.value || 0))
              }
              placeholder='0'
            />
            <p className='text-muted-foreground text-xs'>
              {t('0 means no minimum amount required')}
            </p>
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
              placeholder={t('Max Registrations')}
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='promotion-expires-at'>{t('Expires At')}</Label>
            <Input
              id='promotion-expires-at'
              type='number'
              value={expiresAt}
              onChange={(e) => setExpiresAt(Number(e.target.value || 0))}
              placeholder={t('Expires At')}
            />
          </div>
          <label className='flex items-center gap-2 text-sm'>
            <Checkbox
              checked={enabled}
              onCheckedChange={(value) => setEnabled(!!value)}
            />
            {t('Enabled')}
          </label>
        </div>
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
  const { data } = useQuery({
    queryKey: ['promotion-registrations', promotion?.id],
    queryFn: async () => {
      if (!promotion) return [] as PromotionRegistration[]
      const res = await getPromotionRegistrations(promotion.id, {
        p: 1,
        page_size: 20,
      })
      return res.data?.items || []
    },
    enabled: open && !!promotion,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-3xl'>
        <DialogHeader>
          <DialogTitle>{t('Registration Details')}</DialogTitle>
          <DialogDescription>{promotion?.code || ''}</DialogDescription>
        </DialogHeader>
        <div className='space-y-2'>
          {(data || []).map((item) => (
            <div
              key={item.id}
              className='flex items-center justify-between rounded-md border px-3 py-2 text-sm'
            >
              <div>
                <div className='font-medium'>{item.username}</div>
                <div className='text-muted-foreground text-xs'>
                  {item.channel_tag}
                </div>
              </div>
              <div className='text-right text-xs'>
                <div>{formatTimestampToDate(item.created_at || 0)}</div>
                <div className='text-muted-foreground'>{item.ip || '-'}</div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Promotions() {
  const { t } = useTranslation()
  const quotaPerUnit = useSystemConfigStore((s) => s.config.currency?.quotaPerUnit ?? DEFAULT_CURRENCY_CONFIG.quotaPerUnit)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'promotions',
      pagination.pageIndex,
      pagination.pageSize,
      refreshTick,
    ],
    queryFn: async () => {
      const res = await getPromotions({
        p: pagination.pageIndex + 1,
        page_size: pagination.pageSize,
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
        accessorKey: 'reward_quota',
        header: t('Reward Amount'),
        cell: ({ row }) => `¥${(row.original.reward_quota / quotaPerUnit).toFixed(2)}`,
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
            ? `¥${(row.original.first_topup_reward_quota / quotaPerUnit).toFixed(2)}`
            : '—',
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
              {t('Registrations')}
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
    [t, quotaPerUnit]
  )

  const table = useReactTable({
    data: data?.items || [],
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil((data?.total || 0) / pagination.pageSize),
  })

  return (
    <>
      <SectionPageLayout>
        <SectionPageLayout.Title>
          {t('Promotion Links')}
        </SectionPageLayout.Title>
        <SectionPageLayout.Description>
          {t('Manage registration attribution links and reward quotas')}
        </SectionPageLayout.Description>
        <SectionPageLayout.Actions>
          <Button
            onClick={() => {
              setEditingRow(null)
              setDrawerOpen(true)
            }}
          >
            {t('Create Promotion Link')}
          </Button>
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <DataTablePage
            table={table}
            columns={columns}
            isLoading={isLoading}
            isFetching={isFetching}
            emptyTitle={t('No Promotion Links Found')}
            emptyDescription={t(
              'Create your first promotion link to track registration attribution.'
            )}
            toolbarProps={null}
            hideMobile
          />
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
