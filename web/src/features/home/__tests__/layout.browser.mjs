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

const vendors = [
  { id: 1, name: 'Alpha Labs', icon: 'OpenAI' },
  { id: 2, name: 'Beta AI', icon: 'Claude' },
  { id: 3, name: 'Gamma Works', icon: 'Gemini' },
  { id: 4, name: 'Delta Cloud', icon: 'DeepSeek' },
  { id: 5, name: 'Epsilon' },
]
const catalogModel = (id, name, vendorId, endpoints) => ({
  id,
  model_name: name,
  vendor_id: vendorId,
  enable_groups: ['default'],
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 1,
  supported_endpoint_types: endpoints,
})
const catalogResponse = {
  json: {
    success: true,
    data: [
      catalogModel(1, 'alpha-1', 1, ['openai']),
      catalogModel(2, 'alpha-2', 1, ['openai-response']),
      catalogModel(3, 'beta-1', 2, ['anthropic']),
      catalogModel(4, 'gamma-1', 3, ['gemini']),
      catalogModel(5, 'delta-1', 4, ['openai']),
      catalogModel(6, 'epsilon-1', 5, []),
    ],
    vendors,
    group_ratio: { default: 1 },
    usable_group: {},
    supported_endpoint: {},
    auto_groups: [],
  },
}
const faq = [
  { id: 1, question: 'How do I top up?', answer: 'Open the wallet page.' },
  { id: 2, question: 'Is streaming supported?', answer: 'Yes, always.' },
]

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
  await page.goto(baseURL, { waitUntil: 'networkidle' })
  if (!options.content) await page.locator('#home-title').waitFor()
  return page
}

async function assertNoOverflow(page) {
  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    const clipped = [
      ...document.querySelectorAll(
        '.home-title, .home-description, .home-actions a, #home-hero li, .home-section li, .home-section p, .home-section pre, #home-cta-title, .home-cta p, .home-cta a'
      ),
    ]
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.left < -1 || rect.right > viewport + 1
      })
      .map((element) => element.className)
    return {
      clipped,
      page: document.documentElement.scrollWidth - viewport,
    }
  })
  assert.deepEqual(overflow.clipped, [], 'homepage content fits the viewport')
  assert.ok(overflow.page <= 1, 'no horizontal page scroll')
}

test('default landing renders the KuCode sections in order, with one h1 and no pricing section', async (t) => {
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    status: { faq },
  })
  await page.locator('#home-providers').waitFor()
  assert.deepEqual(
    await page.evaluate(() =>
      [...document.querySelectorAll('.home-landing > section')].map(
        (section) => section.id
      )
    ),
    [
      'home-hero',
      'home-providers',
      'home-features',
      'home-how-it-works',
      'home-code',
      'home-faq',
      'home-cta',
    ]
  )
  assert.equal(await page.locator('main h1').count(), 1)
  assert.equal(await page.locator('#home-features li').count(), 6)
  assert.equal(await page.locator('#home-pricing').count(), 0)
  for (const id of ['#home-hero', '#home-cta']) {
    const canvas = page.locator(`${id} canvas`)
    assert.equal(await canvas.count(), 1)
    assert.equal(await canvas.getAttribute('aria-hidden'), 'true')
  }
})

test('section titles are visible and the removed home modules are gone', async (t) => {
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    status: {
      faq,
      OfficialSocialLinks: JSON.stringify([
        { platform: 'telegram', url: 'https://t.me/example', enabled: true },
      ]),
      mainland_base_url: 'https://cn.example.test',
    },
  })
  await page.locator('#home-providers').waitFor()
  for (const id of [
    'home-providers-title',
    'home-features-title',
    'home-steps-title',
    'home-code-title',
    'home-faq-title',
  ]) {
    const title = page.locator(`#${id}`)
    assert.equal(await title.count(), 1, `${id} exists for aria-labelledby`)
    const box = await title.boundingBox()
    assert.ok(box.width > 1 && box.height > 1, `${id} is visible`)
  }
  for (const selector of [
    '#home-tools',
    '.home-endpoint',
    '.home-network',
    '.home-tool-tile',
    'a[href="https://t.me/example"]',
    '[data-slot="badge"]',
  ]) {
    assert.equal(
      await page.locator(`.home-landing ${selector}`).count(),
      0,
      `${selector} is not rendered`
    )
  }
  assert.equal(
    await page.getByText('https://cn.example.test/v1').count(),
    0,
    'no mainland base URL row'
  )
})

