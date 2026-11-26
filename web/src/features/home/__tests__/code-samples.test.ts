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

import { buildCodeSamples } from '../lib/code-samples'

describe('buildCodeSamples', () => {
  const baseUrl = 'https://gateway.example.test/v1'
  const samples = buildCodeSamples(baseUrl)

  it('returns cURL, Python and Node.js samples in order', () => {
    expect(samples.map((sample) => sample.id)).toEqual([
      'curl',
      'python',
      'node',
    ])
  })

  it('puts the real gateway base URL into every sample and highlights only that line', () => {
    for (const sample of samples) {
      const changed = sample.lines.filter((line) => line.changed)
      expect(changed).toHaveLength(1)
      expect(changed[0].text).toContain(baseUrl)
      expect(sample.code).toContain(baseUrl)
    }
  })

  it('tags each sample with the language its syntax colors use', () => {
    expect(samples.map((sample) => sample.language)).toEqual([
      'bash',
      'python',
      'typescript',
    ])
  })

  it('keeps the copied source identical to the rendered lines', () => {
    for (const sample of samples) {
      expect(sample.lines.map((line) => line.text).join('\n')).toBe(sample.code)
    }
  })

  it('never embeds a real-looking API key', () => {
    for (const sample of samples) {
      expect(sample.code).not.toMatch(/sk-[A-Za-z0-9]/)
    }
  })
})
