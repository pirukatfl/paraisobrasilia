import { expect, test } from '@playwright/test'

// Flyers are shown whole at their own proportions, whatever the social format uploaded.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

async function box(locator: ReturnType<import('@playwright/test').Page['locator']>) {
  const b = await locator.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

test('home: the next party is a large featured flyer, others stay in the card grid', async ({ page }) => {
  await page.goto('/')
  const featured = page.locator('[data-featured-party]')
  await expect(featured).toHaveCount(1)
  await expect(featured).toHaveAttribute('href', '/festas/festa-de-teste')
  const frame = featured.locator('[data-flyer-ratio]')
  const vw = page.viewportSize()!.width
  const b = await box(frame)
  // mobile: full content width; desktop: wide, up to ~1000 px, and never taller than 80% of the viewport
  expect(b.width).toBeGreaterThan(Math.min(vw - 48, 900))
  expect(b.width).toBeLessThanOrEqual(1001)
  expect(b.height).toBeLessThanOrEqual(page.viewportSize()!.height * 0.8 + 1)

  const grid = page.getByRole('list').filter({ has: page.getByRole('link', { name: /Festa Paisagem/ }) })
  await expect(grid.getByRole('link', { name: /Festa de Teste/ })).toHaveCount(0)
})

test('home card: a landscape flyer keeps its own aspect ratio (no 4:5 crop)', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('link', { name: 'Ver detalhes da festa Festa Paisagem' })
  const frame = card.locator('[data-flyer-ratio]')
  const img = card.locator('img').first()
  await img.scrollIntoViewIfNeeded()
  const b = await box(frame)
  expect(b.width / b.height).toBeGreaterThan(1.7) // 16:9 = 1.78, a 4:5 box would be 0.8
  expect(b.width / b.height).toBeLessThan(1.85)
  await expect(img).toHaveCSS('object-fit', 'contain')
  // Lazy image: wait until it has decoded before reading its natural size.
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
  const nat = await img.evaluate((el: HTMLImageElement) => ({ w: el.naturalWidth, h: el.naturalHeight }))
  expect(nat.w / nat.h).toBeCloseTo(16 / 9, 1)
})

test('home card: a stories flyer is capped, not dominating the grid', async ({ page }) => {
  await page.goto('/')
  const frame = page
    .getByRole('link', { name: 'Ver detalhes da festa Festa Stories' })
    .locator('[data-flyer-ratio]')
  await frame.scrollIntoViewIfNeeded()
  const b = await box(frame)
  expect(b.width / b.height).toBeGreaterThanOrEqual(0.74) // capped at 3:4, real 9:16 would be 0.56
})

test('party page: a landscape flyer is shown whole at its own ratio', async ({ page }) => {
  await page.goto('/festas/festa-paisagem')
  const frame = page.locator('article [data-flyer-ratio]').first()
  const b = await box(frame)
  expect(b.width / b.height).toBeGreaterThan(1.7)
  expect(b.width / b.height).toBeLessThan(1.85)
  await expect(frame.locator('img')).toHaveCSS('object-fit', 'contain')
})
