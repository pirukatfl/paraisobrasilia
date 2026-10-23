import fs from 'fs'
import path from 'path'

import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// Client decision 2026-10-23: anyone can post a ClassiSex ad without an account (same fields and rules as a
// paying author, but 1 photo and no video), always moderated; the open board shows the text without contacts
// and a SHARP cover; only an active subscriber sees the contact. One serial story.
test.describe.configure({ mode: 'serial' })

const FIXTURES = path.resolve('tests/fixtures')
const MAILS = path.resolve('test-results/emails')
const RUN = Date.now().toString(36)
const APELIDO = `Casal Visita ${RUN}`
const SENTINELA = `sentinela-${RUN}-lichia`
const TEXTO = `Casal ${SENTINELA} procura amizades. Chama no 61 99877-4455 se quiser.`
const WHATSAPP = '5561998774455'
const VISITOR_EMAIL = `Visita.${RUN}@Exemplo.com`
const PASSWORD = 'senha-sem-conta-12345'
const PAGO = { email: `pago.${RUN}@teste.local`, name: 'Paulo Pagante', password: PASSWORD }
const LIVRE = { email: `livre.${RUN}@teste.local`, name: 'Lia Livre', password: PASSWORD }
const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'

let adId = 0
let seq = 0
// every context gets its own forwarded IP so the in-memory limiter of a reused server never interferes
const ipFor = () => `10.${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 250)}.${(++seq % 250) + 1}`

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ipFor() } })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

async function fillForm(page: Page, opts: { apelido: string; texto: string; email: string; foto?: string }) {
  await page.getByLabel('Apelido', { exact: true }).fill(opts.apelido)
  await page.getByRole('radio', { name: 'Casal' }).check()
  await page.getByLabel('Texto do anúncio').fill(opts.texto)
  await page.getByLabel('WhatsApp', { exact: true }).fill(WHATSAPP)
  await page.getByLabel('Seu e-mail').fill(opts.email)
  await page.getByLabel(DECLARACAO).check()
  await page.getByRole('checkbox', { name: 'Tenho 18 anos ou mais', exact: true }).check()
  await page.getByLabel(/Li e aceito os/).check()
  if (opts.foto) await page.getByLabel('Foto (opcional)').setInputFiles(path.join(FIXTURES, opts.foto))
}