for (const width of [320, 375, 768, 1280, 1920]) {
  test(`at ${width}px every section stays readable and nothing overflows`, async (t) => {
    const page = await openHome(t, {
      width,
      pricingResponse: catalogResponse,
      status: { faq },
    })
    await page.locator('#home-providers').waitFor()
    await assertNoOverflow(page)
    const title = await page.locator('#home-title').boundingBox()
    const header = await page.locator('header').boundingBox()
    assert.ok(title.y >= header.height, 'header does not overlap hero content')
    for (const id of [
      'home-providers',
      'home-features',
      'home-how-it-works',
      'home-code',
      'home-faq',
      'home-cta',
    ]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded()
      assert.equal(
        await page
          .locator(`#${id}`)
          .evaluate((el) => getComputedStyle(el).opacity),
        '1'
      )
    }
    await assertNoOverflow(page)
    if (width === 375 || width === 1920) {
      await page.screenshot({
        path: join(tmpdir(), `home-${width}.png`),
        fullPage: true,
      })
    }
  })
}

test('landing surfaces and text follow light, dark, then light theme without dark islands', async (t) => {
  const page = await openHome(t, {
    theme: 'light',
    pricingResponse: catalogResponse,
    status: { faq },
  })
  await page.locator('#home-providers').waitFor()
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
    const result = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 1
      const context = canvas.getContext('2d')
      const rgb = (color) => {
        context.clearRect(0, 0, 1, 1)
        context.fillStyle = color
        context.fillRect(0, 0, 1, 1)
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3)
      }
      const luminance = (color) => {
        const channels = rgb(color).map((value) => {
          const channel = value / 255
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
        })
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        )
      }
      const brightness = (selector) =>
        rgb(
          getComputedStyle(document.querySelector(selector)).backgroundColor
        ).reduce((sum, value) => sum + value, 0) /
        (3 * 255)
      const contrast = (text, surface) => {
        const foreground = luminance(
          getComputedStyle(document.querySelector(text)).color
        )
        const background = luminance(
          getComputedStyle(document.querySelector(surface)).backgroundColor
        )
        return (
          (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05)
        )
      }
      return {
        surfaces: [
          '.home-hero',
          '.home-cta',
          '#home-code [data-slot="tabs"]',
        ].map((selector) => ({ selector, value: brightness(selector) })),
        contrasts: [
          ['.home-title', '.home-hero'],
          ['.home-description', '.home-hero'],
          ['.home-cta p', '.home-cta'],
          ['#home-features h3', '#home-features [data-spotlight]'],
          ['#home-faq summary', '.home-landing'],
        ].map(([text, surface]) => ({
          text,
          ratio: contrast(text, surface),
        })),
      }
    })
    for (const surface of result.surfaces) {
      assert.ok(
        theme === 'light' ? surface.value > 0.8 : surface.value < 0.25,
        `${theme}: ${surface.selector} uses a matching surface (${surface.value})`
      )
    }
    for (const item of result.contrasts) {
      assert.ok(
        item.ratio >= 4.5,
        `${theme}: ${item.text} contrast ${item.ratio} must meet 4.5:1`
      )
    }
    await assertNoOverflow(page)
    await page.getByRole('menu').waitFor({ state: 'hidden' })
  }
})

