import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { headerMenu } from './helpers/menu'

// Dicas Hot (quick dicas-hot + dicas-hot-assinantes): a public, SEO-first section with the same paywall
// as Contos. Visitors and free accounts read only the beginning; the rest is for active subscribers and
// never reaches the public HTML/RSC/metadata/JSON-LD. Drafts never show (page, list, home, sitemap, REST)
// and a cover reaches the page and the share preview only after staff tick "Capa conferida".
test.describe.configure({ mode: 'serial' })

const SENTINEL = 'SENTINELA-RESTRITA-DICA'
const P = ['Primeiro parágrafo da dica de teste.', 'Segundo parágrafo da dica de teste.', `Último parágrafo ${SENTINEL} reservado aos assinantes.`]
const SUB = { email: 'leitora.dicas@teste.local', name: 'Leitora Dicas', password: 'senha-leitora-12345' }
const FREE = { email: 'gratuita.dicas@teste.local', name: 'Conta Gratuita Dicas', password: 'senha-gratuita-12345' }
const RESUMO = 'Resumo curto da dica aberta, usado como descrição no Google.'
let capaId = 0
let capaDicaId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.deleteAll('dicas')
  await api.deleteAll('assinantes')
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
  const sub = await api.createAssinante(SUB)
  await api.liberar(sub.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.createAssinante(FREE)
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('dicas')
  await api.deleteAll('assinantes')
  if (capaId) await api.deleteDoc('media', capaId).catch(() => undefined)
  await api.dispose()
})

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test('the main menu and the footer both link to Dicas Hot', async ({ browser, baseURL, isMobile }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/contato')
  const menu = page.getByRole('navigation', { name: isMobile ? 'Menu' : 'Principal' })
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(menu.getByRole('link', { name: 'Dicas Hot' })).toHaveAttribute('href', '/dicas-hot')
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
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await expect(main.getByRole('link', { name: 'Já é assinante? Ler as Dicas Hot completas' })).toHaveAttribute('href', '/area-do-assinante/dicas-hot')
  await page.goto('/dicas-hot?pagina=2')
  const page2 = page.locator('main').getByRole('article')
  await expect(page2).toHaveCount(2)
  await expect(page2.filter({ hasText: 'Dica Com Capa' })).toHaveCount(1)
  await expect(page2.filter({ hasText: 'Dica Teste 1' }).first()).toBeVisible()
  await context.close()
})

test('a public dica shows the open paragraphs, then the call to subscribe', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/dicas-hot/dica-teste-13')
  const article = page.getByRole('article').first()
  await expect(article.getByRole('heading', { name: 'Dica Teste 13', level: 1 })).toBeVisible()
  await expect(article).toContainText(P[0]!)
  await expect(article).toContainText(P[1]!)
  await expect(article).not.toContainText('Último parágrafo')
  const main = page.locator('main')
  await expect(main).toContainText('Continue lendo: o restante desta dica é só para assinantes.')
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await expect(main.getByRole('link', { name: 'Já sou assinante: ler a dica completa' })).toHaveAttribute(
    'href',
    '/area-do-assinante/dicas-hot/dica-teste-13',
  )
  await expect(page.getByRole('heading', { name: 'Leia também' })).toBeVisible()
  await context.close()
})

test('the restricted text is absent from HTML, RSC payload, metadata and JSON-LD', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  for (const path of ['/dicas-hot/dica-teste-13', '/dicas-hot', '/']) {
    expect(await (await page.request.get(path)).text()).not.toContain(SENTINEL)
    expect(await (await page.request.get(path, { headers: { RSC: '1' } })).text()).not.toContain(SENTINEL)
  }
  await page.goto('/dicas-hot/dica-teste-13')
  const ld = (await page.locator('script[type="application/ld+json"]').textContent()) ?? ''
  expect(ld).not.toContain(SENTINEL)
  expect(ld).toContain('"isAccessibleForFree":false')
  await context.close()
})

test('anonymous is sent to the login; a free account sees the excerpt and the inactive panel', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/area-do-assinante/dicas-hot/dica-teste-13')
  await expect(page).toHaveURL(/\/entrar\?next=/)
  await loginAsAssinante(page, FREE.email, FREE.password, '/area-do-assinante/dicas-hot/dica-teste-13')
  await expect(page.getByRole('heading', { name: 'Disponível para assinantes' })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(SENTINEL)
  expect(await (await page.request.get('/area-do-assinante/dicas-hot/dica-teste-13')).text()).not.toContain(SENTINEL)
  await page.goto('/dicas-hot/dica-teste-13')
  await expect(page.locator('main')).not.toContainText(SENTINEL)
  await expect(page.locator('main').getByRole('link', { name: 'Assine Já' })).toBeVisible()
  await context.close()
})

test('an active subscriber reads the whole dica in the members area', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await loginAsAssinante(page, SUB.email, SUB.password, '/area-do-assinante/dicas-hot/dica-teste-13')
  const main = page.locator('main')
  for (const p of P) await expect(main).toContainText(p)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await page.goto('/area-do-assinante/dicas-hot')
  await expect(page.locator('main').getByRole('article')).toHaveCount(12)
  await expect(page.locator('main')).not.toContainText('Dica Rascunho')
  const nav = await headerMenu(page)
  await expect(nav.getByRole('link', { name: 'Dicas Hot' })).toHaveAttribute('href', '/area-do-assinante/dicas-hot')
  // the public page of the same dica links to the full version
  await page.goto('/dicas-hot/dica-teste-13')
  await page.locator('main').getByRole('link', { name: 'Já sou assinante: ler a dica completa' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\/dicas-hot\/dica-teste-13$/)
  await expect(page.locator('main')).toContainText(SENTINEL)
  expect((await page.request.get('/area-do-assinante/dicas-hot/dica-rascunho')).status()).toBe(404)
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
