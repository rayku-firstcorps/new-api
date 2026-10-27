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
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'

test('configured mainland endpoint keeps the default and copies its own URL with the keyboard', async (t) => {
  const page = await openHome(t, {
    status: { mainland_base_url: 'https://cn.kucodeapi.com' },
  })
  assert.equal(await page.locator('.home-endpoint').count(), 2)
  await page
    .getByText('https://gateway.example.test/v1', { exact: true })
    .waitFor()
  await page.getByText('https://cn.kucodeapi.com/v1', { exact: true }).waitFor()
  const copy = page.getByRole('button', {
    name: 'Copy mainland China Base URL',
    exact: true,
  })
  await copy.focus()
  await page.keyboard.press('Enter')
  await copy.waitFor({ state: 'hidden' })
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    'https://cn.kucodeapi.com/v1'
  )
  await page
    .locator('#home-hero')
    .screenshot({ path: join(tmpdir(), 'home-mainland-desktop.png') })
})

test('empty or invalid mainland endpoint stays hidden', async (t) => {
  for (const value of [
    undefined,
    '',
    'javascript:alert(1)',
    'https://user:secret@cn.example.com',
  ]) {
    const page = await openHome(t, { status: { mainland_base_url: value } })
    assert.equal(await page.locator('.home-endpoint').count(), 1)
    assert.equal(
      await page
        .getByRole('button', { name: 'Copy mainland China Base URL' })
        .count(),
      0
    )
  }
})

test('mainland endpoint translates and wraps at 320px without duplicating v1', async (t) => {
  const url = `https://${'regional-'.repeat(6)}gateway.example.com/v1`
  for (const language of ['en', 'zh', 'zh-TW', 'fr', 'ja', 'ru', 'vi']) {
    const page = await openHome(t, {
      width: 320,
      language,
      status: { mainland_base_url: url },
    })
    await page.getByText(url, { exact: true }).waitFor()
    assert.equal(await page.locator('.home-endpoint').count(), 2)
    await assertNoOverflow(page)
    if (language === 'zh') {
      await page.getByText('大陆直连优化', { exact: true }).waitFor()
      await page
        .locator('#home-hero')
        .screenshot({ path: join(tmpdir(), 'home-mainland-mobile.png') })
    }
  }
})

test('homepage CTA surfaces follow light, dark, then light theme without dark islands', async (t) => {
  const page = await openHome(t, { theme: 'light' })
  for (const theme of ['light', 'dark', 'light']) {
    await page
      .getByRole('button', { name: 'Toggle theme', exact: true })
      .click()
    await page
      .getByRole('menuitem', {
        name: theme === 'dark' ? 'Dark' : 'Light',
        exact: true,
      })
      .click()
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains('dark') === dark,
      theme === 'dark'
    )
    const surfaces = await page.evaluate(() => {
      const selectors = [
        '.home-hero',
        '.home-network',
        '.home-network-node',
        '.home-endpoint',
        '.home-eyebrow',
        '.home-hub-icon',
        '.home-cta',
      ]
      return selectors.map((selector) => {
        const style = getComputedStyle(document.querySelector(selector))
        const channels = style.backgroundColor
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
        return {
          selector,
          brightness:
            channels.reduce((sum, value) => sum + value, 0) / (3 * 255),
        }
      })
    })
    for (const surface of surfaces) {
      assert.ok(
        theme === 'light'
          ? surface.brightness > 0.8
          : surface.brightness < 0.25,
        `${theme} theme: ${surface.selector} must use a matching surface, got ${surface.brightness}`
      )
    }
    const contrasts = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')
      const luminance = (color) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const rgb = [...context.getImageData(0, 0, 1, 1).data]
          .slice(0, 3)
          .map((value) => {
            const channel = value / 255
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4
          })
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
      }
      return [
        ['.home-title', '.home-hero'],
        ['.home-description', '.home-hero'],
        ['.home-network-node span', '.home-network-node'],
        ['.home-endpoint p', '.home-endpoint'],
        ['.home-eyebrow', '.home-eyebrow'],
        ['.home-actions > a', '.home-actions > a'],
        ['.home-cta p', '.home-cta'],
      ].map(([text, surface]) => {
        const foreground = luminance(
          getComputedStyle(document.querySelector(text)).color
        )
        const background = luminance(
          getComputedStyle(document.querySelector(surface)).backgroundColor
        )
        return {
          text,
          ratio:
            (Math.max(foreground, background) + 0.05) /
            (Math.min(foreground, background) + 0.05),
        }
      })
    })
    for (const contrast of contrasts) {
      assert.ok(
        contrast.ratio >= 4.5,
        `${theme}: ${contrast.text} contrast ${contrast.ratio} must meet 4.5:1`
      )
    }
    await assertNoOverflow(page)
    await page.getByRole('menu').waitFor({ state: 'hidden' })
    await page
      .locator('#home-hero')
      .screenshot({ path: join(tmpdir(), `home-theme-${theme}.png`) })
  }
})

