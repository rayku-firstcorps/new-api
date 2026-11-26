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
import { getLobeIcon } from '@/lib/lobe-icon'

import type { HomeProvider } from '../lib/catalog-summary'

interface ProviderMarkProps {
  provider: HomeProvider
  size: number
}

/**
 * Monochrome provider mark (currentColor). Admin-configured vendor icons go
 * through the shared icon loader; vendors without one get a letter tile.
 */
export function ProviderMark(props: ProviderMarkProps) {
  if (props.provider.icon) {
    return (
      <span aria-hidden='true' className='flex items-center justify-center'>
        {getLobeIcon(props.provider.icon, props.size)}
      </span>
    )
  }

  return (
    <span
      aria-hidden='true'
      className='flex items-center justify-center rounded-full border text-[10px] font-medium'
      style={{ width: props.size, height: props.size }}
    >
      {props.provider.name.charAt(0).toUpperCase()}
    </span>
  )
}
