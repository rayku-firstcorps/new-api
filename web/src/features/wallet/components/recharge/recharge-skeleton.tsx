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
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const PRESET_KEYS = Array.from({ length: 8 }, (_, index) => `preset-${index}`)
const METHOD_KEYS = ['primary', 'secondary', 'tertiary']

/** Loading placeholder with the same sections as the Add Funds panel. */
export function RechargeSkeleton() {
  return (
    <Card data-card-hover='false' className='gap-0 overflow-hidden py-0'>
      <CardHeader className='border-b p-3 !pb-3 sm:p-5 sm:!pb-5'>
        <Skeleton className='h-6 w-32' />
        <Skeleton className='mt-2 h-4 w-48' />
      </CardHeader>
      <CardContent className='space-y-4 p-3 sm:space-y-6 sm:p-5'>
        <div className='space-y-3'>
          <Skeleton className='h-3 w-16' />
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {PRESET_KEYS.map((key) => (
              <Skeleton key={key} className='h-[72px] rounded-lg' />
            ))}
          </div>
        </div>
        <div className='space-y-3'>
          <Skeleton className='h-3 w-28' />
          <Skeleton className='h-[42px] w-full' />
        </div>
        <div className='space-y-3'>
          <Skeleton className='h-3 w-32' />
          <div className='flex flex-wrap gap-3'>
            {METHOD_KEYS.map((key) => (
              <Skeleton key={key} className='h-10 w-24 rounded-lg' />
            ))}
          </div>
        </div>
        <div className='space-y-3 border-t pt-8'>
          <Skeleton className='h-3 w-24' />
          <div className='flex gap-2'>
            <Skeleton className='h-10 flex-1' />
            <Skeleton className='h-10 w-20' />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
