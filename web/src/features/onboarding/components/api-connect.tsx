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
import { useTranslation } from 'react-i18next'

import { CodeSnippetTabs } from '@/components/code-snippet-tabs'
import { useGatewayBaseUrl } from '@/hooks/use-gateway-base-url'
import { buildConnectSnippets } from '@/lib/connect-snippets'

import type { OnboardingFlags } from '../lib/availability'
import type { OnboardingSelectedKey } from '../types'
import { TestRequestBlock } from './test-request-block'

interface ApiConnectProps {
  flags: OnboardingFlags
  selectedKey: OnboardingSelectedKey
  model: string
  onTestSuccess: () => void
}

/**
 * Use case "api": multi-language examples (masked key on screen, full key on
 * copy) and, when enabled, the inline test request.
 */
export function ApiConnect(props: ApiConnectProps) {
  const { t } = useTranslation()
  const gatewayBaseUrl = useGatewayBaseUrl()
  const fullKey = props.selectedKey.fullKey

  const snippets = useMemo(
    () =>
      buildConnectSnippets({
        baseUrl: gatewayBaseUrl,
        model: props.model || 'your-model',
        displayKey: props.selectedKey.maskedKey,
        copyKey: fullKey,
      }),
    [fullKey, gatewayBaseUrl, props.model, props.selectedKey.maskedKey]
  )

  return (
    <div className='space-y-4'>
      <section aria-label={t('Quick start')} className='space-y-2'>
        <h3 className='text-sm font-semibold'>{t('Quick start')}</h3>
        <p className='text-muted-foreground text-xs'>
          {t('The endpoint, key and model below are already filled in.')}
        </p>
        <CodeSnippetTabs snippets={snippets} copyDisabled={!fullKey} />
      </section>
      {props.flags.inlineTest && (
        <TestRequestBlock
          apiKey={fullKey}
          model={props.model}
          selfUseMode={props.flags.selfUseMode}
          onSuccess={props.onTestSuccess}
        />
      )}
    </div>
  )
}
