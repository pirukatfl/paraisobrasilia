import path from 'path'

import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsStaff } from './helpers/staff'

// Client decision 2026-11-01: anyone can send photos and videos to the team, without an account. Nothing
// submitted is public: the files and the contact stay in staff-only collections and private storage.
test.describe.configure({ mode: 'serial' })

const FIXTURES = path.resolve('tests/fixtures')
const RUN = Date.now().toString(36)
const APELIDO = `Casal Envio ${RUN}`
// unique per run and project: the limiter keeps 5 submissions an hour per contact
const PHONE = `619${Math.floor(Math.random() * 90_000_000 + 10_000_000)}`
const PHONE_MASKED = `(${PHONE.slice(0, 2)}) ${PHONE.slice(2, 7)}-${PHONE.slice(7)}`

let seq = 0
// every context gets its own forwarded IP so the in-memory limiter of a reused server never interferes
const ipFor = () => `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${(++seq % 250) + 1}`

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ipFor() } })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

type Envio = { id: number; apelido: string; status: string; contato: string; consentAt?: string }

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('envios-midia')
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('envios-midia')
  await api.dispose()
})

async function fill(page: Page, over: { contato?: string } = {}) {
  await page.getByLabel(/^Apelido/).fill(APELIDO)
  await page.getByLabel(/^Seu e-mail ou WhatsApp/).fill(over.contato ?? `envio.${RUN}@teste.local`)
}

test('the page is open (robots like any open page) and in the sitemap', async ({ page, request, baseURL }) => {
  await page.context().addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await page.goto('/enviar-fotos-e-videos')
  await expect(page.getByRole('heading', { name: 'Enviar fotos e vídeos', level: 1 })).toBeVisible()
  // Staging is noindex for every page; on production this page carries no robots restriction like /contato
  const robots = await page.locator('meta[name="robots"]').getAttribute('content')
  await page.goto('/contato')
  expect(robots).toBe(await page.locator('meta[name="robots"]').getAttribute('content'))
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('/enviar-fotos-e-videos')
})

test('happy path: one photo, then the received page; staff see it, the public does not', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/enviar-fotos-e-videos')
  await fill(page)
  await page.getByLabel('Mensagem (opcional)').fill('Fotos da festa de sábado')
  await page.setInputFiles('input[name="arquivos"]', path.join(FIXTURES, 'flyer-square.jpg'))
  await expect(page.getByRole('list', { name: 'Fotos e vídeos' }).getByText(/flyer-square\.jpg/)).toBeVisible()
  await page.getByLabel(/^Tenho 18 anos ou mais/).check()
  await page.getByLabel(/^Autorizo o Paraíso Brasília a usar/).check()
  await page.getByRole('button', { name: 'Enviar para a equipe' }).click()
  await expect(page).toHaveURL(/\/enviar-fotos-e-videos\/recebido$/)
  await expect(page.getByRole('heading', { name: 'Recebemos seu envio', level: 1 })).toBeVisible()
  await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1) // the answer page is never indexed

  const api = await staffApi(request)
  const found = (await api.get(`/api/envios-midia?depth=1&where[apelido][equals]=${encodeURIComponent(APELIDO)}`)).docs as Envio[]
  expect(found).toHaveLength(1)
  expect(found[0]!.status).toBe('novo')
  expect(found[0]!.consentAt).toBeTruthy()
  const files = (await api.get(`/api/envios-midia-arquivos?where[envio][equals]=${found[0]!.id}`)).docs as { filename: string; kind: string }[]
  expect(files).toHaveLength(1)
  expect(files[0]!.kind).toBe('foto')

  // Nothing is public: the lists, the contact and the file itself answer an anonymous request with a refusal
  const anon = await browser.newContext({ baseURL })
  for (const url of [
    '/api/envios-midia',
    `/api/envios-midia/${found[0]!.id}`,
    '/api/envios-midia-arquivos',
    `/api/envios-midia-arquivos/file/${files[0]!.filename}`,
  ]) {
    const res = await anon.request.get(url)
    expect([401, 403, 404], url).toContain(res.status())
    expect(await res.text()).not.toContain(APELIDO)
  }
  await anon.close()
  await api.dispose()
  await context.close()
})