test('supplied model and client logos load at fixed size and OpenAI follows the actual surface theme', async (t) => {
  const page = await openHome(t, { theme: 'light' })
  const brands = [
    { hero: 'OpenAI', grid: 'OpenAI', title: 'OpenAI' },
    { hero: 'Claude', grid: 'Claude', title: 'Claude' },
    { hero: 'Gemini', grid: 'Gemini', title: 'Gemini' },
    { hero: 'DeepSeek', grid: 'DeepSeek', title: 'DeepSeek' },
    { hero: 'Codex', grid: 'Codex CLI', title: 'Codex' },
    { hero: 'Claude Code', grid: 'Claude Code', title: 'Claude Code' },
    { hero: 'Cherry Studio', grid: 'Cherry Studio', title: 'CherryStudio' },
  ]
  for (const selector of ['.home-network-node', '.home-tool-tile']) {
    for (const brand of brands) {
      const name = selector === '.home-network-node' ? brand.hero : brand.grid
      const row = page
        .locator(selector)
        .filter({ hasText: new RegExp(`^${name}$`) })
      const logo = row.locator('img')
      assert.equal(await logo.count(), 1)
      await logo.evaluate((image) => image.decode())
      assert.equal(await logo.getAttribute('alt'), '')
      assert.equal(await logo.getAttribute('aria-hidden'), 'true')
      const size = await logo.boundingBox()
      assert.equal(size.width, 24)
      assert.equal(size.height, 24)
      assert.equal(
        await logo.evaluate((image) => getComputedStyle(image).objectFit),
        'contain'
      )
      assert.ok(await logo.evaluate((image) => image.naturalWidth > 0))
      if (name !== 'OpenAI' || selector === '.home-tool-tile') {
        const svg = await logo.evaluate(async (image) =>
          (await fetch(image.currentSrc)).text()
        )
        assert.ok(
          svg.includes(`<title>${brand.title}</title>`),
          'rendered logo matches the model or client label'
        )
      }
    }
  }
  const heroOpenAI = page
    .locator('.home-network-node')
    .filter({ hasText: /^OpenAI$/ })
    .locator('img')
  const gridOpenAI = page
    .locator('.home-tool-tile')
    .filter({ hasText: /^OpenAI$/ })
    .locator('img')
  const lightSource = await gridOpenAI.getAttribute('src')
  assert.equal(
    lightSource,
    await heroOpenAI.getAttribute('src'),
    'both light surfaces use the dark OpenAI logo'
  )
  await page
    .locator('.home-network')
    .screenshot({ path: join(tmpdir(), 'home-brand-icons-hero.png') })
  await page
    .locator('#home-tools')
    .screenshot({ path: join(tmpdir(), 'home-brand-icons-light.png') })
  await page.getByRole('button', { name: 'Toggle theme', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click()
  await page.waitForFunction((expected) => {
    const logo = [...document.querySelectorAll('.home-tool-tile')]
      .find((tile) => tile.textContent === 'OpenAI')
      ?.querySelector('img')
    return logo?.getAttribute('src') !== expected
  }, lightSource)
  await gridOpenAI.evaluate((image) => image.decode())
  const inverseSource = await gridOpenAI.getAttribute('src')
  assert.equal(await heroOpenAI.getAttribute('src'), inverseSource)
  await page
    .locator('#home-tools')
    .screenshot({ path: join(tmpdir(), 'home-brand-icons-dark.png') })
  await page.getByRole('button', { name: 'Toggle theme', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Light', exact: true }).click()
  await page.waitForFunction((expected) => {
    const logo = [...document.querySelectorAll('.home-tool-tile')]
      .find((tile) => tile.textContent === 'OpenAI')
      ?.querySelector('img')
    return logo?.getAttribute('src') === expected
  }, lightSource)
  assert.equal(await heroOpenAI.getAttribute('src'), lightSource)
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await assertNoOverflow(page)
  }
})

const communityLinks = [
  {
    platform: 'telegram',
    label: 'Telegram',
    url: 'https://t.me/homepage-preview-community',
    enabled: true,
    sort: 10,
  },
  {
    platform: 'whatsapp',
    label: 'WhatsApp',
    url: 'https://chat.whatsapp.com/homepage-preview-community',
    enabled: true,
    sort: 20,
  },
  {
    platform: 'x',
    label: 'Official X',
    url: 'https://x.com/homepage_preview',
    enabled: true,
    sort: 30,
  },
]

test('Telegram and WhatsApp replace the hero docs action without duplicating communities or removing global docs', async (t) => {
  const page = await openHome(t, {
    status: { official_social_links: communityLinks },
  })
  const hero = page.locator('#home-hero')
  assert.equal(await hero.locator('a[href="/docs"]').count(), 0)
  assert.equal(await page.locator('header a[href="/docs"]').count(), 1)
  for (const link of communityLinks.slice(0, 2)) {
    const button = page
      .locator('.home-actions')
      .getByRole('link', { name: link.label, exact: true })
    assert.equal(await button.getAttribute('href'), link.url)
    assert.equal(await button.getAttribute('target'), '_blank')
    assert.equal(await button.getAttribute('rel'), 'noopener noreferrer')
    assert.equal(
      await hero.getByRole('link', { name: link.label, exact: true }).count(),
      1
    )
    assert.ok((await button.boundingBox()).height >= 44)
  }
  assert.equal(
    await hero.getByRole('link', { name: 'Official X', exact: true }).count(),
    1
  )
  assert.equal(
    await page
      .locator('.home-actions')
      .getByRole('link', { name: 'Official X', exact: true })
      .count(),
    0
  )
  await page.context().route('https://t.me/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>Community fixture</title>',
    })
  )
  await hero.getByRole('link', { name: 'Get Started', exact: true }).focus()
  await page.keyboard.press('Tab')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('href')),
    communityLinks[0].url
  )
  await page.keyboard.press('Tab')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('href')),
    communityLinks[1].url
  )
  await page.keyboard.press('Shift+Tab')
  const opened = page.waitForEvent('popup')
  await page.keyboard.press('Enter')
  const popup = await opened
  await popup.waitForLoadState('domcontentloaded')
  assert.equal(popup.url(), communityLinks[0].url)
  assert.equal(await popup.evaluate(() => window.opener === null), true)
  await popup.close()
  await assertNoOverflow(page)
  await hero.screenshot({ path: join(tmpdir(), 'home-community-desktop.png') })
})

