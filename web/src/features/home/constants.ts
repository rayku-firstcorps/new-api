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
/**
 * Home page constants
 * All hardcoded data for home page sections
 */
import { type TFunction } from 'i18next'

// Layout - Main base classes
export const MAIN_BASE_CLASSES = 'bg-background text-foreground w-full'

// Hero section - AI Applications (Left side)
export const AI_APPLICATIONS = [
  'LobeHub.Color',
  'Dify.Color',
  'OpenWebUI',
  'Cline',
] as const

// Hero section - AI Models (Right side)
export const AI_MODELS = [
  'Qwen.Color',
  'DeepSeek.Color',
  'Doubao.Color',
  'OpenAI',
  'Claude.Color',
  'Gemini.Color',
] as const

// Hero section - Product benefits
export const GATEWAY_FEATURES = [
  'Cost Tracking',
  'Model Access',
  'Guardrails',
  'Observability',
  'Budgets',
  'App Connections',
  'Usage Records',
  'Shared Quota',
  'Request Costs',
  'Developer Docs',
] as const

// Stats section - Default statistics
export const DEFAULT_STATS = [
  {
    value: '50',
    suffix: '+',
    description: 'leading model services',
  },
  {
    value: '100',
    suffix: '+',
    description: 'billable models',
  },
  {
    value: '4',
    suffix: '+',
    description: 'AI app integrations',
  },
  {
    value: 'Real-time',
    suffix: '',
    description: 'usage and cost records',
  },
] as const

// Features section - Default features
export const DEFAULT_FEATURES = [
  {
    title: 'Unified model access',
    description:
      'Use multiple model providers through one account and one control surface.',
    iconName: 'Boxes',
  },
  {
    title: 'Clear usage and cost',
    description:
      'See balance, request records, and per-use costs in real time.',
    iconName: 'WalletCards',
  },
  {
    title: 'Works with common AI tools',
    description:
      'Connect to Cherry Studio, Open WebUI, LobeChat, ChatBox, and similar clients.',
    iconName: 'PlugZap',
  },
  {
    title: 'Team sharing and permissions',
    description:
      'Manage members, quota, permissions, and records in one place.',
    iconName: 'Users',
  },
  {
    title: 'Reliable availability',
    description:
      'Reduce interruptions and repeated configuration through managed service routing.',
    iconName: 'ShieldCheck',
  },
  {
    title: 'Developer-ready access',
    description:
      'Keep compatible APIs and documentation available for advanced integrations.',
    iconName: 'Code2',
  },
] as const

export function getGatewayFeatures(t: TFunction) {
  return GATEWAY_FEATURES.map((feature) => t(feature))
}

export function getDefaultStats(t: TFunction) {
  return DEFAULT_STATS.map((stat) => ({
    ...stat,
    description: stat.description ? t(stat.description) : undefined,
  }))
}

export function getDefaultFeatures(t: TFunction) {
  return DEFAULT_FEATURES.map((feature) => ({
    ...feature,
    title: t(feature.title),
    description: t(feature.description),
  }))
}
