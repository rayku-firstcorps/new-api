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
import ccSwitchDark from '@/assets/docs/cc-switch-conductor-dark.webp'
import ccSwitchLight from '@/assets/docs/cc-switch-conductor-light.webp'

/** Model used throughout the guide (header badge and config). */
export const GUIDE_MODEL = 'claude-opus-5-5'

export type ClientGuide = {
  name: string
  model: string
  /** i18n key of the protocol the guide uses, shown as the eyebrow. */
  protocolLabel: string
  install: string
  verify: string
  configPath: string
  config: string
  run: string
  summary: string
  /** Decorative illustration shown under the guide header, one per theme. */
  illustration: { light: string; dark: string }
  /** Shortcut through an existing console feature; `text` is an i18n key. */
  consoleTip: { text: string; to: '/keys'; linkLabel: string }
}

/** Step titles of the guide, in order. Values are i18n keys. */
export const GUIDE_STEP_TITLES = [
  'Install or update the client.',
  'Run the version command to confirm the client is available.',
  'Open the configuration file and create the directory first if it does not exist.',
  'Write the following configuration and save the file.',
  'Start the client and send one short message.',
  'Check usage logs and confirm the request route is recorded.',
] as const

/**
 * The docs page has a single guide (user decision 2026-11-26, KuCode plan
 * D17): CC Switch with the gateway root as the Claude endpoint.
 */
export function createCcSwitchGuide(gatewayBaseUrl: string): ClientGuide {
  return {
    name: 'CC Switch',
    model: GUIDE_MODEL,
    protocolLabel: 'Claude compatible',
    install: `# CC Switch manages Claude Code providers; install Claude Code first.
# macOS
brew install --cask cc-switch

# Windows / Linux: download the installer from
# https://github.com/farion1231/cc-switch/releases`,
    verify: 'claude --version',
    configPath:
      'CC Switch -> Claude Code -> Add Provider -> Custom Configuration',
    config: `Name: new-api
API Key: sk-********************************
Endpoint URL: ${gatewayBaseUrl}
Model: ${GUIDE_MODEL}

# Config JSON
{
  "env": {
    "ANTHROPIC_BASE_URL": "${gatewayBaseUrl}",
    "ANTHROPIC_AUTH_TOKEN": "sk-********************************",
    "ANTHROPIC_MODEL": "${GUIDE_MODEL}"
  }
}`,
    run: `# Enable the new-api provider in CC Switch (main window or tray menu), then:
claude`,
    summary:
      'Save the gateway as a Claude Code provider in CC Switch and switch to it with one click. Keep the endpoint at the gateway root.',
    illustration: { light: ccSwitchLight, dark: ccSwitchDark },
    // The API Keys page already has a CC Switch import (ccswitch:// deep link).
    consoleTip: {
      text: "Faster: on the API Keys page, open a key's action menu and choose CC Switch. The import dialog fills in the endpoint and key, then opens CC Switch.",
      to: '/keys',
      linkLabel: 'API Keys',
    },
  }
}
