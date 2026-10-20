import fs from 'fs'
import path from 'path'

import { expect, test, type Browser, type Page } from '@playwright/test'

import { buildMp4 } from '../helpers/mp4-fixtures'
import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// CLAS-03 / CLAS-01 / CLAS-02 / D-01 / D-03: owners manage photos and the video of their ads;
// members see them only through the protected route (T-04-04, T-04-07, T-04-09, T-04-15).
test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const PASSWORD = 'senha-midia-ad-12345'
const LIA = { email: 'lia@teste.local', name: 'Lia Anuncia', password: PASSWORD }
const NOA = { email: 'noa@teste.local', name: 'Noa Curiosa', password: PASSWORD }
const RUI = { email: 'rui@teste.local', name: 'Rui Vencido', password: PASSWORD }
const FIXTURES = path.resolve('tests/fixtures')

let liaAd = 0
let liaId = 0
let noaId = 0
let ruiAd = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  liaId = (await api.createAssinante(LIA)).id
  await api.liberar(liaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  liaAd = (await api.createAd({ author: liaId, texto: 'Lia procura casais simpáticos.', status: 'aprovado' })).id
  noaId = (await api.createAssinante(NOA)).id
  await api.liberar(noaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  const ruiId = (await api.createAssinante(RUI)).id
  await api.createSubscription({
    assinante: ruiId,
    startsAt: new Date(Date.now() - 31 * DAY).toISOString(),
    endsAt: new Date(Date.now() - DAY).toISOString(),
  })
  ruiAd = (await api.createAd({ author: ruiId, texto: 'Anúncio de quem venceu.' })).id
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

const editar = (id: number) => `/area-do-assinante/meus-anuncios/${id}/editar`
const midiaPost = (id: number) => `/area-do-assinante/meus-anuncios/${id}/midia`

async function enviar(page: Page, kind: 'foto' | 'video', file: string) {
  const form = page.getByRole('form', { name: kind === 'foto' ? 'Adicionar foto' : 'Adicionar vídeo' })
  await form.locator('input[type=file]').setInputFiles(file)
  await form.getByRole('button', { name: kind === 'foto' ? 'Enviar foto' : 'Enviar vídeo' }).click()
  await page.waitForURL(/[?&]midia=/)
}

/** Multipart POST from the page (same origin, cookie sent); follows redirects. */
const postFromPage = (page: Page, url: string) =>
  page.evaluate(async (u) => {
    const body = new FormData()
    body.append('tipo', 'foto')
    body.append('arquivo', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], 'x.jpg', { type: 'image/jpeg' }))
    const res = await fetch(u, { method: 'POST', body, credentials: 'include' })
    return { status: res.status, url: res.url }
  }, url)

