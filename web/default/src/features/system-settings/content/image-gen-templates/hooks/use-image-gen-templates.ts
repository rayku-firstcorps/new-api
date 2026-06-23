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
import { useQuery } from '@tanstack/react-query'
import { adminListImageGenTemplates } from '../api'

export function useImageGenTemplates(params: {
  keyword?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['admin-image-gen-templates', params],
    queryFn: async () => {
      const res = await adminListImageGenTemplates(params)
      return res.data ?? { items: [], total: 0, page: 1 }
    },
  })
}