test('unconfigured, disabled, or unsafe community URLs never create placeholder actions', async (t) => {
  for (const links of [
    [],
    [
      { ...communityLinks[0], enabled: false },
      { ...communityLinks[1], url: 'javascript:alert(1)' },
      { ...communityLinks[1], url: '' },
    ],
  ]) {
    const page = await openHome(t, { status: { official_social_links: links } })
    assert.equal(
      await page.locator('.home-actions a[target="_blank"]').count(),
      0
    )
    assert.equal(await page.locator('#home-hero a[href="/docs"]').count(), 0)
    assert.equal(
      await page
        .locator('.home-actions')
        .getByRole('link', { name: 'Get Started', exact: true })
        .count(),
      1
    )
  }
})

test('one configured community and long labels fit narrow and desktop layouts', async (t) => {
  const page = await openHome(t, {
    width: 320,
    language: 'zhCN',
    status: {
      official_social_links: [
        {
          ...communityLinks[1],
          label: 'WhatsApp 国际 AI 开发者技术交流与用户社群',
        },
      ],
    },
  })
  const whatsapp = page.locator('.home-actions').getByRole('link', {
    name: 'WhatsApp 国际 AI 开发者技术交流与用户社群',
    exact: true,
  })
  assert.equal(await whatsapp.count(), 1)
  assert.equal(
    await page.locator('.home-actions a[target="_blank"]').count(),
    1
  )
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await assertNoOverflow(page)
    assert.ok((await whatsapp.boundingBox()).height >= 44)
    if (width === 375) {
      await page
        .locator('#home-hero')
        .screenshot({ path: join(tmpdir(), 'home-community-mobile.png') })
    }
  }
})

const linuxDoOffer = {
  platform: 'linuxdo',
  label: 'LinuxDo Offers',
  url: 'https://linux.do/t/topic/123456?source=home#offer',
  enabled: true,
  sort: 25,
}

test('LinuxDo offers appears beside the community buttons and opens safely with the keyboard', async (t) => {
  const page = await openHome(t, {
    language: 'zh',
    status: { official_social_links: [...communityLinks, linuxDoOffer] },
  })
  const offer = page.locator('.home-actions').getByRole('link', {
    name: 'LinuxDo 优惠入口',
    exact: true,
  })
  assert.equal(await offer.getAttribute('href'), linuxDoOffer.url)
  assert.equal(await offer.getAttribute('target'), '_blank')
  assert.equal(await offer.getAttribute('rel'), 'noopener noreferrer')
  assert.equal(await page.locator(`a[href="${linuxDoOffer.url}"]`).count(), 1)
  assert.equal(await offer.locator('svg').getAttribute('aria-hidden'), 'true')
  await page.context().route('https://linux.do/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<title>LinuxDo offer fixture</title>',
    })
  )
  await page.getByRole('link', { name: 'WhatsApp', exact: true }).focus()
  await page.keyboard.press('Tab')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('href')),
    linuxDoOffer.url
  )
  const opened = page.waitForEvent('popup')
  await page.keyboard.press('Enter')
  const popup = await opened
  await popup.waitForLoadState('domcontentloaded')
  assert.equal(popup.url(), linuxDoOffer.url)
  assert.equal(await popup.evaluate(() => window.opener === null), true)
  await popup.close()
  await assertNoOverflow(page)
  await page.locator('#home-hero').screenshot({
    path: join(tmpdir(), 'home-linuxdo-desktop.png'),
  })
})

