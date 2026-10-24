import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { headerMenu } from './helpers/menu'

// PREV-03 / PREV-04: visitors read the beginning of each conto with an "Assine Já"; the rest is
// for active subscribers. The restricted part never reaches public HTML, RSC or metadata (T-05-01).
test.describe.configure({ mode: 'serial' })

const SENTINEL = 'SENTINELA-RESTRITA-ABC'
const P = [
  'Primeiro parágrafo aberto do conto de teste.',
  'Segundo parágrafo aberto do conto de teste.',
  'Terceiro parágrafo reservado aos assinantes.',
  `Quarto parágrafo com ${SENTINEL} reservado.`,
  'Quinto parágrafo reservado aos assinantes.',
]
const SUB = { email: 'leitora.contos@teste.local', name: 'Leitora Contos', password: 'senha-leitora-12345' }
let contoId = 0
let subId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('contos')
  await api.deleteAll('assinantes')
  contoId = (await api.createConto({ title: 'Conto Aberto Um', slug: 'conto-aberto-um', paragrafos: P, paragrafosAbertos: 2 })).id
  await api.createConto({ title: 'Conto Rascunho', slug: 'conto-rascunho', paragrafos: P, status: 'draft' })
  subId = (await api.createAssinante(SUB)).id
  await api.liberar(subId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('contos')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test('visitors find Contos in the menu and see the list with Assine Já', async ({ browser, baseURL, isMobile }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('navigation', { name: isMobile ? 'Menu' : 'Principal' }).getByRole('link', { name: 'Contos' }).click()
  await expect(page).toHaveURL(/\/contos$/)
  await expect(page.getByRole('heading', { name: 'Contos', level: 1 })).toBeVisible()
  const main = page.locator('main')
  const card = main.getByRole('article').filter({ hasText: 'Conto Aberto Um' })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('01/10/2026')
  await expect(card).toContainText('Primeiro parágrafo aberto')
  await expect(card).not.toContainText('Terceiro')
  await expect(main).not.toContainText('Conto Rascunho')
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await context.close()
})

test('the public conto shows the open paragraphs, then the call to subscribe', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/contos/conto-aberto-um')
  const main = page.locator('main')
  await expect(page.getByRole('heading', { name: 'Conto Aberto Um', level: 1 })).toBeVisible()
  await expect(main).toContainText(P[0]!)
  await expect(main).toContainText(P[1]!)
  await expect(main).not.toContainText(P[2]!)
  await expect(main).toContainText('Continue lendo: o restante deste conto é só para assinantes.')
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await expect(main.getByRole('link', { name: 'Já sou assinante: ler o conto completo' })).toHaveAttribute(
    'href',
    '/area-do-assinante/contos/conto-aberto-um',
  )
  await context.close()
})

test('the restricted part is absent from HTML, RSC payload and metadata; drafts are 404', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  const html = await page.request.get('/contos/conto-aberto-um')
  expect(await html.text()).not.toContain(SENTINEL)
  const rsc = await page.request.get('/contos/conto-aberto-um', { headers: { RSC: '1' } })
  expect(await rsc.text()).not.toContain(SENTINEL)
  await page.goto('/contos/conto-aberto-um')
  const description = await page.locator('meta[name="description"]').getAttribute('content')
  expect(description ?? '').not.toContain(SENTINEL)
  expect(description ?? '').not.toContain('Terceiro')
  expect((await page.request.get('/contos/conto-rascunho')).status()).toBe(404)
  const list = await page.request.get('/contos')
  expect(await list.text()).not.toContain(SENTINEL)
  await context.close()
})

test('members: anonymous is sent to the login, an active subscriber reads everything', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/area-do-assinante/contos/conto-aberto-um')
  await expect(page).toHaveURL(/\/entrar\?next=/)
  await loginAsAssinante(page, SUB.email, SUB.password, '/area-do-assinante/contos/conto-aberto-um')
  const main = page.locator('main')
  for (const paragraph of P) await expect(main).toContainText(paragraph)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await page.goto('/area-do-assinante/contos')
  await expect(page.locator('main').getByRole('article').filter({ hasText: 'Conto Aberto Um' })).toHaveCount(1)
  await expect(page.locator('main')).not.toContainText('Conto Rascunho')
  const nav = await headerMenu(page)
  await expect(nav.getByRole('link', { name: 'Contos' })).toHaveAttribute('href', '/area-do-assinante/contos')
  await context.close()
})

test('staff edits show on the next load; an ended subscriber sees only the inactive panel', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  const { context, page } = await visitor(browser, baseURL!)
  await api.updateConto(contoId, { paragrafosAbertos: 3 })
  await page.goto('/contos/conto-aberto-um')
  await expect(page.locator('main')).toContainText(P[2]!)

  await loginAsAssinante(page, SUB.email, SUB.password, '/area-do-assinante/contos/conto-aberto-um')
  await expect(page.locator('main')).toContainText(SENTINEL)
  await api.encerrar(subId, 'fim do teste')
  await page.goto('/area-do-assinante/contos/conto-aberto-um')
  await expect(page.locator('main')).not.toContainText(SENTINEL)
  await expect(page.getByRole('heading', { name: 'Sua assinatura não está ativa' })).toBeVisible()

  // Unpublish: gone from the list and a 404 at once
  await api.updateConto(contoId, { _status: 'draft' })
  const anon = await visitor(browser, baseURL!)
  await expect(async () => {
    expect((await anon.page.request.get('/contos/conto-aberto-um')).status()).toBe(404)
  }).toPass()
  await anon.page.goto('/contos')
  await expect(anon.page.locator('main')).not.toContainText('Conto Aberto Um')
  await anon.context.close()
  await context.close()
  await api.dispose()
})
