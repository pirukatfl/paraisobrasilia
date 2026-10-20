import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// CLAS-01 / CLAS-02 / D-05 / D-06 / D-07: subscribers browse, filter and open ads with contacts;
// expired authors stay as free ads (G-05) and keep their data on renewal; inactive viewers get no ad markup (T-04-05).
test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const PASSWORD = 'senha-classi-12345'
const DUDA = { email: 'duda@teste.local', name: 'Duda Anuncia', password: PASSWORD }
const ELI = { email: 'eli@teste.local', name: 'Eli Vencido', password: PASSWORD }
const GIL = { email: 'gil@teste.local', name: 'Gil Assinante', password: PASSWORD }
const HUGO = { email: 'hugo@teste.local', name: 'Hugo Vencido', password: PASSWORD }

const TEXTO_CASAL = 'Casal de Brasília procura amigos para a próxima festa.'
const TEXTO_SOLTEIRA = 'Solteira de Taguatinga quer conhecer casais.'
const TEXTO_ELI = 'Anúncio de quem venceu ontem.'
const TEXTO_PENDENTE = 'Anúncio ainda em análise.'
const DUDA_WHATS = '5561977776666'
const DUDA_EMAIL = 'duda.contato@exemplo.com'

let dudaId = 0
let casalAd = 0
let solteiraAd = 0
let eliAd = 0
let pendingAd = 0
let solteiraCat = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  const cats = await api.findAdCategories()
  solteiraCat = cats.find((c) => c.name === 'Mulher')!.id
  dudaId = (await api.createAssinante(DUDA)).id
  await api.liberar(dudaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  casalAd = (
    await api.createAd({
      author: dudaId,
      texto: TEXTO_CASAL,
      cidade: 'Brasília',
      status: 'aprovado',
      publishedAt: new Date(Date.now() - 2 * DAY).toISOString(),
      contato: { whatsapp: DUDA_WHATS },
    })
  ).id
  solteiraAd = (
    await api.createAd({
      author: dudaId,
      euSou: solteiraCat,
      texto: TEXTO_SOLTEIRA,
      cidade: 'Taguatinga',
      status: 'aprovado',
      publishedAt: new Date(Date.now() - DAY).toISOString(),
      contato: { telegram: 'duda_bsb' },
    })
  ).id
  pendingAd = (await api.createAd({ author: dudaId, texto: TEXTO_PENDENTE })).id

  const eliId = (await api.createAssinante(ELI)).id
  await api.createSubscription({
    assinante: eliId,
    startsAt: new Date(Date.now() - 31 * DAY).toISOString(),
    endsAt: new Date(Date.now() - DAY).toISOString(),
  })
  eliAd = (await api.createAd({ author: eliId, texto: TEXTO_ELI, cidade: 'Gama', status: 'aprovado' })).id

  const gilId = (await api.createAssinante(GIL)).id
  await api.liberar(gilId, { durationDays: 30, method: 'cortesia', amount: 0 })
  const hugoId = (await api.createAssinante(HUGO)).id
  await api.createSubscription({
    assinante: hugoId,
    startsAt: new Date(Date.now() - 31 * DAY).toISOString(),
    endsAt: new Date(Date.now() - DAY).toISOString(),
  })
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

test('active subscriber sees visible ads only, newest first', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, GIL)
  await page.goto('/area-do-assinante')
  await page.getByRole('navigation', { name: 'Área do assinante' }).getByRole('link', { name: 'ClassiSex' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\/classisex$/)
  const main = page.locator('main')
  await expect(page.getByRole('heading', { name: 'ClassiSex', level: 1 })).toBeVisible()
  const cards = main.getByRole('article')
  // Eli's subscription ended: the ad stays as a free ad (G-05), newest first
  await expect(cards).toHaveCount(3)
  await expect(cards.nth(0)).toContainText(TEXTO_ELI)
  await expect(cards.nth(1)).toContainText(TEXTO_SOLTEIRA)
  await expect(cards.nth(2)).toContainText(TEXTO_CASAL)
  await expect(main).not.toContainText(TEXTO_PENDENTE)
  await context.close()
})

test('filters by Eu sou and cidade; Limpar filtros resets', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, GIL)
  await page.goto('/area-do-assinante/classisex')
  const main = page.locator('main')
  await main.getByLabel('Eu sou').selectOption({ label: 'Mulher' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page).toHaveURL(new RegExp(`eu-sou=${solteiraCat}`))
  await expect(main.getByRole('article')).toHaveCount(1)
  await expect(main.getByRole('article')).toContainText(TEXTO_SOLTEIRA)

  await main.getByLabel('Eu sou').selectOption({ label: 'Todos' })
  await main.getByLabel('Cidade').fill('brasilia')
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(main.getByRole('article')).toHaveCount(1)
  await expect(main.getByRole('article')).toContainText(TEXTO_CASAL)

  await main.getByLabel('Cidade').fill('Recife')
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(main).toContainText('Nenhum anúncio encontrado.')

  await main.getByRole('link', { name: 'Limpar filtros' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\/classisex$/)
  await expect(main.getByRole('article')).toHaveCount(3)
  await context.close()
})

