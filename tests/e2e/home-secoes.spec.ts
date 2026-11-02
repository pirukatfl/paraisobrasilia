import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// Home sections after the agenda: 4 space photos (lightbox with all), 4 gallery photos, no "Quem somos".
test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  await api.deleteAll('models')
  await api.updateGlobal('menu-do-site', { itensOcultos: [] })
})

test('"Conheça o espaço": 4 small photos, a click opens the lightbox with all items', async ({ page, request }) => {
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  for (let i = 1; i <= 6; i++) await api.createSpacePhoto({ order: i, alt: `Ambiente ${i}` })

  await page.goto('/')
  const space = page.getByRole('region', { name: 'Conheça o espaço' })
  await expect(space.locator('[data-space-carousel]')).toHaveCount(0)
  await expect(space.locator('img')).toHaveCount(4)
  await expect(space.getByRole('link', { name: 'Ver galeria completa' })).toHaveAttribute('href', '/espaco')
  await expect(space.getByRole('button', { name: 'Ambiente 4' })).toContainText('+2')
  // below the fold: every image lazy
  for (let i = 0; i < 4; i++) await expect(space.locator('img').nth(i)).toHaveAttribute('loading', 'lazy')

  await space.getByRole('button', { name: 'Ambiente 2' }).click()
  const dialog = page.getByRole('dialog', { name: 'Galeria de fotos' })
  await expect(dialog).toContainText('2 de 6')
  for (const n of [3, 4, 5, 6]) {
    await page.keyboard.press('ArrowRight')
    await expect(dialog).toContainText(`${n} de 6`)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(space.getByRole('button', { name: 'Ambiente 2' })).toBeFocused()

  await space.getByRole('button', { name: 'Ver todas as fotos (6)' }).click()
  await expect(dialog).toContainText('1 de 6')
  await page.keyboard.press('Escape')
})

test('"Galeria": cover photos of 4 models, each linking to its page; hidden with no models or when staff hide it', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000)
  const api = await staffApi(request)
  await api.deleteAll('models')
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Galeria' })).toHaveCount(0)

  for (const [i, name] of ['Aurora', 'Bella', 'Cecília', 'Dalila', 'Estela'].entries()) {
    await api.createModel({ name, photos: 2, order: i + 1 })
  }
  await api.createModel({ name: 'Rascunho', photos: 1, order: 9, published: false })

  await page.goto('/')
  const galeria = page.getByRole('region', { name: 'Galeria' })
  await expect(galeria.getByRole('heading', { name: 'Galeria', level: 2 })).toBeVisible()
  await expect(galeria.getByRole('link', { name: 'Ver toda a galeria' })).toHaveAttribute('href', '/modelos')
  const cards = galeria.locator('ul[role="list"] > li')
  await expect(cards).toHaveCount(4)
  await expect(galeria.locator('img')).toHaveCount(4)
  for (const [i, slug] of ['aurora', 'bella', 'cecilia', 'dalila'].entries()) {
    await expect(cards.nth(i).getByRole('link')).toHaveAttribute('href', `/modelos/${slug}`)
  }
  await expect(galeria).not.toContainText('Estela')
  await expect(galeria).not.toContainText('Rascunho')
  for (let i = 0; i < 4; i++) await expect(galeria.locator('img').nth(i)).toHaveAttribute('loading', 'lazy')

  await cards.nth(1).getByRole('link').click()
  await expect(page).toHaveURL(/\/modelos\/bella$/)

  // staff hid "Galeria" in Menu do site: the section goes away too
  await api.updateGlobal('menu-do-site', { itensOcultos: ['galeria'] })
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Galeria' })).toHaveCount(0)
  await api.updateGlobal('menu-do-site', { itensOcultos: [] })
})

test('order: agenda, small parties, space, gallery, then the house boxes; no "Quem somos" block', async ({ page, request }) => {
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  await api.deleteAll('models')
  for (let i = 1; i <= 4; i++) await api.createSpacePhoto({ order: i, alt: `Ambiente ${i}` })
  await api.createModel({ name: 'Aurora', photos: 1, order: 1 })

  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Quem somos' })).toHaveCount(0)
  await expect(page.locator('main').getByRole('heading', { name: 'Quem somos' })).toHaveCount(0)
  await expect(page.locator('main a[href="/quem-somos"]')).toHaveCount(0)

  const y = async (selector: string) => (await page.locator(selector).first().boundingBox())!.y + (await page.evaluate(() => window.scrollY))
  const carousel = await y('[data-party-carousel]')
  const minis = await y('[data-mini-parties]')
  const espaco = await y('[data-home-espaco]')
  const galeria = await y('[data-home-galeria]')
  const quadros = await y('[data-home-quadros]')
  expect(carousel).toBeLessThan(minis)
  expect(minis).toBeLessThan(espaco)
  expect(espaco).toBeLessThan(galeria)
  expect(galeria).toBeLessThan(quadros)
  // the Quem somos page itself stays
  expect((await page.goto('/quem-somos'))?.status()).toBe(200)
})
