import path from 'path'

import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// Client decision 2026-10-24: anyone can send a conto (optional image) without an account; it is moderated
// (draft until staff publish), the list shows the image, visitors read only the open part, subscribers all.
test.describe.configure({ mode: 'serial' })

const FIXTURES = path.resolve('tests/fixtures')
const RUN = Date.now().toString(36)
const TITULO = `Noite de Verão ${RUN}`
const TITULO_SEM = `Sem Imagem ${RUN}`
const SENTINELA = `SENTINELA-FINAL-${RUN.toUpperCase()}`
const SUB = { email: `leitor.envio.${RUN}@teste.local`, name: 'Leitor Envio', password: 'senha-leitor-12345' }
const paragraph = (n: number, extra = '') =>
  `Parágrafo ${n === 1 ? 'primeiro' : n === 2 ? 'segundo' : n === 3 ? 'terceiro' : n === 4 ? 'quarto' : 'quinto'} do conto. ${'A noite seguiu animada, com música, risadas e muita conversa boa entre todos. '.repeat(2)}${extra}`
const TEXTO = [paragraph(1), paragraph(2), paragraph(3), paragraph(4, SENTINELA), paragraph(5)].join('\n\n')

let seq = 0
// every context gets its own forwarded IP so the in-memory limiter of a reused server never interferes
const ipFor = () => `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${(++seq % 250) + 1}`

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ipFor() } })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

type Staff = Awaited<ReturnType<typeof staffApi>>
type ContoDoc = { id: number; slug: string; title: string; _status: string; enviadoPorVisitante?: boolean; assinadoComo?: string; emailVisitante?: string; imagem?: { id: number; filename: string; pendente: boolean; sizes?: { card?: { filename?: string } } } | null }
const findByTitle = async (api: Staff, title: string) =>
  (((await api.get(`/api/contos?draft=true&depth=1&where[title][equals]=${encodeURIComponent(title)}`)).docs as ContoDoc[])[0])

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('contos')
  await api.deleteAll('assinantes')
  const sub = await api.createAssinante(SUB)
  await api.liberar(sub.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('contos')
  await api.deleteAll('assinantes')
  await api.dispose()
})

test('anyone reaches the form from /contos and sends a conto with an image', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/contos')
  await page.locator('main').getByRole('link', { name: 'Enviar um conto' }).click()
  await expect(page).toHaveURL(/\/contos\/enviar$/)
  await expect(page.getByRole('heading', { name: 'Enviar um conto', level: 1 })).toBeVisible()

  // Refused first: too short, no declaration (the typed title stays)
  await page.getByLabel('Título').fill(TITULO)
  await page.locator('#texto').fill('curto demais')
  await page.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page.getByText(/O conto precisa de pelo menos 300 caracteres/)).toBeVisible()
  await expect(page.getByText(/Confirme que você tem 18 anos/)).toBeVisible()
  await expect(page.getByText(/Aceite os Termos de Uso/)).toBeVisible()
  await expect(page.getByLabel('Título')).toHaveValue(TITULO)

  // Contacts in the text are refused
  await page.locator('#texto').fill(`${TEXTO}\n\nMe chama no zap 61 99877-4455`)
  await page.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page.getByText(/parece ter telefone, e-mail, @ ou link/)).toBeVisible()

  await page.locator('#texto').fill(TEXTO)
  await page.getByLabel('Assinado como').fill('Casal Verão')
  await page.getByLabel('Seu e-mail').fill(`autor.${RUN}@Exemplo.com`)
  await page.getByLabel('Escolher imagem').setInputFiles(path.join(FIXTURES, 'flyer-square.jpg'))
  await page.getByLabel(/Tenho 18 anos ou mais, o conto é de minha autoria/).check()
  await page.getByLabel(/Li e aceito os/).check()
  await page.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page).toHaveURL(/\/contos\/enviado$/)
  await expect(page.getByText('Recebemos seu conto. Ele aparece no site depois que a equipe aprovar.')).toBeVisible()
  await context.close()
})