test('disabled, empty, and unsafe LinuxDo offers stay hidden while other communities remain', async (t) => {
  const page = await openHome(t, {
    status: {
      official_social_links: [
        communityLinks[0],
        { ...linuxDoOffer, enabled: false },
        ...[
          '',
          'javascript:alert(1)',
          'http://linux.do/offer',
          'https://user:secret@linux.do/offer',
        ].map((url) => ({ ...linuxDoOffer, url })),
      ],
    },
  })
  assert.equal(
    await page.getByRole('link', { name: 'LinuxDo Offers' }).count(),
    0
  )
  assert.equal(
    await page.locator('.home-actions a[target="_blank"]').count(),
    1
  )
  assert.equal(
    await page
      .getByRole('link', { name: 'Telegram', exact: true })
      .getAttribute('href'),
    communityLinks[0].url
  )
})

test('LinuxDo default offer labels translate in seven languages and fit both themes at 320px', async (t) => {
  for (const language of ['en', 'zh', 'zh-TW', 'fr', 'ja', 'ru', 'vi']) {
    const locale = JSON.parse(
      await readFile(
        new URL(`../../../i18n/locales/${language}.json`, import.meta.url),
        'utf8'
      )
    )
    const label = locale.translation['LinuxDo Offers']
    assert.ok(label)
    for (const theme of ['light', 'dark']) {
      const page = await openHome(t, {
        width: 320,
        language,
        theme,
        status: {
          official_social_links: [
            ...communityLinks,
            { ...linuxDoOffer, label: '' },
          ],
        },
      })
      const offer = page
        .locator('.home-actions')
        .getByRole('link', { name: label, exact: true })
      assert.equal(await offer.count(), 1)
      assert.ok((await offer.boundingBox()).height >= 44)
      await assertNoOverflow(page)
      if (language === 'zh') {
        await page.locator('#home-hero').screenshot({
          path: join(tmpdir(), `home-linuxdo-mobile-${theme}.png`),
        })
      }
    }
  }
})

// Run against bun run dev (or a production preview) with Playwright installed.
// PLAYWRIGHT_MODULE and PLAYWRIGHT_EXECUTABLE allow reusing a local browser cache.
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
)
const baseURL = process.env.HOME_TEST_URL || 'http://localhost:5173'
let browser

before(async () => {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE || undefined,
  })
})
after(async () => {
  await browser?.close()
})

async function openHome(t, options = {}) {
  const context = await browser.newContext({
    viewport: { width: options.width || 1440, height: 1000 },
    reducedMotion: options.motion || 'reduce',
    permissions: ['clipboard-read', 'clipboard-write'],
  })
  t.after(() => context.close())
  await context.addInitScript(
    ({ language, theme }) => {
      localStorage.setItem('i18nextLng', language)
      localStorage.setItem('newapi:theme:v1:mode', theme)
    },
    { language: options.language || 'en', theme: options.theme || 'light' }
  )
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  t.after(() => assert.deepEqual(errors, [], 'no browser runtime errors'))
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    options.onRequest?.(path)
    if (path === '/api/pricing') {
      return route.fulfill(
        options.pricingResponse || { json: { success: true, data: [] } }
      )
    }
    if (path === '/api/perf-metrics/summary') {
      assert.equal(
        new URL(route.request().url()).searchParams.get('hours'),
        '24'
      )
      if (options.holdPerformance) await options.holdPerformance
      return route.fulfill(
        options.performanceResponse || {
          json: { success: true, data: { models: [] } },
        }
      )
    }
    if (path.includes('/auth/') || path === '/api/user/self') {
      return route.fulfill({
        status: 401,
        json: { success: false, message: 'Not signed in' },
      })
    }
    let data = ''
    if (path === '/api/status') {
      data = {
        system_name: options.systemName || 'New API',
        server_address: options.serverAddress || 'https://gateway.example.test',
        setup: true,
        register_enabled: true,
        HeaderNavModules: { pricing: { enabled: true, requireAuth: false } },
        ...options.status,
      }
    }
    if (path === '/api/home_page_content') data = options.content || ''
    return route.fulfill({ json: { success: true, data } })
  })
  await page.goto(baseURL, {
    waitUntil: options.holdPerformance ? 'domcontentloaded' : 'networkidle',
  })
  if (!options.content) await page.locator('#home-title').waitFor()
  return page
}

