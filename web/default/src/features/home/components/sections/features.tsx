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
import { Boxes, MonitorUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AnimateInView } from '@/components/animate-in-view'

interface FeaturesProps {
  className?: string
}

const modelGroups = [
  {
    title: 'ChatGPT / OpenAI compatible',
    items: ['GPT-5.2', 'o4-mini', 'OpenRouter', 'Azure OpenAI'],
  },
  {
    title: 'Claude',
    items: ['Claude Sonnet', 'Claude Opus', 'Anthropic compatible'],
  },
  {
    title: 'Gemini',
    items: ['Gemini 2.5 Pro', 'Gemini Flash', 'Vertex AI'],
  },
  {
    title: 'Open models',
    items: ['DeepSeek', 'Qwen', 'Llama', 'Mistral'],
  },
]

const appGroups = [
  'Claude Code',
  'Codex CLI',
  'OpenCode CLI',
  'Gemini CLI',
  'Cherry Studio',
  'Open WebUI',
  'LobeChat',
  'ChatBox',
]

export function Features(_props: FeaturesProps) {
  const { t } = useTranslation()

  return (
    <section className='relative z-10 px-4 py-20 sm:px-6 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView className='mb-12 max-w-2xl'>
          <p className='text-muted-foreground mb-3 text-xs font-medium uppercase'>
            {t('Models and apps')}
          </p>
          <h2 className='text-3xl leading-[1.08] font-bold md:text-4xl'>
            {t('Common models and clients stay within reach')}
          </h2>
          <p className='text-muted-foreground mt-4 text-base leading-relaxed'>
            {t(
              'Use lightweight groups instead of a logo wall. The exact model list follows your instance configuration.'
            )}
          </p>
        </AnimateInView>

        <div className='grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
          <AnimateInView className='border-border/70 bg-background/90 rounded-[18px] border p-5 dark:bg-neutral-950/40'>
            <div className='mb-5 flex items-center gap-3'>
              <span className='border-border/60 bg-muted/25 flex size-10 items-center justify-center rounded-xl border'>
                <Boxes className='size-5 text-[#c97955]' />
              </span>
              <div>
                <h3 className='text-base font-semibold'>
                  {t('Model families')}
                </h3>
                <p className='text-muted-foreground text-xs'>
                  {t('Shown as examples from a configurable catalog')}
                </p>
              </div>
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              {modelGroups.map((group) => (
                <div
                  key={group.title}
                  className='border-border/60 bg-muted/15 rounded-xl border p-4'
                >
                  <p className='mb-3 text-sm font-semibold'>{t(group.title)}</p>
                  <div className='flex flex-wrap gap-2'>
                    {group.items.map((item) => (
                      <span
                        key={item}
                        className='border-border/60 bg-background/70 rounded-full border px-2.5 py-1 text-xs'
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AnimateInView>

          <AnimateInView
            delay={100}
            className='border-border/70 bg-background/90 rounded-[18px] border p-5 dark:bg-neutral-950/40'
          >
            <div className='mb-5 flex items-center gap-3'>
              <span className='border-border/60 bg-muted/25 flex size-10 items-center justify-center rounded-xl border'>
                <MonitorUp className='size-5 text-[#c97955]' />
              </span>
              <div>
                <h3 className='text-base font-semibold'>
                  {t('Client ecosystem')}
                </h3>
                <p className='text-muted-foreground text-xs'>
                  {t('Start with the tool you already use')}
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              {appGroups.map((app) => (
                <span
                  key={app}
                  className='border-border/60 bg-muted/20 rounded-full border px-3 py-1.5 text-sm'
                >
                  {app}
                </span>
              ))}
            </div>
          </AnimateInView>
        </div>
      </div>
    </section>
  )
}
