import { expect, test, type Browser } from '@playwright/test'
import sharp from 'sharp'

import { staffApi } from './helpers/api'

// PREV-01 / D-04 / D-07 (revisão 2026-10-22): anonymous visitors read apelido, tipo, city and the whole
// text with every contact removed on the server, plus one sharp cover photo per ad; never the video, the
// original photos or any contact (WhatsApp/Telegram fields, phones, e-mails, links, @) (T-04-01, T-04-11, T-04-14).
test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const NINA = { email: 'nina.conta@teste.local', name: 'Nina Sobrenome Secreto', password: 'senha-nina-12345' }
const OTTO = { email: 'otto.conta@teste.local', name: 'Otto Vencido Secreto', password: 'senha-otto-12345' }
// Not 99988-9772 (the plan's example): that is the house's own WhatsApp, shown in the footer
const TEXTO_NINA =
  'Casal liberal, chama no zap 61 98877-6655 ou nina@exemplo.com. Insta @nina_texto ou https://wa.me/5561977776666 e www.nina-casal.com'
const TEXTO_NINA_VISIVEL = 'Casal liberal, chama no'
const TEXTO_OTTO = 'Texto do Otto que venceu ontem.'
const TEXTO_PENDENTE = 'Texto pendente secreto'
const APELIDO_NINA = 'Nina e Beto'
const APELIDO_PENDENTE = 'Pendente Fogo'
const APELIDO_OTTO = 'Otto Sem Assinatura'
const SECRETS = [
  '98877',
  '-6655', // (a bare 4-digit string could match a build hash)
  'nina@exemplo.com',
  '5561977776666',
  'nina_bsb',
  'nina.contato@exemplo.com',
  NINA.name,
  NINA.email,
  OTTO.name,
  TEXTO_PENDENTE,
  TEXTO_NINA,
  '@nina_texto',
  'nina-casal.com',
  '/area-do-assinante/midia/',
  '/api/ad-media',
]

let ninaAd = 0
let pendingAd = 0
let photoIds: number[] = []
let videoId = 0
let filenames: string[] = []

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  const ninaId = (await api.createAssinante(NINA)).id
  await api.liberar(ninaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  ninaAd = (
    await api.createAd({
      author: ninaId,
      apelido: APELIDO_NINA,
      cidade: 'Taguatinga',
      texto: TEXTO_NINA,
      status: 'aprovado',
      contato: { whatsapp: '5561977776666', telegram: 'nina_bsb' },
    })
  ).id
  photoIds = [(await api.uploadAdMedia(ninaAd, 'flyer-square.jpg', 0)).id, (await api.uploadAdMedia(ninaAd, 'flyer-portrait.jpg', 1)).id]
  videoId = (await api.uploadAdMedia(ninaAd, 'espaco.mp4', 2)).id
  filenames = (await api.findAdMedia(ninaAd)).flatMap((m) => [m.filename, m.sizes?.card?.filename, m.previa]).filter(Boolean) as string[]
  pendingAd = (await api.createAd({ author: ninaId, apelido: APELIDO_PENDENTE, texto: TEXTO_PENDENTE })).id

  const ottoId = (await api.createAssinante(OTTO)).id
  await api.createSubscription({
    assinante: ottoId,
    startsAt: new Date(Date.now() - 31 * DAY).toISOString(),
    endsAt: new Date(Date.now() - DAY).toISOString(),
  })
  await api.createAd({ author: ottoId, apelido: APELIDO_OTTO, texto: TEXTO_OTTO, status: 'aprovado' })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test('visitors read the whole text without contacts, with one sharp cover photo and a call to subscribe', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  const res = await page.goto('/classisex')
  expect(res?.status()).toBe(200)
  const main = page.locator('main')
  await expect(page.getByRole('heading', { name: 'ClassiSex', level: 1 })).toBeVisible()
  await expect(main).toContainText('Leia os recados na íntegra; os contatos')
  const all = main.getByRole('article')
  // G-05: Otto's subscription ended yesterday, his approved ad stays online (cover only, no photo here)
  await expect(all).toHaveCount(2)
  await expect(all.filter({ hasText: APELIDO_OTTO })).toHaveCount(1)
  await expect(all.filter({ hasText: APELIDO_OTTO })).toContainText(TEXTO_OTTO)
  const cards = all.filter({ hasText: APELIDO_NINA })
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText(APELIDO_NINA)
  await expect(cards.first()).toContainText('Casal')
  await expect(cards.first()).toContainText('Casal · Taguatinga')
  await expect(cards.first()).toContainText(TEXTO_NINA_VISIVEL)
  await expect(cards.first()).toContainText('[contato só para assinantes]')
  for (const secret of ['98877', 'nina@exemplo.com', '@nina_texto', 'wa.me', 'nina-casal']) {
    await expect(cards.first()).not.toContainText(secret)
  }
  // the call to subscribe now says "... e os vídeos"; no video itself (text or player) may be on the card
  await expect(cards.first()).not.toContainText(/vídeo(?!s)/i)
  await expect(cards.first().locator('video, source')).toHaveCount(0)
  await expect(cards.first().getByRole('link', { name: 'Assine para ver o contato, todas as fotos e os vídeos', exact: true })).toHaveAttribute('href', '/assine-ja')
  await expect(main.getByRole('link', { name: 'Já é assinante? Ver anúncios completos' })).toHaveAttribute(
    'href',
    '/area-do-assinante/classisex',
  )

  const imgs = cards.first().locator('img')
  await expect(imgs).toHaveCount(1)
  const srcs = await imgs.evaluateAll((list) => list.map((i) => i.getAttribute('src')))
  expect(srcs).toEqual([`/classisex/previa/${photoIds[0]}`])
  await expect(imgs.first()).toHaveAttribute('alt', 'Foto do anúncio')

  const html = await page.content()
  const raw = await (await request.get('/classisex')).text() // includes the RSC payload
  for (const body of [html, raw]) {
    for (const secret of [...SECRETS, ...filenames]) expect(body, secret).not.toContain(secret)
  }
  await context.close()
})