test('provider cards, marquee and totals are computed from the public catalog; only the marquee shows without one', async (t) => {
  const page = await openHome(t, { pricingResponse: catalogResponse })
  await page.locator('#home-providers').waitFor()
  assert.deepEqual(
    await page
      .locator('#home-providers [role="group"]')
      .evaluateAll((cards) =>
        cards.map((card) => card.querySelector('h3').textContent)
      ),
    ['Alpha Labs', 'Beta AI', 'Delta Cloud']
  )
  const alpha = page.locator('#home-providers [role="group"]').first()
  await alpha.getByText('2 models', { exact: true }).waitFor()
  await alpha.getByText('alpha-1', { exact: true }).waitFor()
  await alpha.getByText('Native OpenAI API', { exact: true }).waitFor()
  assert.equal(
    await alpha.getByText('Native Anthropic API').count(),
    0,
    'only protocols the catalog lists'
  )
  await page
    .locator('#home-providers')
    .getByText('Gamma Works', { exact: true })
    .first()
    .waitFor({ state: 'attached' })
  await page
    .locator('#home-hero')
    .getByText('6 models from 5 providers', { exact: true })
    .waitFor()
  assert.equal(
    await page.locator('#home-providers a[href="/pricing"]').innerText(),
    'View all models →'
  )
  const empty = await openHome(t)
  await empty.locator('#home-providers').waitFor()
  assert.equal(
    await empty.locator('#home-providers [role="group"]').count(),
    0,
    'no provider cards without a catalog'
  )
  await empty
    .locator('#home-providers [role="region"], #home-providers ul[aria-label]')
    .first()
    .waitFor()
  assert.equal(
    await empty
      .locator('#home-hero')
      .getByText(/models from/)
      .count(),
    0
  )
})

test('provider logos are monochrome, hidden from assistive tech and follow the theme color', async (t) => {
  const page = await openHome(t, { pricingResponse: catalogResponse })
  await page.locator('#home-providers').waitFor()
  const logos = page.locator('#home-hero ul[aria-label] svg')
  assert.ok((await logos.count()) > 0, 'hero shows provider logos')
  assert.equal(
    await logos
      .first()
      .evaluate((svg) => svg.closest('[aria-hidden="true"]') !== null),
    true
  )
  const fills = []
  for (const theme of ['Dark', 'Light']) {
    await page
      .getByRole('button', { name: 'Toggle theme', exact: true })
      .click()
    await page.getByRole('menuitem', { name: theme, exact: true }).click()
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains('dark') === dark,
      theme === 'Dark'
    )
    fills.push(
      await logos.first().evaluate((svg) => getComputedStyle(svg).color)
    )
  }
  assert.notEqual(
    fills[0],
    fills[1],
    'logos follow currentColor in both themes'
  )
})

test('hero logos show a tooltip on keyboard focus and link to the providers section', async (t) => {
  const page = await openHome(t, { pricingResponse: catalogResponse })
  await page.locator('#home-providers').waitFor()
  const first = page.locator('#home-hero ul[aria-label] a').first()
  assert.equal(await first.getAttribute('href'), '#home-providers')
  await first.focus()
  const tooltip = page.locator('[data-slot="tooltip-content"]')
  await tooltip.waitFor()
  assert.match(await tooltip.innerText(), /Alpha Labs/)
})

test('code demo uses the real gateway URL, switches samples with the keyboard and copies the active one', async (t) => {
  const page = await openHome(t)
  const demo = page.locator('#home-code')
  assert.equal(await demo.locator('.home-endpoint').count(), 0)
  await demo.getByRole('tab', { name: 'cURL' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await demo.getByRole('tab', { name: 'Python', selected: true }).waitFor()
  assert.match(
    await demo.getByRole('tabpanel').innerText(),
    /base_url="https:\/\/gateway\.example\.test\/v1"/
  )
  assert.ok(
    (await demo.locator('pre span[class*="home-code"]').count()) > 0,
    'code is syntax colored through theme tokens'
  )
  await demo.getByRole('button', { name: 'Copy code' }).click()
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /from openai import OpenAI[\s\S]*https:\/\/gateway\.example\.test\/v1/
  )
  await assertNoOverflow(page)
})

test('the base URL pill copies the configured endpoint with the keyboard and announces completion', async (t) => {
  const page = await openHome(t)
  const copy = page
    .locator('#home-code')
    .getByRole('button', { name: 'Copy base URL' })
  await copy.focus()
  await page.keyboard.press('Enter')
  await page
    .locator('#home-code')
    .getByRole('button', { name: 'Copied', exact: true })
    .waitFor()
  assert.equal(
    await page.evaluate(() => navigator.clipboard.readText()),
    'https://gateway.example.test/v1'
  )
})

test('FAQ is built from the status FAQ, opens with the keyboard and is absent without entries', async (t) => {
  const page = await openHome(t, { status: { faq } })
  const section = page.locator('#home-faq')
  await section.waitFor()
  assert.equal(await section.locator('details').count(), 2)
  const summary = section.locator('summary').first()
  await summary.focus()
  await page.keyboard.press('Enter')
  await page.getByText('Open the wallet page.').waitFor()
  assert.equal(
    await section.locator('details').first().getAttribute('open'),
    ''
  )
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => !document.querySelector('#home-faq details').open
  )

  const none = await openHome(t, { status: { faq: [] } })
  assert.equal(await none.locator('#home-faq').count(), 0)
  const disabled = await openHome(t, { status: { faq, faq_enabled: false } })
  assert.equal(await disabled.locator('#home-faq').count(), 0)
})

