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
/**
 * KuCode look shared by the usage and audit tables: 13px body, small uppercase
 * muted header cells. Purely presentational class names.
 */
export const LOG_TABLE_CLASS_NAME = [
  '[&_[data-slot=table]]:text-[13px] [&_[data-slot=table]_td]:text-[13px] [&_[data-slot=table]_td_*]:text-[13px]',
  '[&_[data-slot=table]_th]:text-muted-foreground [&_[data-slot=table]_th]:text-[11px] [&_[data-slot=table]_th]:font-medium [&_[data-slot=table]_th]:tracking-wide [&_[data-slot=table]_th]:uppercase',
  '[&_[data-slot=table]_th_*]:text-[11px] [&_[data-slot=table]_th_*]:tracking-wide',
].join(' ')

/** Tinted row plus a 2px severity bar on the first cell (never colour only: the type badge stays). */
export const LOG_ROW_ACCENT = {
  danger:
    'bg-destructive/10 [&>td:first-child]:shadow-[inset_2px_0_0_var(--destructive)]',
  info: 'bg-info/10 [&>td:first-child]:shadow-[inset_2px_0_0_var(--info)]',
  warning:
    'bg-warning/10 [&>td:first-child]:shadow-[inset_2px_0_0_var(--warning)]',
} as const

/**
 * Detail dialogs are presented as a right-hand drawer from `sm` up and keep
 * the centred dialog on phones.
 */
export const LOG_DRAWER_CONTENT_CLASS_NAME =
  'sm:top-0 sm:right-0 sm:left-auto sm:h-dvh sm:max-h-dvh sm:translate-x-0 sm:translate-y-0 sm:rounded-none sm:rounded-l-xl'

export const LOG_DRAWER_BODY_HEIGHT = 'min(72dvh, calc(100dvh - 7rem))'
