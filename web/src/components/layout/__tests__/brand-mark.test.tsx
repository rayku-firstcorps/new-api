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
import { render } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { BrandLogoImage } from '../components/brand-mark'
import { HeaderLogo } from '../components/header-logo'
import { isKucodeMarkUrl } from '../lib/brand-mark-url'

describe('isKucodeMarkUrl', () => {
  test.each([
    '/kucode-mark.svg',
    '/kucode-mark-mono.svg',
    'https://cdn.example.com/a/kucode-mark.svg?v=2',
  ])('matches the bundled mark url %s', (url) => {
    expect(isKucodeMarkUrl(url)).toBe(true)
  })

  test.each(['/logo.png', '', null, undefined, '/my-kucode-mark.svg.png'])(
    'ignores other logo url %s',
    (url) => {
      expect(isKucodeMarkUrl(url)).toBe(false)
    }
  )
})

describe('BrandLogoImage', () => {
  test('renders the KuCode mark inline in currentColor instead of an img', () => {
    const { container } = render(
      <BrandLogoImage src='/kucode-mark.svg' alt='Logo' />
    )

    expect(container.querySelector('img')).toBeNull()
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('fill')).toBe('currentColor')
    expect(svg?.querySelectorAll('circle')).toHaveLength(9)
  })

  test('renders any other logo unchanged as an img', () => {
    const { getByAltText } = render(
      <BrandLogoImage src='/logo.png' alt='Logo' />
    )

    expect(getByAltText('Logo').getAttribute('src')).toBe('/logo.png')
  })
})

describe('HeaderLogo', () => {
  test('keeps the loading fade for the inline mark', () => {
    const { container } = render(
      <HeaderLogo src='/kucode-mark-mono.svg' loading logoLoaded />
    )

    expect(container.querySelector('svg')?.getAttribute('class')).toContain(
      'opacity-0'
    )
  })

  test('renders a regular logo as an img', () => {
    const { container } = render(
      <HeaderLogo src='/logo.png' loading={false} logoLoaded />
    )

    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/logo.png'
    )
  })
})