test('refuses without the image-use authorization and keeps what was typed', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/enviar-fotos-e-videos')
  await fill(page, { contato: `semauth.${RUN}@teste.local` })
  await page.setInputFiles('input[name="arquivos"]', path.join(FIXTURES, 'flyer-square.jpg'))
  await page.getByLabel(/^Tenho 18 anos ou mais/).check()
  await page.getByRole('button', { name: 'Enviar para a equipe' }).click()
  await expect(page.locator('#erro-autorizacao')).toContainText('autoriza o uso das imagens')
  await expect(page).toHaveURL(/\/enviar-fotos-e-videos$/)
  await expect(page.getByLabel(/^Apelido/)).toHaveValue(APELIDO)
  await expect(page.getByRole('list', { name: 'Fotos e vídeos' }).getByText(/flyer-square\.jpg/)).toBeVisible()

  const api = await staffApi(request)
  const found = (await api.get(`/api/envios-midia?where[contato][equals]=${encodeURIComponent(`semauth.${RUN}@teste.local`)}`)).docs as Envio[]
  expect(found).toHaveLength(0)
  await api.dispose()
  await context.close()
})

test('refuses with no file', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/enviar-fotos-e-videos')
  await fill(page)
  await page.getByLabel(/^Tenho 18 anos ou mais/).check()
  await page.getByLabel(/^Autorizo o Paraíso Brasília a usar/).check()
  await page.getByRole('button', { name: 'Enviar para a equipe' }).click()
  await expect(page.locator('#erro-arquivos')).toContainText('Escolha pelo menos uma foto')
  await context.close()
})

test('a photo and a video: the first goes with the text, the rest one by one', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/enviar-fotos-e-videos')
  await page.getByLabel(/^Apelido/).fill(`${APELIDO} 2`)
  await page.getByLabel(/^Seu e-mail ou WhatsApp/).fill(PHONE_MASKED)
  await page.setInputFiles('input[name="arquivos"]', [path.join(FIXTURES, 'flyer-square.jpg'), path.join(FIXTURES, 'espaco.mp4')])
  await expect(page.getByRole('list', { name: 'Fotos e vídeos' }).getByRole('listitem')).toHaveCount(2)
  // a document is refused on the spot
  await page.setInputFiles('input[name="arquivos"]', { name: 'nota.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') })
  await expect(page.getByRole('status').filter({ hasText: 'nota.pdf' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Fotos e vídeos' }).getByRole('listitem')).toHaveCount(2)
  await page.getByLabel(/^Tenho 18 anos ou mais/).check()
  await page.getByLabel(/^Autorizo o Paraíso Brasília a usar/).check()
  await page.getByRole('button', { name: 'Enviar para a equipe' }).click()
  await expect(page).toHaveURL(/\/enviar-fotos-e-videos\/recebido$/, { timeout: 60_000 })

  const api = await staffApi(request)
  const found = (await api.get(`/api/envios-midia?where[apelido][equals]=${encodeURIComponent(`${APELIDO} 2`)}`)).docs as Envio[]
  expect(found).toHaveLength(1)
  expect(found[0]!.contato).toBe(PHONE)
  const files = (await api.get(`/api/envios-midia-arquivos?where[envio][equals]=${found[0]!.id}`)).docs as { kind: string }[]
  expect(files.map((f) => f.kind).sort()).toEqual(['foto', 'video'])
  await api.dispose()
  await context.close()
})

test('staff open the submission in the panel and see the file with its preview', async ({ page, request }) => {
  test.setTimeout(90_000)
  const api = await staffApi(request)
  const found = (await api.get(`/api/envios-midia?where[apelido][equals]=${encodeURIComponent(`${APELIDO} 2`)}`)).docs as Envio[]
  await api.dispose()
  await loginAsStaff(page)
  await page.goto(`/admin/collections/envios-midia/${found[0]!.id}`)
  await expect(page.locator('#field-apelido')).toHaveValue(`${APELIDO} 2`)
  await expect(page.getByText('Autorização de uso de imagem registrada em')).toBeVisible()
  // the join list shows both files
  await expect(page.locator('.relationship-table tbody tr')).toHaveCount(2)
})
