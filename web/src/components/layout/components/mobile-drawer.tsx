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
import { Link } from '@tanstack/react-router'
import { LogOut, ShieldCheck, User, Wallet, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import useDialogState from '@/hooks/use-dialog'
import { useIsSidebarModuleVisible } from '@/hooks/use-sidebar-config'
import { useUserDisplay } from '@/hooks/use-user-display'
import { cn } from '@/lib/utils'
import type { AuthUser } from '@/stores/auth-store'

import { FOCUS_RING, isNavLinkActive } from '../lib/public-chrome'
import type { TopNavLink } from '../types'
import { PublicBrandLink } from './header-logo'

const PROFILE_ROW_CLASS = cn(
  'text-muted-foreground hover:text-foreground border-border flex items-center gap-2.5 border-b py-3 text-sm transition-colors duration-150',
  FOCUS_RING
)

/** Signed-in block of the drawer: who you are, profile / security / wallet, sign out. */
function MobileUserProfile(props: {
  user: AuthUser | null
  onNavigate: () => void
}) {
  const { t } = useTranslation()
  const [signOutOpen, setSignOutOpen] = useDialogState()
  const { displayName, initials, roleLabel } = useUserDisplay(props.user)
  const isSecurityVisible = useIsSidebarModuleVisible('/security')

  if (!props.user) return null

  return (
    <>
      <div className='flex flex-col text-sm'>
        <div className='border-border flex items-center gap-2.5 border-b py-3'>
          <Avatar className='size-9'>
            <AvatarImage src='/avatars/01.png' alt={`@${displayName}`} />
            <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-col gap-0.5 overflow-hidden'>
            <p className='text-foreground truncate font-medium'>
              {displayName}
            </p>
            <div className='flex items-center gap-1.5'>
              <span className='text-muted-foreground text-xs'>{roleLabel}</span>
              {props.user.group && (
                <>
                  <span className='text-muted-foreground text-xs'>·</span>
                  <span className='text-muted-foreground text-xs'>
                    {String(props.user.group)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <Link
          to='/profile'
          onClick={props.onNavigate}
          className={PROFILE_ROW_CLASS}
        >
          <User className='size-4' aria-hidden='true' />
          {t('Profile')}
        </Link>

        {isSecurityVisible && (
          <Link
            to='/security'
            onClick={props.onNavigate}
            className={PROFILE_ROW_CLASS}
          >
            <ShieldCheck className='size-4' aria-hidden='true' />
            {t('Security & Access')}
          </Link>
        )}

        <Link
          to='/wallet'
          onClick={props.onNavigate}
          className={PROFILE_ROW_CLASS}
        >
          <Wallet className='size-4' aria-hidden='true' />
          {t('Wallet')}
        </Link>

        <Button
          variant='ghost'
          onClick={() => setSignOutOpen(true)}
          className='text-destructive hover:text-destructive/80 mt-1 h-auto w-full justify-start gap-2.5 py-3 hover:bg-transparent'
        >
          <LogOut className='size-4' aria-hidden='true' />
          {t('Sign out')}
        </Button>
      </div>

      <SignOutDialog open={!!signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  )
}

/** Sign in / Sign up (or Go to Dashboard plus the account links) at the bottom of the drawer. */
function MobileAuthActions(props: {
  user: AuthUser | null
  showRegister: boolean
  onNavigate: () => void
}) {
  const { t } = useTranslation()

  if (props.user) {
    return (
      <>
        <Button
          className='h-11 w-full text-[15px]'
          render={<Link to='/dashboard' onClick={props.onNavigate} />}
        >
          {t('Go to Dashboard')}
        </Button>
        <div className='mt-6'>
          <MobileUserProfile user={props.user} onNavigate={props.onNavigate} />
        </div>
      </>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {props.showRegister && (
        <Button
          className='h-11 w-full text-[15px]'
          render={<Link to='/sign-up' onClick={props.onNavigate} />}
        >
          {t('Sign up')}
        </Button>
      )}
      <Button
        variant={props.showRegister ? 'outline' : 'default'}
        className='h-11 w-full text-[15px]'
        render={<Link to='/sign-in' onClick={props.onNavigate} />}
      >
        {t('Sign in')}
      </Button>
    </div>
  )
}

export interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  homeUrl: string
  /** Configured logo url (the KuCode mark is drawn inline when it matches). */
  logoSrc: string
  /** Replaces the configured logo mark. */
  customLogo?: ReactNode
  displaySiteName: string
  loading: boolean
  logoLoaded: boolean
  mobileLinksList: TopNavLink[]
  showAuthButtons: boolean
  /** Show the Sign up button next to Sign in (registration is available). */
  showRegister?: boolean
  showLanguageSwitcher?: boolean
  user: AuthUser | null
  pathname?: string
  /** Same handler as the desktop links: disabled links and the requireAuth prompt. */
  onLinkClick?: (
    event: React.MouseEvent<HTMLAnchorElement>,
    link: TopNavLink
  ) => void
}

/**
 * KuCode mobile menu: a full-screen dialog (focus trap, Esc, scroll lock and
 * focus return come from the shared Sheet) with the brand and a close button
 * on top, large display-font links, and the auth actions at the bottom.
 */
export function MobileDrawer(props: MobileDrawerProps) {
  const { t } = useTranslation()
  const pathname = props.pathname ?? ''

  return (
    <Sheet
      open={props.isOpen}
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <SheetContent
        side='top'
        showCloseButton={false}
        className='inset-0 h-dvh gap-0 overflow-y-auto border-b-0 motion-reduce:transition-none xl:hidden'
      >
        <SheetTitle className='sr-only'>{props.displaySiteName}</SheetTitle>

        <div className='flex h-[72px] shrink-0 items-center justify-between px-6'>
          <PublicBrandLink
            to={props.homeUrl}
            name={props.displaySiteName}
            src={props.logoSrc}
            customLogo={props.customLogo}
            loading={props.loading}
            logoLoaded={props.logoLoaded}
            onClick={props.onClose}
          />
          <SheetClose
            aria-label={t('Close menu')}
            className={cn(
              'text-foreground hover:bg-foreground/5 active:bg-foreground/10 -me-2 inline-flex size-10 items-center justify-center rounded-full transition-colors duration-150',
              FOCUS_RING
            )}
          >
            <X className='size-5' aria-hidden='true' />
          </SheetClose>
        </div>

        <nav aria-label={t('Main navigation')} className='px-6 pt-6'>
          {props.loading ? (
            <div className='flex flex-col gap-3'>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </div>
          ) : (
            <ul className='border-border border-t'>
              {props.mobileLinksList.map((link) => {
                const isActive = isNavLinkActive(pathname, link.href)
                const label = t(link.title)
                const linkClass = cn(
                  'font-display block rounded-sm py-4 text-2xl font-medium tracking-[-0.02em] transition-colors duration-150',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  link.disabled && 'pointer-events-none opacity-50',
                  FOCUS_RING
                )
                const onClick = (
                  event: React.MouseEvent<HTMLAnchorElement>
                ) => {
                  if (props.onLinkClick) props.onLinkClick(event, link)
                  else props.onClose()
                }
                return (
                  <li
                    key={`${link.title}:${link.href}`}
                    className='border-border border-b'
                  >
                    {link.external ? (
                      <a
                        href={link.href}
                        target='_blank'
                        rel='noopener noreferrer'
                        aria-disabled={link.disabled}
                        tabIndex={link.disabled ? -1 : undefined}
                        onClick={onClick}
                        className={linkClass}
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        to={link.href}
                        disabled={link.disabled}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={onClick}
                        className={linkClass}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </nav>

        <div className='px-6 pt-8 pb-10'>
          {props.showAuthButtons && (
            <MobileAuthActions
              user={props.user}
              showRegister={props.showRegister ?? false}
              onNavigate={props.onClose}
            />
          )}
          {props.showLanguageSwitcher && (
            <div className='text-muted-foreground border-border mt-6 flex items-center justify-between border-t pt-4 text-sm'>
              <span>{t('Change language')}</span>
              <LanguageSwitcher className='size-10 rounded-full' />
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
