import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { toast } from 'sonner'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { OfficialSocialLink } from '@/features/official-social-links'
import en from '@/i18n/locales/en.json'
import zh from '@/i18n/locales/zh.json'
import { api } from '@/lib/api'

import { OfficialSocialLinksSection } from '../official-social-links-section'

const offer: OfficialSocialLink = {
  id: 'linuxdo-offer',
  platform: 'linuxdo',
  label: 'LinuxDo Offers',
  url: 'https://linux.do/t/topic/123456?source=home#offer',
  enabled: true,
  sort: 30,
}

async function renderSettings(links: OfficialSocialLink[] = []) {
  const i18n = createInstance()
  await i18n.init({ lng: 'en', fallbackLng: 'en', resources: { en, zh } })
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  client.setQueryData(['status'], { official_social_links: links })
  const view = render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <OfficialSocialLinksSection data={JSON.stringify(links)} />
      </QueryClientProvider>
    </I18nextProvider>
  )
  return { client, i18n, ...view }
}

beforeEach(() => {
  vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } })
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  toast.dismiss()
})

test('adding a LinuxDo offer saves its destination and refreshes homepage status', async () => {
  const { client } = await renderSettings()
  localStorage.setItem('status', '{}')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Add Community Link' }))
  await user.click(screen.getByRole('combobox', { name: 'Social Platform' }))
  await user.click(
    await screen.findByRole('option', { name: 'LinuxDo Offers' })
  )
  expect(screen.getByRole('textbox', { name: 'Display Name' })).toHaveValue(
    'LinuxDo Offers'
  )
  await user.type(
    screen.getByRole('textbox', { name: 'Community Link' }),
    ` ${offer.url} `
  )
  await user.click(screen.getByRole('button', { name: 'Save Settings' }))
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
  const request = vi.mocked(api.put).mock.calls[0][1] as {
    key: string
    value: string
  }
  expect(request.key).toBe('OfficialSocialLinks')
  expect(JSON.parse(request.value)).toEqual([
    { ...offer, id: expect.any(String), sort: 10 },
  ])
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Save Settings' })).toBeDisabled()
  )
  expect(client.getQueryState(['status'])?.isInvalidated).toBe(true)
  expect(localStorage.getItem('status')).toBeNull()
})

test('an existing offer can change its destination without losing its display name', async () => {
  const configured = { ...offer, label: 'Community special' }
  await renderSettings([configured])
  const user = userEvent.setup()
  const field = screen.getByRole('textbox', { name: 'Community Link' })
  await user.clear(field)
  await user.type(field, 'https://example.com/linuxdo-offer')
  await user.click(screen.getByRole('button', { name: 'Save Settings' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'OfficialSocialLinks',
      value: JSON.stringify([
        { ...configured, url: 'https://example.com/linuxdo-offer' },
      ]),
    })
  )
})

test('disabling an offer allows clearing its URL and persists the disabled state', async () => {
  await renderSettings([offer])
  const user = userEvent.setup()
  await user.click(screen.getByRole('switch', { name: 'Enable This Link' }))
  await user.clear(screen.getByRole('textbox', { name: 'Community Link' }))
  await user.click(screen.getByRole('button', { name: 'Save Settings' }))
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'OfficialSocialLinks',
      value: JSON.stringify([{ ...offer, url: '', enabled: false }]),
    })
  )
})

test('the default offer name follows the interface language without persisting a translation', async () => {
  const { i18n } = await renderSettings([offer])
  await act(() => i18n.changeLanguage('zh'))
  expect(screen.getByRole('textbox', { name: '显示名称' })).toHaveValue(
    'LinuxDo 优惠入口'
  )
  const user = userEvent.setup()
  await user.click(
    screen.getByRole('switch', { name: i18n.t('Enable This Link') })
  )
  await user.click(
    screen.getByRole('button', { name: i18n.t('Save Settings') })
  )
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith('/api/option/', {
      key: 'OfficialSocialLinks',
      value: JSON.stringify([{ ...offer, enabled: false }]),
    })
  )
})

test.each([
  ['', 'Community link is required for enabled entries'],
  ['javascript:alert(1)', 'Please enter a valid community link'],
  ['https://user:secret@linux.do/offer', 'Please enter a valid community link'],
])(
  'an enabled offer with URL %s is rejected before saving',
  async (url, message) => {
    const errorToast = vi.spyOn(toast, 'error')
    await renderSettings([offer])
    const user = userEvent.setup()
    const field = screen.getByRole('textbox', { name: 'Community Link' })
    await user.clear(field)
    if (url) await user.type(field, url)
    await user.click(screen.getByRole('button', { name: 'Save Settings' }))
    expect(errorToast).toHaveBeenCalledWith(message)
    expect(api.put).not.toHaveBeenCalled()
  }
)

test('a failed save retains the edited offer and allows retry', async () => {
  vi.mocked(api.put).mockResolvedValueOnce({
    data: { success: false, message: 'Save failed' },
  })
  await renderSettings([offer])
  const user = userEvent.setup()
  const field = screen.getByRole('textbox', { name: 'Community Link' })
  await user.clear(field)
  await user.type(field, 'https://example.com/linuxdo-offer')
  const save = screen.getByRole('button', { name: 'Save Settings' })
  await user.click(save)
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(save).toBeEnabled())
  expect(field).toHaveValue('https://example.com/linuxdo-offer')
  await user.click(save)
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(save).toBeDisabled())
})
