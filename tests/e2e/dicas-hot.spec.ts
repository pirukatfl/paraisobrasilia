import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'

// Dicas Hot (quick dicas-hot): a fully public, SEO-first section. Whole texts are open, drafts never
// show (page, list, home, sitemap, REST) and a cover reaches the page and the share preview only
// after staff tick "Capa conferida".
test.describe.configure({ mode: 'serial' })

const P = ['Primeiro parágrafo da dica de teste.', 'Segundo parágrafo da dica de teste.', 'ÚLTIMO-PARÁGRAFO-ABERTO fecha a dica de teste.']
const RESUMO = 'Resumo curto da dica aberta, usado como descrição no Google.'
let capaId = 0
let capaDicaId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.deleteAll('dicas')
  // 13 published dicas: day 1..13 of 2026-09 (dica-teste-13 is the newest)
  for (let i = 1; i <= 13; i++) {
    await api.createDica({
      title: `Dica Teste ${i}`,
      slug: `dica-teste-${i}`,
      paragrafos: i === 13 ? P : [`Texto da dica ${i}.`],
      resumo: i === 13 ? RESUMO : undefined,
      publishedAt: `2026-09-${String(i).padStart(2, '0')}T12:00:00.000Z`,
    })
  }
  await api.createDica({ title: 'Dica Rascunho', slug: 'dica-rascunho', paragrafos: P, status: 'draft', publishedAt: '2026-10-05T12:00:00.000Z' })
  const capa = await api.createMedia('Capa da dica com capa')
  capaId = capa.id
  capaDicaId = (
    await api.createDica({
      title: 'Dica Com Capa',
      slug: 'dica-com-capa',
      paragrafos: ['Texto da dica com capa.'],
      capa: capaId,
      capaConferida: false,
      publishedAt: '2026-08-01T12:00:00.000Z',
    })
  ).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('dicas')
  if (capaId) await api.deleteDoc('media', capaId).catch(() => undefined)
  await api.dispose()
})

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test('the footer links to Dicas Hot and the main menu does not', async ({ browser, baseURL, isMobile }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/contato')
  const menu = page.getByRole('navigation', { name: isMobile ? 'Menu' : 'Principal' })
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(menu.getByRole('link', { name: 'Dicas Hot' })).toHaveCount(0)
  await page.getByRole('contentinfo').getByRole('link', { name: 'Dicas Hot' }).click()
  await expect(page).toHaveURL(/\/dicas-hot$/)
  await expect(page.getByRole('heading', { name: 'Dicas Hot', level: 1 })).toBeVisible()
  await context.close()
})

test('the home shows the 3 newest dicas and a link to all of them', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/')
  const section = page.locator('section', { has: page.getByRole('heading', { name: 'Dicas Hot', level: 2 }) })
  await expect(section.getByRole('link', { name: /^Dica Teste/ })).toHaveText(['Dica Teste 13', 'Dica Teste 12', 'Dica Teste 11'])
  await expect(section).not.toContainText('Dica Rascunho')
  await section.getByRole('link', { name: 'Ver todas as Dicas Hot' }).click()
  await expect(page).toHaveURL(/\/dicas-hot$/)
  await context.close()
})

test('the list is newest first, without drafts, 12 per page', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/dicas-hot')
  const main = page.locator('main')
  const cards = main.getByRole('article')
  await expect(cards).toHaveCount(12)
  await expect(cards.first()).toContainText('Dica Teste 13')
  await expect(main).not.toContainText('Dica Rascunho')
  await expect(main).not.toContainText('Assine Já')
  await page.goto('/dicas-hot?pagina=2')
  const page2 = page.locator('main').getByRole('article')
  await expect(page2).toHaveCount(2)
  await expect(page2.filter({ hasText: 'Dica Com Capa' })).toHaveCount(1)
  await expect(page2.filter({ hasText: 'Dica Teste 1' }).first()).toBeVisible()
  await context.close()
})

test('a dica shows the whole text, with no Assine Já inside the article', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/dicas-hot/dica-teste-13')
  const article = page.getByRole('article').first()
  await expect(article.getByRole('heading', { name: 'Dica Teste 13', level: 1 })).toBeVisible()
  for (const p of P) await expect(article).toContainText(p)
  await expect(article).not.toContainText('Assine Já')
  await expect(page.getByRole('heading', { name: 'Leia também' })).toBeVisible()
  await context.close()
})

test('SEO: title, description = resumo, canonical and one Article JSON-LD', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/dicas-hot/dica-teste-13')
  await expect(page).toHaveTitle('Dica Teste 13 · Paraíso Brasília')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', RESUMO)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/dicas-hot\/dica-teste-13$/)
  const ld = page.locator('script[type="application/ld+json"]')
  await expect(ld).toHaveCount(1)
  expect(await ld.textContent()).toContain('"@type":"Article"')
  await context.close()
})

test('a cover only appears (page and og:image) after "Capa conferida"', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/dicas-hot/dica-com-capa')
  await expect(page.getByRole('article').first().locator('img')).toHaveCount(0)
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-default\.jpg/)
  await page.goto('/dicas-hot')
  await expect(page.locator('main').getByRole('article').filter({ hasText: 'Dica Com Capa' }).locator('img')).toHaveCount(0)

  const api = await staffApi(request)
  await api.updateDica(capaDicaId, { capaConferida: true })
  await api.dispose()

  await page.goto('/dicas-hot/dica-com-capa')
  await expect(page.getByRole('article').first().locator('img')).toBeVisible()
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/api\/media\/file\//)
  await context.close()
})

test('a draft or unknown slug answers 404', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  for (const slug of ['dica-rascunho', 'nao-existe']) {
    const res = await page.goto(`/dicas-hot/${slug}`)
    expect(res?.status()).toBe(404)
  }
  await context.close()
})

test('REST is staff-only: an anonymous read returns no documents, drafts included', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  const res = await anon.get('/api/dicas?draft=true')
  if (res.status() === 200) {
    expect(((await res.json()) as { totalDocs: number }).totalDocs).toBe(0)
  } else {
    expect([401, 403]).toContain(res.status())
  }
  await anon.dispose()
})

test('sitemap.xml lists /dicas-hot and published dicas, never drafts', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.ok()).toBe(true)
  const xml = await res.text()
  expect(xml).toContain('/dicas-hot</loc>')
  expect(xml).toContain('/dicas-hot/dica-teste-13</loc>')
  expect(xml).not.toContain('dica-rascunho')
})
