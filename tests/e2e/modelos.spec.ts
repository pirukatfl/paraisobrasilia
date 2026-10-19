import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// MIDIA-02 / D-08: models grid with lightbox; the section exists only when a model is published.
test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('models')
})

test('without published models /modelos is a 404', async ({ page, request }) => {
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Rascunho', photos: 1, published: false })
  const res = await page.goto('/modelos')
  expect(res?.status()).toBe(404)
})

test('published models show as cards with a lightbox, no profile pages', async ({ page, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Aurora', photos: 3, order: 1 })
  await api.createModel({ name: 'Bella', photos: 1, order: 2 })

  await page.goto('/modelos')
  await expect(page.getByRole('heading', { name: 'Modelos', level: 1 })).toBeVisible()
  const cards = page.locator('main ul[role="list"] > li')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0)).toContainText('Aurora')
  await expect(cards.nth(0)).toContainText('3 fotos')
  await expect(cards.nth(1)).toContainText('Bella')
  await expect(cards.nth(1)).not.toContainText('fotos')

  await page.getByRole('button', { name: 'Ver fotos de Aurora' }).click()
  const dialog = page.getByRole('dialog', { name: 'Galeria de fotos' })
  await expect(dialog).toContainText('1 de 3')
  await dialog.getByRole('button', { name: 'Próxima' }).click()
  await expect(dialog).toContainText('2 de 3')
  await expect(dialog).toContainText('Aurora')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // D-08: no individual model page, no contact
  await expect(page.locator('a[href^="/modelos/"]')).toHaveCount(0)
  expect((await page.goto('/modelos/aurora'))?.status()).toBe(404)
})
