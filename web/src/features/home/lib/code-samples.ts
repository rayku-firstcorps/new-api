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
import type { HighlightLanguage } from './highlight'

export type CodeSampleId = 'curl' | 'python' | 'node'

export type CodeSample = {
  id: CodeSampleId
  label: string
  filename: string
  language: HighlightLanguage
  lines: { no: number; text: string; changed: boolean }[]
  /** Full source, used for the copy button. */
  code: string
}

const MODEL = 'your-model'
const API_KEY = 'YOUR_API_KEY'

type SampleSource = {
  id: CodeSampleId
  label: string
  filename: string
  language: HighlightLanguage
  /** Lines of the sample; the one carrying the base URL is marked changed. */
  lines: string[]
}

/**
 * "Change one line" samples for the landing page. `baseUrl` is the real
 * gateway endpoint (including /v1); the line that carries it is highlighted.
 */
export function buildCodeSamples(baseUrl: string): CodeSample[] {
  const sources: SampleSource[] = [
    {
      id: 'curl',
      label: 'cURL',
      filename: 'request.sh',
      language: 'bash',
      lines: [
        `curl ${baseUrl}/chat/completions \\`,
        `  -H "Authorization: Bearer ${API_KEY}" \\`,
        '  -H "Content-Type: application/json" \\',
        "  -d '{",
        `    "model": "${MODEL}",`,
        '    "messages": [{ "role": "user", "content": "Hello" }]',
        "  }'",
      ],
    },
    {
      id: 'python',
      label: 'Python',
      filename: 'main.py',
      language: 'python',
      lines: [
        'from openai import OpenAI',
        '',
        'client = OpenAI(',
        `    base_url="${baseUrl}",`,
        `    api_key="${API_KEY}",`,
        ')',
        '',
        'response = client.chat.completions.create(',
        `    model="${MODEL}",`,
        '    messages=[{"role": "user", "content": "Hello"}],',
        ')',
        'print(response.choices[0].message.content)',
      ],
    },
    {
      id: 'node',
      label: 'Node.js',
      filename: 'index.mjs',
      language: 'typescript',
      lines: [
        'import OpenAI from "openai";',
        '',
        'const client = new OpenAI({',
        `  baseURL: "${baseUrl}",`,
        `  apiKey: "${API_KEY}",`,
        '});',
        '',
        'const response = await client.chat.completions.create({',
        `  model: "${MODEL}",`,
        '  messages: [{ role: "user", content: "Hello" }],',
        '});',
        'console.log(response.choices[0].message.content);',
      ],
    },
  ]

  return sources.map((source) => ({
    id: source.id,
    label: source.label,
    filename: source.filename,
    language: source.language,
    lines: source.lines.map((text, index) => ({
      no: index + 1,
      text,
      changed: text.includes(baseUrl),
    })),
    code: source.lines.join('\n'),
  }))
}