async function assertNoOverflow(page) {
  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    return [
      ...document.querySelectorAll(
        '.home-title, .home-description, .home-network, .home-network-node, .home-endpoint, .home-tool-tile, .home-step, .home-cta, #home-cta-title, .home-cta p, .home-cta a, .home-cta [data-slot="badge"], .home-cta li, .home-cta dl, .home-cta h3, .home-actions a'
      ),
    ]
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return (
          rect.left < -1 ||
          rect.right > viewport + 1 ||
          element.scrollWidth > element.clientWidth + 1
        )
      })
      .map((element) => element.className)
  })
  assert.deepEqual(
    overflow,
    [],
    'homepage text and controls fit without clipping'
  )
}

for (const width of [320, 375, 768, 1440]) {
  test(`at ${width}px the hero reflows, all sections remain readable, and nothing overflows`, async (t) => {
    const page = await openHome(t, { width })
    await assertNoOverflow(page)
    assert.equal(await page.locator('main h1').count(), 1)
    const title = await page.locator('#home-title').boundingBox()
    const preview = await page.locator('.home-network').boundingBox()
    if (width < 1024) assert.ok(preview.y > title.y + title.height)
    else assert.ok(preview.x > title.x + title.width)
    for (const id of [
      'home-tools-title',
      'home-steps-title',
      'home-cta-title',
    ]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded()
      assert.equal(
        await page
          .locator(`#${id}`)
          .evaluate((el) => getComputedStyle(el.parentElement).opacity),
        '1'
      )
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    const header = await page.locator('header').boundingBox()
    assert.ok(title.y >= header.height, 'header does not overlap hero content')
    if (width === 375 || width === 1440) {
      await page.screenshot({
        path: join(tmpdir(), `home-${width}-light.png`),
        fullPage: true,
      })
    }
  })
}

test('all seven languages and a long configured endpoint fit on mobile in dark mode', async (t) => {
  for (const [language, locale] of [
    ['zhCN', 'zh'],
    ['zhTW', 'zh-TW'],
    ['en', 'en'],
    ['fr', 'fr'],
    ['ja', 'ja'],
    ['ru', 'ru'],
    ['vi', 'vi'],
  ]) {
    const page = await openHome(t, {
      width: 375,
      theme: 'dark',
      language,
      systemName: 'New API — International model gateway',
      serverAddress:
        'https://international-gateway.example.test/very-long-configured-endpoint',
    })
    await assertNoOverflow(page)
    const messages = JSON.parse(
      await readFile(
        new URL(`../../../i18n/locales/${locale}.json`, import.meta.url),
        'utf8'
      )
    )
    assert.equal(
      await page.locator('#home-title').innerText(),
      messages.translation[
        'Use frontier models inside the tools you already know'
      ]
    )
    if (language === 'zhCN') {
      await page.screenshot({
        path: join(tmpdir(), 'home-375-dark.png'),
        fullPage: true,
      })
    }
  }
})

test('keyboard activation copies the configured endpoint and announces completion', async (t) => {
  const page = await openHome(t)
  const primary = page
    .locator('#home-hero')
    .getByRole('link', { name: 'Get Started', exact: true })
  await primary.focus()
  await page.keyboard.press('Tab')
  assert.equal(
    await page.evaluate(() => document.activeElement.getAttribute('href')),
    '/pricing'
  )
  await page.keyboard.press('Tab')
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.getAttribute('aria-label')
    ),
    'Copy config'
  )
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Copied', exact: true }).waitFor()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  assert.equal(
    copied.replaceAll('\r\n', '\n'),
    'base_url: https://gateway.example.test/v1\napi_key: sk-********************************\nmodel: claude-sonnet-4-5'
  )
  await page.locator('a[href="#home-tools"]').click()
  await page.waitForFunction(() => {
    const y = document.querySelector('#home-tools').getBoundingClientRect().top
    return y >= 64 && y < 200
  })
})

test('disabled registration and private pricing retain their existing destination and visibility', async (t) => {
  const page = await openHome(t, {
    status: {
      register_enabled: false,
      HeaderNavModules: { pricing: { enabled: true, requireAuth: true } },
    },
  })
  assert.equal(
    await page
      .locator('#home-hero')
      .getByRole('link', { name: 'Sign In', exact: true })
      .getAttribute('href'),
    '/sign-in'
  )
  assert.equal(
    await page.locator('.home-landing a[href="/pricing"]').count(),
    0
  )
  assert.equal(await page.locator('.home-cta a[href="/sign-in"]').count(), 1)
})