test('the owner adds, orders and removes photos and the video', async ({ browser, baseURL, request }, testInfo) => {
  test.setTimeout(120_000)
  const { page, context } = await asSubscriber(browser, baseURL!, LIA)
  await page.goto(editar(liaAd))
  const main = page.locator('main')
  const section = main.getByRole('region', { name: 'Fotos e vídeo' })
  await expect(section.getByRole('heading', { name: 'Fotos e vídeo' })).toBeVisible()
  await expect(section).toContainText('Nenhuma foto ainda.')
  await expect(section).toContainText(
    'Fotos JPG, PNG ou WebP até 15 MB (até 5). Vídeo MP4 ou MOV até 100 MB e 60 segundos.',
  )
  const fotoForm = section.getByRole('form', { name: 'Adicionar foto' })
  await expect(fotoForm.locator('input[type=file]')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  await expect(fotoForm.getByRole('button', { name: 'Enviar foto' })).toBeVisible()
  const videoForm = section.getByRole('form', { name: 'Adicionar vídeo' })
  await expect(videoForm.locator('input[type=file]')).toHaveAttribute('accept', 'video/mp4,video/quicktime')
  await expect(videoForm.getByRole('button', { name: 'Enviar vídeo' })).toBeVisible()

  // Photo → back to moderation
  await enviar(page, 'foto', path.join(FIXTURES, 'flyer-square.jpg'))
  await expect(main.getByRole('alert')).toContainText('Foto enviada. O anúncio volta para análise da equipe.')
  const thumbs = section.getByRole('list', { name: 'Fotos do anúncio' }).locator('img')
  await expect(thumbs).toHaveCount(1)
  const src = await thumbs.first().getAttribute('src')
  expect(src).toMatch(/^\/area-do-assinante\/midia\/\d+\/miniatura$/)
  await expect
    .poll(() => thumbs.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true)
  await page.goto('/area-do-assinante/meus-anuncios')
  await expect(main.getByRole('article')).toContainText('Em análise pela equipe')
  await expect(main.getByRole('article')).toContainText('1 foto')

  // Video, then a second video
  await page.goto(editar(liaAd))
  await enviar(page, 'video', path.join(FIXTURES, 'espaco.mp4'))
  await expect(main.getByRole('alert')).toContainText('Vídeo enviado. O anúncio volta para análise da equipe.')
  await expect(section).toContainText(/Vídeo · \d+:\d\d/)
  await enviar(page, 'video', path.join(FIXTURES, 'espaco.mp4'))
  await expect(main.getByRole('alert')).toContainText('Cada anúncio pode ter 1 vídeo.')

  // Too long, not a photo
  const longo = testInfo.outputPath('longo.mp4')
  const falso = testInfo.outputPath('texto.jpg')
  fs.mkdirSync(path.dirname(longo), { recursive: true })
  fs.writeFileSync(longo, buildMp4({ durationSeconds: 61 }))
  fs.writeFileSync(falso, 'isto é só um texto, não uma foto')
  await enviar(page, 'video', longo)
  await expect(main.getByRole('alert')).toContainText('O vídeo pode ter até 60 segundos.')
  await enviar(page, 'foto', falso)
  await expect(main.getByRole('alert')).toContainText('Não conseguimos ler esta foto. Envie JPG, PNG ou WebP.')

  // Second photo becomes the cover, then the first is removed
  await enviar(page, 'foto', path.join(FIXTURES, 'flyer-portrait.jpg'))
  await expect(thumbs).toHaveCount(2)
  const api = await staffApi(request)
  const [first, second] = (await api.findAdMedia(liaAd)).filter((m) => m.kind === 'foto')
  const items = section.getByRole('list', { name: 'Fotos do anúncio' }).getByRole('listitem')
  await items.nth(1).getByRole('button', { name: 'Usar como capa' }).click()
  await page.waitForURL(/midia=capa/)
  await expect(items.first()).toContainText('Capa')
  expect((await api.findAdMedia(liaAd)).filter((m) => m.kind === 'foto').map((m) => m.id)).toEqual([second.id, first.id])
  await expect(thumbs.first()).toHaveAttribute('src', `/area-do-assinante/midia/${second.id}/miniatura`)

  await items.nth(1).getByRole('button', { name: 'Remover' }).click()
  await page.waitForURL(/midia=removida/)
  await expect(thumbs).toHaveCount(1)
  expect((await api.findAdMedia(liaAd)).map((m) => m.id)).not.toContain(first.id)
  expect((await api.getAd(liaAd)).status).toBe('pendente')
  await api.dispose()
  await context.close()
})

test('other subscribers, anonymous and cross-site posts cannot upload', async ({ browser, baseURL, request, playwright }) => {
  const api = await staffApi(request)
  const before = (await api.findAdMedia(liaAd)).length

  // Another subscriber: plain 404, nothing stored (T-04-04)
  const noa = await asSubscriber(browser, baseURL!, NOA)
  expect((await postFromPage(noa.page, midiaPost(liaAd))).status).toBe(404)
  await noa.context.close()

  // Anonymous: to /entrar, nothing stored
  const anon = await playwright.request.newContext({ baseURL })
  const res = await anon.post(midiaPost(liaAd), {
    multipart: { tipo: 'foto', arquivo: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync(path.join(FIXTURES, 'flyer-square.jpg')) } },
    maxRedirects: 0,
  })
  expect(res.status()).toBe(303)
  expect(res.headers()['location']).toContain('/entrar?next=')
  await anon.dispose()

  // Lia's cookie on a cross-site POST is rejected by the Origin guard (T-04-15)
  const lia = await asSubscriber(browser, baseURL!, LIA)
  const evil = await lia.context.request.post(midiaPost(liaAd), {
    headers: { Origin: 'https://evil.example' },
    multipart: { tipo: 'foto', arquivo: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: fs.readFileSync(path.join(FIXTURES, 'flyer-square.jpg')) } },
    maxRedirects: 0,
  })
  expect(evil.status()).toBe(403)
  await lia.context.close()

  // Expired owner: back to the edit page with the inactive code, nothing stored
  const rui = await asSubscriber(browser, baseURL!, RUI)
  const expired = await postFromPage(rui.page, midiaPost(ruiAd))
  expect(expired.url).toContain('midia=erro')
  expect(expired.url).toContain('codigo=inativo')
  await rui.context.close()

  expect((await api.findAdMedia(liaAd)).length).toBe(before)
  expect(await api.findAdMedia(ruiAd)).toHaveLength(0)
  await api.dispose()
})

