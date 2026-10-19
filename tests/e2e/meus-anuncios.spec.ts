import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// CLAS-03 / CLAS-04 / D-01 / D-02 / D-03: subscribers write their own ads; every write waits for
// staff approval; nobody but staff uses /api/ads (T-04-04); inactive owners list and delete only.
test.describe.configure({ mode: 'serial' })

const BIA = { email: 'bia@teste.local', name: 'Bia Anuncia', password: 'senha-bia-12345', whatsapp: '5561988887777' }
const CAIO = { email: 'caio@teste.local', name: 'Caio Teste', password: 'senha-caio-12345' }
const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'
const ENVIADO = 'Anúncio enviado. Ele aparece no ClassiSex depois que a equipe aprovar.'
const LIMITE = 'Você já tem 3 anúncios ativos. Apague um para publicar outro.'
const TEXTO = 'Casal de Brasília procura amigos para a próxima festa.'

let biaId = 0
let caioId = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  biaId = (await api.createAssinante(BIA)).id
  caioId = (await api.createAssinante(CAIO)).id
  await api.liberar(biaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.liberar(caioId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function asSubscriber(browser: Browser, baseURL: string, acc: { email: string; password: string }) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, acc.email, acc.password)
  return { page, context }
}

const biaAds = async (request: Parameters<typeof staffApi>[0]) => {
  const api = await staffApi(request)
  const res = (await api.get(`/api/ads?where[author][equals]=${biaId}&limit=50&depth=0&sort=createdAt`)) as unknown as {
    docs: { id: number; status: string }[]
  }
  await api.dispose()
  return res.docs
}

/** Same-origin request from the page, with the session cookie (as a browser sends it). */
const call = (page: Page, method: string, path: string, data?: unknown) =>
  page.evaluate(
    async ([m, p, d]) => {
      const res = await fetch(p as string, {
        method: m as string,
        credentials: 'include',
        headers: d ? { 'Content-Type': 'application/json' } : undefined,
        body: d ? JSON.stringify(d) : undefined,
      })
      return { status: res.status, body: await res.text() }
    },
    [method, path, data] as const,
  )

test('Meus anúncios starts empty, with the sub-nav link', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, BIA)
  await page.goto('/area-do-assinante')
  const nav = page.getByRole('navigation', { name: 'Área do assinante' })
  await nav.getByRole('link', { name: 'Meus anúncios' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\/meus-anuncios$/)
  const main = page.locator('main')
  await expect(main).toContainText('Você ainda não tem anúncios.')
  await expect(main.getByRole('link', { name: 'Novo anúncio' })).toBeVisible()
  await context.close()
})

test('new ad: fields, contact error keeps the text, valid submit waits for approval', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, BIA)
  await page.goto('/area-do-assinante/meus-anuncios/novo')
  const main = page.locator('main')
  const euSou = main.getByRole('group', { name: 'Eu sou' })
  for (const name of ['Casal', 'Solteiro', 'Solteira']) await expect(euSou.getByRole('radio', { name })).toBeVisible()
  await expect(main.getByLabel('Cidade (opcional)')).toBeVisible()
  await expect(main.getByLabel('Texto do anúncio')).toHaveAttribute('maxlength', '600')
  await expect(main.getByLabel('WhatsApp')).toHaveValue(BIA.whatsapp)
  await expect(main.getByLabel('Telegram')).toBeVisible()
  await expect(main.getByLabel('E-mail')).toBeVisible()

  await euSou.getByRole('radio', { name: 'Casal' }).check()
  await main.getByLabel('Cidade (opcional)').fill('Brasília')
  await main.getByLabel('Texto do anúncio').fill(TEXTO)
  await main.getByLabel('WhatsApp').fill('')
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(main.getByRole('alert').filter({ hasText: 'Informe pelo menos um contato' })).toBeVisible()
  await expect(main.getByLabel('Texto do anúncio')).toHaveValue(TEXTO)

  await main.getByLabel('WhatsApp').fill(BIA.whatsapp)
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await page.waitForURL(/\/meus-anuncios\?ok=enviado/)
  await expect(main.getByRole('status')).toContainText(ENVIADO)
  const card = main.getByRole('article').first()
  await expect(card).toContainText('Em análise pela equipe')
  await expect(card).toContainText('Casal · Brasília')
  await expect(card).toContainText(TEXTO)
  await context.close()
})