test('entrance and connection motion run finitely and stop when reduced motion is enabled', async (t) => {
  const page = await openHome(t, { motion: 'no-preference' })
  assert.notEqual(
    await page
      .locator('.home-title')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none'
  )
  assert.equal(
    await page
      .locator('.home-connection')
      .first()
      .evaluate(
        (el) => getComputedStyle(el, '::after').animationIterationCount
      ),
    '2'
  )
  await page.locator('#home-steps-title').scrollIntoViewIfNeeded()
  await page.waitForFunction(() => {
    const parent = document.querySelector('#home-steps-title').parentElement
    return getComputedStyle(parent).opacity === '1'
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const animated = await page
    .locator('.home-landing')
    .evaluate((root) =>
      [...root.querySelectorAll('*')]
        .filter(
          (el) =>
            getComputedStyle(el).animationName !== 'none' ||
            getComputedStyle(el, '::after').animationName !== 'none'
        )
        .map((el) => el.className)
    )
  assert.deepEqual(animated, [])
  assert.equal(
    await page
      .locator('.home-cta')
      .evaluate((el) => getComputedStyle(el).opacity),
    '1'
  )
})

test('a configured Markdown homepage keeps its content and does not inherit the default landing theme', async (t) => {
  const page = await openHome(t, {
    content: '# Custom gateway\n\nExisting administrator content.',
  })
  await page.getByRole('heading', { name: 'Custom gateway' }).waitFor()
  assert.equal(await page.locator('.home-landing').count(), 0)
  assert.equal(await page.locator('#home-hero').count(), 0)
  assert.equal(
    await page.getByText('Existing administrator content.').count(),
    1
  )
})

const popularModelName = 'provider/most-called-model'
const catalogResponse = {
  json: {
    success: true,
    data: [
      {
        id: 1,
        model_name: 'a-fastest-model',
        description: 'Lower traffic model',
        vendor_id: 1,
        enable_groups: ['default'],
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 1,
      },
      {
        id: 2,
        model_name: popularModelName,
        description: 'A model selected from real request rankings.',
        vendor_id: 2,
        tags: 'Reasoning,Coding,Multimodal',
        context_length: 1000000,
        max_output_tokens: 128000,
        enable_groups: ['default'],
        quota_type: 0,
        model_ratio: 2.5,
        completion_ratio: 5,
      },
      {
        id: 3,
        model_name: 'third-per-call-model',
        vendor_id: 1,
        enable_groups: ['default'],
        quota_type: 1,
        model_price: 0.04,
        model_ratio: 0,
        completion_ratio: 0,
      },
      {
        id: 4,
        model_name: 'fourth-ranked-model',
        vendor_id: 2,
        enable_groups: ['default'],
        quota_type: 0,
        model_ratio: 1,
        completion_ratio: 1,
      },
    ],
    vendors: [
      { id: 1, name: 'Alpha Labs' },
      { id: 2, name: 'Beta AI' },
    ],
    group_ratio: { default: 1 },
    usable_group: {},
    supported_endpoint: {},
    auto_groups: [],
  },
}
const rankedResponse = {
  json: {
    success: true,
    data: {
      // Counts are intentionally absent, just as in the public backend response.
      models: [
        {
          model_name: 'unlisted-model',
          avg_latency_ms: 1,
          success_rate: 100,
          avg_tps: 100,
        },
        {
          model_name: popularModelName,
          avg_latency_ms: 900,
          success_rate: 90,
          avg_tps: 10,
        },
        {
          model_name: 'a-fastest-model',
          avg_latency_ms: 1,
          success_rate: 100,
          avg_tps: 100,
        },
        { model_name: 'third-per-call-model' },
        { model_name: 'fourth-ranked-model' },
      ],
    },
  },
}
const rankedModelNames = [
  popularModelName,
  'a-fastest-model',
  'third-per-call-model',
]

test('CTA lists the top three catalog models in server order and skips unlisted ones', async (t) => {
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    performanceResponse: rankedResponse,
  })
  const list = page.getByRole('list', {
    name: 'Most called models · Last 24 hours',
  })
  await list.waitFor()
  const cards = list.locator('> li')
  assert.equal(await cards.count(), 3)
  assert.deepEqual(
    await cards.getByRole('heading').allInnerTexts(),
    rankedModelNames
  )
  assert.deepEqual(
    await cards
      .locator('[data-slot="card-header"] [data-slot="badge"]')
      .allInnerTexts(),
    ['#1', '#2', '#3']
  )
  assert.equal(
    await page.locator('#home-cta-title').innerText(),
    'Start with the AI tool you already use'
  )
})

test('CTA card shows only catalog-provided vendor, tags, prices and limits', async (t) => {
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    performanceResponse: rankedResponse,
  })
  const cards = page.locator('.home-cta > ul > li')
  await cards.first().waitFor()
  const top = cards.nth(0)
  const topText = await top.innerText()
  assert.match(topText, /Beta AI/)
  assert.deepEqual(
    await top.getByRole('list', { name: 'Tags' }).locator('li').allInnerTexts(),
    ['Reasoning', 'Coding']
  )
  assert.equal(await top.locator('dd').nth(0).innerText(), '$5')
  assert.equal(await top.locator('dd').nth(1).innerText(), '$25')
  assert.match(topText, /Context:\s*1M/)
  assert.match(topText, /Max output:\s*128K/)

  const second = await cards.nth(1).innerText()
  assert.match(second, /Alpha Labs/)
  assert.doesNotMatch(second, /Context|Max output|Tags/)

  const third = cards.nth(2)
  assert.match(await third.innerText(), /Price per request/)
  assert.equal(await third.locator('dd').first().innerText(), '$0.04')
  // Request counts are private; nothing numeric about traffic may be rendered.
  assert.doesNotMatch(
    await page.locator('.home-cta').innerText(),
    /requests?\b.*\d/i
  )
})

