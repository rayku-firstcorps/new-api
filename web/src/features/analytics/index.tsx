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
import { getRouteApi, Link } from '@tanstack/react-router'
import { BarChart3 } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { SectionPageLayout } from '@/components/layout'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { BehaviorTab } from './components/behavior-tab'
import { DevicesTab } from './components/devices-tab'
import { FilterBar } from './components/filter-bar'
import { HealthTab } from './components/health-tab'
import { OverviewTab } from './components/overview-tab'
import { resolveAnalyticsRange } from './lib/range'
import {
  ANALYTICS_TABS,
  type AnalyticsSearch,
  type AnalyticsTab,
} from './lib/search'

const route = getRouteApi('/_authenticated/analytics/')

interface AnalyticsPageProps {
  search: AnalyticsSearch
  onSearchChange: (patch: Partial<AnalyticsSearch>) => void
  /** `false` when behavior analytics is switched off in system settings. */
  enabled: boolean
}

/** Dashboard body, kept free of router hooks so tests can drive it directly. */
export function AnalyticsPage(props: AnalyticsPageProps) {
  const { t } = useTranslation()
  const { range, start, end, client, tab } = props.search

  // The window is frozen per filter state so query keys stay stable.
  const params = useMemo(
    () => resolveAnalyticsRange({ range, start, end, client }, Date.now()),
    [range, start, end, client]
  )

  const tabLabel = (value: AnalyticsTab): string => {
    switch (value) {
      case 'overview':
        return t('Overview')
      case 'devices':
        return t('Devices')
      case 'behavior':
        return t('Behavior')
      default:
        return t('Health')
    }
  }

  let content = <OverviewTab params={params} />
  if (tab === 'devices') content = <DevicesTab params={params} />
  if (tab === 'behavior') content = <BehaviorTab params={params} />
  if (tab === 'health') content = <HealthTab params={params} />

  if (!props.enabled) {
    content = (
      <EmptyState
        icon={BarChart3}
        bordered
        title={t('Behavior analytics is turned off')}
        description={t(
          'Turn it on in System Settings to start collecting anonymous usage data.'
        )}
        action={
          <Link
            to='/system-settings/operations/$section'
            params={{ section: 'analytics' }}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {t('Open analytics settings')}
          </Link>
        }
      />
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Behavior Analytics')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          {props.enabled && (
            <>
              <FilterBar
                search={props.search}
                onChange={props.onSearchChange}
              />
              <Tabs
                value={tab}
                onValueChange={(value) =>
                  props.onSearchChange({ tab: value as AnalyticsTab })
                }
              >
                <TabsList aria-label={t('Analytics sections')}>
                  {ANALYTICS_TABS.map((value) => (
                    <TabsTrigger key={value} value={value} className='px-3'>
                      {tabLabel(value)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </>
          )}
          {content}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

export function Analytics() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const { status } = useStatus()

  return (
    <AnalyticsPage
      search={search}
      enabled={status?.analytics_enabled !== false}
      onSearchChange={(patch) =>
        void navigate({
          search: (prev) => ({ ...prev, ...patch }),
          replace: true,
        })
      }
    />
  )
}
