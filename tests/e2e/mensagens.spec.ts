import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { headerMenu } from './helpers/menu'

// REC-02 / D-02 / D-04: private messages between subscribers, started from an ad ("Enviar recado", R-01),
// with an unread counter in the members menu (T-05-05, T-05-06, T-05-10, T-05-18).
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-mensagens-12345'
const ANA = { email: 'ana.anuncia@teste.local', name: 'Ana Anuncia', password: PASSWORD }
const BETO = { email: 'beto.leitor@teste.local', name: 'Beto Leitor', password: PASSWORD }
const CAIO = { email: 'caio.terceiro@teste.local', name: 'Caio Terceiro', password: PASSWORD }
const EDU = { email: 'edu.vencido@teste.local', name: 'Edu Vencido', password: PASSWORD }
const RITA = { email: 'rita.recado.msg@teste.local', name: 'Rita Recado', password: PASSWORD }
const DAY = 86_400_000
const BASE = '/area-do-assinante/mensagens'
const ids: Record<string, number> = {}
let adId = 0
let ritaAdId = 0
let anaSecondAdId = 0
let conversaId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(150_000)
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  for (const [key, who] of Object.entries({ ana: ANA, beto: BETO, caio: CAIO, edu: EDU, rita: RITA })) {
    ids[key] = (await api.createAssinante(who)).id
  }
  for (const key of ['ana', 'beto', 'caio', 'rita']) {
    await api.liberar(ids[key]!, { durationDays: 30, method: 'cortesia', amount: 0 })
  }
  await api.createSubscription({
    assinante: ids.edu!,
    startsAt: new Date(Date.now() - 31 * DAY).toISOString(),
    endsAt: new Date(Date.now() - DAY).toISOString(),
  })
  adId = (await api.createAd({ author: ids.ana!, apelido: 'AnaBSB', status: 'aprovado' })).id
  ritaAdId = (await api.createAd({ author: ids.rita!, apelido: 'Rita e Beto', status: 'aprovado' })).id
  anaSecondAdId = (await api.createAd({ author: ids.ana!, apelido: 'AnaBSB Segundo', status: 'aprovado' })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function login(browser: Browser, baseURL: string, who: typeof ANA, next = BASE) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, who.email, who.password, next)
  return { context, page }
}


test('the header menu has no Recados item; own content has no Enviar recado', async ({ browser, baseURL }) => {
  const ana = await login(browser, baseURL!, ANA, `/area-do-assinante/classisex/${adId}`)
  const labels = await (await headerMenu(ana.page)).locator(':scope > ul > li > a').allTextContents()
  expect(labels.map((l) => l.trim())).toEqual([
    'Festas',
    'Quem somos',
    'Espaço',
    'Profissionais e amadoras',
    'ClassiSex',
    'Contos',
    'Dicas Hot',
    'Contato',
    'Meus anúncios',
    'Minha assinatura',
    'Trocar senha',
  ])
  await expect(ana.page.getByRole('heading', { name: /AnaBSB/, level: 1 })).toBeVisible()
  await expect(ana.page.getByRole('link', { name: 'Enviar recado' })).toHaveCount(0)
  await ana.page.goto(`${BASE}/nova?anuncio=${adId}`)
  await expect(ana.page.getByText('Este anúncio é seu.')).toBeVisible()
  await expect(ana.page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)
  await ana.context.close()
})