test('full ad shows contacts; hidden ads answer 404', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, GIL)
  await page.goto('/area-do-assinante/classisex')
  const main = page.locator('main')
  await main.getByRole('article').filter({ hasText: TEXTO_CASAL }).getByRole('link', { name: 'Ver anúncio' }).click()
  await expect(page).toHaveURL(new RegExp(`/area-do-assinante/classisex/${casalAd}$`))
  await expect(main).toContainText('Casal · Brasília')
  await expect(main).toContainText(TEXTO_CASAL)
  await expect(main.getByRole('link', { name: /^WhatsApp/ })).toHaveAttribute('href', new RegExp(`^https://wa\\.me/${DUDA_WHATS}`))
  // Revisão 2026-10-20: WhatsApp and Telegram only, no e-mail button
  await expect(main.getByRole('link', { name: /^E-mail/ })).toHaveCount(0)
  await expect(main).toContainText('Anúncio Teste · Casal · Brasília')
  await expect(main.getByRole('link', { name: /^Telegram/ })).toHaveCount(0)
  await expect(main.getByRole('link', { name: 'Voltar para o ClassiSex' })).toHaveAttribute('href', '/area-do-assinante/classisex')

  await page.goto(`/area-do-assinante/classisex/${solteiraAd}`)
  await expect(main.getByRole('link', { name: /^Telegram/ })).toHaveAttribute('href', 'https://t.me/duda_bsb')

  for (const id of [pendingAd, 99999999]) {
    const res = await page.goto(`/area-do-assinante/classisex/${id}`)
    expect(res?.status()).toBe(404)
    await expect(main).toContainText('Página não encontrada')
  }
  // the ad of an expired author is open, as a free ad: contacts yes, "Enviar recado" no (G-02, G-04)
  const res = await page.goto(`/area-do-assinante/classisex/${eliAd}`)
  expect(res?.status()).toBe(200)
  await expect(main).toContainText(TEXTO_ELI)
  await expect(main.getByRole('link', { name: 'Enviar recado' })).toHaveCount(0)
  await expect(main.getByText('Este anúncio é de uma conta gratuita e não recebe recados. Use os contatos do anúncio.')).toBeVisible()
  await context.close()
})

test('inactive viewer gets the status panel and no ad markup', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, HUGO)
  for (const path of ['/area-do-assinante/classisex', `/area-do-assinante/classisex/${casalAd}`]) {
    await page.goto(path)
    await expect(page.locator('main')).toContainText('Sua assinatura não está ativa')
    const html = await page.content()
    for (const secret of [TEXTO_CASAL, TEXTO_SOLTEIRA, DUDA_WHATS, '977776666', DUDA_EMAIL, 'duda_bsb']) {
      expect(html).not.toContain(secret)
    }
  }
  await context.close()
})

test('anonymous visitors go to /entrar; pages are private and noindex', async ({ browser, baseURL }) => {
  const anon = await browser.newContext({ baseURL })
  await anon.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await anon.newPage()
  await page.goto('/area-do-assinante/classisex')
  await expect(page).toHaveURL(/\/entrar\?next=%2Farea-do-assinante%2Fclassisex$/)
  await anon.close()

  const { page: gil, context } = await asSubscriber(browser, baseURL!, GIL)
  for (const path of ['/area-do-assinante/classisex', `/area-do-assinante/classisex/${casalAd}`]) {
    const res = await gil.goto(path)
    const headers = res!.headers()
    expect(headers['cache-control']).toContain('no-store')
    expect(headers['x-robots-tag']).toContain('noindex')
  }
  await context.close()
})

test('ending the author access keeps the ads on the board as free ads; renewing changes nothing else', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.encerrar(dudaId, 'Teste de vencimento')
  const { page, context } = await asSubscriber(browser, baseURL!, GIL)
  await page.goto('/area-do-assinante/classisex')
  const main = page.locator('main')
  await expect(main.getByRole('article')).toHaveCount(3)
  await page.goto(`/area-do-assinante/classisex/${casalAd}`)
  await expect(main.getByRole('link', { name: /^WhatsApp/ })).toBeVisible()
  await expect(main.getByRole('link', { name: 'Enviar recado' })).toHaveCount(0)

  await api.liberar(dudaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await page.reload()
  await expect(main.getByRole('link', { name: 'Enviar recado' })).toBeVisible()
  await page.goto('/area-do-assinante/classisex')
  await expect(main.getByRole('article')).toHaveCount(3)
  await api.dispose()
  await context.close()
})

test('pagination keeps the filters', async ({ browser, baseURL, request }) => {
  test.setTimeout(150_000)
  const api = await staffApi(request)
  for (let i = 0; i < 20; i++) {
    await api.createAd({
      author: dudaId,
      euSou: solteiraCat,
      texto: `Solteira extra número ${i + 1}.`,
      cidade: 'Taguatinga',
      status: 'aprovado',
      publishedAt: new Date(Date.now() - (3 * DAY + i * 60_000)).toISOString(),
    })
  }
  await api.dispose()
  const { page, context } = await asSubscriber(browser, baseURL!, GIL)
  await page.goto(`/area-do-assinante/classisex?eu-sou=${solteiraCat}&cidade=taguatinga`)
  const main = page.locator('main')
  await expect(main.getByRole('article')).toHaveCount(20)
  const nav = main.getByRole('navigation', { name: 'Paginação' })
  await nav.getByRole('link', { name: 'Próximos' }).click()
  await expect(page).toHaveURL(/pagina=2/)
  const url = new URL(page.url())
  expect(url.searchParams.get('eu-sou')).toBe(String(solteiraCat))
  expect(url.searchParams.get('cidade')).toBe('taguatinga')
  await expect(main.getByRole('article')).toHaveCount(1)
  await expect(nav.getByRole('link', { name: 'Anteriores' })).toBeVisible()
  await context.close()
})
