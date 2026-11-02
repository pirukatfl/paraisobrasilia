import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// Home: carousel of ALL upcoming parties (slider like the old site, automatic from the first second), 2 small cards below.
test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

const slides = (page: import('@playwright/test').Page) =>
  page.locator('[data-party-carousel] [role="group"][aria-roledescription="slide"]')

async function activeSlide(page: import('@playwright/test').Page): Promise<number> {
  return page.locator('[data-party-carousel] > div').first().evaluate((track) => Math.round(track.scrollLeft / track.clientWidth) + 1)
}

test('carousel exposes every upcoming party with accessible names', async ({ page }) => {
  await page.goto('/')
  const carousel = page.getByRole('region', { name: 'Carrossel de festas' })
  await expect(carousel).toHaveAttribute('aria-roledescription', 'carousel')
  const count = await slides(page).count()
  expect(count).toBeGreaterThanOrEqual(3)
  await expect(slides(page).first()).toHaveAttribute('aria-label', /^1 de \d+: Festa de Teste$/)
  await expect(slides(page).first().getByRole('link')).toHaveAttribute('href', '/festas/festa-de-teste')
  // every slide links to its party and shows title + date under the flyer
  await expect(slides(page).nth(1).getByRole('link')).toHaveAttribute('href', /^\/festas\/.+/)
  await expect(slides(page).nth(1).locator('time')).toHaveCount(1)
  await expect(slides(page).nth(1).getByRole('heading', { level: 2 })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Próxima festa' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Festa anterior' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Ir para a festa 1 de \d+: Festa de Teste$/ })).toHaveAttribute('aria-current', 'true')
})

test('arrows and dots move the carousel (wrapping around)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Próxima festa' }).click()
  await expect.poll(() => activeSlide(page)).toBe(2)
  await page.getByRole('button', { name: /^Ir para a festa 3 de/ }).click()
  await expect.poll(() => activeSlide(page)).toBe(3)
  await expect(page.getByRole('button', { name: /^Ir para a festa 3 de/ })).toHaveAttribute('aria-current', 'true')
  await page.getByRole('button', { name: 'Festa anterior' }).click()
  await expect.poll(() => activeSlide(page)).toBe(2)
  await page.getByRole('button', { name: /^Ir para a festa 1 de/ }).click()
  await expect.poll(() => activeSlide(page)).toBe(1)
  await page.getByRole('button', { name: 'Festa anterior' }).click() // wraps to the last one
  const total = await slides(page).count()
  await expect.poll(() => activeSlide(page)).toBe(total)
})

test('swipe (scroll-snap) changes the slide and updates the dots', async ({ page }) => {
  await page.goto('/')
  await page.locator('[data-party-carousel] > div').first().evaluate((track) => track.scrollTo({ left: track.clientWidth, behavior: 'instant' }))
  await expect(page.getByRole('button', { name: /^Ir para a festa 2 de/ })).toHaveAttribute('aria-current', 'true')
})

const AUTO_ADVANCE_MS = 6000

async function mouseOverCarousel(page: import('@playwright/test').Page) {
  const box = (await page.locator('[data-party-carousel] [data-slide="1"]').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 200))
}

test('auto-advances by itself after ~6 s', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'on')
  await expect.poll(() => activeSlide(page), { timeout: AUTO_ADVANCE_MS + 6_000 }).toBe(2)
})

test('keeps advancing while the mouse hovers over the carousel (hover never pauses it)', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await mouseOverCarousel(page)
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'on')
  await expect.poll(() => activeSlide(page), { timeout: AUTO_ADVANCE_MS + 6_000 }).toBe(2)
  await expect.poll(() => activeSlide(page), { timeout: AUTO_ADVANCE_MS + 6_000 }).toBe(3)
})

test('starts on its own right after accepting the 18+ gate, with the mouse over the carousel', async ({ page, context }) => {
  test.setTimeout(60_000)
  await context.clearCookies()
  await page.goto('/')
  const enter = page.getByRole('button', { name: 'Tenho 18 anos ou mais — Entrar' })
  await expect(enter).toBeFocused()
  await enter.click()
  await expect(page.getByRole('dialog', { name: 'Conteúdo para maiores de 18 anos' })).toBeHidden()
  // the gate never leaves the focus inside the carousel
  expect(await page.evaluate(() => !!document.activeElement?.closest('[data-party-carousel]'))).toBe(false)
  await mouseOverCarousel(page)
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'on')
  await expect.poll(() => activeSlide(page), { timeout: AUTO_ADVANCE_MS + 6_000 }).toBe(2)
})

