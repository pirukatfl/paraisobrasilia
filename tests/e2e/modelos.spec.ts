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

test('Modelos appears in nav, footer and sitemap only while a model is published', async ({
  page,
  request,
  isMobile,
}) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('models')

  const navLinks = async () => {
    await page.goto('/')
    if (isMobile) {
      await page.getByRole('button', { name: 'Abrir menu' }).click()
      return page.getByRole('navigation', { name: 'Menu' }).locator(':scope > ul > li > a')
    }
    return page.getByRole('navigation', { name: 'Principal' }).getByRole('link')
  }

  let links = await navLinks()
  await expect(links.filter({ hasText: 'Contato' })).toHaveCount(1)
  await expect(links.filter({ hasText: 'Modelos' })).toHaveCount(0)
  await expect(page.locator('footer').getByRole('link', { name: 'Modelos' })).toHaveCount(0)
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/modelos</loc>')

  await api.createModel({ name: 'Aurora', photos: 1 })
  links = await navLinks()
  // UI-SPEC order, pinned explicitly: Contos (05-03) sits between ClassiSex and Dicas Hot; Dicas Hot (quick dicas-hot-menu) precedes Contato.
  // Recados removed 2026-10-20 (quick recados-privados, R-08)
  const order = ['Festas', 'Quem somos', 'Espaço', 'Modelos', 'ClassiSex', 'Contos', 'Dicas Hot', 'Contato', 'Assine Já', 'Área do assinante']
  await expect(links).toHaveText(order)
  if (!isMobile) {
    // the eleven items stay on one line at 1280 px
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const fits = await page.getByRole('navigation', { name: 'Principal' }).evaluate((nav) => {
      const ul = nav.querySelector('ul') as HTMLElement
      const ys = Array.from(nav.querySelectorAll('a')).map((a) => Math.round(a.getBoundingClientRect().y))
      const right = Math.max(...Array.from(nav.querySelectorAll('a')).map((a) => a.getBoundingClientRect().right))
      return { overflow: ul.scrollWidth - ul.clientWidth, oneLine: new Set(ys).size === 1, right, viewport: window.innerWidth }
    })
    expect(fits.overflow).toBeLessThanOrEqual(0)
    expect(fits.oneLine).toBe(true)
    expect(fits.right).toBeLessThanOrEqual(fits.viewport)
  }
  await expect(page.locator('footer').getByRole('link', { name: 'Modelos' })).toHaveCount(1)
  expect(await (await request.get('/sitemap.xml')).text()).toContain('/modelos</loc>')
})

test.describe('staff unpublishes a model (fast removal)', () => {
  test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
  test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

  test('Despublicar removes /modelos and the nav link at once', async ({ page, request, context }) => {
    test.setTimeout(180_000)
    const api = await staffApi(request)
    await api.deleteAll('models')
    const model = await api.createModel({ name: 'Aurora', photos: 1 })

    const site = await context.newPage()
    expect((await site.goto('/modelos'))?.status()).toBe(200)

    const { loginAsStaff } = await import('./helpers/staff')
    await loginAsStaff(page)
    await page.goto(`/admin/collections/models/${model.id}`)
    await expect(page.locator('#field-name')).toHaveValue('Aurora')
    await page.locator('.doc-controls__popup .popup-button').click()
    await page.getByRole('button', { name: 'Despublicar', exact: true }).click()
    const confirm = page.getByRole('dialog').filter({ hasText: 'Confirmar despublicação' })
    await confirm.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Status: Rascunho')).toBeVisible()

    expect((await site.goto('/modelos'))?.status()).toBe(404)
    await site.goto('/')
    await expect(site.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Modelos' })).toHaveCount(0)
  })
})
