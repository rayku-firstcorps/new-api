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
import type { CodeSnippet } from '@/components/code-snippet-tabs'
import {
  buildCurlCommand,
  normalizeEndpoint,
} from '@/features/dashboard/lib/setup-guide'

export interface ConnectSnippetParams {
  /** Gateway root without a trailing path, e.g. `https://api.example.com`. */
  baseUrl: string
  model: string
  /** Key shown on screen, normally masked (`sk-abcd...wxyz`). */
  displayKey: string
  /** Key placed on the clipboard; falls back to `displayKey` when absent. */
  copyKey?: string
}

const PROMPT = 'Say hello in one sentence.'

function renderSnippets(
  baseUrl: string,
  model: string,
  apiKey: string
): Record<'curl' | 'python' | 'anthropic' | 'node', string> {
  return {
    curl: buildCurlCommand({
      endpoint: normalizeEndpoint(baseUrl),
      apiKey,
      model,
    }),
    python: [
      'from openai import OpenAI',
      '',
      'client = OpenAI(',
      `    base_url="${baseUrl}/v1",`,
      `    api_key="${apiKey}",`,
      ')',
      '',
      'response = client.chat.completions.create(',
      `    model="${model}",`,
      `    messages=[{"role": "user", "content": "${PROMPT}"}],`,
      ')',
      'print(response.choices[0].message.content)',
    ].join('\n'),
    anthropic: [
      'import anthropic',
      '',
      'client = anthropic.Anthropic(',
      `    base_url="${baseUrl}",`,
      `    api_key="${apiKey}",`,
      ')',
      '',
      'message = client.messages.create(',
      `    model="${model}",`,
      '    max_tokens=1024,',
      `    messages=[{"role": "user", "content": "${PROMPT}"}],`,
      ')',
      'print(message.content[0].text)',
    ].join('\n'),
    node: [
      'import OpenAI from "openai";',
      '',
      'const client = new OpenAI({',
      `  baseURL: "${baseUrl}/v1",`,
      `  apiKey: "${apiKey}",`,
      '});',
      '',
      'const response = await client.chat.completions.create({',
      `  model: "${model}",`,
      `  messages: [{ role: "user", content: "${PROMPT}" }],`,
      '});',
      'console.log(response.choices[0].message.content);',
    ].join('\n'),
  }
}

/**
 * First-call examples (curl, Python/OpenAI, Anthropic SDK, Node.js) for
 * `CodeSnippetTabs`. The on-screen text uses `displayKey`; the copied text
 * uses `copyKey`, so a masked key can be shown while the real one is copied.
 */
export function buildConnectSnippets(
  params: ConnectSnippetParams
): CodeSnippet[] {
  const baseUrl = params.baseUrl.replace(/\/+$/, '')
  const shown = renderSnippets(baseUrl, params.model, params.displayKey)
  const copied = renderSnippets(
    baseUrl,
    params.model,
    params.copyKey ?? params.displayKey
  )
  const meta = [
    { id: 'curl', label: 'curl', title: 'Terminal' },
    { id: 'python', label: 'Python (OpenAI)', title: 'main.py' },
    { id: 'anthropic', label: 'Anthropic SDK', title: 'anthropic_example.py' },
    { id: 'node', label: 'Node.js', title: 'index.mjs' },
  ] as const
  return meta.map((item) => ({
    ...item,
    display: shown[item.id],
    copy: copied[item.id],
  }))
}
