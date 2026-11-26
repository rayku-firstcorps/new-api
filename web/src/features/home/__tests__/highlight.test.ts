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
import { describe, expect, it } from 'vitest'

import { highlight, tokenize } from '../lib/highlight'

const types = (src: string, lang: Parameters<typeof tokenize>[1]) =>
  tokenize(src, lang)
    .filter((token) => token.type !== 'plain')
    .map((token) => `${token.type}:${token.text.trim()}`)

describe('highlight', () => {
  it('colors Python keywords, calls, keyword arguments and strings', () => {
    expect(types('client = OpenAI(base_url="x")', 'python')).toEqual([
      'punctuation:=',
      'function:OpenAI',
      'punctuation:(',
      'property:base_url',
      'punctuation:=',
      'string:"x"',
      'punctuation:)',
    ])
    expect(types('from openai import OpenAI', 'python')).toContain(
      'keyword:from'
    )
  })

  it('treats TypeScript object keys as properties and never colors member access as a keyword', () => {
    const result = types('const a = { baseURL: "x" }; block.type', 'typescript')
    expect(result).toContain('keyword:const')
    expect(result).toContain('property:baseURL')
    expect(result).not.toContain('keyword:type')
  })

  it('colors Bash flags and variables, and JSON keys inside the body', () => {
    const result = types('curl -H "Bearer $KEY" -d \'{"model": 1}\'', 'bash')
    expect(result).toContain('function:curl')
    expect(result).toContain('keyword:-H')
    expect(result).toContain('variable:$KEY')
    expect(result).toContain('property:"model"')
    expect(result).toContain('number:1')
  })

  it('splits multi-line tokens per line without losing text', () => {
    const src = '# a\nx = 1'
    const lines = highlight(src, 'python')
    expect(lines).toHaveLength(2)
    expect(
      lines.map((line) => line.map((t) => t.text).join('')).join('\n')
    ).toBe(src)
  })
})