test('hero and CTA actions follow registration state, and private pricing hides the pricing links', async (t) => {
  const page = await openHome(t, {
    pricingResponse: catalogResponse,
    status: { faq },
  })
  assert.equal(
    await page
      .locator('#home-hero')
      .getByRole('link', { name: 'Get Started', exact: true })
      .getAttribute('href'),
    '/sign-up'
  )
  assert.equal(
    await page.locator('#home-hero a[href="/pricing"]').count(),
    0,
    'hero has a single action'
  )
  assert.equal(await page.locator('.home-cta a[href="/sign-up"]').count(), 1)

  const closed = await openHome(t, {
    status: {
      register_enabled: false,
      HeaderNavModules: { pricing: { enabled: true, requireAuth: true } },
    },
  })
  assert.equal(
    await closed
      .locator('#home-hero')
      .getByRole('link', { name: 'Sign In', exact: true })
      .getAttribute('href'),
    '/sign-in'
  )
  assert.equal(
    await closed.locator('.home-landing a[href="/pricing"]').count(),
    0
  )
  assert.equal(await closed.locator('.home-cta a[href="/sign-in"]').count(), 1)
})

test('hero title carries the configured system name and every language fits on mobile in dark mode', async (t) => {
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
      pricingResponse: catalogResponse,
      status: { faq },
      systemName: 'Example Gateway — International',
      serverAddress:
        'https://international-gateway.example.test/very-long-configured-endpoint',
    })
    await page.locator('#home-providers').waitFor()
    await assertNoOverflow(page)
    const messages = JSON.parse(
      await readFile(
        new URL(`../../../i18n/locales/${locale}.json`, import.meta.url),
        'utf8'
      )
    )
    const title = await page.locator('#home-title').innerText()
    assert.ok(title.includes('Example Gateway — International'))
    assert.ok(title.includes(messages.translation['Every Model']))
  }
})

test('entrance motion runs finitely and every animation stops when reduced motion is enabled', async (t) => {
  const page = await openHome(t, {
    motion: 'no-preference',
    pricingResponse: catalogResponse,
  })
  assert.notEqual(
    await page
      .locator('.home-title')
      .evaluate((el) => getComputedStyle(el).animationName),
    'none'
  )
  assert.equal(
    await page
      .locator('.home-title')
      .evaluate((el) => getComputedStyle(el).animationIterationCount),
    '1'
  )
  await page.locator('#home-steps-title').scrollIntoViewIfNeeded()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const animated = await page
    .locator('.home-landing')
    .evaluate((root) =>
      [...root.querySelectorAll('*')]
        .filter((el) => getComputedStyle(el).animationName !== 'none')
        .map((el) => el.className)
    )
  assert.deepEqual(animated, [])
  assert.equal(
    await page
      .locator('.home-cta')
      .evaluate((el) => getComputedStyle(el).opacity),
    '1'
  )
  assert.equal(
    await page.locator('#home-providers [role="region"]').count(),
    0,
    'the marquee becomes a static wrapped list'
  )
})

test('a configured Markdown homepage keeps its content and does not inherit the default landing', async (t) => {
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
