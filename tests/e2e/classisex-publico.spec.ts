import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'

// PREV-01 / D-04 / D-07: anonymous visitors see contact-free previews with blurred photos only
// (T-04-01, T-04-11, T-04-14).
test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const NINA = { email: 'nina.conta@teste.local', name: 'Nina Sobrenome Secreto', password: 'senha-nina-12345' }
const OTTO = { email: 'otto.conta@teste.local', name: 'Otto Vencido Secreto', password: 'senha-otto-12345' }
const TEXTO_NINA = 'Casal liberal, chama no zap 61 99988-9772 ou nina@exemplo.com'
const TEXTO_OTTO = 'Texto do Otto que venceu ontem.'
const TEXTO_PENDENTE = 'Texto pendente secreto'
const SECRETS = [
  '99988',
  '-9772', // (a bare 4-digit string could match a build hash)
  'nina@exemplo.com',
  '5561977776666',
  'nina_bsb',
  'nina.contato@exemplo.com',
  NINA.name,
  NINA.email,
  OTTO.name,
  TEXTO_PENDENTE,
  TEXTO_OTTO,
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
      cidade: 'Brasília',
      texto: TEXTO_NINA,
      status: 'aprovado',
      contato: { whatsapp: '5561977776666', telegram: 'nina_bsb', email: 'nina.contato@exemplo.com' },
    })
  ).id
  photoIds = [(await api.uploadAdMedia(ninaAd, 'flyer-square.jpg', 0)).id, (await api.uploadAdMedia(ninaAd, 'flyer-portrait.jpg', 1)).id]
  videoId = (await api.uploadAdMedia(ninaAd, 'espaco.mp4', 2)).id
  filenames = (await api.findAdMedia(ninaAd)).flatMap((m) => [m.filename, m.sizes?.card?.filename, m.previa]).filter(Boolean) as string[]
  pendingAd = (await api.createAd({ author: ninaId, texto: TEXTO_PENDENTE })).id

  const ottoId = (await api.createAssinante(OTTO)).id
  await api.createSubscription({
    assinante: ottoId,
    startsAt: new Date(Date.now() - 31 * DAY).toISOString(),
    endsAt: new Date(Date.now() - DAY).toISOString(),
  })
  await api.createAd({ author: ottoId, texto: TEXTO_OTTO, status: 'aprovado' })
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

test('visitors see the redacted preview with blurred photos and a call to subscribe', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  const res = await page.goto('/classisex')
  expect(res?.status()).toBe(200)
  const main = page.locator('main')
  await expect(page.getByRole('heading', { name: 'ClassiSex', level: 1 })).toBeVisible()
  await expect(main).toContainText('Os contatos, as fotos e os vídeos completos ficam na área do assinante.')
  const cards = main.getByRole('article')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toContainText('Casal')
  await expect(cards.first()).toContainText('Brasília')
  await expect(cards.first()).toContainText('[contato só para assinantes]')
  await expect(cards.first()).toContainText('vídeo')
  await expect(cards.first().getByRole('link', { name: 'Assine para ver o contato' })).toHaveAttribute('href', '/assine-ja')
  await expect(main.getByRole('link', { name: 'Já é assinante? Ver anúncios completos' })).toHaveAttribute(
    'href',
    '/area-do-assinante/classisex',
  )

  const imgs = cards.first().locator('img')
  await expect(imgs).toHaveCount(2)
  const srcs = await imgs.evaluateAll((list) => list.map((i) => i.getAttribute('src')))
  expect(srcs).toEqual(photoIds.map((id) => `/classisex/previa/${id}`))
  await expect(imgs.first()).toHaveAttribute('alt', 'Foto desfocada do anúncio')

  const html = await page.content()
  const raw = await (await request.get('/classisex')).text() // includes the RSC payload
  for (const body of [html, raw]) {
    for (const secret of [...SECRETS, ...filenames]) expect(body, secret).not.toContain(secret)
  }
  await context.close()
})

test('the blurred photo route serves only previews of visible ads', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  const ok = await anon.get(`/classisex/previa/${photoIds[0]}`)
  expect(ok.status()).toBe(200)
  expect(ok.headers()['content-type']).toBe('image/webp')
  expect(ok.headers()['cache-control']).toContain('public')
  for (const id of [videoId, 99999999, 'abc']) {
    const res = await anon.get(`/classisex/previa/${id}`)
    expect(res.status(), String(id)).toBe(404)
    expect(res.headers()['cache-control']).toContain('no-store')
  }
  await anon.dispose()
})

test('filters by Eu sou and cidade', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/classisex')
  const main = page.locator('main')
  await main.getByLabel('Eu sou').selectOption({ label: 'Solteira' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page).toHaveURL(/\/classisex\?eu-sou=/)
  await expect(main).toContainText('Nenhum anúncio encontrado.')
  await main.getByLabel('Eu sou').selectOption({ label: 'Todos' })
  await main.getByLabel('Cidade').fill('brasilia')
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(main.getByRole('article')).toHaveCount(1)
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
  await expect(main.getByRole('article')).toHaveCount(2)
  await expect(main).toContainText(TEXTO_PENDENTE)

  await api.despublicar(ninaAd, 'Teste da prévia pública')
  await api.despublicar(pendingAd, 'Teste da prévia pública')
  await page.goto('/classisex')
  await expect(main.getByRole('article')).toHaveCount(0)
  await expect(main).toContainText('Ainda não há anúncios publicados.')
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
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
