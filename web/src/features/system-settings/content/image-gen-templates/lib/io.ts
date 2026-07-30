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
import * as XLSX from 'xlsx'

import type { ImageGenTemplateExportItem } from '../types'

const EXPORT_COLUMNS = [
  'title',
  'description',
  'prompt',
  'image_url',
  'image_urls',
  'tags',
  'sort',
  'visible',
] as const

/** 触发浏览器下载一个 Blob */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 把数组字段渲染为单元格文本：image_urls 用换行分隔，tags 用逗号分隔 */
function arrayToCell(arr: string[], sep: string): string {
  if (!Array.isArray(arr)) return ''
  return arr.filter(Boolean).join(sep)
}

/** 把单元格文本解析为字符串数组，兼容 JSON 数组文本 / 换行 / 逗号分隔 */
function cellToArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  const str = String(value ?? '').trim()
  if (!str) return []
  // 兼容 JSON 数组文本
  if (str.startsWith('[') && str.endsWith(']')) {
    try {
      const parsed = JSON.parse(str)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean)
      }
    } catch {
      // fallthrough
    }
  }
  return str
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function toBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const str = String(value ?? '')
    .trim()
    .toLowerCase()
  return str === '1' || str === 'true' || str === 'yes' || str === 'y'
}

function toNumber(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** 导出为 JSON 文件下载 */
export function downloadJson(
  items: ImageGenTemplateExportItem[],
  filename: string
) {
  const blob = new Blob([JSON.stringify(items, null, 2)], {
    type: 'application/json',
  })
  triggerDownload(blob, filename)
}

/** 导出为 Excel(.xlsx) 文件下载 */
export function downloadExcel(
  items: ImageGenTemplateExportItem[],
  filename: string
) {
  const rows = items.map((it) => ({
    title: it.title,
    description: it.description,
    prompt: it.prompt,
    image_url: it.image_url,
    image_urls: arrayToCell(it.image_urls, '\n'),
    tags: arrayToCell(it.tags, ', '),
    sort: it.sort,
    visible: it.visible ? 1 : 0,
  }))
  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: EXPORT_COLUMNS as unknown as string[],
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'templates')
  XLSX.writeFile(workbook, filename)
}

/** 把任意一行（对象）归一化为导出/导入项，兼容 PRD 旧列名 imageurl / visiable */
function rowToItem(row: Record<string, unknown>): ImageGenTemplateExportItem {
  const get = (...keys: string[]): unknown => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
        return row[k]
      }
    }
    return undefined
  }

  return {
    title: String(get('title') ?? '').trim(),
    description: String(get('description') ?? '').trim(),
    prompt: String(get('prompt') ?? '').trim(),
    image_url: String(get('image_url', 'imageurl') ?? '').trim(),
    image_urls: cellToArray(get('image_urls')),
    tags: cellToArray(get('tags')),
    sort: toNumber(get('sort') ?? 0),
    // visiable 是 PRD 样例表的拼写错误字段，导入时兼容
    visible:
      row['visible'] !== undefined || row['visiable'] !== undefined
        ? toBool(get('visible', 'visiable'))
        : true,
  }
}

/** 解析导入文件（.json / .xlsx / .xls / .csv），统一产出导入项数组 */
export async function parseImportFile(
  file: File
): Promise<ImageGenTemplateExportItem[]> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.json')) {
    const text = await file.text()
    const parsed = JSON.parse(text)
    // 兼容两种结构：纯数组 或 { items: [...] }
    const arr = Array.isArray(parsed) ? parsed : parsed?.items
    if (!Array.isArray(arr)) {
      throw new Error('invalid-json')
    }
    return arr.map((row) => rowToItem(row as Record<string, unknown>))
  }

  if (
    name.endsWith('.xlsx') ||
    name.endsWith('.xls') ||
    name.endsWith('.csv')
  ) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error('empty-workbook')
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    })
    return rows.map(rowToItem)
  }

  throw new Error('unsupported-file')
}
