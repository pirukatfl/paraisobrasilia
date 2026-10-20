import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// CLAS-06 / D-05: ClassiSex originals open only for staff, the owner and active subscribers of a
// visible ad; private headers; byte ranges for video (T-04-02, T-04-05, T-04-08).
test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const PASSWORD = 'senha-midia-12345'
const IVO = { email: 'ivo@teste.local', name: 'Ivo Anuncia', password: PASSWORD }
const JADE = { email: 'jade@teste.local', name: 'Jade Assinante', password: PASSWORD }
const KAI = { email: 'kai@teste.local', name: 'Kai Vencido', password: PASSWORD }

let ivoId = 0
let photoA = 0
let videoA = 0
let photoA2 = 0
let photoP = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  ivoId = (await api.createAssinante(IVO)).id
  await api.liberar(ivoId, { durationDays: 30, method: 'cortesia', amount: 0 })
  const adA = (await api.createAd({ author: ivoId, texto: 'Anúncio com mídia.', status: 'aprovado' })).id
  photoA = (await api.uploadAdMedia(adA, 'flyer-square.jpg')).id
  videoA = (await api.uploadAdMedia(adA, 'espaco.mp4')).id
  photoA2 = (await api.uploadAdMedia(adA, 'flyer-portrait.jpg')).id
  const adP = (await api.createAd({ author: ivoId, texto: 'Anúncio em análise com foto.' })).id
  photoP = (await api.uploadAdMedia(adP, 'flyer-portrait.jpg')).id
  const jadeId = (await api.createAssinante(JADE)).id
  await api.liberar(jadeId, { durationDays: 30, method: 'cortesia', amount: 0 })
  const kaiId = (await api.createAssinante(KAI)).id
  await api.createSubscription({
    assinante: kaiId,
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

const url = (id: number | string, variante: string) => `/area-do-assinante/midia/${id}/${variante}`

async function asSubscriber(browser: Browser, baseURL: string, acc: { email: string; password: string }) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, acc.email, acc.password)
  return { page, context }
}

type Fetched = { status: number; type: string; length: number; headers: Record<string, string> }

/**
 * Same-origin fetch from the page (the browser sends the cookie with Sec-Fetch-Site). `no-store`:
 * the full 200 is cacheable for the viewer (private, max-age=600), and Chromium would otherwise
 * answer later range requests from its own cache.
 */
const fetchIn = (page: Page, path: string, range?: string) =>
  page.evaluate(
    async ([p, r]) => {
      const res = await fetch(p as string, {
        credentials: 'include',
        cache: 'no-store',
        headers: r ? { Range: r as string } : undefined,
      })
      const buf = await res.arrayBuffer()
      const headers: Record<string, string> = {}
      res.headers.forEach((v, k) => (headers[k] = v))
      return { status: res.status, type: res.headers.get('content-type') ?? '', length: buf.byteLength, headers }
    },
    [path, range ?? null] as const,
  ) as Promise<Fetched>

test('anonymous visitors get 403 with private, noindex headers and no bytes', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  for (const [id, v] of [
    [photoA, 'foto'],
    [photoA, 'miniatura'],
    [videoA, 'video'],
  ] as const) {
    const res = await anon.get(url(id, v))
    expect(res.status()).toBe(403)
    expect(res.headers()['content-type'] ?? '').not.toMatch(/^(image|video)\//)
    expect(res.headers()['cache-control']).toContain('private')
    expect(res.headers()['x-robots-tag']).toContain('noindex')
  }
  await anon.dispose()
})

