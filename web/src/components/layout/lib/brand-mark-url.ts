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
const KUCODE_MARK_URL_PATTERN = /kucode-mark(?:-mono)?\.svg(?:[?#].*)?$/

/**
 * True when the configured logo URL points at the bundled KuCode starburst mark.
 * Those URLs are drawn inline in currentColor; any other logo is left alone.
 */
export function isKucodeMarkUrl(url: string | null | undefined): boolean {
  return !!url && KUCODE_MARK_URL_PATTERN.test(url)
}
