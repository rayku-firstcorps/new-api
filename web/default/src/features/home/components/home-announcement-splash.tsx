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
import { useEffect, useRef } from 'react'
import { useNotifications } from '@/hooks/use-notifications'
import { NotificationDialog } from '@/components/notification-dialog'

export function HomeAnnouncementSplash() {
  const {
    activeTab,
    announcements,
    closeToday,
    dialogOpen,
    isNoticeClosed,
    loading,
    notice,
    openHomeSplashDialog,
    setActiveTab,
    setDialogOpen,
  } = useNotifications()
  const hasOpened = useRef(false)

  useEffect(() => {
    if (
      hasOpened.current ||
      loading ||
      (announcements.length === 0 && !notice) ||
      isNoticeClosed
    ) {
      return
    }

    hasOpened.current = openHomeSplashDialog()
  }, [
    announcements.length,
    loading,
    notice,
    isNoticeClosed,
    openHomeSplashDialog,
  ])

  return (
    <NotificationDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      notice={notice}
      announcements={announcements}
      loading={loading}
      onCloseToday={closeToday}
    />
  )
}
