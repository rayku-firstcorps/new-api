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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStatus } from '@/hooks/use-status'

import { FAQ } from '../components/sections/faq'

vi.mock('@/hooks/use-status', () => ({ useStatus: vi.fn() }))

const mockStatus = (status: Record<string, unknown> | null) => {
  vi.mocked(useStatus).mockReturnValue({
    status: status as never,
    loading: false,
    error: null,
  })
}

describe('home FAQ', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: false,
          media: query,
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as MediaQueryList
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('lists the admin FAQ entries as collapsed details that open on click', async () => {
    mockStatus({
      faq: [
        {
          id: 1,
          question: 'How do I top up?',
          answer: 'Open the wallet page.',
        },
        { id: 2, question: 'Is streaming supported?', answer: 'Yes.' },
      ],
    })
    render(<FAQ />)

    const summary = screen.getByText('How do I top up?').closest('summary')
    const details = summary?.closest('details')
    expect(screen.getAllByRole('group')).toHaveLength(2)
    expect(details).not.toHaveAttribute('open')

    await userEvent.click(summary as HTMLElement)

    expect(details).toHaveAttribute('open')
  })

  it('is not rendered when no FAQ entries are configured', () => {
    mockStatus({ faq: [] })
    const { container } = render(<FAQ />)

    expect(container).toBeEmptyDOMElement()
  })

  it('is not rendered when the admin disabled the FAQ', () => {
    mockStatus({
      faq_enabled: false,
      faq: [{ id: 1, question: 'Q', answer: 'A' }],
    })
    const { container } = render(<FAQ />)

    expect(container).toBeEmptyDOMElement()
  })

  it('skips entries that lack a question or an answer', () => {
    mockStatus({
      faq: [
        { id: 1, question: 'Only a question', answer: '' },
        { id: 2, question: 'Complete', answer: 'Answer text' },
      ],
    })
    render(<FAQ />)

    expect(screen.queryByText('Only a question')).not.toBeInTheDocument()
    expect(screen.getByText('Complete')).toBeInTheDocument()
  })
})
