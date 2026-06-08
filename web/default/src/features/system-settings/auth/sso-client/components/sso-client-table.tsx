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
import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeleteSSOClient } from '../hooks/use-sso-client-mutations'
import type { SSOClient } from '../types'

type SSOClientTableProps = {
  clients: SSOClient[]
  onCreate: () => void
  onEdit: (client: SSOClient) => void
}

export function SSOClientTable(props: SSOClientTableProps) {
  const { t } = useTranslation()
  const deleteClient = useDeleteSSOClient()
  const [deleteTarget, setDeleteTarget] = useState<SSOClient | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteClient.mutateAsync(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-muted-foreground text-sm'>
          {t('Register applications that can request new-api login grants.')}
        </p>
        <Button size='sm' onClick={props.onCreate}>
          <Plus className='mr-1.5 h-4 w-4' />
          {t('Add Application')}
        </Button>
      </div>

      {props.clients.length === 0 ? (
        <div className='text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm'>
          {t('No SSO applications configured yet.')}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Name')}</TableHead>
              <TableHead>{t('Client ID')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead>{t('Redirect URIs')}</TableHead>
              <TableHead>{t('Scopes')}</TableHead>
              <TableHead className='text-right'>{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className='font-medium'>{client.name}</TableCell>
                <TableCell className='text-muted-foreground max-w-[180px] truncate font-mono text-xs'>
                  {client.client_id}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    label={client.enabled ? t('Enabled') : t('Disabled')}
                    variant={client.enabled ? 'success' : 'neutral'}
                    copyable={false}
                  />
                </TableCell>
                <TableCell className='text-muted-foreground max-w-[260px] truncate text-xs'>
                  {client.redirect_uris.join(', ')}
                </TableCell>
                <TableCell className='text-muted-foreground text-xs'>
                  {client.allowed_scopes.join(' ')}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => props.onEdit(client)}
                      aria-label={t('Edit')}
                    >
                      <Pencil className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setDeleteTarget(client)}
                      aria-label={t('Delete')}
                    >
                      <Trash2 className='text-destructive h-4 w-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t('Delete SSO Application')}
        desc={t(
          'Are you sure you want to delete "{{name}}"? The application will no longer be able to exchange new authorization codes.',
          { name: deleteTarget?.name || '' }
        )}
        confirmText={t('Delete')}
        destructive
        handleConfirm={handleDelete}
        isLoading={deleteClient.isPending}
      />
    </>
  )
}
