import fs from 'fs'
import path from 'path'

import { expect, test, type Browser, type Page } from '@playwright/test'

import { STAFF_EMAIL, STAFF_PASSWORD } from './helpers/staff'
import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// Client decision 2026-11-10: photos and videos sent by the public and approved by staff go on the site.
// Photos: a card next to the amateur models in Galeria → Amadoras (page /amadoras/{id}). Videos: /videos-amadores
// ("Vídeo amador"), where ONLY active subscribers can play (client correction 2026-11-11: no staff exception).
// The files stay in the private storage and are served only by two routes that re-check publication (and the
// viewer's right, for video) on every request. Contact, message and note never reach a page.
test.describe.configure({ mode: 'serial' })

const FIXTURES = path.resolve('tests/fixtures')
const RUN = Date.now().toString(36)
const APELIDO = `Casal Aprovado ${RUN}`
const CONTATO = `contato.secreto.${RUN}@teste.local`
const MENSAGEM = `mensagem-reservada-${RUN}`
const OBSERVACAO = `observacao-interna-${RUN}`
const PASSWORD = 'senha-amadores-123'
const ATIVO = { email: `amadores-ativo-${RUN}@teste.local`, name: 'Assinante Ativo', password: PASSWORD }
const GRATIS = { email: `amadores-gratis-${RUN}@teste.local`, name: 'Conta Gratuita', password: PASSWORD }

let envio = 0
let fotoId = 0
let videoId = 0
let fotoFilename = ''

const fotoUrl = (variante: 'foto' | 'miniatura') => `/amadores/foto/${fotoId}/${variante}`
const videoUrl = () => `/videos-amadores/${videoId}/video`

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('envios-midia')
  await api.deleteAll('assinantes')
  const ativo = await api.createAssinante(ATIVO)
  await api.liberar(ativo.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.createAssinante(GRATIS)

  const created = await request.post('/api/envios-midia', {
    headers: api.headers,
    data: { apelido: APELIDO, contato: CONTATO, mensagem: MENSAGEM, observacao: OBSERVACAO, status: 'novo' },
  })
  envio = ((await created.json()) as { doc: { id: number } }).doc.id
  for (const fixture of ['flyer-square.jpg', 'espaco.mp4']) {
    const res = await request.post('/api/envios-midia-arquivos', {
      headers: api.headers,
      multipart: {
        _payload: JSON.stringify({ envio }),
        file: {
          name: fixture,
          mimeType: fixture.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
          buffer: fs.readFileSync(path.join(FIXTURES, fixture)),
        },
      },
    })
    expect(res.ok(), await res.text()).toBe(true)
  }
  const files = (await api.get(`/api/envios-midia-arquivos?where[envio][equals]=${envio}&depth=0`)).docs as {
    id: number
    kind: string
    filename: string
  }[]
  const foto = files.find((f) => f.kind === 'foto')!
  fotoId = foto.id
  fotoFilename = foto.filename
  videoId = files.find((f) => f.kind === 'video')!.id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', { itensOcultos: [] })
  await api.deleteAll('envios-midia')
  await api.deleteAll('assinantes')
  await api.dispose()
})

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

async function setStatus(request: Parameters<typeof staffApi>[0], status: 'novo' | 'aprovado' | 'recusado') {
  const api = await staffApi(request)
  const res = await request.patch(`/api/envios-midia/${envio}`, { headers: api.headers, data: { status } })
  expect(res.ok(), await res.text()).toBe(true)
  await api.dispose()
}
async function setOculto(request: Parameters<typeof staffApi>[0], id: number, oculto: boolean) {
  const api = await staffApi(request)
  const res = await request.patch(`/api/envios-midia-arquivos/${id}`, { headers: api.headers, data: { oculto } })
  expect(res.ok(), await res.text()).toBe(true)
  await api.dispose()
}

async function asSubscriber(browser: Browser, baseURL: string, acc: { email: string; password: string }) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, acc.email, acc.password)
  return { page, context }
}

const cardDoVideo = (page: Page) => page.getByRole('button', { name: /^Assistir vídeo amador/ })
const cardDaAmadora = (page: Page) => page.getByRole('link', { name: `Ver fotos de ${APELIDO}` })
const NAO_DIZ = /frequentador/i

