import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// Home "Conheça o espaço": slideshow of the space photos (arrows, dots, pause, no autoplay with reduced motion).
test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

const track = (page: import('@playwright/test').Page) => page.locator('[data-space-carousel] > div').first()
const activeSlide = (page: import('@playwright/test').Page) =>
  track(page).evaluate((el) => Math.round(el.scrollLeft / el.clientWidth) + 1)

test('the space slideshow has accessible controls and moves with arrows and dots', async ({ page, request }) => {
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  for (const order of [1, 2, 3]) await api.createSpacePhoto({ order, alt: `Ambiente ${order}` })

  await page.goto('/')
  const space = page.getByRole('region', { name: 'Conheça o espaço' })
  await expect(space.locator('[data-space-carousel]')).toHaveAttribute('aria-roledescription', 'carousel')
  await expect(space.locator('[aria-roledescription="slide"]')).toHaveCount(3)
  await expect(space.getByRole('link', { name: 'Ver galeria completa' })).toHaveAttribute('href', '/espaco')

  await space.getByRole('button', { name: 'Próxima foto' }).click()
  await expect.poll(() => activeSlide(page)).toBe(2)
  await space.getByRole('button', { name: 'Ir para a foto 3 de 3' }).click()
  await expect.poll(() => activeSlide(page)).toBe(3)
  await expect(space.getByRole('button', { name: 'Ir para a foto 3 de 3' })).toHaveAttribute('aria-current', 'true')
  await space.getByRole('button', { name: 'Foto anterior' }).click()
  await expect.poll(() => activeSlide(page)).toBe(2)

  // Only the first photo loads eagerly
  await expect(space.locator('img').first()).not.toHaveAttribute('loading', 'lazy')
  await expect(space.locator('img').nth(1)).toHaveAttribute('loading', 'lazy')

  const pause = space.getByRole('button', { name: 'Pausar a troca automática das fotos' })
  await pause.click()
  await expect(space.locator('[data-space-carousel]')).toHaveAttribute('data-autoplay', 'off')
  await expect(space.getByRole('button', { name: 'Retomar a troca automática das fotos' })).toHaveAttribute('aria-pressed', 'true')
})

test('reduced motion turns the automatic change off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('[data-space-carousel]')).toHaveAttribute('data-autoplay', 'off')
  await expect(page.getByRole('button', { name: /troca automática/ })).toHaveCount(0)
})