test('a conto without image also goes through, and the no-JavaScript post answers 303', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  const res = await page.request.post('/contos/enviar/enviar', {
    maxRedirects: 0,
    multipart: { title: TITULO_SEM, texto: TEXTO, assinadoComo: '', email: '', consent: 'sim', termos: 'sim', website: '' },
  })
  expect(res.status()).toBe(303)
  expect(res.headers().location).toBe('/contos/enviado')
  // the honeypot gets the same answer and creates nothing
  const trap = await page.request.post('/contos/enviar/enviar', {
    maxRedirects: 0,
    multipart: { title: `Isca ${RUN}`, texto: TEXTO, consent: 'sim', termos: 'sim', website: 'http://spam.example' },
  })
  expect(trap.status()).toBe(303)
  const bad = await page.request.post('/contos/enviar/enviar', { maxRedirects: 0, multipart: { title: 'x', texto: 'y' } })
  expect(bad.status()).toBe(303)
  expect(bad.headers().location).toBe('/contos/enviar?erro=invalido')
  await context.close()
})

test('nothing shows publicly while pending: list, page, image and e-mail', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  const doc = (await findByTitle(api, TITULO))!
  expect(doc._status).toBe('draft')
  expect(doc.enviadoPorVisitante).toBe(true)
  expect(doc.assinadoComo).toBe('Casal Verão')
  expect(doc.emailVisitante).toBe(`autor.${RUN}@exemplo.com`)
  expect(doc.imagem?.pendente).toBe(true)
  expect(await findByTitle(api, `Isca ${RUN}`)).toBeUndefined()
  expect((await findByTitle(api, TITULO_SEM))!.imagem ?? null).toBeNull()

  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/contos')
  await expect(page.locator('main')).not.toContainText(TITULO)
  expect((await page.request.get(`/contos/${doc.slug}`)).status()).toBe(404)
  const file = doc.imagem!.filename
  const small = doc.imagem!.sizes!.card!.filename!
  for (const name of [file, small]) {
    expect([403, 404]).toContain((await page.request.get(`/api/media/file/${name}`)).status())
  }
  expect([403, 404]).toContain((await page.request.get(`/api/media/${doc.imagem!.id}`)).status())
  // other media (flyers) stay listed; the pending one is not
  const list = (await (await page.request.get('/api/media?limit=200&depth=0')).json()) as { docs: { id: number }[] }
  expect(list.docs.length).toBeGreaterThan(0)
  expect(list.docs.map((d) => d.id)).not.toContain(doc.imagem!.id)
  expect([401, 403]).toContain((await page.request.get(`/api/contos/${doc.id}?draft=true`)).status())
  await context.close()
  await api.dispose()
})

test('published: the list shows the image, visitors read only the open part, the image is public', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  const doc = (await findByTitle(api, TITULO))!
  await api.updateConto(doc.id, { _status: 'published' })

  const { context, page } = await visitor(browser, baseURL!)
  await expect(async () => {
    await page.goto('/contos')
    await expect(page.locator('main').getByRole('article').filter({ hasText: TITULO })).toHaveCount(1)
  }).toPass()
  const card = page.locator('main').getByRole('article').filter({ hasText: TITULO })
  await expect(card).toContainText('por Casal Verão')
  const img = card.locator('img')
  await expect(img).toHaveCount(1)
  await expect(img).toHaveAttribute('alt', `Imagem do conto ${TITULO}`)
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
  await expect(page.locator('main')).not.toContainText(TITULO_SEM)
  expect((await page.request.get(`/api/media/file/${doc.imagem!.filename}`)).status()).toBe(200)

  await page.goto(`/contos/${doc.slug}`)
  const main = page.locator('main')
  await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  await expect(main.locator('img')).toHaveCount(1)
  await expect(main).toContainText('por Casal Verão')
  await expect(main).toContainText('Parágrafo primeiro do conto')
  await expect(main).not.toContainText('Parágrafo quinto do conto')
  const html = await (await page.request.get(`/contos/${doc.slug}`)).text()
  const rsc = await (await page.request.get(`/contos/${doc.slug}`, { headers: { RSC: '1' } })).text()
  for (const body of [html, rsc, await (await page.request.get('/contos')).text()]) {
    expect(body).not.toContain(SENTINELA)
    expect(body).not.toContain('exemplo.com')
  }
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await context.close()
  await api.dispose()
})

test('an active subscriber reads the whole sent conto, with the image', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  const doc = (await findByTitle(api, TITULO))!
  await api.dispose()
  const { context, page } = await visitor(browser, baseURL!)
  await loginAsAssinante(page, SUB.email, SUB.password, `/area-do-assinante/contos/${doc.slug}`)
  const main = page.locator('main')
  await expect(main).toContainText(SENTINELA)
  await expect(main.locator('img')).toHaveCount(1)
  await page.goto('/area-do-assinante/contos')
  await expect(page.locator('main').getByRole('article').filter({ hasText: TITULO }).locator('img')).toHaveCount(1)
  await context.close()
})