test('REST, HTML and RSC give visitors no contact, planted or structured', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  const planted = ['98877', '6655', 'nina@exemplo.com', '@nina_texto', '5561977776666', 'nina_bsb', 'nina.contato@exemplo.com', 'nina-casal.com']
  for (const path of ['/api/ads?depth=2&limit=100', '/api/ads?where[status][equals]=aprovado&depth=2', '/api/ad-media?limit=100', `/api/ads/${ninaAd}?depth=2`]) {
    const res = await anon.get(path)
    const body = await res.text()
    if (res.status() === 200) {
      const docs = (JSON.parse(body) as { docs?: unknown[] }).docs
      if (docs) expect(docs, path).toHaveLength(0)
    } else {
      expect([401, 403, 404], path).toContain(res.status())
    }
    for (const value of planted) expect(body, `${path} -> ${value}`).not.toContain(value)
  }
  for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
    for (const path of ['/classisex', '/classisex?pagina=1']) {
      const body = await (await anon.get(path, { headers })).text()
      expect(body, path).toContain(TEXTO_NINA_VISIVEL) // the redacted text is there...
      for (const value of planted) expect(body, `${path} -> ${value}`).not.toContain(value) // ...the contacts are not
    }
  }
  await anon.dispose()
})

test('the cover photo route serves only previews of visible ads', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  const ok = await anon.get(`/classisex/previa/${photoIds[0]}`)
  expect(ok.status()).toBe(200)
  expect(ok.headers()['content-type']).toBe('image/webp')
  expect(ok.headers()['cache-control']).toContain('public')
  expect(ok.headers()['x-robots-tag']).toContain('noindex')
  // client decision 2026-10-23: sharp card of the cover (480 px webp from the 1080 px source), not a blur
  const meta = await sharp(await ok.body()).metadata()
  expect(meta.format).toBe('webp')
  expect(meta.width).toBe(480)
  for (const id of [videoId, 99999999, 'abc']) {
    const res = await anon.get(`/classisex/previa/${id}`)
    expect(res.status(), String(id)).toBe(404)
    expect(res.headers()['cache-control']).toContain('no-store')
  }
  await anon.dispose()
})

test('filters by Eu sou only; the city is not a public filter', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/classisex')
  const main = page.locator('main')
  await main.getByLabel('Eu sou').selectOption({ label: 'Mulher' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page).toHaveURL(/\/classisex\?eu-sou=/)
  await expect(main).toContainText('Nenhum anúncio encontrado.')
  await main.getByLabel('Eu sou').selectOption({ label: 'Todos' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(main.getByLabel('Cidade')).toHaveCount(0)
  await expect(main.getByRole('article')).toHaveCount(2) // Nina + Otto (expired, G-05)
  await page.goto('/classisex?cidade=recife')
  await expect(main.getByRole('article')).toHaveCount(2)
  await main.getByRole('link', { name: 'Limpar filtros' }).click()
  await expect(page).toHaveURL(/\/classisex$/)
  await context.close()
})

test('approving shows the ad at once; unpublishing removes it and its previews', async ({ browser, baseURL, request, playwright }) => {
  const api = await staffApi(request)
  const { context, page } = await visitor(browser, baseURL!)
  const main = page.locator('main')
  await api.aprovar(pendingAd)
  await page.goto('/classisex')
  await expect(main.getByRole('article')).toHaveCount(3)
  await expect(main).toContainText(APELIDO_PENDENTE)
  await expect(main).toContainText(TEXTO_PENDENTE) // approved: the text is public (there is no contact in it)

  await api.despublicar(ninaAd, 'Teste da prévia pública')
  await api.despublicar(pendingAd, 'Teste da prévia pública')
  await page.goto('/classisex')
  // only Otto's ad (author without a subscription, still approved) is left
  await expect(main.getByRole('article')).toHaveCount(1)
  await expect(main).toContainText(APELIDO_OTTO)
  await expect(main.getByRole('link', { name: 'Assine Já' }).first()).toHaveAttribute('href', '/assine-ja')
  const anon = await playwright.request.newContext({ baseURL })
  expect((await anon.get(`/classisex/previa/${photoIds[0]}`)).status()).toBe(404)
  await anon.dispose()
  await api.dispose()
  await context.close()
})

test('menu and footer list ClassiSex; the sitemap lists /classisex', async ({ page, request, isMobile, baseURL }) => {
  await page.context().addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await page.goto('/')
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await expect(page.getByRole('navigation', { name: 'Menu' }).getByRole('link', { name: 'ClassiSex' })).toHaveAttribute(
      'href',
      '/classisex',
    )
  } else {
    await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'ClassiSex' })).toHaveAttribute(
      'href',
      '/classisex',
    )
  }
  await expect(page.locator('footer').getByRole('link', { name: 'ClassiSex' })).toHaveAttribute('href', '/classisex')
  expect(await (await request.get('/sitemap.xml')).text()).toContain('/classisex</loc>')
})
