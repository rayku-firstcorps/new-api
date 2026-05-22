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
const fs = require('node:fs')
const path = require('node:path')

const file = path.resolve(__dirname, '../src/i18n/locales/zh.json')
const json = JSON.parse(fs.readFileSync(file, 'utf8'))

const translations = {
  '10-minute first connection': '\u0031\u0030 \u5206\u949f\u5b8c\u6210\u9996\u6b21\u63a5\u5165',
  '401 / token invalid': '\u0034\u0030\u0031 \u002f token invalid',
  '404 /v1/v1/...': '\u0034\u0030\u0034 \u002fv\u0031\u002fv\u0031\u002f...',
  Acceptance: '\u9a8c\u6536',
  'Admin workflow': '\u7ba1\u7406\u5458\u6d41\u7a0b',
  'Append the built-in Claude CLI and Codex CLI templates before production rollout.':
    '\u751f\u4ea7\u53d1\u5e03\u524d\u8ffd\u52a0\u5185\u7f6e\u7684 Claude CLI \u548c Codex CLI \u6a21\u677f\u3002',
  'Auth Header': '\u9274\u6743 Header',
  'Base URL Rule': 'Base URL \u89c4\u5219',
  'Channel Affinity keeps repeated agent turns on a successful upstream channel.':
    'Channel Affinity \u4f1a\u8ba9\u540c\u4e00 Agent \u4f1a\u8bdd\u6301\u7eed\u590d\u7528\u6210\u529f\u7684\u4e0a\u6e38\u6e20\u9053\u3002',
  'Check the current shell and ~/.gemini/.env before restarting Gemini CLI.':
    '\u91cd\u542f Gemini CLI \u524d\u68c0\u67e5\u5f53\u524d shell \u548c ~\u002f.gemini\u002f.env\u3002',
  'Claude Code completes one request through /v1/messages.':
    'Claude Code \u80fd\u901a\u8fc7 \u002fv\u0031\u002fmessages \u5b8c\u6210\u4e00\u6b21\u8bf7\u6c42\u3002',
  'Claude Code uses the Anthropic Messages route. Set the base URL to the gateway root, without /v1.':
    'Claude Code \u4f7f\u7528 Anthropic Messages \u8def\u7531\u3002Base URL \u586b\u7f51\u5173\u6839\u5730\u5740\uff0c\u4e0d\u8981\u5e26 \u002fv\u0031\u3002',
  'Claude Messages': 'Claude Messages',
  'CLI Agent Access Guide': 'CLI Agent \u63a5\u5165\u6307\u5357',
  'CLI Agent Docs': 'CLI Agent \u6587\u6863',
  'CLI setup': 'CLI \u914d\u7f6e',
  Client: '\u5ba2\u6237\u7aef',
  'Codex CLI completes one request through /v1/responses.':
    'Codex CLI \u80fd\u901a\u8fc7 \u002fv\u0031\u002fresponses \u5b8c\u6210\u4e00\u6b21\u8bf7\u6c42\u3002',
  'Codex CLI should use the OpenAI Responses protocol. Set the provider base URL to the gateway /v1 root.':
    'Codex CLI \u5e94\u4f7f\u7528 OpenAI Responses \u534f\u8bae\u3002Provider Base URL \u586b\u7f51\u5173 \u002fv\u0031 \u5730\u5740\u3002',
  'Common pitfall': '\u5e38\u89c1\u5751\u70b9',
  'Config switching': '\u914d\u7f6e\u5207\u6362',
  'Config target': '\u914d\u7f6e\u76ee\u6807',
  'Configure upstream channels': '\u914d\u7f6e\u4e0a\u6e38\u6e20\u9053',
  'Connect Claude Code, Gemini CLI, and Codex CLI':
    '\u63a5\u5165 Claude Code\u3001Gemini CLI \u548c Codex CLI',
  'Create model mappings': '\u521b\u5efa\u6a21\u578b\u6620\u5c04',
  'Create one gateway key, set the correct base URL, and verify a real CLI request.':
    '\u521b\u5efa\u4e00\u4e2a\u7f51\u5173 Key\uff0c\u8bbe\u7f6e\u6b63\u786e Base URL\uff0c\u5e76\u9a8c\u8bc1\u4e00\u6b21\u771f\u5b9e CLI \u8bf7\u6c42\u3002',
  'Developer check': '\u5f00\u53d1\u8005\u68c0\u67e5',
  'Direct config mode': '\u76f4\u63a5\u914d\u7f6e\u6a21\u5f0f',
  'Do not add /v1 to Claude or Gemini base URLs.':
    'Claude \u548c Gemini \u7684 Base URL \u4e0d\u8981\u52a0 \u002fv\u0031\u3002',
  'Enable Channel Affinity': '\u542f\u7528 Channel Affinity',
  'Enable Channel Affinity and review upstream health in the channel list.':
    '\u542f\u7528 Channel Affinity\uff0c\u5e76\u5728\u6e20\u9053\u5217\u8868\u68c0\u67e5\u4e0a\u6e38\u5065\u5eb7\u72b6\u6001\u3002',
  'Enable Claude Messages, Gemini API, and OpenAI Responses capable channels for agent traffic.':
    '\u4e3a Agent \u6d41\u91cf\u542f\u7528\u652f\u6301 Claude Messages\u3001Gemini API \u548c OpenAI Responses \u7684\u6e20\u9053\u3002',
  Error: '\u9519\u8bef',
  'Expected log route': '\u9884\u671f\u65e5\u5fd7\u8def\u7531',
  'Expose practical model names such as claude-*, gemini-*, and gpt-*-codex to developers.':
    '\u5411\u5f00\u53d1\u8005\u5f00\u653e claude-*\u3001gemini-*\u3001gpt-*-codex \u7b49\u5b9e\u7528\u6a21\u578b\u540d\u3002',
  Fix: '\u5904\u7406\u65b9\u5f0f',
  'Gateway base': '\u7f51\u5173\u5730\u5740',
  'Gateway Path': '\u7f51\u5173\u8def\u5f84',
  'Gateway Setup': '\u7f51\u5173\u914d\u7f6e',
  'Gemini CLI completes one request through /v1beta/models/{model}:generateContent.':
    'Gemini CLI \u80fd\u901a\u8fc7 \u002fv\u0031beta\u002fmodels\u002f{model}:generateContent \u5b8c\u6210\u4e00\u6b21\u8bf7\u6c42\u3002',
  'Gemini CLI uses the Gemini route. Set the gateway root as the base URL, without /v1beta.':
    'Gemini CLI \u4f7f\u7528 Gemini \u8def\u7531\u3002Base URL \u586b\u7f51\u5173\u6839\u5730\u5740\uff0c\u4e0d\u8981\u5e26 \u002fv\u0031beta\u3002',
  'Gemini Generate Content': 'Gemini Generate Content',
  'Gemini still calls Google': 'Gemini \u4ecd\u8bf7\u6c42 Google \u5b98\u65b9',
  Install: '\u5b89\u88c5',
  'Issue a dedicated CLI key': '\u53d1\u653e\u4e13\u7528 CLI Key',
  'Likely cause': '\u53ef\u80fd\u539f\u56e0',
  'Local router mode': '\u672c\u5730\u8def\u7531\u6a21\u5f0f',
  'Most CLI connection failures come from key loading, duplicated URL versions, or upstream route mismatch.':
    '\u5927\u591a\u6570 CLI \u8fde\u63a5\u5931\u8d25\u6765\u81ea Key \u672a\u52a0\u8f7d\u3001URL \u7248\u672c\u91cd\u590d\u6216\u4e0a\u6e38\u8def\u7531\u4e0d\u5339\u914d\u3002',
  'Need deeper specs?': '\u9700\u8981\u66f4\u5b8c\u6574\u89c4\u683c\uff1f',
  'Never publish real API keys in docs, repos, or screenshots.':
    '\u4e0d\u8981\u5728\u6587\u6863\u3001\u4ed3\u5e93\u6216\u622a\u56fe\u4e2d\u53d1\u5e03\u771f\u5b9e API Key\u3002',
  'OpenAI Responses': 'OpenAI Responses',
  'Persistent config': '\u6301\u4e45\u5316\u914d\u7f6e',
  'Point each CLI to a local 127.0.0.1 route, then let CC Switch forward to the gateway upstream.':
    '\u5c06\u5404 CLI \u6307\u5411\u672c\u5730 \u0031\u0032\u0037.\u0030.\u0030.\u0031 \u8def\u7531\uff0c\u518d\u7531 CC Switch \u8f6c\u53d1\u5230\u7f51\u5173\u4e0a\u6e38\u3002',
  'Preflight Checks': '\u63a5\u5165\u524d\u68c0\u67e5',
  'Prepare channels, model mappings, developer keys, and sticky routing before sharing CLI snippets with users.':
    '\u5411\u7528\u6237\u5206\u4eab CLI \u7247\u6bb5\u524d\uff0c\u5148\u51c6\u5907\u6e20\u9053\u3001\u6a21\u578b\u6620\u5c04\u3001\u5f00\u53d1\u8005 Key \u548c\u7c98\u6027\u8def\u7531\u3002',
  'Provider Field': 'Provider \u5b57\u6bb5',
  'Re-copy the gateway key and verify the active environment variable.':
    '\u91cd\u65b0\u590d\u5236\u7f51\u5173 Key\uff0c\u5e76\u786e\u8ba4\u5f53\u524d\u73af\u5883\u53d8\u91cf\u5df2\u751f\u6548\u3002',
  'Release checklist': '\u53d1\u5e03\u68c0\u67e5\u6e05\u5355',
  'Route CLI traffic through the same quota, model permission, billing, and audit controls.':
    '\u8ba9 CLI \u6d41\u91cf\u8d70\u540c\u4e00\u5957\u989d\u5ea6\u3001\u6a21\u578b\u6743\u9650\u3001\u8ba1\u8d39\u548c\u5ba1\u8ba1\u63a7\u5236\u3002',
  'Safety note': '\u5b89\u5168\u63d0\u793a',
  'See the AI CLI Agent access tutorial PRD in the docs directory.':
    '\u5b8c\u6574\u89c4\u683c\u89c1 docs \u76ee\u5f55\u4e2d\u7684 AI CLI Agent \u63a5\u5165\u6559\u7a0b PRD\u3002',
  'Start with gateway setup': '\u4ece\u7f51\u5173\u914d\u7f6e\u5f00\u59cb',
  'Sticky routing for long sessions': '\u957f\u4f1a\u8bdd\u7c98\u6027\u8def\u7531',
  'Stream disconnected': 'Stream disconnected',
  'Switch the profile, then restart the active Claude, Gemini, or Codex session.':
    '\u5207\u6362 Profile \u540e\uff0c\u91cd\u542f\u5f53\u524d Claude\u3001Gemini \u6216 Codex \u4f1a\u8bdd\u3002',
  'The API key is wrong, disabled, expired, or not loaded by the shell.':
    'API Key \u9519\u8bef\u3001\u88ab\u7981\u7528\u3001\u5df2\u8fc7\u671f\uff0c\u6216\u672a\u88ab\u5f53\u524d shell \u52a0\u8f7d\u3002',
  'The base URL already contains an API version and the client appended another one.':
    'Base URL \u5df2\u5305\u542b API \u7248\u672c\uff0c\u5ba2\u6237\u7aef\u53c8\u8ffd\u52a0\u4e86\u4e00\u6b21\u3002',
  'The custom Gemini base URL is missing or overridden by an older local env file.':
    '\u81ea\u5b9a\u4e49 Gemini Base URL \u7f3a\u5931\uff0c\u6216\u88ab\u65e7\u7684\u672c\u5730\u73af\u5883\u6587\u4ef6\u8986\u76d6\u3002',
  'The upstream channel is unstable or a long session switched channels mid-task.':
    '\u4e0a\u6e38\u6e20\u9053\u4e0d\u7a33\u5b9a\uff0c\u6216\u957f\u4f1a\u8bdd\u5728\u4efb\u52a1\u4e2d\u9014\u5207\u6362\u4e86\u6e20\u9053\u3002',
  Troubleshooting: '\u6392\u969c',
  'Unified keys and billing': '\u7edf\u4e00 Key \u4e0e\u8ba1\u8d39',
  'Usage logs record user key, model, channel, tokens, and status.':
    '\u7528\u91cf\u65e5\u5fd7\u8bb0\u5f55\u7528\u6237 Key\u3001\u6a21\u578b\u3001\u6e20\u9053\u3001Token \u548c\u72b6\u6001\u3002',
  'Usage logs should show /v1/messages.':
    '\u7528\u91cf\u65e5\u5fd7\u5e94\u51fa\u73b0 \u002fv\u0031\u002fmessages\u3002',
  'Usage logs should show /v1/responses.':
    '\u7528\u91cf\u65e5\u5fd7\u5e94\u51fa\u73b0 \u002fv\u0031\u002fresponses\u3002',
  'Usage logs should show /v1beta/models/{model}:generateContent.':
    '\u7528\u91cf\u65e5\u5fd7\u5e94\u51fa\u73b0 \u002fv\u0031beta\u002fmodels\u002f{model}:generateContent\u3002',
  'Use a separate group, quota, rate limit, and model allowlist for terminal agents.':
    '\u4e3a\u7ec8\u7aef Agent \u4f7f\u7528\u72ec\u7acb\u5206\u7ec4\u3001\u989d\u5ea6\u3001\u9650\u901f\u548c\u6a21\u578b\u767d\u540d\u5355\u3002',
  'Use CC Switch style tools to manage multiple local profiles while the gateway remains the billing and audit boundary.':
    '\u4f7f\u7528 CC Switch \u7c7b\u5de5\u5177\u7ba1\u7406\u591a\u4e2a\u672c\u5730 Profile\uff0c\u540c\u65f6\u8ba9\u7f51\u5173\u7ee7\u7eed\u4f5c\u4e3a\u8ba1\u8d39\u548c\u5ba1\u8ba1\u8fb9\u754c\u3002',
  'Use Channel Affinity templates to keep Claude Code and Codex sessions on stable upstream channels.':
    '\u4f7f\u7528 Channel Affinity \u6a21\u677f\uff0c\u8ba9 Claude Code \u548c Codex \u4f1a\u8bdd\u4fdd\u6301\u5728\u7a33\u5b9a\u7684\u4e0a\u6e38\u6e20\u9053\u3002',
  'Use the root URL for Claude and Gemini, and the /v1 URL for Codex.':
    'Claude \u548c Gemini \u4f7f\u7528\u6839\u5730\u5740\uff0cCodex \u4f7f\u7528 \u002fv\u0031 \u5730\u5740\u3002',
  'Use this checklist before publishing the tutorial to users or support teams.':
    '\u5c06\u6559\u7a0b\u53d1\u5e03\u7ed9\u7528\u6237\u6216\u652f\u6301\u56e2\u961f\u524d\uff0c\u4f7f\u7528\u6b64\u6e05\u5355\u68c0\u67e5\u3002',
  'Use this gateway as the single entry point for terminal AI agents, with unified keys, billing, rate limits, logs, and upstream routing.':
    '\u5c06\u672c\u7f51\u5173\u4f5c\u4e3a\u7ec8\u7aef AI Agent \u7684\u7edf\u4e00\u5165\u53e3\uff0c\u96c6\u4e2d\u7ba1\u7406 Key\u3001\u8ba1\u8d39\u3001\u9650\u901f\u3001\u65e5\u5fd7\u548c\u4e0a\u6e38\u8def\u7531\u3002',
  'Verify the gateway key and route before opening a long-running CLI agent session.':
    '\u542f\u52a8\u957f\u65f6\u95f4\u8fd0\u884c\u7684 CLI Agent \u4f1a\u8bdd\u524d\uff0c\u5148\u9a8c\u8bc1\u7f51\u5173 Key \u548c\u8def\u7531\u3002',
}

json.translation = { ...json.translation, ...translations }
json.translation = Object.fromEntries(
  Object.entries(json.translation).sort(([a], [b]) => a.localeCompare(b)),
)

fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8')
