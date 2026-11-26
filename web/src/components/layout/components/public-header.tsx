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
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isRegistrationAvailable } from '@/features/home/lib/landing-actions'
import { SystemUpdateAction } from '@/features/system-update/system-update-action'
import { useNotifications } from '@/hooks/use-notifications'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { defaultTopNavLinks } from '../config/top-nav.config'
import {
  CTA_CAPSULE,
  FOCUS_RING,
  ROUND_ICON_BUTTON,
  splitNavLinks,
} from '../lib/public-chrome'
import type { TopNavLink } from '../types'
import { PublicBrandLink } from './header-logo'
import { MobileDrawer } from './mobile-drawer'
import { PublicNavigation } from './public-navigation'

const AUTH_PROMPT_SECONDS = 5
/** Scroll distance before the bar turns from transparent to blurred. */
const SCROLL_THRESHOLD = 8
/** Width (Tailwind `xl`) from which the desktop bar replaces the mobile menu. */
const DESKTOP_QUERY = '(min-width: 1280px)'

type AuthPromptTarget = {
  title: string
  href: string
}

export interface PublicHeaderProps {
  navLinks?: TopNavLink[]
  mobileLinks?: TopNavLink[]
  navContent?: React.ReactNode
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  logo?: React.ReactNode
  siteName?: string
  homeUrl?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  showNavigation?: boolean
  showAuthButtons?: boolean
  showNotifications?: boolean
  className?: string
}

/**
 * Public top bar, laid out like the KuCode Navbar: nav links on the left, the
 * brand centered, links and actions on the right, transparent at the top of
 * the page and blurred with a bottom border once scrolled. Below `xl` it
 * collapses to brand + theme + menu button and the full-screen MobileDrawer.
 */
