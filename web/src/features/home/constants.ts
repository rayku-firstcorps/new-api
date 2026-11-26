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
import type { TFunction } from 'i18next'

// Features section - Default features
export const DEFAULT_FEATURES = [
  {
    title: 'Smart Routing',
    description:
      'Routes each request to a healthy channel by priority and weight.',
    iconName: 'Route',
  },
  {
    title: 'Automatic Failover',
    description:
      'When a channel errors or is rate-limited, the request is retried on another channel automatically.',
    iconName: 'ShieldCheck',
  },
  {
    title: 'Native API Compatible',
    description:
      'Speaks the OpenAI, Anthropic and Gemini protocols natively. Change one base_url to migrate.',
    iconName: 'Plug',
  },
  {
    title: 'Unified Billing',
    description:
      'One account, one balance, real-time per-token billing across every provider.',
    iconName: 'Receipt',
  },
  {
    title: 'Usage Analytics',
    description: 'Usage and cost dashboards broken down by model and key.',
    iconName: 'ChartColumn',
  },
  {
    title: 'Enterprise Ready',
    description: 'Single sign-on, request logs and private deployment.',
    iconName: 'Building2',
  },
] as const

export function getDefaultFeatures(t: TFunction) {
  return DEFAULT_FEATURES.map((feature) => ({
    ...feature,
    title: t(feature.title),
    description: t(feature.description),
  }))
}
