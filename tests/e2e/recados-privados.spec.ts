import { expect, test, type APIResponse, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginPage, type Who } from './helpers/fase5'
import { headerMenu } from './helpers/menu'
import {
  ANA,
  APELIDOS,
  BETO,
  buildScenario,
  CAIO,
  FELIPE,
  GABI,
  inboxLinks,
  LEGADO_FONE,
  SENT,
  withTarget,
  type Scenario,
} from './helpers/recados-privados'
import { loginAsStaff } from './helpers/staff'

// Quick recados-privados (R-01..R-08): a member sees only the recados they sent or received, "Enviar
// recado" exists only between paying members, free accounts and non-paying advertisers can neither
// send nor receive (UI, typed URL and replayed server action), and no mural remains anywhere.
test.describe.configure({ mode: 'serial' })
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

const M = '/area-do-assinante/mensagens'
const GRATIS_NOTE = 'Este anúncio é de uma conta gratuita e não recebe recados. Use os contatos do anúncio.'
const BOTH = [{} as Record<string, string>, { RSC: '1' }]
let s: Scenario

test.beforeAll(async ({ request, browser, baseURL }) => {
  test.setTimeout(420_000)
  s = await buildScenario(request, browser, baseURL!)
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('message-reports')
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

const as = (browser: Browser, baseURL: string, who: Who, next?: string) => loginPage(browser, baseURL, who, next)

// The members navigation is the site header menu (quick menu-logado)
const subNav = (page: import('@playwright/test').Page) => headerMenu(page)

function expectNone(body: string, values: string[]) {
  for (const v of values) expect(body, `body leaks ${v}`).not.toContain(v)
}

/** Texts of Ana's inbox and thread: used as "nothing was created" controls. */
async function anaInbox(browser: Browser, baseURL: string): Promise<string> {
  const { context } = await as(browser, baseURL, ANA)
  const html = await (await context.request.get(M)).text()
  await context.close()
  return html
}

test('1. Ana and Beto see the conversation in Recados; there is no Recados menu item', async ({
  browser,
  baseURL,
}) => {
  const ana = await as(browser, baseURL!, ANA, '/area-do-assinante/classisex')
  const links = await (await subNav(ana.page)).locator(':scope > ul > li > a').allTextContents()
  expect(links.map((l) => l.trim().replace(/\s*\d+\+?$/, ''))).toEqual([
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
  // no Recados item in the menu (client request): the inbox is opened by its address
  await ana.page.goto(M)
  await expect(ana.page.getByRole('heading', { name: 'Recados', level: 1 })).toBeVisible()
  await expect(ana.page.getByText('Só você e a outra pessoa veem cada conversa.')).toBeVisible()
  const item = ana.page.getByRole('link', { name: new RegExp(APELIDOS.beto) })
  await expect(item).toContainText(SENT.replay)
  await item.click()
  await expect(ana.page.getByRole('list', { name: 'Recados' })).toContainText(SENT.conversa)
  await ana.context.close()

  const beto = await as(browser, baseURL!, BETO, M)
  await expect(beto.page.getByRole('heading', { name: 'Recados', level: 1 })).toBeVisible()
  await expect(beto.page.getByRole('link', { name: /AnaBSB/ })).toHaveCount(1)
  await beto.page.getByRole('link', { name: /AnaBSB/ }).click()
  await expect(beto.page.getByRole('list', { name: 'Recados' })).toContainText(SENT.resposta)
  await beto.context.close()
})

test('2. a third paying member (Caio) sees nothing: empty list, 404 for the thread (HTML and RSC), replayed reply creates nothing', async ({
  browser,
  baseURL,
}) => {
  const caio = await as(browser, baseURL!, CAIO)
  for (const headers of BOTH) {
    const res = await caio.context.request.get(`${M}/${s.conv}`, { headers })
    if (!headers.RSC) expect(res.status()).toBe(404)
    expectNone(await res.text(), [SENT.conversa, SENT.resposta, SENT.replay, APELIDOS.beto, APELIDOS.ana])
  }
  for (const headers of BOTH) {
    const body = await (await caio.context.request.get(M, { headers })).text()
    expectNone(body, [SENT.conversa, SENT.resposta, SENT.replay, APELIDOS.beto, APELIDOS.ana, 'AnaBSB', 'BetoBSB'])
    if (!headers.RSC) expect(inboxLinks(body)).toBe(0)
  }
  await caio.page.goto(M)
  await expect(caio.page.getByText('Nenhum recado ainda.')).toBeVisible()
  const before = (await (await (await as(browser, baseURL!, ANA)).context.request.get(`${M}/${s.conv}`)).text()).split(SENT.replay).length
  await caio.context.request.post(s.reply.url, { headers: s.reply.headers, data: s.reply.body })
  const ana = await as(browser, baseURL!, ANA)
  const html = await (await ana.context.request.get(`${M}/${s.conv}`)).text()
  expect(html.split(SENT.replay).length, 'replayed reply added a message').toBe(before)
  expect(html).toContain(SENT.replay) // control: the real message exists
  await ana.context.close()
  await caio.context.close()
})

test('3. button matrix on the ad page: only paying -> paying, never own, never a free advertiser', async ({ browser, baseURL }) => {
  const beto = await as(browser, baseURL!, BETO, `/area-do-assinante/classisex/${s.anaAd}`)
  const link = beto.page.getByRole('main').getByRole('link', { name: 'Enviar recado' })
  await expect(link).toHaveCount(1)
  await expect(link).toHaveAttribute('href', `${M}/nova?anuncio=${s.anaAd}`)
  await beto.page.goto(`/area-do-assinante/classisex/${s.gabiAd}`)
  await expect(beto.page.getByRole('heading', { level: 1 })).toContainText('GabiBSB')
  await expect(beto.page.getByRole('link', { name: 'Enviar recado' })).toHaveCount(0)
  await expect(beto.page.getByText(GRATIS_NOTE)).toBeVisible()
  await beto.context.close()

  const ana = await as(browser, baseURL!, ANA, `/area-do-assinante/classisex/${s.anaAd}`)
  await expect(ana.page.getByRole('heading', { level: 1 })).toContainText('AnaBSB')
  await expect(ana.page.getByRole('link', { name: 'Enviar recado' })).toHaveCount(0)
  await ana.context.close()

  const gabi = await as(browser, baseURL!, GABI, `/area-do-assinante/classisex/${s.anaAd}`)
  await expect(gabi.page.getByRole('heading', { name: 'Disponível para assinantes' })).toBeVisible()
  expect(await gabi.page.content()).not.toContain('sentinela-ana')
  await expect(gabi.page.getByRole('link', { name: 'Enviar recado' })).toHaveCount(0)
  await gabi.context.close()
})

test('4. free senders: the compose URL shows the Assine Já panel and no form; a replayed iniciarConversa creates nothing', async ({
  browser,
  baseURL,
}) => {
  const baseline = inboxLinks(await anaInbox(browser, baseURL!))
  expect(baseline).toBe(1)
  for (const who of [GABI, FELIPE]) {
    const free = await as(browser, baseURL!, who, `${M}/nova?anuncio=${s.anaAd}`)
    await expect(free.page.getByRole('heading', { name: 'Disponível para assinantes' })).toBeVisible()
    await expect(free.page.locator('textarea')).toHaveCount(0)
    await expect(free.page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)
    for (const headers of BOTH) expectNone(await (await free.context.request.get(M, { headers })).text(), [SENT.conversa])
    // the action is processed (control) and refuses with the inactive-sender message
    const replay = await free.context.request.post(s.start.url, { headers: s.start.headers, data: s.start.body })
    expect(await replay.text()).toContain('Sua assinatura não está ativa. Renove para mandar recados.')
    await free.context.close()
  }
  const after = await anaInbox(browser, baseURL!)
  expect(inboxLinks(after)).toBe(baseline)
})

test('5. a non-paying advertiser cannot receive: compose URL shows the note and no form; a replay with her ad id creates nothing', async ({
  browser,
  baseURL,
}) => {
  const beto = await as(browser, baseURL!, BETO, `${M}/nova?anuncio=${s.gabiAd}`)
  await expect(beto.page.getByText(GRATIS_NOTE)).toBeVisible()
  await expect(beto.page.locator('textarea')).toHaveCount(0)
  await expect(beto.page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)
  const res: APIResponse = await beto.context.request.post(s.start.url, {
    headers: s.start.headers,
    data: withTarget(s.start, s.gabiAd),
  })
  expect(await res.text()).toContain('Esta pessoa está sem assinatura ativa e não recebe recados agora.')
  const inbox = await (await beto.context.request.get(M)).text()
  expect(inboxLinks(inbox)).toBe(1) // still only the thread with Ana
  expectNone(inbox, ['GabiBSB'])
  await beto.context.close()
})

test('6. no mural anywhere: no legacy recado, no Mural, no /recados link; old URLs redirect', async ({ browser, baseURL, playwright }) => {
  const pages = ['/', '/classisex', '/assine-ja', '/area-do-assinante', M]
  const forbidden = [SENT.legado, SENT.legadoApelido, LEGADO_FONE, 'Mural']
  const noMuralLinks = (body: string, label: string) => {
    expect(body, `${label} links /recados`).not.toMatch(/href="\/recados[/"?#]/)
    expect(body, `${label} links the members mural`).not.toContain('/area-do-assinante/recados')
  }
  const anon = await playwright.request.newContext({ baseURL })
  const principals: { label: string; get: (path: string, headers: Record<string, string>) => Promise<string>; close: () => Promise<void> }[] = [
    {
      label: 'anonymous',
      get: async (path, headers) => (await anon.get(path, { headers })).text(),
      close: () => anon.dispose(),
    },
  ]
  const logged = [] as { dispose: () => Promise<void> }[]
  for (const [label, who] of [['Felipe', FELIPE], ['Caio', CAIO], ['Ana', ANA]] as const) {
    const ctx = await as(browser, baseURL!, who)
    principals.push({
      label,
      get: async (path, headers) => (await ctx.context.request.get(path, { headers })).text(),
      close: () => ctx.context.close(),
    })
    logged.push({ dispose: () => ctx.context.close() })
  }
  for (const p of principals) {
    for (const path of pages) {
      for (const headers of BOTH) {
        const body = await p.get(path, headers)
        expectNone(body, forbidden)
        noMuralLinks(body, `${p.label} ${path}`)
      }
    }
  }
  const old = await anon.get('/recados', { maxRedirects: 0 })
  expect(old.status()).toBe(308)
  expect(old.headers()['location']).toMatch(/\/assine-ja$/)
  const oldMembers = await anon.get('/area-do-assinante/recados', { maxRedirects: 0 })
  expect(oldMembers.status()).toBe(308)
  expect(oldMembers.headers()['location']).toMatch(/\/area-do-assinante\/mensagens$/)

  // an old ?recado= link only leads to the list and creates nothing
  const ana = await as(browser, baseURL!, ANA, `${M}/nova?recado=${s.legado}`)
  await expect(ana.page).toHaveURL(new RegExp(`${M}$`))
  expect(inboxLinks(await ana.page.content())).toBe(1)
  await ana.context.close()
  for (const p of principals) await p.close().catch(() => undefined)
})

test('7. REST: the legacy table is closed to members, the moderation endpoint is gone, conversations stay closed even to staff', async ({
  browser,
  baseURL,
  playwright,
  request,
}) => {
  const anon = await playwright.request.newContext({ baseURL })
  const ana = await as(browser, baseURL!, ANA)
  for (const ctx of [anon, ana.context.request]) {
    const list = await ctx.get('/api/recados?limit=50&depth=0')
    if (list.status() === 200) expect(((await list.json()) as { docs: unknown[] }).docs).toHaveLength(0)
    else expect([401, 403, 404]).toContain(list.status())
    expectNone(await list.text(), [SENT.legado, SENT.legadoApelido])
    const created = await ctx.post('/api/recados', { data: { apelido: 'x', texto: 'y' } })
    expect([401, 403, 404]).toContain(created.status())
  }
  await anon.dispose()
  await ana.context.close()

  const api = await staffApi(request)
  const staffList = await request.get('/api/recados?limit=50&depth=0')
  expect(staffList.status()).toBe(200)
  expect(((await staffList.json()) as { docs: unknown[] }).docs.length).toBeGreaterThan(0) // legacy data kept (R-06)
  const approve = await request.post(`/api/recados/${s.legado}/aprovar`, { data: {} })
  expect(approve.status()).toBe(404)
  for (const collection of ['conversations', 'messages']) {
    const res = await request.get(`/api/${collection}?limit=50&depth=0`)
    if (res.status() === 200) expect(((await res.json()) as { docs: unknown[] }).docs).toHaveLength(0)
    else expect([401, 403, 404]).toContain(res.status())
    expectNone(await res.text(), [SENT.conversa])
  }
  await api.dispose()
})

test('8. admin (desktop): no recados moderation line, no report line, no menu entry', async ({ page, isMobile }) => {
  test.skip(isMobile, 'admin flow runs on desktop only')
  test.setTimeout(120_000)
  await loginAsStaff(page)
  await page.goto('/admin')
  const body = page.locator('main, body').first()
  expect(await page.content()).not.toMatch(/Recados: \d+ denúncias? abertas?|Nenhuma denúncia de recado\./)
  expect(await page.content()).not.toMatch(/Recados: \d+ para aprovar|Nenhum recado para aprovar/)
  await expect(page.locator('a[href="/admin/collections/recados"]')).toHaveCount(0)
  await expect(page.locator('nav a[href="/admin/collections/message-reports"]')).toHaveCount(0)
})

test('9. the sitemap has no /recados', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  const xml = await (await anon.get('/sitemap.xml')).text()
  expect(xml).toContain('/classisex')
  expect(xml).not.toContain('/recados')
  await anon.dispose()
})
