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
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
} from '@/features/pricing/lib/dynamic-price'
import { parseTags } from '@/features/pricing/lib/filters'
import { isTokenBasedModel } from '@/features/pricing/lib/model-helpers'
import { formatPrice, formatRequestPrice } from '@/features/pricing/lib/price'
import type { PricingModel } from '@/features/pricing/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatCompactNumber } from '@/lib/format'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

interface PopularModelCardProps {
  model: PricingModel
  rank: number
}

type PriceCell = { key: string; label: string; value: string; unit?: string }

/** Flat token or per-request prices only; dynamic billing stays on the details page. */
function getPriceCells(
  model: PricingModel,
  labels: { input: string; output: string; request: string }
): PriceCell[] {
  if (
    isDynamicPricingModel(model) ||
    isUnconfiguredTaskUsageModel(model) ||
    model.billing_plugin_variants?.length
  ) {
    return []
  }
  if (isTokenBasedModel(model)) {
    return [
      {
        key: 'input',
        label: labels.input,
        value: formatPrice(model, 'input', 'M'),
        unit: '1M',
      },
      {
        key: 'output',
        label: labels.output,
        value: formatPrice(model, 'output', 'M'),
        unit: '1M',
      },
    ]
  }
  return [
    {
      key: 'request',
      label: labels.request,
      value: formatRequestPrice(model),
    },
  ]
}

export function PopularModelCard(props: PopularModelCardProps) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const iconKey = props.model.icon || props.model.vendor_icon
  const icon = iconKey ? getLobeIcon(iconKey, 20) : null
  const tags = parseTags(props.model.tags).slice(0, 2)
  const priceCells = getPriceCells(props.model, {
    input: t('Input'),
    output: t('Output'),
    request: t('Price per request'),
  })
  const specs = [
    { key: 'context', label: t('Context'), value: props.model.context_length },
    {
      key: 'max-output',
      label: t('Max output'),
      value: props.model.max_output_tokens,
    },
  ].filter((spec) => typeof spec.value === 'number' && spec.value > 0)

  return (
    <li className='min-w-0'>
      <Card
        size='sm'
        className='bg-background hover:ring-primary/50 has-[a:focus-visible]:ring-primary relative h-full gap-3 transition-shadow has-[a:focus-visible]:ring-2'
      >
        <CardHeader className='flex flex-row items-center justify-between gap-3'>
          <span className='text-muted-foreground flex min-w-0 items-center gap-2 font-mono text-xs'>
            {icon ? (
              <span aria-hidden='true' className='flex shrink-0 items-center'>
                {icon}
              </span>
            ) : null}
            <span className='truncate'>{props.model.vendor_name}</span>
          </span>
          <Badge variant='outline' className='shrink-0 font-mono'>
            #{props.rank}
          </Badge>
        </CardHeader>
        <CardContent className='flex flex-1 flex-col gap-3'>
          <h3 className='text-base leading-snug font-semibold text-balance wrap-anywhere'>
            <Link
              to='/pricing/$modelId'
              params={{ modelId: props.model.model_name }}
              className='after:absolute after:inset-0 after:content-[""] focus-visible:outline-none'
            >
              {props.model.model_name}
            </Link>
          </h3>
          {tags.length > 0 ? (
            <ul className='flex flex-wrap gap-1.5' aria-label={t('Tags')}>
              {tags.map((tag) => (
                <li key={tag} className='min-w-0'>
                  <Badge
                    variant='outline'
                    className='h-auto max-w-full wrap-anywhere whitespace-normal'
                  >
                    {tag}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
          {priceCells.length > 0 ? (
            <dl className='home-model-price mt-auto grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg border px-3 py-2'>
              {priceCells.map((cell) => (
                <div
                  key={cell.key}
                  className={cn(
                    'min-w-0',
                    cell.key === 'request' && 'col-span-2',
                    cell.key === 'output' && 'text-right'
                  )}
                >
                  <dt className='text-muted-foreground text-xs wrap-anywhere'>
                    {cell.label}
                    {cell.unit ? ` (${cell.unit})` : ''}
                  </dt>
                  <dd className='font-mono text-sm font-semibold tabular-nums'>
                    {cell.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {specs.length > 0 ? (
            <dl className='text-muted-foreground flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs'>
              {specs.map((spec) => (
                <div key={spec.key} className='flex min-w-0 gap-1'>
                  <dt>{spec.label}:</dt>
                  <dd className='text-foreground font-mono'>
                    {formatCompactNumber(spec.value, locale)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </CardContent>
      </Card>
    </li>
  )
}
