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
import cherryStudioIcon from '@/assets/brand-icons/clients/cherrystudio.svg'
import claudeCodeIcon from '@/assets/brand-icons/clients/claudecode.svg'
import codexIcon from '@/assets/brand-icons/clients/codex.svg'
import claudeIcon from '@/assets/brand-icons/models/claude.svg'
import deepseekIcon from '@/assets/brand-icons/models/deepseek.svg'
import geminiIcon from '@/assets/brand-icons/models/gemini.svg'
import openaiWhiteIcon from '@/assets/brand-icons/models/openai-white.png'
import openaiIcon from '@/assets/brand-icons/models/openai.svg'
import { useTheme } from '@/context/theme-provider'

// User-supplied ai-brand-icons assets. Preserve their shapes and original colors.
const icons = {
  OpenAI: openaiIcon,
  Claude: claudeIcon,
  Gemini: geminiIcon,
  DeepSeek: deepseekIcon,
  Codex: codexIcon,
  'Claude Code': claudeCodeIcon,
  'Cherry Studio': cherryStudioIcon,
}

type HomeBrandIconProps = {
  brand: keyof typeof icons
}

/** Decorative logo beside a visible brand name; no duplicate accessible label. */
export function HomeBrandIcon(props: HomeBrandIconProps) {
  const { resolvedTheme } = useTheme()
  const useWhiteVariant = props.brand === 'OpenAI' && resolvedTheme === 'dark'

  return (
    <img
      src={useWhiteVariant ? openaiWhiteIcon : icons[props.brand]}
      alt=''
      aria-hidden='true'
      width={24}
      height={24}
      decoding='async'
      className='size-6 shrink-0 object-contain'
    />
  )
}