test('CTA cards open the model details by keyboard and by clicking anywhere on the card', async (t) => {
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    performanceResponse: rankedResponse,
  })
  const cards = page.locator('.home-cta > ul > li')
  await cards.first().waitFor()
  await page.locator('.home-cta').scrollIntoViewIfNeeded()
  await page
    .locator('.home-cta')
    .screenshot({ path: join(tmpdir(), 'home-popular-model-desktop.png') })

  const links = cards.getByRole('link')
  assert.equal(await links.count(), 3)
  assert.deepEqual(
    (
      await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')))
    ).map(decodeURIComponent),
    rankedModelNames.map((name) => `/pricing/${name}`)
  )
  await page
    .locator('.home-cta')
    .getByRole('link', { name: 'View Pricing', exact: true })
    .focus()
  await page.keyboard.press('Tab')
  assert.equal(
    await links.nth(0).evaluate((el) => el === document.activeElement),
    true
  )
  await page.keyboard.press('Tab')
  assert.equal(
    await links.nth(1).evaluate((el) => el === document.activeElement),
    true
  )
  await links.nth(0).focus()
  await page.keyboard.press('Enter')
  await page.waitForURL(
    (url) => decodeURIComponent(url.pathname) === `/pricing/${popularModelName}`
  )
})

for (const [count, width, columns] of [
  [1, 1440, 1],
  [2, 1440, 2],
  [2, 375, 1],
  [3, 1440, 3],
  [3, 768, 1],
]) {
  test(`CTA with ${count} matching model(s) uses ${columns} column(s) at ${width}px without overflow`, async (t) => {
    const page = await openHome(t, {
      width,
      pricingResponse: catalogResponse,
      performanceResponse: {
        json: {
          success: true,
          data: {
            models: rankedModelNames.slice(0, count).map((model_name) => ({
              model_name,
            })),
          },
        },
      },
    })
    const cards = page.locator('.home-cta > ul > li')
    await cards.first().waitFor()
    assert.equal(await cards.count(), count)
    const lefts = await cards.evaluateAll((els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().left))
    )
    assert.equal(new Set(lefts).size, Math.min(columns, count))
    await assertNoOverflow(page)
  })
}

test('CTA cards keep readable text and a matching surface in light and dark themes', async (t) => {
  for (const theme of ['light', 'dark']) {
    const page = await openHome(t, {
      theme,
      pricingResponse: catalogResponse,
      performanceResponse: rankedResponse,
    })
    await page.locator('.home-cta > ul > li').first().waitFor()
    const result = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')
      // Computed colors may be oklch(); painting normalizes them to RGB.
      const brightness = (color) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        const data = context.getImageData(0, 0, 1, 1).data
        return (data[0] + data[1] + data[2]) / (3 * 255)
      }
      const card = document.querySelector('.home-cta [data-slot="card"]')
      const price = document.querySelector('.home-model-price')
      return {
        card: brightness(getComputedStyle(card).backgroundColor),
        price: brightness(getComputedStyle(price).backgroundColor),
        title: brightness(getComputedStyle(card.querySelector('h3 a')).color),
      }
    })
    if (theme === 'light') {
      assert.ok(result.card > 0.8 && result.price > 0.8, 'light card surfaces')
      assert.ok(result.title < 0.4, 'light card title is dark')
    } else {
      assert.ok(result.card < 0.25 && result.price < 0.25, 'dark card surfaces')
      assert.ok(result.title > 0.6, 'dark card title is light')
    }
    await page
      .locator('.home-cta')
      .screenshot({ path: join(tmpdir(), `home-cta-cards-${theme}.png`) })
  }
})

test('clicking the empty area of a CTA card follows its link', async (t) => {
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    performanceResponse: rankedResponse,
  })
  const card = page.locator('.home-cta > ul > li').nth(1)
  await card.waitFor()
  await card.scrollIntoViewIfNeeded()
  const box = await card.boundingBox()
  await page.mouse.click(box.x + box.width - 12, box.y + box.height - 12)
  await page.waitForURL(
    (url) => decodeURIComponent(url.pathname) === '/pricing/a-fastest-model'
  )
})

