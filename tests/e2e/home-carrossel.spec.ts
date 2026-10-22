import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// Home: carousel of ALL upcoming parties (slider like the old site), grid of the others below.
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

test('auto-advances after ~6 s and pauses while the pointer is over it', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'on')
  await expect.poll(() => activeSlide(page), { timeout: 15_000 }).toBe(2)
  // hovering pauses it
  const target = page.locator('[data-party-carousel] [data-slide="2"]')
  await target.hover()
  await expect(page.locator('[data-party-carousel]')).toHaveAttribute('data-autoplay', 'off')
  await page.waitForTimeout(7_000)
  expect(await activeSlide(page)).toBe(2)
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

test('the other parties grid has bigger cards: 1 per row on mobile, 2 on tablet and desktop', async ({ page }) => {
  await page.goto('/')
  const grid = page.getByRole('list').filter({ has: page.getByRole('link', { name: /Festa Paisagem/ }) })
  const items = grid.locator('> li')
  await items.last().scrollIntoViewIfNeeded()
  const boxes = await items.evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))
  expect(boxes.length).toBeGreaterThanOrEqual(2)
  const vw = page.viewportSize()!.width
  const sameRow = Math.abs(boxes[0]!.top - boxes[1]!.top) < 4
  if (vw < 640) {
    expect(sameRow).toBe(false)
    expect(boxes[0]!.width).toBeGreaterThan(vw - 48)
  } else {
    expect(sameRow).toBe(true)
    expect(boxes[0]!.width).toBeGreaterThan(Math.min(vw, 1136) / 2 - 40)
    if (boxes.length > 2) expect(Math.abs(boxes[2]!.left - boxes[0]!.left)).toBeLessThan(4) // third wraps under the first
  }
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
  })
})
