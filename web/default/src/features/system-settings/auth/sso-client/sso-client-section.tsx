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
import { useTranslation } from 'react-i18next'
import { SettingsSection } from '../../components/settings-section'
import { SSOClientFormDialog } from './components/sso-client-form-dialog'
import { SSOClientTable } from './components/sso-client-table'
import { useSSOClients } from './hooks/use-sso-clients'
import type { SSOClient } from './types'

export function SSOClientSection() {
  const { t } = useTranslation()
  const { data: clients = [], isLoading } = useSSOClients()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<SSOClient | null>(null)

  const handleCreate = () => {
    setEditingClient(null)
    setDialogOpen(true)
  }

  const handleEdit = (client: SSOClient) => {
    setEditingClient(client)
    setDialogOpen(true)
  }

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) setEditingClient(null)
  }

  if (isLoading) {
    return (
      <SettingsSection
        title={t('SSO Applications')}
        description={t(
          'Allow external applications to obtain user-approved new-api access tokens'
        )}
      >
        <div className='text-muted-foreground py-8 text-center text-sm'>
          {t('Loading...')}
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection
      title={t('SSO Applications')}
      description={t(
        'Allow external applications to obtain user-approved new-api access tokens'
      )}
    >
      <SSOClientTable
        clients={clients}
        onCreate={handleCreate}
        onEdit={handleEdit}
      />

      <SSOClientFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        client={editingClient}
      />
    </SettingsSection>
  )
}
