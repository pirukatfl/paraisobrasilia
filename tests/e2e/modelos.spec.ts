import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// MIDIA-06/07, PAINEL-09 (Phase 06.1): cards link to /modelos/{slug}; the section exists only when a model is published.
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

test('cards open the model page with name, description and photos (G-01)', async ({ page, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Aurora', photos: 3, order: 1, description: 'Ruiva, simpática e muito animada.' })
  await api.createModel({ name: 'Bella', photos: 1, order: 2 })

  await page.goto('/modelos')
  await expect(page.getByRole('heading', { name: 'Modelos', level: 1 })).toBeVisible()
  const cards = page.locator('main ul[role="list"] > li')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0)).toContainText('Aurora')
  await expect(cards.nth(0)).toContainText('3 fotos')
  await expect(cards.nth(1)).toContainText('Bella')
  await expect(cards.nth(1)).not.toContainText('fotos')

  const link = cards.nth(0).getByRole('link', { name: 'Ver fotos de Aurora' })
  await expect(link).toHaveAttribute('href', '/modelos/aurora')
  await link.click()
  await expect(page).toHaveURL(/\/modelos\/aurora$/)
  await expect(page.getByRole('heading', { name: 'Aurora', level: 1 })).toBeVisible()
  await expect(page.getByText('Ruiva, simpática e muito animada.')).toBeVisible()
  const tiles = page.locator('main ul[role="list"] > li')
  await expect(tiles).toHaveCount(3)

  await tiles.nth(0).locator('a, button').first().click()
  const dialog = page.getByRole('dialog', { name: 'Galeria de fotos' })
  await expect(dialog).toContainText('1 de 3')
  await dialog.getByRole('button', { name: 'Próxima' }).click()
  await expect(dialog).toContainText('2 de 3')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  // G-03: no contact anywhere on the page
  await expect(page.locator('main a[href^="tel:"], main a[href*="wa.me"], main a[href^="mailto:"]')).toHaveCount(0)

  await page.getByRole('link', { name: 'Ver todas as modelos' }).click()
  await expect(page).toHaveURL(/\/modelos$/)
})

test('model page shows videos first and plays them (G-05)', async ({ page, request }) => {
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Aurora', photos: 2, videos: 1 })

  await page.goto('/modelos')
  const card = page.locator('main ul[role="list"] > li').first()
  await expect(card).toContainText('2 fotos · 1 vídeo')

  await card.getByRole('link', { name: 'Ver fotos de Aurora' }).click()
  await expect(page.getByRole('heading', { name: 'Aurora', level: 1 })).toBeVisible()
  await expect(page.locator('main')).toContainText('2 fotos · 1 vídeo')
  const tiles = page.locator('main ul[role="list"] > li')
  await expect(tiles).toHaveCount(3)
  const first = tiles.nth(0).getByRole('button')
  await expect(first).toHaveAccessibleName(/^Assistir vídeo:/)
  await first.click()
  const dialog = page.getByRole('dialog', { name: 'Galeria de fotos' })
  await expect(dialog).toContainText('1 de 3')
  await expect(dialog.locator('video')).toHaveAttribute('src', /\.mp4$/)
})

test('drafts and unknown slugs are 404', async ({ page, request }) => {
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Publicada', photos: 1 })
  await api.createModel({ name: 'Rascunho', photos: 1, published: false })
  expect((await page.goto('/modelos/rascunho'))?.status()).toBe(404)
  expect((await page.goto('/modelos/nao-existe'))?.status()).toBe(404)
  expect((await page.goto('/modelos/publicada'))?.status()).toBe(200)
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

  test('Despublicar removes /modelos, the model page and the nav link at once', async ({ page, request, context }) => {
    test.setTimeout(180_000)
    const api = await staffApi(request)
    await api.deleteAll('models')
    const model = await api.createModel({ name: 'Aurora', photos: 1 })

    const site = await context.newPage()
    expect((await site.goto('/modelos'))?.status()).toBe(200)
    expect((await site.goto('/modelos/aurora'))?.status()).toBe(200)

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
    expect((await site.goto('/modelos/aurora'))?.status()).toBe(404)
    await site.goto('/')
    await expect(site.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Modelos' })).toHaveCount(0)
  })
})