async function asStaff(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const login = await context.request.post('/api/users/login', { data: { email: STAFF_EMAIL, password: STAFF_PASSWORD } })
  expect(login.ok()).toBe(true)
  return context
}

test('new submission: nothing is on the site and every file route answers 404', async ({ page, request }) => {
  for (const url of [fotoUrl('foto'), fotoUrl('miniatura'), videoUrl()]) {
    const res = await request.get(url)
    expect(res.status(), url).toBe(404)
    expect(await res.text()).not.toContain(fotoFilename)
  }
  await page.goto('/modelos?tipo=amadoras')
  await expect(cardDaAmadora(page)).toHaveCount(0)
  expect((await request.get(`/amadoras/${envio}`)).status()).toBe(404)
  await page.goto('/videos-amadores')
  await expect(page.getByRole('heading', { name: 'Vídeos amadores', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ainda não há vídeos por aqui.' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Assistir vídeo/ })).toHaveCount(0)
})

test('the staff-only Payload file route stays closed to the public, approved or not', async ({ request }) => {
  await setStatus(request, 'aprovado')
  const res = await request.get(`/api/envios-midia-arquivos/file/${fotoFilename}`)
  expect([401, 403]).toContain(res.status())
  const list = await request.get('/api/envios-midia-arquivos')
  expect([401, 403]).toContain(list.status())
  const envios = await request.get('/api/envios-midia')
  expect([401, 403]).toContain(envios.status())
})

test('approved: the photo is open and shows in Galeria → Amadoras only; no secret reaches the pages', async ({ page, request }) => {
  await setStatus(request, 'aprovado')

  for (const variante of ['foto', 'miniatura'] as const) {
    const res = await request.get(fotoUrl(variante))
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toBe('image/webp')
    expect(res.headers()['x-robots-tag']).toContain('noindex')
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  }
  // a video id on the photo route, and a photo id on the video route, are not found
  expect((await request.get(`/amadores/foto/${videoId}/foto`)).status()).toBe(404)
  expect((await request.get(`/videos-amadores/${fotoId}/video`)).status()).toBe(404)
  expect((await request.get(`/amadores/foto/${fotoId}/original`)).status()).toBe(404)

  // a card in the SAME grid as the amateur models, with the first photo as cover; no separate section
  await page.goto('/modelos?tipo=amadoras')
  await expect(page.getByRole('heading', { name: NAO_DIZ })).toHaveCount(0)
  const card = cardDaAmadora(page)
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('href', `/amadoras/${envio}`)
  await expect(card.locator('img')).toHaveAttribute('src', new RegExp(`/amadores/foto/${fotoId}/miniatura`))
  await expect(card.locator('img')).toHaveAttribute('alt', `Foto de ${APELIDO}`)
  await expect(page.locator('#conteudo')).not.toContainText(NAO_DIZ)

  // the whole gallery lists it too (amadoras are part of it); Profissionais does not
  await page.goto('/modelos')
  await expect(cardDaAmadora(page)).toBeVisible()
  await page.goto('/modelos?tipo=profissionais')
  await expect(cardDaAmadora(page)).toHaveCount(0)

  for (const url of ['/modelos?tipo=amadoras', '/videos-amadores']) {
    const html = await (await request.get(url)).text()
    for (const secret of [CONTATO, MENSAGEM, OBSERVACAO, fotoFilename, 'espaco.mp4']) {
      expect(html, `${url}: ${secret}`).not.toContain(secret)
    }
  }
})

test('approved: the card opens /amadoras/{id} with the photos and a lightbox', async ({ page, request }) => {
  await page.goto('/modelos?tipo=amadoras')
  await cardDaAmadora(page).click()
  await expect(page).toHaveURL(new RegExp(`/amadoras/${envio}$`))
  await expect(page.getByRole('heading', { name: APELIDO, level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Amadoras', exact: true }).first()).toHaveAttribute('href', '/modelos?tipo=amadoras')
  const tile = page.getByRole('button', { name: `Foto de ${APELIDO}` })
  await expect(tile.locator('img')).toHaveAttribute('src', new RegExp(`/amadores/foto/${fotoId}/miniatura`))
  await tile.click()
  const dialog = page.getByRole('dialog', { name: `Fotos de ${APELIDO}` })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('img')).toHaveAttribute('src', fotoUrl('foto'))

  const html = await (await request.get(`/amadoras/${envio}`)).text()
  for (const secret of [CONTATO, MENSAGEM, OBSERVACAO, fotoFilename, 'espaco.mp4', 'frequentador']) {
    expect(html, secret).not.toContain(secret)
  }
  expect((await request.get('/amadoras/999999999')).status()).toBe(404)
  expect((await request.get('/amadoras/abc')).status()).toBe(404)
})

test('approved: the video is listed for everybody, but its bytes are refused to anyone who is not a subscriber', async ({
  page,
  request,
  browser,
  baseURL,
}) => {
  await page.goto('/videos-amadores')
  await expect(cardDoVideo(page)).toBeVisible()
  await expect(page.locator('#conteudo')).not.toContainText(NAO_DIZ)
  await expect(page.locator('#conteudo')).not.toContainText(APELIDO)
  // the visitor's page never carries the address of the video
  const html = await (await request.get('/videos-amadores')).text()
  expect(html).not.toContain(videoUrl())

  // visitor
  const visitor = await request.get(videoUrl())
  expect(visitor.status()).toBe(403)
  expect(await visitor.json()).toEqual({ error: 'Só assinantes podem assistir.' })
  const visitorRange = await request.get(videoUrl(), { headers: { Range: 'bytes=0-99' } })
  expect(visitorRange.status()).toBe(403)

  // staff signed in the panel is NOT a subscriber: no play for them either (client correction 2026-11-11)
  const staff = await asStaff(browser, baseURL!)
  expect((await staff.request.get(videoUrl())).status()).toBe(403)
  expect((await staff.request.get(videoUrl(), { headers: { Range: 'bytes=0-99' } })).status()).toBe(403)
  await staff.close()

  // free account (no active subscription)
  const free = await asSubscriber(browser, baseURL!, GRATIS)
  expect((await free.context.request.get(videoUrl())).status()).toBe(403)
  expect((await free.context.request.get(videoUrl(), { headers: { Range: 'bytes=0-99' } })).status()).toBe(403)
  await free.context.close()

  // active subscriber: full file and byte ranges, private cache
  const sub = await asSubscriber(browser, baseURL!, ATIVO)
  const full = await sub.context.request.get(videoUrl())
  expect(full.status()).toBe(200)
  expect(full.headers()['content-type']).toBe('video/mp4')
  expect(full.headers()['cache-control']).toContain('private')
  expect(full.headers()['vary']).toContain('Cookie')
  const ranged = await sub.context.request.get(videoUrl(), { headers: { Range: 'bytes=0-99' } })
  expect(ranged.status()).toBe(206)
  expect(ranged.headers()['content-range']).toMatch(/^bytes 0-99\//)
  await sub.context.close()
})

test('visitor clicking the video sees the invitation, not a player', async ({ page }) => {
  await page.goto('/videos-amadores')
  await cardDoVideo(page).click()
  const dialog = page.getByRole('dialog', { name: 'Só assinantes dão o play' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('video')).toHaveCount(0)
  await expect(page.locator('video')).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: 'Assine já' })).toHaveAttribute('href', '/assine-ja')
  await expect(dialog.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/entrar?next=%2Fvideos-amadores')
  // Esc closes it and focus goes back to the card
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(cardDoVideo(page)).toBeFocused()
})

test('staff-only session clicking the video is invited like a visitor (with "Entrar")', async ({ browser, baseURL }) => {
  const context = await asStaff(browser, baseURL!)
  const page = await context.newPage()
  await page.goto('/videos-amadores')
  await cardDoVideo(page).click()
  const dialog = page.getByRole('dialog', { name: 'Só assinantes dão o play' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('video')).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: 'Assine já' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Entrar' })).toBeVisible()
  await context.close()
})

test('free account clicking the video is invited to subscribe (no "Entrar")', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, GRATIS)
  await page.goto('/videos-amadores')
  await cardDoVideo(page).click()
  const dialog = page.getByRole('dialog', { name: 'Só assinantes dão o play' })
  await expect(dialog).toContainText('não tem assinatura ativa')
  await expect(dialog.locator('video')).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: 'Assine já' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Entrar' })).toHaveCount(0)
  await context.close()
})

test('the invitation "Entrar" brings a subscriber back to the video list', async ({ page }) => {
  await page.goto('/videos-amadores')
  await cardDoVideo(page).click()
  await page.getByRole('dialog').getByRole('link', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/entrar\?next=%2Fvideos-amadores$/)
  await page.getByLabel('E-mail').fill(ATIVO.email)
  await page.getByLabel('Senha', { exact: true }).fill(ATIVO.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/videos-amadores$/)
  await expect(cardDoVideo(page)).toBeVisible()
})

test('active subscriber gets the player, and it stops when the dialog closes', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, ATIVO)
  await page.goto('/videos-amadores')
  await cardDoVideo(page).click()
  const dialog = page.getByRole('dialog', { name: 'Vídeo amador' })
  const player = dialog.locator('video')
  await expect(player).toHaveAttribute('src', videoUrl())
  await expect.poll(() => player.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('video')).toHaveCount(0)
  await expect(cardDoVideo(page)).toBeFocused()
  await context.close()
})

test('"Não mostrar no site" hides only that file', async ({ page, request }) => {
  await setOculto(request, videoId, true)
  expect((await request.get(videoUrl())).status()).toBe(404)
  await page.goto('/videos-amadores')
  await expect(page.getByRole('button', { name: /Assistir vídeo/ })).toHaveCount(0)
  expect((await request.get(fotoUrl('foto'))).status()).toBe(200)
  await setOculto(request, videoId, false)
  expect((await request.get(videoUrl())).status()).toBe(403)

  await setOculto(request, fotoId, true)
  expect((await request.get(fotoUrl('foto'))).status()).toBe(404)
  expect((await request.get(fotoUrl('miniatura'))).status()).toBe(404)
  await page.goto('/modelos?tipo=amadoras')
  await expect(cardDaAmadora(page)).toHaveCount(0)
  expect((await request.get(`/amadoras/${envio}`)).status()).toBe(404)
  await setOculto(request, fotoId, false)
  await page.goto('/modelos?tipo=amadoras')
  await expect(cardDaAmadora(page)).toBeVisible()
  expect((await request.get(fotoUrl('foto'))).status()).toBe(200)
})

test('refusing the submission takes everything down at once', async ({ page, request, browser, baseURL }) => {
  await setStatus(request, 'recusado')
  for (const url of [fotoUrl('foto'), fotoUrl('miniatura'), videoUrl()]) {
    expect((await request.get(url)).status(), url).toBe(404)
  }
  // not even an active subscriber reaches the video of a refused submission
  const sub = await asSubscriber(browser, baseURL!, ATIVO)
  expect((await sub.context.request.get(videoUrl())).status()).toBe(404)
  await sub.context.close()
  await page.goto('/modelos?tipo=amadoras')
  await expect(cardDaAmadora(page)).toHaveCount(0)
  expect((await request.get(`/amadoras/${envio}`)).status()).toBe(404)
  await page.goto('/videos-amadores')
  await expect(page.getByRole('heading', { name: 'Ainda não há vídeos por aqui.' })).toBeVisible()

  // back to new and approved again: published again; deleting the submission removes it for good
  await setStatus(request, 'aprovado')
  expect((await request.get(fotoUrl('foto'))).status()).toBe(200)
  const api = await staffApi(request)
  await api.remove('envios-midia', envio)
  await api.dispose()
  expect((await request.get(fotoUrl('foto'))).status()).toBe(404)
  expect((await request.get(videoUrl())).status()).toBe(404)
  expect((await request.get(`/amadoras/${envio}`)).status()).toBe(404)
})

test('Vídeos amadores is no longer in the public Galeria menu (it is "Amadores" under the subscribers\' external link)', async ({ page, isMobile }) => {
  await page.goto('/')
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    const menu = page.getByRole('navigation', { name: 'Menu' })
    await expect(menu.getByRole('link', { name: 'Amadoras', exact: true })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Vídeos amadores' })).toHaveCount(0)
  } else {
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await nav.getByRole('link', { name: 'Galeria', exact: true }).hover()
    await expect(nav.getByRole('link', { name: 'Amadoras', exact: true })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Vídeos amadores' })).toHaveCount(0)
  }
})
