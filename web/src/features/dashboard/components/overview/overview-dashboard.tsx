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
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  KeyRound,
  ListChecks,
  RadioTower,
  ShieldCheck,
  TerminalSquare,
  Timer,
} from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { Button } from '@/components/ui/button'
import { getApiKeys } from '@/features/keys/api'
import { getUserModels } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { requireServerSuccess } from '@/lib/server-error-message'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import {
  useApiInfo,
  useDashboardContentVisibility,
} from '../../hooks/use-status-data'
import {
  formatDisplayKey,
  getPreferredKey,
  getSavedSetupGuideExpanded,
  normalizeEndpoint,
  saveSetupGuideExpanded,
  type HeroSignal,
  type QuickAction,
  type RequestExample,
  type StartStep,
} from '../../lib/setup-guide'
import { AnnouncementsPanel } from './announcements-panel'
import { ApiInfoPanel } from './api-info-panel'
import { FAQPanel } from './faq-panel'
import { PerformanceHealthPanel } from './performance-health-panel'
import { RequestPreview } from './request-preview'
import {
  CompactQuickAction,
  QuickActionItem,
  StartStepItem,
} from './setup-guide-parts'
import { SummaryCards } from './summary-cards'
import { UptimePanel } from './uptime-panel'

export function OverviewDashboard() {
  const { t } = useTranslation()
  const setupGuideId = useId()
  const setupGuideToggleRef = useRef<HTMLButtonElement>(null)
  const user = useAuthStore((state) => state.auth.user)
  const { items: apiInfoItems } = useApiInfo()
  const {
    apiInfo: showApiInfoPanel,
    announcements: showAnnouncementsPanel,
    faq: showFAQPanel,
    uptimeKuma: showUptimePanel,
  } = useDashboardContentVisibility()
  const [manualSetupGuideExpanded, setManualSetupGuideExpanded] = useState<
    boolean | null
  >(() => getSavedSetupGuideExpanded())

  const requestCount = Number(user?.request_count ?? 0)
  const remainQuota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const isAdmin = Boolean(user?.role && user.role >= ROLE.ADMIN)

  const apiKeysQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'api-keys'],
    queryFn: async () => {
      const result = requireServerSuccess(await getApiKeys({ p: 1, size: 10 }))
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const modelsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'user-models'],
    queryFn: async () => {
      const result = requireServerSuccess(await getUserModels())
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const preferredKey = useMemo(
    () => getPreferredKey(apiKeysQuery.data ?? []),
    [apiKeysQuery.data]
  )

  const startSteps = useMemo<StartStep[]>(
    () => [
      {
        title: t('Create API Key'),
        description: t('Create a key for your app or service'),
        to: '/keys',
        icon: KeyRound,
        completed: Boolean(preferredKey),
      },
      {
        title: t('Add credits'),
        description: t('Keep enough balance before production traffic'),
        to: '/wallet',
        icon: CreditCard,
        completed: remainQuota > 0 || usedQuota > 0,
      },
      {
        title: t('Send a request'),
        description: t('Verify routing with Playground or your client'),
        to: '/playground',
        icon: TerminalSquare,
        completed: requestCount > 0,
      },
    ],
    [preferredKey, remainQuota, requestCount, t, usedQuota]
  )

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        title: t('API Keys'),
        description: t('Create a key for your app or service'),
        to: '/keys',
        icon: KeyRound,
      },
      {
        title: t('Channels'),
        description: t('Configure upstream providers and routing.'),
        to: '/channels',
        icon: RadioTower,
        adminOnly: true,
      },
      {
        title: t('Usage Logs'),
        description: t('Inspect requests, errors, and billing details'),
        to: '/usage-logs',
        icon: FileText,
      },
      {
        title: t('Pricing'),
        description: t('Review model rates before scaling traffic'),
        to: '/pricing',
        icon: BookOpen,
      },
    ],
    [t]
  )

  const visibleQuickActions = useMemo(
    () => quickActions.filter((action) => !action.adminOnly || isAdmin),
    [isAdmin, quickActions]
  )

  const heroSignals = useMemo<HeroSignal[]>(
    () => [
      {
        label: t('Route active'),
        value: apiInfoItems.length > 0 ? t('Online') : t('Current domain'),
        icon: RadioTower,
        tone: 'info',
      },
      {
        label: t('Auth configured'),
        value: preferredKey ? t('Secured') : t('Needs API key'),
        icon: ShieldCheck,
        tone: 'success',
      },
      {
        label: t('Model selected'),
        value: modelsQuery.data?.[0] ?? t('Loading'),
        icon: Timer,
        tone: 'chart-4',
      },
    ],
    [apiInfoItems.length, modelsQuery.data, preferredKey, t]
  )

  const requestExample = useMemo<RequestExample>(() => {
    const endpoint = normalizeEndpoint(apiInfoItems[0]?.url)
    const model = modelsQuery.data?.[0] ?? 'gpt-4o-mini'
    const keyName = preferredKey?.name ?? t('No API key yet')
    const ready = Boolean(preferredKey?.id && model)

    return {
      endpoint,
      model,
      keyName,
      keyId: preferredKey?.id,
      displayKey: preferredKey
        ? formatDisplayKey(`sk-${preferredKey.key}`)
        : 'sk-...',
      ready,
    }
  }, [apiInfoItems, modelsQuery.data, preferredKey, t])

  const completedStepCount = startSteps.filter((step) => step.completed).length
  const setupComplete = completedStepCount === startSteps.length
  const setupStatusReady = apiKeysQuery.isFetched && Boolean(user)
  const setupGuideExpanded =
    manualSetupGuideExpanded ?? (setupStatusReady && !setupComplete)
  const showLeftContentPanels =
    isAdmin || showApiInfoPanel || showAnnouncementsPanel || showFAQPanel
  const showContentPanels = showLeftContentPanels || showUptimePanel

  const handleSetupGuideToggle = () => {
    const nextExpanded = !setupGuideExpanded
    setManualSetupGuideExpanded(nextExpanded)
    saveSetupGuideExpanded(nextExpanded)
    if (!nextExpanded && setupComplete) {
      setupGuideToggleRef.current?.focus()
    }
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{t('Overview')}</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        {setupStatusReady && setupComplete && (
          <Button
            ref={setupGuideToggleRef}
            variant='ghost'
            size='sm'
            className='text-muted-foreground hover:text-foreground h-auto min-h-7 max-w-[60vw] whitespace-normal'
            aria-expanded={setupGuideExpanded}
            aria-controls={setupGuideId}
            onClick={handleSetupGuideToggle}
          >
            {t('Setup guide')}
          </Button>
        )}
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          <div id={setupGuideId} hidden={!setupGuideExpanded}>
            {setupGuideExpanded && (
              <CardStaggerContainer className='grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]'>
                <CardStaggerItem className='bg-card h-full overflow-hidden rounded-xl border'>
                  <div className='relative h-full overflow-hidden p-4 sm:p-5'>
                    <div className='relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]'>
                      <div className='flex min-w-0 flex-col gap-5'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='flex max-w-2xl flex-col gap-1'>
                            <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase'>
                              <ListChecks
                                className='size-3.5'
                                aria-hidden='true'
                              />
                              {t('Get started')}
                            </div>
                            <h3 className='font-display text-xl font-medium tracking-tight sm:text-2xl'>
                              {t('Build on your API gateway in minutes')}
                            </h3>
                            <p className='text-muted-foreground max-w-xl text-sm leading-relaxed'>
                              {t(
                                'A focused home for keys, balance, routing, and service health.'
                              )}
                            </p>
                          </div>
                          <div className='flex flex-wrap items-center gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              aria-expanded={setupGuideExpanded}
                              aria-controls={setupGuideId}
                              onClick={handleSetupGuideToggle}
                            >
                              <ChevronUp data-icon='inline-start' />
                              {t('Hide setup guide')}
                            </Button>
                            <Button size='sm' render={<Link to='/keys' />}>
                              <KeyRound data-icon='inline-start' />
                              {t('Create API Key')}
                            </Button>
                          </div>
                        </div>

                        <ol className='bg-muted/30 rounded-xl border p-2'>
                          {startSteps.map((step, index) => (
                            <StartStepItem
                              key={step.title}
                              step={step}
                              index={index}
                              isLast={index === startSteps.length - 1}
                            />
                          ))}
                        </ol>
                      </div>

                      <RequestPreview
                        example={requestExample}
                        signals={heroSignals}
                      />
                    </div>
                  </div>
                </CardStaggerItem>

                <CardStaggerItem className='bg-card h-full rounded-xl border p-4 sm:p-5'>
                  <div className='flex h-full flex-col gap-4'>
                    <div className='flex flex-col gap-1'>
                      <div className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
                        {t('Recommended actions')}
                      </div>
                      <h3 className='font-display text-lg font-medium tracking-tight'>
                        {t('Keep the platform ready')}
                      </h3>
                    </div>
                    <div className='grid gap-2'>
                      {visibleQuickActions.map((action) => (
                        <QuickActionItem key={action.title} action={action} />
                      ))}
                    </div>
                  </div>
                </CardStaggerItem>
              </CardStaggerContainer>
            )}
          </div>
          {!setupGuideExpanded && !setupComplete && (
            <CardStaggerContainer>
              <CardStaggerItem className='bg-card overflow-hidden rounded-xl border'>
                <div className='relative overflow-hidden px-4 py-3 sm:px-5'>
                  <div className='relative flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                      <span className='bg-background flex size-9 shrink-0 items-center justify-center rounded-lg border'>
                        <Check
                          className='text-success size-4'
                          aria-hidden='true'
                        />
                      </span>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-2'>
                          <h3 className='truncate text-sm font-medium'>
                            {t('Setup guide')}
                          </h3>
                          <span className='text-muted-foreground bg-background rounded-md border px-2 py-0.5 text-xs'>
                            {t('Setup progress: {{completed}}/{{total}}', {
                              completed: completedStepCount,
                              total: startSteps.length,
                            })}
                          </span>
                        </div>
                        <p className='text-muted-foreground line-clamp-1 text-xs'>
                          {t('Setup guide is collapsed. Expand it anytime.')}
                        </p>
                      </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2'>
                      {visibleQuickActions.map((action) => (
                        <CompactQuickAction
                          key={action.title}
                          action={action}
                        />
                      ))}
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 min-w-28'
                        aria-expanded={setupGuideExpanded}
                        aria-controls={setupGuideId}
                        onClick={handleSetupGuideToggle}
                      >
                        <ChevronDown data-icon='inline-start' />
                        {t('Show setup guide')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardStaggerItem>
            </CardStaggerContainer>
          )}

          <SummaryCards />

          {showContentPanels && (
            <CardStaggerContainer
              className={cn(
                'grid grid-cols-1 gap-4',
                showLeftContentPanels &&
                  showUptimePanel &&
                  'xl:grid-cols-[minmax(0,1fr)_22rem]'
              )}
            >
              {showLeftContentPanels && (
                <div
                  className={cn(
                    'grid min-w-0 grid-cols-1 gap-4',
                    (showApiInfoPanel ||
                      showAnnouncementsPanel ||
                      showFAQPanel) &&
                      'lg:grid-cols-2'
                  )}
                >
                  {isAdmin && (
                    <CardStaggerItem className='lg:col-span-2'>
                      <PerformanceHealthPanel />
                    </CardStaggerItem>
                  )}
                  {showApiInfoPanel && (
                    <CardStaggerItem>
                      <ApiInfoPanel />
                    </CardStaggerItem>
                  )}
                  {showAnnouncementsPanel && (
                    <CardStaggerItem>
                      <AnnouncementsPanel />
                    </CardStaggerItem>
                  )}
                  {showFAQPanel && (
                    <CardStaggerItem>
                      <FAQPanel />
                    </CardStaggerItem>
                  )}
                </div>
              )}
              {showUptimePanel && (
                <CardStaggerItem>
                  <UptimePanel />
                </CardStaggerItem>
              )}
            </CardStaggerContainer>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