test('approved ad shows Publicado; editing warns and sends it back to analysis', async ({ browser, baseURL, request }) => {
  const [ad] = await biaAds(request)
  const api = await staffApi(request)
  await api.updateAd(ad.id, { status: 'aprovado', publishedAt: new Date().toISOString() })
  await api.dispose()

  const { page, context } = await asSubscriber(browser, baseURL!, BIA)
  await page.goto('/area-do-assinante/meus-anuncios')
  const main = page.locator('main')
  await expect(main.getByRole('article').first()).toContainText('Publicado')
  await main.getByRole('link', { name: 'Editar' }).first().click()
  await expect(page).toHaveURL(new RegExp(`/meus-anuncios/${ad.id}/editar$`))
  await expect(main).toContainText('Ao salvar, o anúncio sai do ar até a equipe aprovar de novo.')
  await main.getByLabel('Texto do anúncio').fill(`${TEXTO} Editado.`)
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await page.waitForURL(/\/meus-anuncios\?ok=enviado/)
  await expect(main.getByRole('article').first()).toContainText('Em análise pela equipe')
  await expect(main.getByRole('article').first()).toContainText('Editado.')
  await context.close()
})

test('a 4th active ad is refused; Apagar removes an ad', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.createAd({ author: biaId, texto: 'Segundo anúncio da Bia.' })
  await api.createAd({ author: biaId, texto: 'Terceiro anúncio da Bia.', status: 'aprovado' })
  await api.dispose()

  const { page, context } = await asSubscriber(browser, baseURL!, BIA)
  await page.goto('/area-do-assinante/meus-anuncios/novo')
  const main = page.locator('main')
  await main.getByRole('group', { name: 'Eu sou' }).getByRole('radio', { name: 'Solteira' }).check()
  await main.getByLabel('Texto do anúncio').fill('Quarto anúncio que não pode entrar.')
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(main.getByRole('alert').filter({ hasText: LIMITE })).toBeVisible()

  await page.goto('/area-do-assinante/meus-anuncios')
  await expect(main.getByRole('article')).toHaveCount(3)
  const second = main.getByRole('article').filter({ hasText: 'Segundo anúncio da Bia.' })
  await second.getByText('Apagar', { exact: true }).click()
  await second.getByRole('button', { name: 'Sim, apagar' }).click()
  await page.waitForURL(/\/meus-anuncios\?ok=apagado/)
  await expect(main.getByRole('article')).toHaveCount(2)
  await context.close()
})

test("another subscriber cannot open Bia's ad; nobody but staff uses /api/ads", async ({
  browser,
  baseURL,
  request,
  playwright,
}) => {
  const [ad] = await biaAds(request)
  const caio = await asSubscriber(browser, baseURL!, CAIO)
  const res = await caio.page.goto(`/area-do-assinante/meus-anuncios/${ad.id}/editar`)
  expect(res?.status()).toBe(404)
  await expect(caio.page.locator('main')).toContainText('Página não encontrada')
  await caio.context.close()

  const bia = await asSubscriber(browser, baseURL!, BIA)
  expect((await call(bia.page, 'POST', '/api/ads', { author: biaId, texto: 'x', contato: { email: 'a@b.com' } })).status).toBe(403)
  expect((await call(bia.page, 'PATCH', `/api/ads/${ad.id}`, { status: 'aprovado' })).status).toBe(403)
  const list = await call(bia.page, 'GET', '/api/ads')
  if (list.status === 200) expect((JSON.parse(list.body) as { docs: unknown[] }).docs).toHaveLength(0)
  else expect(list.status).toBe(403)
  await bia.context.close()

  const anon = await playwright.request.newContext({ baseURL })
  expect((await anon.get('/api/ads')).status()).toBe(403)
  await anon.dispose()
})

test('after access ends: list and delete only, no form', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.encerrar(biaId, 'Teste de fim de acesso')
  await api.dispose()
  const [ad] = await biaAds(request)

  const { page, context } = await asSubscriber(browser, baseURL!, BIA)
  await page.goto('/area-do-assinante/meus-anuncios')
  const main = page.locator('main')
  await expect(main.getByRole('article')).toHaveCount(2)
  await expect(main.getByRole('link', { name: 'Novo anúncio' })).toHaveCount(0)
  await expect(main.getByRole('article').filter({ hasText: 'Fora do ar: assinatura vencida' })).toHaveCount(1)

  for (const path of ['/area-do-assinante/meus-anuncios/novo', `/area-do-assinante/meus-anuncios/${ad.id}/editar`]) {
    await page.goto(path)
    await expect(main).toContainText('Sua assinatura não está ativa')
    await expect(main.getByRole('button', { name: 'Enviar para aprovação' })).toHaveCount(0)
    await expect(main.getByLabel('Texto do anúncio')).toHaveCount(0)
  }

  await page.goto('/area-do-assinante/meus-anuncios')
  const first = main.getByRole('article').first()
  await first.getByText('Apagar', { exact: true }).click()
  await first.getByRole('button', { name: 'Sim, apagar' }).click()
  await page.waitForURL(/\/meus-anuncios\?ok=apagado/)
  await expect(main.getByRole('article')).toHaveCount(1)
  await context.close()
})
