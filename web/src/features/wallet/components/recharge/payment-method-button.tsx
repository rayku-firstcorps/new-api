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
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PaymentMethodButtonProps {
  name: string
  icon: ReactNode
  loading: boolean
  disabled: boolean
  disabledReason?: string
  disabledLabel?: string
  onSelect: () => void
}

/**
 * One payment method card. Clicking it starts the existing quote and confirm
 * flow; a method below its minimum top-up is disabled and explained in a tooltip.
 */
export function PaymentMethodButton(props: PaymentMethodButtonProps) {
  const button = (
    <Button
      variant='outline'
      onClick={props.onSelect}
      disabled={props.disabled}
      title={props.disabledReason}
      aria-label={
        props.disabledReason
          ? `${props.name}. ${props.disabledReason}`
          : props.name
      }
      className='bg-card hover:border-primary/60 hover:bg-primary/5 min-h-14 min-w-0 justify-start gap-2.5 rounded-lg px-3 py-2 text-left'
    >
      {props.loading ? (
        <Loader2 className='h-4 w-4 animate-spin' />
      ) : (
        props.icon
      )}
      <span className='flex min-w-0 flex-col items-start gap-0.5'>
        <span className='max-w-full truncate'>{props.name}</span>
        {props.disabledLabel && (
          <span className='text-muted-foreground max-w-full truncate text-[11px] leading-4 font-normal'>
            {props.disabledLabel}
          </span>
        )}
      </span>
    </Button>
  )

  if (!props.disabledReason) return button

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent>{props.disabledReason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