export function PublicHeader(props: PublicHeaderProps) {
  const {
    navLinks = defaultTopNavLinks,
    showThemeSwitch = true,
    showLanguageSwitcher = true,
    siteName: customSiteName,
    homeUrl = '/',
    showAuthButtons = true,
    showNotifications = true,
  } = props

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authPromptTarget, setAuthPromptTarget] =
    useState<AuthPromptTarget | null>(null)
  const [authPromptSecondsLeft, setAuthPromptSecondsLeft] =
    useState(AUTH_PROMPT_SECONDS)
  const { auth } = useAuthStore()
  const {
    systemName,
    logo: systemLogo,
    loading,
    logoLoaded,
  } = useSystemConfig()
  const { status } = useStatus()
  const dynamicLinks = useTopNavLinks()
  const notifications = useNotifications()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const user = auth.user
  const isAuthenticated = !!user
  const displaySiteName = customSiteName || systemName
  const links = dynamicLinks.length > 0 ? dynamicLinks : navLinks
  const groups = useMemo(() => splitNavLinks(links), [links])
  // Signed-in users always get a Console entry unless the nav already lists it.
  const showConsoleLink =
    isAuthenticated && !links.some((link) => link.href === '/dashboard')
  const showRegister =
    !status?.self_use_mode_enabled &&
    isRegistrationAvailable(status as Record<string, unknown> | null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // The drawer is mobile-only: close it when the viewport becomes desktop.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = () => {
      if (query.matches) setMobileOpen(false)
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!authPromptTarget) return

    const intervalId = window.setInterval(() => {
      setAuthPromptSecondsLeft((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    const timeoutId = window.setTimeout(() => {
      const redirect = authPromptTarget.href
      setAuthPromptTarget(null)
      navigate({ to: '/sign-in', search: { redirect } })
    }, AUTH_PROMPT_SECONDS * 1000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [authPromptTarget, navigate])

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptTarget(null)
    setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
  }, [])

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  const navigateToSignIn = useCallback(() => {
    const redirect = authPromptTarget?.href || '/'
    setAuthPromptTarget(null)
    navigate({ to: '/sign-in', search: { redirect } })
  }, [authPromptTarget?.href, navigate])

  const handleNavLinkClick = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      link: TopNavLink,
      closeDrawer = false
    ) => {
      if (link.disabled) {
        event.preventDefault()
        return
      }

      if (link.requiresAuth) {
        event.preventDefault()
        if (closeDrawer) {
          setMobileOpen(false)
        }
        setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
        setAuthPromptTarget({
          title: t(link.title),
          href: link.href,
        })
        return
      }

      if (closeDrawer) {
        setMobileOpen(false)
      }
    },
    [t]
  )

  const handleDrawerLinkClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, link: TopNavLink) =>
      handleNavLinkClick(event, link, true),
    [handleNavLinkClick]
  )

  let desktopAuth = (
    <>
      <Link
        to='/sign-in'
        className={cn(
          'text-muted-foreground hover:text-foreground rounded-sm text-[14px] whitespace-nowrap transition-colors duration-150',
          FOCUS_RING
        )}
      >
        {t('Sign in')}
      </Link>
      {showRegister && (
        <Button
          variant='outline'
          className={cn(CTA_CAPSULE, FOCUS_RING)}
          render={<Link to='/sign-up' />}
        >
          {t('Sign up')}
        </Button>
      )}
    </>
  )
  if (!showRegister) {
    desktopAuth = (
      <Button
        variant='outline'
        className={cn(CTA_CAPSULE, FOCUS_RING)}
        render={<Link to='/sign-in' />}
      >
        {t('Sign in')}
      </Button>
    )
  }
  if (isAuthenticated) {
    desktopAuth = (
      <>
        {showConsoleLink && (
          <Button
            variant='outline'
            className={cn(CTA_CAPSULE, FOCUS_RING)}
            render={<Link to='/dashboard' />}
          >
            {t('Console')}
          </Button>
        )}
        <ProfileDropdown />
      </>
    )
  }
  if (loading) {
    desktopAuth = <Skeleton className='h-8 w-20 rounded-full' />
  }

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 h-[72px] border-b transition-[background-color,border-color,backdrop-filter] duration-300 motion-reduce:transition-none',
          scrolled
            ? 'border-border bg-background/70 backdrop-blur-md'
            : 'border-transparent bg-transparent',
          props.className
        )}
      >
        <nav
          aria-label={t('Main navigation')}
          className='mx-auto flex h-full max-w-7xl items-center justify-between gap-2 px-4 md:px-6 xl:grid xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'
        >
          {/* Left: first link group (desktop) */}
          <div className='hidden min-w-0 xl:block'>
            <PublicNavigation
              links={groups.left}
              onLinkClick={handleNavLinkClick}
            />
          </div>

          {/* Center on desktop, left on mobile: brand */}
          <div className='flex min-w-0 items-center gap-1'>
            <PublicBrandLink
              to={homeUrl}
              name={displaySiteName}
              src={systemLogo}
              customLogo={props.logo}
              loading={loading}
              logoLoaded={logoLoaded}
            />
            <SystemUpdateAction presentation='version' />
          </div>

          {/* Right: second link group + actions (desktop) */}
          <div className='hidden min-w-0 items-center justify-end gap-5 xl:flex xl:gap-6'>
            <PublicNavigation
              links={groups.right}
              onLinkClick={handleNavLinkClick}
            />
            <div className='flex items-center'>
              {showLanguageSwitcher && (
                <LanguageSwitcher className={ROUND_ICON_BUTTON} />
              )}
              {showNotifications && (
                <NotificationPopover
                  className={ROUND_ICON_BUTTON}
                  open={notifications.popoverOpen}
                  onOpenChange={notifications.setPopoverOpen}
                  unreadCount={notifications.unreadCount}
                  activeTab={notifications.activeTab}
                  onTabChange={notifications.setActiveTab}
                  notice={notifications.notice}
                  announcements={notifications.announcements}
                  loading={notifications.loading}
                />
              )}
              {showThemeSwitch && <ThemeSwitch className={ROUND_ICON_BUTTON} />}
            </div>
            {showAuthButtons && (
              <div className='flex items-center gap-4'>{desktopAuth}</div>
            )}
          </div>

          {/* Mobile: theme, profile, menu button */}
          <div className='-me-2 flex shrink-0 items-center xl:hidden'>
            {showThemeSwitch && <ThemeSwitch className={ROUND_ICON_BUTTON} />}
            {showAuthButtons && !loading && isAuthenticated && (
              <ProfileDropdown />
            )}
            <button
              type='button'
              aria-label={t('Open menu')}
              aria-haspopup='dialog'
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
              className={cn(
                'text-foreground hover:bg-foreground/5 active:bg-foreground/10 inline-flex size-10 items-center justify-center rounded-full transition-colors duration-150',
                FOCUS_RING
              )}
            >
              <Menu className='size-5' aria-hidden='true' />
            </button>
          </div>
        </nav>
      </header>

      {/* Sibling of <header>: backdrop-filter on the header would trap position:fixed. */}
      <MobileDrawer
        isOpen={mobileOpen}
        onClose={closeMobile}
        homeUrl={homeUrl}
        logoSrc={systemLogo}
        customLogo={props.logo}
        displaySiteName={displaySiteName}
        loading={loading}
        logoLoaded={logoLoaded}
        mobileLinksList={links}
        showAuthButtons={showAuthButtons}
        showRegister={showRegister}
        showLanguageSwitcher={showLanguageSwitcher}
        user={user}
        pathname={pathname}
        onLinkClick={handleDrawerLinkClick}
      />

      <Dialog
        open={!!authPromptTarget}
        onOpenChange={(open) => {
          if (!open) {
            closeAuthPrompt()
          }
        }}
        title={t('Sign in required')}
        description={t('Please sign in to view {{module}}.', {
          module: authPromptTarget?.title || '',
        })}
        contentClassName='sm:max-w-md'
        contentHeight='auto'
        footer={
          <>
            <Button variant='outline' onClick={closeAuthPrompt}>
              {t('Cancel')}
            </Button>
            <Button onClick={navigateToSignIn}>{t('Sign in now')}</Button>
          </>
        }
      >
        <div className='bg-muted/40 text-muted-foreground rounded-lg px-3 py-2 text-sm'>
          {t('Redirecting to sign in in {{seconds}} seconds.', {
            seconds: authPromptSecondsLeft,
          })}
        </div>
      </Dialog>
    </>
  )
}