const multipart = (fields: Record<string, string>, files: { field: string; name: string; mimeType: string; buffer: Buffer }[]) => {
  // Playwright multipart accepts one value per key; repeated field names go through a hand-made body
  const boundary = `----sem-conta-${RUN}`
  const parts: Buffer[] = []
  for (const [k, v] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
  }
  for (const f of files) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.field}"; filename="${f.name}"\r\nContent-Type: ${f.mimeType}\r\n\r\n`))
    parts.push(f.buffer, Buffer.from('\r\n'))
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  return { data: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` }
}

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('recados')
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  const pago = await api.createAssinante(PAGO)
  await api.liberar(pago.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.createAssinante(LIVRE)
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

test('a visitor opens ClassiSex, clicks Anunciar, fills the form with one photo and lands on "Recebemos seu anúncio"; nothing is public yet', async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000)
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/classisex')
  await page.getByRole('link', { name: 'Anunciar', exact: true }).click()
  await expect(page).toHaveURL(/\/classisex\/anunciar$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Anunciar no ClassiSex' })).toBeVisible()
  await expect(page.getByText('Depois de enviar, não dá para editar nem apagar este anúncio.')).toBeVisible()
  // one photo only: the file input is not "multiple"
  await expect(page.getByLabel('Foto (opcional)')).not.toHaveAttribute('multiple', /.*/)
  await expect(page.locator('input[type="file"][name="video"]')).toHaveCount(0)

  await fillForm(page, { apelido: APELIDO, texto: TEXTO, email: VISITOR_EMAIL, foto: 'flyer-square.jpg' })
  await page.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page).toHaveURL(/\/classisex\/anunciar\/recebido$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Recebemos seu anúncio' })).toBeVisible()
  await expect(page.getByText('Ele aparece no ClassiSex depois da análise da equipe.')).toBeVisible()
  // the success page is not indexable
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

  await page.goto('/classisex')
  expect(await page.content()).not.toContain(SENTINELA)
  await context.close()
})

test('the server keeps what was typed when it refuses (missing e-mail) and creates nothing', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/classisex/anunciar')
  const apelido = `Casal Erro ${RUN}`
  await fillForm(page, { apelido, texto: `Casal ${SENTINELA}-erro procura amizades.`, email: 'isto-nao-e-email' })
  await page.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page.getByText('Informe um e-mail válido. Só a equipe vê.')).toBeVisible()
  await expect(page.getByLabel('Apelido', { exact: true })).toHaveValue(apelido)
  await expect(page.getByLabel('Texto do anúncio')).toHaveValue(/-erro procura/)
  await context.close()

  const api = await staffApi(request)
  const found = await api.get(`/api/ads?where[apelido][equals]=${encodeURIComponent(apelido)}&depth=0`)
  expect(found.docs).toHaveLength(0)
  await api.dispose()
})

test('the server refuses 2 photos or a video straight to the endpoint and creates nothing', async ({ playwright, baseURL, request }) => {
  const anon = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ipFor() } })
  const api = await staffApi(request)
  const cats = await api.findAdCategories()
  const jpg = fs.readFileSync(path.join(FIXTURES, 'flyer-square.jpg'))
  const base = {
    apelido: `Casal Midia ${RUN}`,
    euSou: String(cats[0].id),
    texto: `Casal ${SENTINELA}-midia procura amizades.`,
    whatsapp: WHATSAPP,
    consent: 'sim',
    email: `midia.${RUN}@exemplo.com`,
    maior18: 'sim',
    termos: 'sim',
  }
  const post = async (files: { field: string; name: string; mimeType: string; buffer: Buffer }[]) => {
    const body = multipart(base, files)
    return anon.post('/classisex/anunciar/enviar', {
      headers: { accept: 'application/json', 'content-type': body.contentType },
      data: body.data,
    })
  }
  const two = await post([
    { field: 'foto', name: 'a.jpg', mimeType: 'image/jpeg', buffer: jpg },
    { field: 'foto', name: 'b.jpg', mimeType: 'image/jpeg', buffer: jpg },
  ])
  expect(two.status()).toBe(400)
  expect(await two.json()).toMatchObject({ ok: false, errors: { foto: expect.stringContaining('1 foto, sem vídeo') } })

  const video = await post([{ field: 'video', name: 'v.mp4', mimeType: 'video/mp4', buffer: fs.readFileSync(path.join(FIXTURES, 'espaco.mp4')) }])
  expect(video.status()).toBe(400)
  expect(await video.json()).toMatchObject({ ok: false })
  const asFoto = await post([{ field: 'foto', name: 'v.mp4', mimeType: 'video/mp4', buffer: fs.readFileSync(path.join(FIXTURES, 'espaco.mp4')) }])
  expect(asFoto.status()).toBe(400)

  const none = await api.get(`/api/ads?where[apelido][equals]=${encodeURIComponent(base.apelido)}&depth=0`)
  expect(none.docs).toHaveLength(0)
  await api.dispose()
  await anon.dispose()
})

test('a filled honeypot gets the usual answer and creates nothing', async ({ playwright, baseURL, request }) => {
  const anon = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ipFor() } })
  const api = await staffApi(request)
  const cats = await api.findAdCategories()
  const apelido = `Casal Robo ${RUN}`
  const body = multipart(
    {
      apelido,
      euSou: String(cats[0].id),
      texto: 'Casal robô procura cliques.',
      whatsapp: WHATSAPP,
      consent: 'sim',
      email: `robo.${RUN}@exemplo.com`,
      maior18: 'sim',
      termos: 'sim',
      website: 'http://spam.example',
    },
    [],
  )
  const res = await anon.post('/classisex/anunciar/enviar', { headers: { accept: 'application/json', 'content-type': body.contentType }, data: body.data })
  expect(await res.json()).toEqual({ ok: true, redirect: '/classisex/anunciar/recebido' })
  expect((await api.get(`/api/ads?where[apelido][equals]=${encodeURIComponent(apelido)}&depth=0`)).docs).toHaveLength(0)
  await api.dispose()
  await anon.dispose()
})

test('staff find the ad as pending and "sem conta", with the e-mail; approving e-mails the visitor', async ({ request }) => {
  const api = await staffApi(request)
  const found = await api.get(
    `/api/ads?where[enviadoSemConta][equals]=true&where[apelido][equals]=${encodeURIComponent(APELIDO)}&depth=0`,
  )
  expect(found.docs).toHaveLength(1)
  const doc = found.docs[0] as { id: number; status: string; enviadoSemConta: boolean; emailVisitante: string }
  adId = doc.id
  expect(doc.status).toBe('pendente')
  expect(doc.enviadoSemConta).toBe(true)
  expect(doc.emailVisitante).toBe(VISITOR_EMAIL.toLowerCase())
  const media = await api.findAdMedia(adId)
  expect(media.map((m) => m.kind)).toEqual(['foto'])

  await api.aprovar(adId)
  const sent = await (async () => {
    for (let i = 0; i < 20; i++) {
      const files = fs.existsSync(MAILS) ? fs.readdirSync(MAILS) : []
      for (const f of files) {
        const mail = JSON.parse(fs.readFileSync(path.join(MAILS, f), 'utf8')) as { to?: unknown; subject?: string; text?: string }
        if (JSON.stringify(mail.to).toLowerCase().includes(VISITOR_EMAIL.toLowerCase())) return mail
      }
      await new Promise((r) => setTimeout(r, 500))
    }
    return null
  })()
  expect(sent, 'e-mail to the visitor').not.toBeNull()
  expect(sent!.subject).toContain('publicado')
  expect(sent!.text).toContain(APELIDO)
  expect(sent!.text).not.toContain(WHATSAPP)
  await api.dispose()
})

test('after approval the open board shows the redacted text and one sharp cover, no contact and no e-mail', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/classisex')
  const card = page.locator('main').getByRole('article').filter({ hasText: SENTINELA })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText(APELIDO)
  await expect(card).toContainText('[contato só para assinantes]')
  const imgs = card.locator('img')
  await expect(imgs).toHaveCount(1)
  await expect(imgs.first()).toHaveAttribute('alt', 'Foto do anúncio')
  const src = (await imgs.first().getAttribute('src'))!
  expect(src).toMatch(/^\/classisex\/previa\/\d+$/)
  const html = await page.content()
  for (const secret of ['99877-4455', WHATSAPP, VISITOR_EMAIL, VISITOR_EMAIL.toLowerCase(), 'invalid.paraiso.local']) {
    expect(html, secret).not.toContain(secret)
  }
  const res = await page.request.get(src)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('image/webp')
  expect(res.headers()['x-robots-tag']).toContain('noindex')
  await context.close()
})

test('an active subscriber sees the WhatsApp of the ad and no "Enviar recado"; a free account sees neither', async ({ browser, baseURL }) => {
  const pago = await visitor(browser, baseURL!)
  await loginAsAssinante(pago.page, PAGO.email, PAGO.password)
  await pago.page.goto(`/area-do-assinante/classisex/${adId}`)
  const main = pago.page.locator('main')
  await expect(main.getByRole('link', { name: /WhatsApp/ })).toBeVisible()
  await expect(main.getByRole('link', { name: 'Enviar recado' })).toHaveCount(0)
  await pago.context.close()

  const livre = await visitor(browser, baseURL!)
  await loginAsAssinante(livre.page, LIVRE.email, LIVRE.password)
  await livre.page.goto('/area-do-assinante/classisex')
  const html = await livre.page.content()
  expect(html).not.toContain(WHATSAPP)
  expect(html).not.toContain(VISITOR_EMAIL.toLowerCase())
  await livre.context.close()
})

test('a signed-in account that opens /classisex/anunciar goes to the members flow', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  await loginAsAssinante(page, LIVRE.email, LIVRE.password)
  await page.goto('/classisex/anunciar')
  await expect(page).toHaveURL(/\/area-do-assinante\/meus-anuncios\/novo$/)
  await context.close()
})
