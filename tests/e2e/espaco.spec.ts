import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// MIDIA-01 / MIDIA-03: space gallery (photos + videos), empty state, lightbox, byte ranges.
test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('space-items')
})

test('empty gallery shows the elegant empty state', async ({ page, request }) => {
  const api = await staffApi(request)
  await api.deleteAll('space-items')

  await page.goto('/espaco')
  await expect(page.getByRole('heading', { name: 'Fotos do espaço em breve' })).toBeVisible()
  const main = page.locator('main')
  await expect(main.getByRole('link', { name: 'Como chegar' })).toHaveAttribute('href', '/contato')
  await expect(main.getByRole('link', { name: 'Ver próximas festas' })).toHaveAttribute('href', '/')
})

test('published photos and video appear as tiles', async ({ page, request, isMobile }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  for (const order of [1, 2, 3]) await api.createSpacePhoto({ order, alt: `Ambiente ${order}` })
  const { video } = await api.createSpaceVideo({ order: 4 })

  await page.goto('/espaco')
  await expect(page.getByRole('heading', { name: 'Conheça o Paraíso', level: 1 })).toBeVisible()
  const grid = page.locator('main ul[role="list"]')
  await expect(grid.getByRole('button')).toHaveCount(4)
  await expect(grid.getByRole('button', { name: 'Assistir vídeo: Pista de dança numa noite de festa' })).toContainText(
    'Vídeo',
  )

  // Menu lists Espaço
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'Espaço' })).toBeVisible()
    await page.keyboard.press('Escape')
  } else {
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Espaço' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  }

  // Lightbox: open, navigate, close and return focus
  const mp4Requests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('.mp4')) mp4Requests.push(r.url())
  })
  const first = grid.getByRole('button', { name: 'Ambiente 1' })
  await first.click()
  const dialog = page.getByRole('dialog', { name: 'Galeria de fotos' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('1 de 4')
  await dialog.getByRole('button', { name: 'Próxima' }).click()
  await expect(dialog).toContainText('2 de 4')
  await page.keyboard.press('ArrowRight')
  await expect(dialog).toContainText('3 de 4')
  expect(mp4Requests).toHaveLength(0) // nothing downloaded before the video slide
  await page.keyboard.press('ArrowRight')
  await expect(dialog).toContainText('4 de 4')
  const player = dialog.locator('video')
  await expect(player).toHaveAttribute('playsinline', '')
  await expect(player).toHaveAttribute('poster', /\/api\/media\/file\//)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(first).toBeFocused()

  // Byte ranges (iOS needs 206 to play and seek)
  const res = await request.get(video.url!, { headers: { Range: 'bytes=0-99' } })
  expect(res.status()).toBe(206)
  expect(res.headers()['content-range']).toMatch(/^bytes 0-99\//)
  expect(res.headers()['accept-ranges']).toBe('bytes')
})

test('a 12-photo gallery stays under 600 KB on a phone before interaction (MIDIA-03)', async ({
  page,
  request,
  isMobile,
}) => {
  test.skip(!isMobile, 'mobile budget')
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  for (let i = 0; i < 12; i++) {
    await api.createSpacePhoto({ order: i, alt: `Ambiente ${i + 1}`, fixture: i % 2 ? 'flyer-square.jpg' : 'flyer-portrait.jpg' })
  }

  const { measureWeight } = await import('./helpers/weight')
  await page.goto('/espaco')
  await expect(page.locator('main ul[role="list"] > li')).toHaveCount(12)
  const weight = await measureWeight(page)
  console.log(`[budget] /espaco 12 photos: ${Math.round(weight.total / 1024)} KB without JS`, weight.byType)
  expect(weight.total).toBeLessThanOrEqual(600 * 1024)
})
