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
import { ChevronDown } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  CodeSnippetTabs,
  type CodeSnippet,
} from '@/components/code-snippet-tabs'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { createCcSwitchGuide, GUIDE_MODEL } from '@/features/docs/lib/guides'
import { CCSwitchPanel } from '@/features/keys/components/cc-switch-panel'
import { useGatewayBaseUrl } from '@/hooks/use-gateway-base-url'

import type { OnboardingSelectedKey } from '../types'

interface CodingConnectProps {
  selectedKey: OnboardingSelectedKey
  ccSwitchEnabled: boolean
  model: string
}

/**
 * Use case "coding": one-click CC Switch import (when enabled) plus the manual
 * configuration from the docs guide and a link to the full documentation.
 */
export function CodingConnect(props: CodingConnectProps) {
  const { t } = useTranslation()
  const gatewayBaseUrl = useGatewayBaseUrl()
  const fullKey = props.selectedKey.fullKey

  const manualConfig = useMemo<CodeSnippet>(() => {
    const config = createCcSwitchGuide(gatewayBaseUrl).config
    const withModel = props.model
      ? config.replaceAll(GUIDE_MODEL, props.model)
      : config
    return {
      id: 'manual',
      label: 'Config',
      title: 'CC Switch -> Add Provider -> Custom Configuration',
      display: withModel.replaceAll(/sk-\*+/g, props.selectedKey.maskedKey),
      copy: fullKey ? withModel.replaceAll(/sk-\*+/g, fullKey) : undefined,
    }
  }, [fullKey, gatewayBaseUrl, props.model, props.selectedKey.maskedKey])

  return (
    <div className='space-y-4'>
      {props.ccSwitchEnabled && (
        <section
          aria-label={t('One-click import to CC Switch')}
          className='bg-card space-y-3 rounded-xl border p-4'
        >
          <h3 className='text-sm font-semibold'>
            {t('One-click import to CC Switch')}
          </h3>
          <p className='text-muted-foreground text-xs'>
            {t('Your gateway address and API key are filled in for you.')}
          </p>
          <CCSwitchPanel tokenKey={fullKey ?? ''} defaultModel={props.model} />
        </section>
      )}

      <Collapsible
        defaultOpen={!props.ccSwitchEnabled}
        className='bg-card rounded-xl border'
      >
        <CollapsibleTrigger
          render={
            <Button
              type='button'
              variant='ghost'
              className='w-full justify-between rounded-xl px-4'
            />
          }
        >
          {t('Manual configuration')}
          <ChevronDown className='size-4' aria-hidden />
        </CollapsibleTrigger>
        <CollapsibleContent className='space-y-2 px-4 pb-4'>
          <p className='text-muted-foreground text-xs'>
            {t('Copy this into CC Switch or your client settings.')}
          </p>
          <CodeSnippetTabs snippets={[manualConfig]} copyDisabled={!fullKey} />
        </CollapsibleContent>
      </Collapsible>

      <Button variant='outline' size='sm' render={<Link to='/docs' />}>
        {t('Open the full setup guide')}
      </Button>
    </div>
  )
}
