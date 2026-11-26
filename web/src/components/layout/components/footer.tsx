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
import { Fragment, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'

import { buildFooterColumns, type FooterHealth } from '../lib/footer-columns'
import { FOCUS_RING } from '../lib/public-chrome'
import { useFooterHealth } from '../lib/use-footer-health'
import { BrandLogoImage } from './brand-mark'

interface FooterLink {
  text: string
  href: string
}

interface FooterColumnProps {
  title: string
  links: FooterLink[]
}

interface FooterProps {
  logo?: string
  name?: string
  columns?: FooterColumnProps[]
  copyright?: string
  className?: string
}

/** A column ready to render: labels already translated. */
interface RenderColumn {
  key: string
  title: string
  links: {
    key: string
    label: string
    href: string
    requiresAuth?: boolean
  }[]
}

const FOOTER_LINK_CLASS = cn(
  'text-muted-foreground hover:text-foreground rounded-sm text-sm transition-colors duration-150',
  FOCUS_RING
)

function FooterLinkItem(props: {
  href: string
  label: string
  requiresAuth?: boolean
}) {
  if (props.href.startsWith('http')) {
    return (
      <a
        href={props.href}
        target='_blank'
        rel='noopener noreferrer'
        className={FOOTER_LINK_CLASS}
      >
        {props.label}
      </a>
    )
  }

  if (props.requiresAuth) {
    return (
      <Link
        to='/sign-in'
        search={{ redirect: props.href }}
        className={FOOTER_LINK_CLASS}
      >
        {props.label}
      </Link>
    )
  }

  return (
    <Link to={props.href} className={FOOTER_LINK_CLASS}>
      {props.label}
    </Link>
  )
}

function FooterColumnView(props: { column: RenderColumn }) {
  const headingId = `footer-${props.column.key}`
  return (
    <div>
      <h2
        id={headingId}
        className='text-foreground text-xs font-medium tracking-wide uppercase'
      >
        {props.column.title}
      </h2>
      <ul aria-labelledby={headingId} className='mt-4 flex flex-col gap-3'>
        {props.column.links.map((link) => (
          <li key={link.key}>
            <FooterLinkItem
              href={link.href}
              label={link.label}
              requiresAuth={link.requiresAuth}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

// Status line backed by the real Uptime Kuma monitors (`/api/uptime/status`).
// Renders nothing when there is no monitor data, so it never claims a state.
function FooterStatus() {
  const { t } = useTranslation()
  const health: FooterHealth | null = useFooterHealth()
  if (!health) return null

  const operational = health === 'operational'
  const label = operational
    ? t('All systems operational')
    : t('Some services are experiencing issues')

  return (
    <p className='text-muted-foreground inline-flex shrink-0 items-center gap-2.5 text-xs'>
      <span aria-hidden='true' className='relative flex size-2'>
        {operational && (
          <span className='bg-success absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping' />
        )}
        <span
          className={cn(
            'relative size-2 rounded-full',
            operational ? 'bg-success' : 'bg-warning'
          )}
        />
      </span>
      {label}
    </p>
  )
}

// Renders User Agreement / Privacy Policy links inline with the parent's
// copyright row when either is configured in System Settings → Site. Emits
// fragmented siblings so the parent flex container's gap controls spacing.
function LegalLinks(props: { leadingSeparator?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const items: { key: string; label: string; href: string }[] = []
  if (status?.user_agreement_enabled) {
    items.push({
      key: 'user-agreement',
      label: t('User Agreement'),
      href: '/user-agreement',
    })
  }
  if (status?.privacy_policy_enabled) {
    items.push({
      key: 'privacy-policy',
      label: t('Privacy Policy'),
      href: '/privacy-policy',
    })
  }
  if (items.length === 0) {
    return null
  }
  return (
    <>
      {items.map((item, index) => (
        <Fragment key={item.key}>
          {(props.leadingSeparator || index > 0) && (
            <span aria-hidden='true' className='text-muted-foreground/30'>
              ·
            </span>
          )}
          <Link
            to={item.href}
            className={cn(
              'hover:text-foreground rounded-sm transition-colors duration-150',
              FOCUS_RING
            )}
          >
            {item.label}
          </Link>
        </Fragment>
      ))}
    </>
  )
}

// inline=true returns just the inner span for composition in a parent flex
// row. inline=false wraps in a centered/right-aligned div (default).
function ProjectAttribution(props: { currentYear: number; inline?: boolean }) {
  const content = <span className='text-muted-foreground/45'></span>
  if (props.inline) {
    return content
  }
  return (
    <div className='text-muted-foreground/45 text-center text-xs sm:text-right'>
      {content}
    </div>
  )
}

export function Footer(props: FooterProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const navLinks = useTopNavLinks()
  const {
    systemName,
    logo: systemLogo,
    footerHtml,
    demoSiteEnabled,
  } = useSystemConfig()

  const displayLogo = systemLogo || props.logo || '/logo.png'
  const displayName = systemName || props.name || 'New API'
  const isDemoSiteMode = Boolean(demoSiteEnabled)
  const currentYear = new Date().getFullYear()

  const fallbackColumns = useMemo<FooterColumnProps[]>(
    () => [
      {
        title: t('footer.columns.about.title'),
        links: [
          {
            text: t('footer.columns.about.links.aboutProject'),
            href: 'https://docs.newapi.pro/wiki/project-introduction/',
          },
          {
            text: t('footer.columns.about.links.contact'),
            href: 'https://docs.newapi.pro/support/community-interaction/',
          },
          {
            text: t('footer.columns.about.links.features'),
            href: 'https://docs.newapi.pro/wiki/features-introduction/',
          },
        ],
      },
      {
        title: t('footer.columns.docs.title'),
        links: [
          {
            text: t('footer.columns.docs.links.quickStart'),
            href: 'https://docs.newapi.pro/getting-started/',
          },
          {
            text: t('footer.columns.docs.links.installation'),
            href: 'https://docs.newapi.pro/installation/',
          },
          {
            text: t('footer.columns.docs.links.apiDocs'),
            href: 'https://docs.newapi.pro/api/',
          },
        ],
      },
      {
        title: t('footer.columns.related.title'),
        links: [
          {
            text: t('footer.columns.related.links.oneApi'),
            href: 'https://github.com/songquanpeng/one-api',
          },
          {
            text: t('footer.columns.related.links.midjourney'),
            href: 'https://github.com/novicezk/midjourney-proxy',
          },
          {
            text: t('footer.columns.related.links.newApiKeyTool'),
            href: 'https://github.com/Calcium-Ion/new-api-key-tool',
          },
        ],
      },
    ],
    [t]
  )

  const displayColumns = props.columns ?? fallbackColumns

  // Link columns come from the same gated links as the top bar. In demo-site
  // mode the project columns (docs, related projects) replace the product
  // ones; the Legal column stays in both.
  const renderColumns = useMemo<RenderColumn[]>(() => {
    const columns = buildFooterColumns(navLinks, {
      userAgreement: Boolean(status?.user_agreement_enabled),
      privacyPolicy: Boolean(status?.privacy_policy_enabled),
    })
    const siteColumns: RenderColumn[] = columns.map((column) => ({
      key: column.key,
      title: t(column.title),
      links: column.items.map((item) => ({
        key: item.key,
        label: t(item.label),
        href: item.href,
        requiresAuth: item.requiresAuth,
      })),
    }))
    if (!isDemoSiteMode) return siteColumns

    const demoColumns: RenderColumn[] = displayColumns.map((column, index) => ({
      key: `demo-${index}`,
      title: t(column.title),
      links: column.links.map((link, linkIndex) => ({
        key: `${index}-${linkIndex}`,
        label: t(link.text),
        href: link.href,
      })),
    }))
    return [
      ...demoColumns,
      ...siteColumns.filter((column) => column.key === 'legal'),
    ]
  }, [displayColumns, isDemoSiteMode, navLinks, status, t])

  if (footerHtml) {
    return (
      <footer
        className={cn(
          'border-border bg-background relative z-10 border-t',
          props.className
        )}
      >
        <div className='mx-auto w-full max-w-7xl px-4 pt-12 pb-10 md:px-6'>
          <div className='flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8'>
            <div
              className='custom-footer text-muted-foreground min-w-0 text-sm leading-relaxed'
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
            <div className='text-muted-foreground/45 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:shrink-0 md:justify-end'>
              <LegalLinks />
              <ProjectAttribution currentYear={currentYear} inline />
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer
      className={cn(
        'border-border bg-background relative z-10 border-t',
        props.className
      )}
    >
      <div className='mx-auto max-w-7xl px-4 pt-16 pb-10 md:px-6 md:pt-20'>
        <div className='grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16'>
          {/* Brand column */}
          <div className='max-w-xs'>
            <Link
              to='/'
              className={cn(
                'text-foreground inline-flex items-center gap-2.5 rounded-sm text-lg font-medium',
                FOCUS_RING
              )}
            >
              <span className='flex size-5 shrink-0 items-center justify-center'>
                <BrandLogoImage
                  src={displayLogo}
                  alt=''
                  className='size-full rounded-md object-contain'
                />
              </span>
              {displayName}
            </Link>
            <p className='text-muted-foreground mt-4 text-sm leading-relaxed'>
              {t('Powerful API Management Platform')}
            </p>
          </div>

          {/* Link columns: 2 on mobile, 4 from sm. Empty columns are omitted. */}
          {renderColumns.length > 0 && (
            <nav
              aria-label={t('Footer')}
              className='grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4'
            >
              {renderColumns.map((column) => (
                <FooterColumnView key={column.key} column={column} />
              ))}
            </nav>
          )}
        </div>

        {/* Copyright + disclaimer on the left, real status and attribution on the right. */}
        <div className='border-border text-muted-foreground mt-16 flex flex-col gap-4 border-t pt-8 text-xs md:flex-row md:items-center md:justify-between md:gap-8'>
          <div className='flex flex-col gap-1.5 md:flex-row md:gap-4'>
            <p>
              &copy; {currentYear} {displayName}.{' '}
              {props.copyright ?? t('footer.defaultCopyright')}
            </p>
            <p>
              {t(
                'All product names, logos, and brands are property of their respective owners.'
              )}
            </p>
          </div>
          <div className='flex flex-col gap-2 md:items-end'>
            <FooterStatus />
            <ProjectAttribution currentYear={currentYear} />
          </div>
        </div>
      </div>
    </footer>
  )
}
