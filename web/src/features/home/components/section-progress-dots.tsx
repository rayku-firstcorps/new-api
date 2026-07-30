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
import { useTranslation } from 'react-i18next'

const sections = [
  { id: 'home-hero', label: 'Hero' },
  { id: 'home-tools', label: 'Tools' },
  { id: 'home-account', label: 'Account' },
  { id: 'home-developers', label: 'Developers' },
]

export function SectionProgressDots() {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('Home page sections')}
      className='fixed top-1/2 right-6 z-20 hidden -translate-y-1/2 flex-col gap-3 xl:flex'
    >
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-label={t(section.label)}
          className='border-border/70 bg-background/80 block size-2.5 rounded-full border transition-colors hover:border-[#c97955]/70 hover:bg-[#c97955]/10'
        />
      ))}
    </nav>
  )
}
