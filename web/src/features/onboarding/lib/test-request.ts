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

/** Small cap on purpose: the request is billed like any other relay call. */
export const TEST_REQUEST_MAX_TOKENS = 16
const TEST_REQUEST_PROMPT = 'Say hello in one short sentence.'
const REPLY_PREVIEW_LENGTH = 200

export type TestFailureKind =
  | 'invalid_key'
  | 'insufficient_quota'
  | 'model_unavailable'
  | 'rate_limited'
  | 'network'
  | 'unknown'

export type TestRequestResult =
  | { ok: true; latencyMs: number; reply: string }
  | {
      ok: false
      kind: TestFailureKind
      latencyMs: number
      /** Raw upstream/gateway message, shown as detail when present. */
      detail: string
      status?: number
    }

interface RelayErrorBody {
  error?: { message?: unknown; code?: unknown; type?: unknown }
}

/** Maps a relay error response to a failure kind with a user-actionable hint. */
export function classifyTestFailure(
  status: number,
  body: RelayErrorBody | null
): { kind: TestFailureKind; detail: string } {
  const detail =
    typeof body?.error?.message === 'string' ? body.error.message : ''
  const code = String(body?.error?.code ?? '')
  const text = `${code} ${detail}`.toLowerCase()

  if (status === 401) return { kind: 'invalid_key', detail }
  if (
    status === 402 ||
    /insufficient|quota|balance|余额|额度/.test(text) ||
    code === 'pre_consume_token_quota_failed'
  ) {
    return { kind: 'insufficient_quota', detail }
  }
  if (
    status === 404 ||
    code === 'model_not_found' ||
    /no available channel|model.*(not found|not available)|无可用渠道/.test(
      text
    )
  ) {
    return { kind: 'model_unavailable', detail }
  }
  if (status === 429) return { kind: 'rate_limited', detail }
  return { kind: 'unknown', detail }
}

function extractReply(payload: unknown): string {
  const choices = (
    payload as { choices?: { message?: { content?: unknown } }[] }
  )?.choices
  const content = choices?.[0]?.message?.content
  return typeof content === 'string' ? content.trim() : ''
}

/**
 * Sends one minimal chat completion through the normal `/v1/chat/completions`
 * relay with the user's own key (no cookies, no backend proxy), so it is
 * authenticated, rate limited and billed like any other API call.
 */
export async function sendTestChatCompletion(args: {
  apiKey: string
  model: string
}): Promise<TestRequestResult> {
  const startedAt = performance.now()
  const elapsed = () => Math.round(performance.now() - startedAt)
  try {
    const response = await fetch('/v1/chat/completions', {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify({
        model: args.model,
        messages: [{ role: 'user', content: TEST_REQUEST_PROMPT }],
        max_tokens: TEST_REQUEST_MAX_TOKENS,
        stream: false,
      }),
    })
    const payload: unknown = await response.json().catch(() => null)
    const latencyMs = elapsed()
    if (!response.ok) {
      const failure = classifyTestFailure(
        response.status,
        payload as RelayErrorBody | null
      )
      return { ok: false, latencyMs, status: response.status, ...failure }
    }
    const reply = extractReply(payload)
    return {
      ok: true,
      latencyMs,
      reply:
        reply.length > REPLY_PREVIEW_LENGTH
          ? `${reply.slice(0, REPLY_PREVIEW_LENGTH)}...`
          : reply,
    }
  } catch {
    return { ok: false, kind: 'network', latencyMs: elapsed(), detail: '' }
  }
}