test('members see the cover in the list, the gallery and the video in the full ad', async ({ browser, baseURL, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  const galeria = (await api.createAd({ author: liaId, texto: 'Lia com fotos e vídeo.', status: 'aprovado' })).id
  await api.uploadAdMedia(galeria, 'flyer-square.jpg', 0)
  await api.uploadAdMedia(galeria, 'flyer-portrait.jpg', 1)
  await api.uploadAdMedia(galeria, 'espaco.mp4', 2)
  await api.createAd({ author: noaId, texto: 'Noa ainda sem fotos.', status: 'aprovado' })
  const stored = await api.findAdMedia(galeria)
  const filenames = stored.flatMap((m) => [m.filename, m.sizes?.card?.filename, m.previa]).filter(Boolean) as string[]
  expect(filenames.length).toBeGreaterThan(3)
  await api.dispose()

  const { page, context } = await asSubscriber(browser, baseURL!, NOA)
  await page.goto('/area-do-assinante/classisex')
  const main = page.locator('main')
  const card = main.getByRole('article').filter({ hasText: 'Lia com fotos e vídeo.' })
  await expect(card.locator('img')).toHaveCount(1)
  expect(await card.locator('img').getAttribute('src')).toMatch(/^\/area-do-assinante\/midia\/\d+\/miniatura$/)
  await expect(card).toContainText('2 fotos')
  const semFoto = main.getByRole('article').filter({ hasText: 'Noa ainda sem fotos.' })
  await expect(semFoto).toContainText('Sem foto')
  await expect(semFoto.locator('img')).toHaveCount(0)

  await page.goto(`/area-do-assinante/classisex/${galeria}`)
  const fotos = main.getByRole('list', { name: 'Fotos do anúncio' }).locator('img')
  await expect(fotos).toHaveCount(2)
  for (const src of await fotos.evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')))) {
    expect(src).toMatch(/^\/area-do-assinante\/midia\/\d+\/(miniatura|foto)$/)
  }
  await expect
    .poll(() => fotos.first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true)
  await main.getByRole('list', { name: 'Fotos do anúncio' }).getByRole('button').first().click()
  const dialog = page.getByRole('dialog', { name: 'Fotos do anúncio' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('img')).toHaveAttribute('src', /\/area-do-assinante\/midia\/\d+\/foto$/)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const video = main.locator('video')
  await expect(video).toHaveCount(1)
  await expect(video).toHaveAttribute('src', /\/area-do-assinante\/midia\/\d+\/video$/)
  await expect(video).toHaveAttribute('controls', '')
  await expect(video).toHaveAttribute('preload', 'metadata')
  expect(await video.evaluate((v: HTMLVideoElement) => v.playsInline)).toBe(true)
  await expect(main).toContainText(/Vídeo · 0:\d\d/)
  const src = (await video.getAttribute('src'))!
  const ranged = await page.evaluate(async (u) => {
    const res = await fetch(u, { headers: { Range: 'bytes=0-1' }, cache: 'no-store' })
    return res.status
  }, src)
  expect(ranged).toBe(206)

  const html = await page.content()
  expect(html).not.toMatch(/\/_next\/image[^"']*midia/)
  expect(html).not.toContain('/api/ad-media')
  for (const name of filenames) expect(html).not.toContain(name)
  await context.close()

  // Expired viewer: no media URL at all
  const rui = await asSubscriber(browser, baseURL!, RUI)
  for (const path of ['/area-do-assinante/classisex', `/area-do-assinante/classisex/${galeria}`]) {
    await rui.page.goto(path)
    expect(await rui.page.content()).not.toContain('/area-do-assinante/midia/')
  }
  await rui.context.close()
})
