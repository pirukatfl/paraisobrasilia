import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'

// PREV-02 / PREV-04 / R-05 (quick recados-privados): the mural is gone, old URLs redirect, the open
// ClassiSex carries a locked "Enviar recado" on every card, every preview has an "Assine Já" link.
test.describe.configure({ mode: 'serial' })

const RITA = { email: 'rita.previa@teste.local', name: 'Rita Recado', password: 'senha-rita-12345' }
const APELIDO = 'RitaSentinela'
const TEXTO = 'Casal tranquilo, chama no 61 98877-6655 ou @ritacasal'
let ritaId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('contos')
  await api.deleteAll('assinantes')
  ritaId = (await api.createAssinante(RITA)).id
  await api.liberar(ritaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.createAd({ author: ritaId, apelido: APELIDO, texto: TEXTO, status: 'aprovado' })
  await api.createConto({
    title: 'Conto de Previa',
    slug: 'conto-de-previa',
    paragrafos: ['Primeiro aberto.', 'Segundo aberto.', 'Terceiro aberto.', 'Quarto fechado.'],
  })
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

test('/recados answers 308 to /assine-ja and /area-do-assinante/recados to the Recados list (R-05)', async ({ request }) => {
  const old = await request.get('/recados', { maxRedirects: 0 })
  expect(old.status()).toBe(308)
  expect(old.headers()['location']).toMatch(/\/assine-ja$/)
  const followed = await request.get('/recados')
  expect(followed.status()).toBe(200)
  expect(followed.url()).toMatch(/\/assine-ja$/)
  const members = await request.get('/area-do-assinante/recados', { maxRedirects: 0 })
  expect(members.status()).toBe(308)
  expect(members.headers()['location']).toMatch(/\/area-do-assinante\/mensagens$/)
})

test('the open ClassiSex shows a locked "Enviar recado" on every card, with no members URL', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/classisex')
  const cards = page.locator('main article')
  const count = await cards.count()
  expect(count).toBeGreaterThan(0)
  const locked = page.locator('main').getByRole('link', { name: 'Enviar recado: só para assinantes' })
  await expect(locked).toHaveCount(count)
  for (let i = 0; i < count; i++) await expect(locked.nth(i)).toHaveAttribute('href', '/assine-ja')
  for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
    const body = await (await page.request.get('/classisex', { headers })).text()
    expect(body).not.toContain('/area-do-assinante/mensagens/nova')
    expect(body).not.toContain(TEXTO)
  }
  await context.close()
})

test('the open ClassiSex shows the redacted text of the ad, never its phone or @handle', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/classisex')
  const card = page.locator('main article').filter({ hasText: APELIDO })
  await expect(card).toContainText('Casal tranquilo, chama no')
  await expect(card).toContainText('[contato só para assinantes]')
  await expect(card.getByRole('link', { name: 'Assine para ver o contato e as fotos' })).toHaveAttribute('href', '/assine-ja')
  for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
    const body = await (await page.request.get('/classisex', { headers })).text()
    for (const planted of ['98877-6655', '98877', '@ritacasal', 'ritacasal']) expect(body, planted).not.toContain(planted)
  }
  await context.close()
})

test('every public preview has an Assine Já link to /assine-ja', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  for (const path of ['/classisex', '/contos', '/contos/conto-de-previa']) {
    await page.goto(path)
    await expect(page.locator('main').getByRole('link', { name: 'Assine Já' }).first(), path).toHaveAttribute('href', '/assine-ja')
  }
  await context.close()
})
