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
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DocsPage } from '../components/docs-page'

const GATEWAY = 'https://gw.example.com'

vi.mock('@/components/layout', () => ({
  PublicLayout: (props: { children: React.ReactNode }) => props.children,
}))
vi.mock('@/hooks/use-gateway-base-url', () => ({
  useGatewayBaseUrl: () => GATEWAY,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Router boundary: the docs page renders outside a RouterProvider here.
vi.mock('@tanstack/react-router', () => ({
  Link: (props: { to: string; children: React.ReactNode }) => (
    <a href={props.to}>{props.children}</a>
  ),
}))

describe('docs page', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows only the CC Switch guide, with claude-opus-5-5 and no page navigation', () => {
    render(<DocsPage />)

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'CC Switch · claude-opus-5-5',
      })
    ).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.queryByRole('navigation', { name: 'Docs navigation' })
    ).toBeNull()
    expect(screen.queryByText(/Codex|Cursor|OpenCode|Cherry Studio/)).toBeNull()
    expect(screen.queryByText(/claude-opus-4/)).toBeNull()
    expect(
      screen.getByText(/"ANTHROPIC_MODEL": "claude-opus-5-5"/)
    ).toBeInTheDocument()
  })

  it('uses the gateway root endpoint, a per-theme illustration and the API Keys shortcut', () => {
    const { container } = render(<DocsPage />)

    const images = container.querySelectorAll('figure img')
    expect(
      [...images].map((img) => img.getAttribute('data-theme-variant'))
    ).toEqual(['light', 'dark'])
    expect(images[0]).toHaveClass('dark:hidden')
    expect(images[1]).toHaveClass('hidden', 'dark:block')
    expect(images[0]).toHaveAttribute('alt', '')
    expect(
      screen.getByText(`Endpoint URL: ${GATEWAY}`, { exact: false })
    ).toBeInTheDocument()
    expect(screen.queryByText(/\/v1/)).toBeNull()
    expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute(
      'href',
      '/keys'
    )
  })

  it('copies the full config text and confirms with the configuration toast', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText')
    render(<DocsPage />)

    const configBlock = screen
      .getByText(/# Config JSON/)
      .closest('figure') as HTMLElement
    await user.click(
      within(configBlock).getByRole('button', { name: 'Copy config' })
    )

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining(`"ANTHROPIC_BASE_URL": "${GATEWAY}"`)
    )
    expect(writeText.mock.calls[0][0]).toMatch(/^Name: new-api/)
    expect(toast.success).toHaveBeenCalledWith('Configuration copied')
    expect(
      within(configBlock).getByRole('button', { name: 'Copied' })
    ).toBeInTheDocument()
  })

  it('lists the steps and each step in the on-this-page rail', () => {
    render(<DocsPage />)

    const toc = screen.getByRole('navigation', { name: 'On this page' })
    const links = within(toc).getAllByRole('link')

    expect(links).toHaveLength(7)
    expect(links[0]).toHaveAttribute('href', '#steps')
    expect(links[0]).toHaveAttribute('aria-current', 'location')
    for (const link of links) {
      const id = link.getAttribute('href')?.slice(1) ?? ''
      expect(document.querySelector(`#${id}`)).not.toBeNull()
    }
  })
})
