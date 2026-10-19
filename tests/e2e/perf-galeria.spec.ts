import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'
import { measureWeight } from './helpers/weight'

// MIDIA-03: transfer budgets on a phone before any interaction (JavaScript reported apart:
// the local server is `next dev`; production JS is checked against `next build && next start`).
test.skip(({ isMobile }) => !isMobile, 'mobile budgets')
test.describe.configure({ mode: 'serial' })

const KB = 1024

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('space-items')
})

test('home with a party and 6 space photos ≤ 600 KB', async ({ page, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  for (let i = 0; i < 6; i++) await api.createSpacePhoto({ order: i, alt: `Ambiente ${i + 1}` })

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Ver detalhes da festa Festa de Teste' })).toBeVisible()
  const w = await measureWeight(page)
  console.log(`[budget] / ${Math.round(w.total / KB)} KB (+${Math.round(w.scripts / KB)} KB dev JS)`, w.byType)
  expect(w.total).toBeLessThanOrEqual(600 * KB)
})

test('/contato ≤ 400 KB without the OpenStreetMap iframe', async ({ page }) => {
  await page.goto('/contato')
  const w = await measureWeight(page, { excludeHosts: ['www.openstreetmap.org', 'tile.openstreetmap.org'] })
  console.log(`[budget] /contato ${Math.round(w.total / KB)} KB`, w.byType)
  expect(w.total).toBeLessThanOrEqual(400 * KB)
})

test('/quem-somos ≤ 250 KB', async ({ page }) => {
  await page.goto('/quem-somos')
  const w = await measureWeight(page)
  console.log(`[budget] /quem-somos ${Math.round(w.total / KB)} KB`, w.byType)
  expect(w.total).toBeLessThanOrEqual(250 * KB)
})