test('clicking a carousel button with the mouse does not freeze the slider', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Próxima festa' }).click()
  await expect.poll(() => activeSlide(page)).toBe(2)
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'on')
  await expect.poll(() => activeSlide(page), { timeout: AUTO_ADVANCE_MS + 6_000 }).toBe(3)
})

test('keyboard focus inside the carousel pauses it, leaving resumes it', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  const carousel = page.locator('[data-party-carousel]')
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab')
    if (await page.evaluate(() => !!document.activeElement?.closest('[data-party-carousel]'))) break
  }
  await expect(carousel).toHaveAttribute('data-autoplay', 'off')
  await page.waitForTimeout(AUTO_ADVANCE_MS + 1_000)
  expect(await activeSlide(page)).toBe(1)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await expect(carousel).toHaveAttribute('data-autoplay', 'on')
})

test('the stop button halts the auto-advance', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Pausar a troca automática das festas' }).click()
  await page.mouse.move(0, 0)
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'off')
  await page.waitForTimeout(7_000)
  expect(await activeSlide(page)).toBe(1)
  await expect(page.getByRole('button', { name: 'Retomar a troca automática das festas' })).toHaveAttribute('aria-pressed', 'true')
})

test('no autoplay with prefers-reduced-motion', async ({ page }) => {
  test.setTimeout(60_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'off')
  await page.waitForTimeout(7_000)
  expect(await activeSlide(page)).toBe(1)
  // manual controls still work
  await page.getByRole('button', { name: 'Próxima festa' }).click()
  await expect.poll(() => activeSlide(page)).toBe(2)
})

test('each flyer keeps its own proportion inside the slide (landscape is not cropped)', async ({ page }) => {
  await page.goto('/')
  const landscape = page.locator('[data-party-carousel] [data-slide]', { hasText: 'Festa Paisagem' })
  const ratio = Number(await landscape.locator('[data-flyer-ratio]').getAttribute('data-flyer-ratio'))
  expect(ratio).toBeGreaterThan(1.7)
  await expect(landscape.locator('img')).toHaveCSS('object-fit', 'contain')
})

test('two small cards of the next parties sit side by side under the carousel (also on mobile)', async ({ page }) => {
  await page.goto('/')
  const row = page.locator('[data-mini-parties]')
  const cards = row.locator('[data-mini-party]')
  await expect(cards).toHaveCount(2)
  await cards.last().scrollIntoViewIfNeeded()
  // the 2 parties after the first slide, each one link to its page with flyer, date and title
  const second = await slides(page).nth(1).getByRole('link').getAttribute('href')
  const third = await slides(page).nth(2).getByRole('link').getAttribute('href')
  await expect(cards.nth(0)).toHaveAttribute('href', second!)
  await expect(cards.nth(1)).toHaveAttribute('href', third!)
  for (const i of [0, 1]) {
    await expect(cards.nth(i).locator('img')).toHaveCount(1)
    await expect(cards.nth(i).locator('time')).toHaveCount(1)
  }
  const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
  expect(Math.abs(boxes[0]!.top - boxes[1]!.top)).toBeLessThan(4) // same row
  const vw = page.viewportSize()!.width
  expect(boxes[0]!.width).toBeLessThan(vw / 2) // small: not the big cards of before
  expect(boxes[1]!.right).toBeLessThanOrEqual(vw)
  // under the carousel, not beside it
  const carouselBox = (await page.locator('[data-party-carousel]').boundingBox())!
  expect(boxes[0]!.top).toBeGreaterThanOrEqual(carouselBox.y + carouselBox.height - 1)
  // the carousel flyer still enlarges in the lightbox
  await page.getByRole('button', { name: 'Ampliar flyer da festa Festa de Teste' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Flyers das festas' })).toBeVisible()
})

test.describe('a single upcoming party', () => {
  let unpublished: number[] = []

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000)
    const api = await staffApi(request)
    const all = await api.setAllPartiesStatus('draft')
    // keep only 'Festa de Teste' online
    const res = await request.get('/api/parties?where[title][equals]=Festa de Teste&depth=0&draft=true', { headers: api.headers })
    const keep = ((await res.json()) as { docs: { id: number }[] }).docs[0]!.id
    unpublished = all.filter((id) => id !== keep)
    await api.setAllPartiesStatus('published', [keep])
  })

  test.afterAll(async ({ request }) => {
    const api = await staffApi(request)
    await api.setAllPartiesStatus('published', unpublished)
  })

  test('shows the flyer with no controls and no autoplay', async ({ page }) => {
    await page.goto('/')
    await expect(slides(page)).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Próxima festa' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Festa anterior' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Ir para a festa/ })).toHaveCount(0)
    await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'off')
    await expect(page.locator('[data-mini-parties]')).toHaveCount(0) // nothing after the first: no row
  })
})
