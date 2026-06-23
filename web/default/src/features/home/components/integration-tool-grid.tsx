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
import {
  Bot,
  BrainCircuit,
  Code2,
  Gem,
  MonitorUp,
  Sparkles,
  TerminalSquare,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

const tiles = [
  { name: 'OpenAI', meta: 'GPT 5.2', icon: BrainCircuit },
  { name: 'Claude', meta: 'Opus 4.7', icon: Sparkles },
  { name: 'Gemini', meta: '3.1 Pro', icon: Gem },
  { name: 'DeepSeek', meta: 'R2', icon: Bot },
  { name: 'Codex CLI', meta: 'Terminal', icon: TerminalSquare },
  { name: 'Claude Code', meta: 'IDE', icon: Code2 },
  { name: 'Cherry Studio', meta: 'Desktop', icon: MonitorUp },
  { name: 'Open WebUI', meta: 'Web UI', icon: Bot },
]

export function IntegrationToolGrid() {
  const { t } = useTranslation()

  return (
    <section id='home-tools' className='relative z-10 px-4 py-14 sm:px-6'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mx-auto mb-8 max-w-2xl text-center'>
          <p className='mb-3 text-xs font-semibold tracking-[0.16em] text-[#f05a53] uppercase'>
            {t('Unified setup')}
          </p>
          <h2 className='text-2xl leading-tight font-bold md:text-3xl'>
            {t('One endpoint for the AI tools you already use')}
          </h2>
        </AnimateInView>

        <AnimateInView className='bg-border/70 border-border/70 grid gap-px overflow-hidden rounded-[18px] border sm:grid-cols-2 lg:grid-cols-4'>
          {tiles.map((tile) => {
            const Icon = tile.icon
            return (
              <div
                key={tile.name}
                className='bg-background flex min-h-32 flex-col items-center justify-center p-5 text-center dark:bg-neutral-950'
              >
                <span className='border-border/60 bg-background mb-3 flex size-9 items-center justify-center rounded-xl border dark:bg-neutral-950'>
                  <Icon className='size-4 text-[#f05a53]' />
                </span>
                <p className='text-sm font-semibold'>{tile.name}</p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {tile.meta}
                </p>
              </div>
            )
          })}
        </AnimateInView>
      </div>
    </section>
  )
}
