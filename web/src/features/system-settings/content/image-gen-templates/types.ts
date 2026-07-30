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
export interface ImageGenTemplate {
  id: number
  title: string
  description: string
  prompt: string
  image_url: string
  image_urls: string // JSON string
  tags: string // JSON string
  sort: number
  visible: boolean
  created_at: number
  updated_at: number
}

export interface ImageGenTemplateInput {
  title: string
  description: string
  prompt: string
  image_url: string
  image_urls: string // JSON string
  tags: string // JSON string
  sort: number
  visible: boolean
}

// 导入导出交换格式：image_urls / tags 为数组，便于人读与表格转换
export interface ImageGenTemplateExportItem {
  title: string
  description: string
  prompt: string
  image_url: string
  image_urls: string[]
  tags: string[]
  sort: number
  visible: boolean
}

export interface ImageGenImportResult {
  imported: number
  failed: number
  total: number
}
