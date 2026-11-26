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
import { useMemo } from 'react'

import { PublicLayout } from '@/components/layout'
import { useGatewayBaseUrl } from '@/hooks/use-gateway-base-url'

import { useActiveHeading } from '../hooks/use-active-heading'
import { createCcSwitchGuide } from '../lib/guides'
import { buildGuideToc } from '../lib/toc'
import { DocsToc } from './docs-toc'
import { GuideArticle } from './guide-article'

const TOC_ENTRIES = buildGuideToc()
const TOC_IDS = TOC_ENTRIES.map((entry) => entry.id)

/**
 * Single-guide docs page (CC Switch): the article, plus an "On this page"
 * rail from 1280px. No page navigation, since there is only one page.
 */
export function DocsPage() {
  const gatewayBaseUrl = useGatewayBaseUrl()
  const guide = useMemo(
    () => createCcSwitchGuide(gatewayBaseUrl),
    [gatewayBaseUrl]
  )
  const activeHeading = useActiveHeading(TOC_IDS)

  return (
    <PublicLayout showMainContainer={false}>
      <main className='bg-background min-h-svh w-full max-w-[100vw] overflow-x-clip pt-[72px]'>
        <div className='mx-auto grid w-full max-w-7xl min-w-0 px-4 md:px-6 xl:grid-cols-[minmax(0,760px)_208px] xl:justify-center xl:gap-12'>
          <div className='mx-auto w-full max-w-[760px] min-w-0 pt-8 pb-20 lg:pt-10'>
            <GuideArticle guide={guide} gatewayBaseUrl={gatewayBaseUrl} />
          </div>

          <aside className='hidden xl:block'>
            <div className='sticky top-[72px] max-h-[calc(100svh-72px)] overflow-y-auto py-10'>
              <DocsToc entries={TOC_ENTRIES} activeId={activeHeading} />
            </div>
          </aside>
        </div>
      </main>
    </PublicLayout>
  )
}