test('an active subscriber opens photos and streams the video with ranges', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, JADE)
  const foto = await fetchIn(page, url(photoA, 'foto'))
  expect(foto.status).toBe(200)
  expect(foto.type).toBe('image/webp')
  expect(foto.length).toBeGreaterThan(0)
  expect(foto.headers['cache-control']).toContain('private, max-age=600')
  expect(foto.headers['vary']).toMatch(/cookie/i)
  expect(foto.headers['x-content-type-options']).toBe('nosniff')
  expect(foto.headers['x-robots-tag']).toContain('noindex')

  const mini = await fetchIn(page, url(photoA, 'miniatura'))
  expect(mini.status).toBe(200)
  expect(mini.type).toBe('image/webp')
  expect(mini.length).toBeLessThan(foto.length + 1)

  const video = await fetchIn(page, url(videoA, 'video'))
  expect(video.status).toBe(200)
  expect(video.type).toBe('video/mp4')
  expect(video.headers['accept-ranges']).toBe('bytes')
  const part = await fetchIn(page, url(videoA, 'video'), 'bytes=0-99')
  expect(part.status).toBe(206)
  expect(part.length).toBe(100)
  expect(part.headers['content-range']).toBe(`bytes 0-99/${video.length}`)
  const invalid = await fetchIn(page, url(videoA, 'video'), `bytes=${video.length + 10}-`)
  expect(invalid.status).toBe(416)

  for (const [id, v] of [
    [photoP, 'foto'],
    [99999999, 'foto'],
    ['abc', 'foto'],
    [photoA, 'original'],
    [photoA, 'video'],
    [videoA, 'foto'],
  ] as const) {
    expect((await fetchIn(page, url(id, v))).status, `${id}/${v}`).toBe(404)
  }

  // Regression (login loop): the same cookie from a client without Origin/Sec-Fetch-Site is authenticated
  const res = await context.request.get(url(photoA, 'foto'))
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('image/webp')
  await context.close()
})

test('an expired subscriber gets 403', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, KAI)
  expect((await fetchIn(page, url(photoA, 'foto'))).status).toBe(403)
  await context.close()
})

test('the owner and staff open media of a pending ad', async ({ browser, baseURL, request }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, IVO)
  const own = await fetchIn(page, url(photoP, 'foto'))
  expect(own.status).toBe(200)
  expect(own.type).toBe('image/webp')
  await context.close()

  const api = await staffApi(request)
  const res = await request.get(url(photoP, 'foto'), { headers: api.headers })
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toBe('image/webp')
  await api.dispose()
})

test("ending the author's access leaves other subscribers only the cover photo (G-05)", async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.encerrar(ivoId, 'Teste de mídia')
  await api.dispose()
  const { page, context } = await asSubscriber(browser, baseURL!, JADE)
  // Cover stays; the video and the second photo are kept but answer 404 (no leak of their existence)
  expect((await fetchIn(page, url(photoA, 'foto'))).status).toBe(200)
  expect((await fetchIn(page, url(photoA, 'miniatura'))).status).toBe(200)
  for (const [id, v] of [
    [photoA2, 'foto'],
    [photoA2, 'miniatura'],
    [videoA, 'video'],
  ] as const) {
    expect((await fetchIn(page, url(id, v))).status, `${id}/${v}`).toBe(404)
  }
  expect((await fetchIn(page, url(videoA, 'video'), 'bytes=0-')).status).toBe(404)
  expect((await fetchIn(page, url(videoA, 'video'), 'bytes=0-99')).status).toBe(404)
  await context.close()

  // The author still sees everything; an expired viewer still gets nothing
  const owner = await asSubscriber(browser, baseURL!, IVO)
  expect((await fetchIn(owner.page, url(videoA, 'video'))).status).toBe(200)
  expect((await fetchIn(owner.page, url(photoA2, 'foto'))).status).toBe(200)
  await owner.context.close()
  const kai = await asSubscriber(browser, baseURL!, KAI)
  expect((await fetchIn(kai.page, url(photoA, 'foto'))).status).toBe(403)
  await kai.context.close()
})

test('renewing the author brings the video and the other photos back', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.liberar(ivoId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.dispose()
  const { page, context } = await asSubscriber(browser, baseURL!, JADE)
  expect((await fetchIn(page, url(videoA, 'video'))).status).toBe(200)
  expect((await fetchIn(page, url(photoA2, 'foto'))).status).toBe(200)
  await context.close()
})