test('Beto writes to Ana from her ad; empty text keeps the apelido; the thread opens', async ({ browser, baseURL }) => {
  const beto = await login(browser, baseURL!, BETO, `/area-do-assinante/classisex/${adId}`)
  const { page } = beto
  await page.getByRole('link', { name: 'Enviar recado' }).click()
  await expect(page).toHaveURL(new RegExp(`/mensagens/nova\\?anuncio=${adId}$`))
  await expect(page.getByRole('heading', { name: 'Recado para AnaBSB', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Recado', { exact: true })).toHaveAttribute('maxlength', '2000')
  await page.getByLabel('Seu apelido').fill('BetoDF')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page.getByText('Escreva o recado.')).toBeVisible()
  await expect(page.getByLabel('Seu apelido')).toHaveValue('BetoDF')
  await page.getByLabel('Recado', { exact: true }).fill('Oi, vi seu anúncio')
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page).toHaveURL(new RegExp(`${BASE}/\\d+$`))
  conversaId = Number(page.url().split('/').pop())
  await expect(page.getByRole('heading', { name: 'Conversa com AnaBSB', level: 1 })).toBeVisible()
  await expect(page.getByText('Anúncio: AnaBSB · Casal')).toBeVisible()
  const mine = page.getByRole('list', { name: 'Recados' }).getByRole('listitem').filter({ hasText: 'Oi, vi seu anúncio' })
  await expect(mine).toContainText('Você')
  await beto.context.close()
})

test('Ana sees the new recado in her inbox, opens and replies; Beto reads the reply', async ({
  browser,
  baseURL,
}) => {
  // Recados is not in the header menu (quick menu-logado, client request): the inbox is opened by its address
  const ana = await login(browser, baseURL!, ANA, BASE)
  const item = ana.page.getByRole('link', { name: /BetoDF/ })
  await expect(item).toContainText('Oi, vi seu anúncio')
  await expect(item).toContainText('Nova')
  await item.click()
  await expect(ana.page.getByRole('heading', { name: 'Conversa com BetoDF', level: 1 })).toBeVisible()
  await ana.page.goto(`${BASE}/${conversaId}`)
  await ana.page.getByLabel('Recado', { exact: true }).fill('Oi Beto!')
  await ana.page.getByRole('button', { name: 'Enviar' }).click()
  await expect(ana.page.getByRole('list', { name: 'Recados' })).toContainText('Oi Beto!')
  await ana.context.close()

  const beto = await login(browser, baseURL!, BETO, `${BASE}/${conversaId}`)
  await expect(beto.page.getByRole('list', { name: 'Recados' })).toContainText('Oi Beto!')
  await beto.context.close()
})

test('an ad of another author starts another conversation; a second ad of the same author reuses the existing thread', async ({
  browser,
  baseURL,
}) => {
  const beto = await login(browser, baseURL!, BETO, `${BASE}/nova?anuncio=${ritaAdId}`)
  await expect(beto.page.getByRole('heading', { name: 'Recado para Rita e Beto', level: 1 })).toBeVisible()
  await expect(beto.page.getByLabel('Seu apelido')).toHaveCount(0) // saved on the account already
  await beto.page.getByLabel('Recado', { exact: true }).fill('Gostei do seu anúncio')
  await beto.page.getByRole('button', { name: 'Enviar' }).click()
  await expect(beto.page.getByRole('heading', { name: 'Conversa com Rita e Beto', level: 1 })).toBeVisible()
  await expect(beto.page.getByText(/^Anúncio: Rita e Beto/)).toBeVisible()
  await beto.page.goto(`${BASE}/nova?anuncio=${adId}`)
  await expect(beto.page).toHaveURL(new RegExp(`${BASE}/${conversaId}$`))
  // the same author from another of her ads: still the same thread
  await beto.page.goto(`${BASE}/nova?anuncio=${anaSecondAdId}`)
  await expect(beto.page).toHaveURL(new RegExp(`${BASE}/${conversaId}$`))
  await beto.page.goto(BASE)
  await expect(beto.page.getByRole('link', { name: /AnaBSB|Rita e Beto/ })).toHaveCount(2)
  // an old ?recado= link only leads to the list and creates nothing
  await beto.page.goto(`${BASE}/nova?recado=1`)
  await expect(beto.page).toHaveURL(new RegExp(`${BASE}$`))
  await expect(beto.page.getByRole('link', { name: /AnaBSB|Rita e Beto/ })).toHaveCount(2)
  await beto.context.close()
})

test('a third subscriber gets 404 and an empty inbox; the unread route is private', async ({ browser, baseURL }) => {
  const caio = await login(browser, baseURL!, CAIO, `${BASE}/${conversaId}`)
  await expect(caio.page.getByText('Oi Beto!')).toHaveCount(0)
  await expect(caio.page.getByText(/Oi, vi seu anúncio/)).toHaveCount(0)
  const res = await caio.page.request.get(`${BASE}/${conversaId}`)
  expect(res.status()).toBe(404)
  await caio.page.goto(BASE)
  await expect(caio.page.getByText('Nenhum recado ainda.')).toBeVisible()
  const own = await caio.page.request.get(`${BASE}/nao-lidas`)
  expect(own.status()).toBe(200)
  expect(await own.json()).toEqual({ count: 0 })
  expect(own.headers()['cache-control']).toContain('no-store')
  await caio.context.close()

  const anon = await browser.newContext({ baseURL })
  const anonRes = await anon.request.get(`${BASE}/nao-lidas`)
  expect(anonRes.status()).toBe(401)
  expect(anonRes.headers()['cache-control']).toContain('no-store')
  expect(await anonRes.json()).toEqual({ count: 0 })
  await anon.close()
})

test('staff sessions get 401 from the unread route', async ({ request }) => {
  const api = await staffApi(request) // logs in: the request context now carries the staff cookie
  const res = await request.get(`${BASE}/nao-lidas`)
  expect(res.status()).toBe(401)
  await api.dispose()
})

test('an expired subscriber sees only the inactive panel; anonymous goes to login', async ({ browser, baseURL }) => {
  const edu = await login(browser, baseURL!, EDU, '/area-do-assinante')
  for (const path of [BASE, `${BASE}/nova?anuncio=${adId}`, `${BASE}/${conversaId}`]) {
    await edu.page.goto(path)
    await expect(edu.page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)
    await expect(edu.page.locator('main')).not.toContainText('Oi, vi seu anúncio')
  }
  const res = await edu.page.request.get(`${BASE}/nao-lidas`)
  expect(await res.json()).toEqual({ count: 0 })
  await edu.context.close()

  const anon = await browser.newContext({ baseURL })
  await anon.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await anon.newPage()
  await page.goto(BASE)
  await expect(page).toHaveURL(/\/entrar\?next=%2Farea-do-assinante%2Fmensagens$/)
  await anon.close()
})

test('replying to someone whose access ended shows the inactive-recipient message', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.encerrar(ids.ana!, 'Fim do teste de mensagens')
  await api.dispose()
  const beto = await login(browser, baseURL!, BETO, `${BASE}/${conversaId}`)
  await beto.page.getByLabel('Recado', { exact: true }).fill('Ainda aí?')
  await beto.page.getByRole('button', { name: 'Enviar' }).click()
  await expect(
    beto.page.getByText('Esta pessoa está sem assinatura ativa e não recebe recados agora.'),
  ).toBeVisible()
  await beto.context.close()
})
