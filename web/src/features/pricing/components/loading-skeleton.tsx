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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { VIEW_MODES, type ViewMode } from '../constants'

export interface LoadingSkeletonProps {
  viewMode?: ViewMode
}

export function LoadingSkeleton(props: LoadingSkeletonProps) {
  return (
    <div aria-busy='true'>
      <div className='flex flex-col items-center pt-10 pb-8 sm:pt-16 sm:pb-10'>
        <Skeleton className='h-7 w-36 rounded-full' />
        <Skeleton className='mt-6 h-10 w-full max-w-[560px] sm:h-14' />
        <Skeleton className='mt-4 h-5 w-full max-w-[480px]' />
        <Skeleton className='mt-8 h-[74px] w-full max-w-[440px] rounded-2xl sm:mt-10 sm:h-[86px]' />
      </div>
      <div className='flex flex-col gap-2 border-b py-3 lg:flex-row lg:items-center lg:gap-4'>
        <Skeleton className='h-9 w-full lg:w-[320px]' />
        <Skeleton className='h-8 w-full max-w-md' />
      </div>
      <div className='grid gap-6 pt-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8'>
        <div className='hidden self-start rounded-xl border p-4 lg:block'>
          <Skeleton className='mb-4 h-5 w-24' />
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className='flex flex-col gap-3 border-b py-4 last:border-0'
            >
              <Skeleton className='h-4 w-28' />
              <div className='flex flex-wrap gap-2'>
                <Skeleton className='h-7 w-24' />
                <Skeleton className='h-7 w-20' />
                <Skeleton className='h-7 w-28' />
              </div>
            </div>
          ))}
        </div>
        <div className='flex min-w-0 flex-col gap-4'>
          {props.viewMode === VIEW_MODES.TABLE ? (
            <div className='overflow-hidden rounded-xl border'>
              {Array.from({ length: 10 }, (_, index) => (
                <div
                  key={index}
                  className='flex gap-4 border-b p-4 last:border-0'
                >
                  <Skeleton className='h-5 w-40 max-w-full' />
                  <Skeleton className='h-5 flex-1' />
                  <Skeleton className='h-5 w-20' />
                </div>
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {Array.from({ length: 6 }, (_, index) => (
                <Card key={index} className='gap-3'>
                  <CardHeader className='flex flex-row gap-3'>
                    <Skeleton className='size-10 shrink-0' />
                    <div className='flex min-w-0 flex-1 flex-col gap-2'>
                      <Skeleton className='h-5 w-40 max-w-full' />
                      <Skeleton className='h-3 w-20' />
                    </div>
                    <Skeleton className='size-7 shrink-0' />
                  </CardHeader>
                  <CardContent className='flex flex-1 flex-col gap-3'>
                    <div className='flex flex-col gap-2'>
                      <Skeleton className='h-3.5 w-full' />
                      <Skeleton className='h-3.5 w-4/5' />
                    </div>
                    <div className='mt-auto flex flex-col gap-1.5'>
                      <Skeleton className='h-4 w-16' />
                      <div className='grid grid-cols-3 gap-3'>
                        <Skeleton className='h-10' />
                        <Skeleton className='h-10' />
                        <Skeleton className='h-10' />
                      </div>
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <Skeleton className='h-4 w-28 max-w-full' />
                      <Skeleton className='h-4 w-28 max-w-full' />
                    </div>
                  </CardContent>
                  <CardFooter className='border-0 bg-transparent pt-0'>
                    <div className='border-border/60 flex w-full items-center justify-between gap-3 border-t pt-2'>
                      <div className='flex items-start gap-5'>
                        <div className='flex w-24 shrink-0 flex-col gap-1'>
                          <Skeleton className='h-4 w-10' />
                          <div className='flex h-3 items-center justify-between'>
                            {Array.from({ length: 24 }, (_, bar) => (
                              <Skeleton
                                key={bar}
                                className='h-full w-[3px] rounded-xs'
                              />
                            ))}
                          </div>
                        </div>
                        <Skeleton className='h-8 w-6' />
                        <Skeleton className='h-8 w-8' />
                      </div>
                      <Skeleton className='h-7 w-12' />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