test('CTA stays useful while traffic loads, then replaces the fallback with the actual top model', async (t) => {
  const gate = Promise.withResolvers()
  const requested = Promise.withResolvers()
  t.after(() => gate.resolve())
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    performanceResponse: rankedResponse,
    holdPerformance: gate.promise,
    onRequest: (path) => {
      if (path === '/api/perf-metrics/summary') requested.resolve()
    },
  })
  await requested.promise
  assert.equal(
    await page.locator('#home-cta-title').innerText(),
    'Start with the AI tool you already use'
  )
  assert.equal(
    await page
      .locator('.home-cta')
      .getByRole('link', { name: 'Get Started', exact: true })
      .isVisible(),
    true
  )
  assert.equal(await page.locator('.home-cta ul').count(), 0)
  gate.resolve()
  await page
    .locator('.home-cta ul')
    .getByRole('link', { name: popularModelName, exact: true })
    .waitFor()
})

for (const [scenario, pricingResponse, performanceResponse] of [
  [
    'empty traffic',
    catalogResponse,
    { json: { success: true, data: { models: [] } } },
  ],
  ['empty catalog', { json: { success: true, data: [] } }, rankedResponse],
  [
    'unlisted traffic only',
    catalogResponse,
    {
      json: {
        success: true,
        data: { models: [{ model_name: 'unlisted-model' }] },
      },
    },
  ],
  ['missing summary', catalogResponse, { json: { success: true, data: {} } }],
  [
    'catalog business error',
    { json: { success: false, message: 'Recommendation unavailable' } },
    rankedResponse,
  ],
  [
    'traffic business error',
    catalogResponse,
    { json: { success: false, message: 'Recommendation unavailable' } },
  ],
  [
    'traffic network error',
    catalogResponse,
    {
      status: 503,
      json: { success: false, message: 'Recommendation unavailable' },
    },
  ],
]) {
  test(`CTA preserves the original action without a recommendation toast when there is ${scenario}`, async (t) => {
    const page = await openHome(t, { pricingResponse, performanceResponse })
    assert.equal(
      await page.locator('#home-cta-title').innerText(),
      'Start with the AI tool you already use'
    )
    assert.equal(
      await page
        .locator('.home-cta')
        .getByRole('link', { name: 'View Pricing', exact: true })
        .getAttribute('href'),
      '/pricing'
    )
    assert.equal(await page.getByText('Recommendation unavailable').count(), 0)
    assert.equal(await page.locator('.home-cta ul').count(), 0)
  })
}

for (const access of [
  { enabled: false, requireAuth: false },
  { enabled: true, requireAuth: true },
]) {
  test(`CTA does not request or reveal models when pricing access is ${JSON.stringify(access)}`, async (t) => {
    const requests = []
    const page = await openHome(t, {
      status: { HeaderNavModules: { pricing: access } },
      pricingResponse: catalogResponse,
      performanceResponse: rankedResponse,
      onRequest: (path) => requests.push(path),
    })
    assert.equal(requests.includes('/api/pricing'), false)
    assert.equal(requests.includes('/api/perf-metrics/summary'), false)
    assert.equal(
      await page.locator('#home-cta-title').innerText(),
      'Start with the AI tool you already use'
    )
    assert.equal(await page.locator('.home-cta a[href^="/pricing"]').count(), 0)
  })
}

test('a long top-model name and fallback description fit at 320px in all seven languages', async (t) => {
  const longName =
    'provider/very-long-model-name-with-reasoning-and-multimodal-support'
  for (const [language, locale] of [
    ['zhCN', 'zh'],
    ['zhTW', 'zh-TW'],
    ['en', 'en'],
    ['fr', 'fr'],
    ['ja', 'ja'],
    ['ru', 'ru'],
    ['vi', 'vi'],
  ]) {
    const page = await openHome(t, {
      width: 320,
      language,
      theme: 'dark',
      pricingResponse: {
        json: {
          ...catalogResponse.json,
          data: [
            {
              ...catalogResponse.json.data[0],
              model_name: longName,
              description: '',
            },
          ],
        },
      },
      performanceResponse: {
        json: { success: true, data: { models: [{ model_name: longName }] } },
      },
    })
    await page
      .locator('.home-cta ul')
      .getByRole('link', { name: longName, exact: true })
      .waitFor()
    const messages = JSON.parse(
      await readFile(
        new URL(`../../../i18n/locales/${locale}.json`, import.meta.url),
        'utf8'
      )
    )
    assert.equal(
      await page.locator('.home-cta > div [data-slot="badge"]').innerText(),
      messages.translation['Most called models · Last 24 hours']
    )
    assert.equal(
      await page.locator('.home-cta > div p').innerText(),
      messages.translation[
        'Create one account, copy the right setup, and keep keys, models, balance, usage, and cost records visible from the console.'
      ]
    )
    await assertNoOverflow(page)
    if (language === 'zhCN') {
      await page.locator('.home-cta').scrollIntoViewIfNeeded()
      await page
        .locator('.home-cta')
        .screenshot({ path: join(tmpdir(), 'home-popular-model-mobile.png') })
    }
  }
})
