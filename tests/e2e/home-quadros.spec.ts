import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// Home: three frames side by side on the desktop, stacked on the phone: ClassiSex first, then Contos and
// Dicas Hot. A frame goes away with its menu item (Menu do site).
test.describe.configure({ mode: 'serial' })

const RESET = { itensOcultos: [], linkExterno: { ativo: true, rotulo: 'Pornô grátis', url: 'https://www.redtube.com.br/' } }
const PARAGRAFOS = ['Primeiro parágrafo aberto.', 'Segundo parágrafo aberto.', 'Terceiro parágrafo.']

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', RESET)
  await api.deleteAll('contos')
  await api.deleteAll('dicas')
  await api.createDica({ title: 'Dica Da Home', slug: 'dica-da-home', paragrafos: PARAGRAFOS })
  await api.createConto({ title: 'Conto Da Home Um', slug: 'conto-da-home-um', paragrafos: PARAGRAFOS, paragrafosAbertos: 2 })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', RESET)
  await api.deleteAll('contos')
  await api.deleteAll('dicas')
  await api.dispose()
})

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test('the home has the ClassiSex, Contos and Dicas Hot frames, ClassiSex first', async ({ page, isMobile }) => {
  await page.goto('/')
  const quadros = page.locator('[data-home-quadros] > section')
  await expect(quadros).toHaveCount(3)
  await expect(quadros.nth(0).getByRole('heading', { name: 'ClassiSex', level: 2 })).toBeVisible()
  await expect(quadros.nth(0).getByRole('link', { name: 'Ver o ClassiSex' })).toHaveAttribute('href', '/classisex')
  await expect(quadros.nth(1).getByRole('heading', { name: 'Contos', level: 2 })).toBeVisible()
  await expect(quadros.nth(1).getByRole('link', { name: 'Conto Da Home Um' })).toHaveAttribute('href', '/contos/conto-da-home-um')
  await expect(quadros.nth(1).getByRole('link', { name: 'Ler todos os contos' })).toHaveAttribute('href', '/contos')
  await expect(quadros.nth(2).getByRole('heading', { name: 'Dicas Hot', level: 2 })).toBeVisible()
  await expect(quadros.nth(2).getByRole('link', { name: 'Ver todas as Dicas Hot' })).toHaveAttribute('href', '/dicas-hot')

  const a = await quadros.nth(0).boundingBox()
  const b = await quadros.nth(1).boundingBox()
  if (isMobile) expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1)
  else expect(Math.abs(b!.y - a!.y)).toBeLessThan(2) // same row
})

test('a frame disappears when its menu item is hidden', async ({ page, request }) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', { ...RESET, itensOcultos: ['contos', 'classisex'] })
  await api.dispose()
  await page.goto('/')
  const quadros = page.locator('[data-home-quadros] > section')
  await expect(quadros).toHaveCount(1)
  await expect(quadros.first().getByRole('heading', { name: 'Dicas Hot', level: 2 })).toBeVisible()
})
