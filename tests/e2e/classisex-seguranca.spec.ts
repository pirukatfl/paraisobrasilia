import { expect, test, type APIResponse, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { buildClassisexScenario, EXPIRED, fetchAs, OWNER, TEXTS, VIEWER, type Fetched, type Scenario } from './helpers/classisex'

// Phase 4 leak / regression matrix (CLAS-06, PREV-01, T-04-01, T-04-02, T-04-03, T-04-07, T-04-08,
// T-04-24): every principal against every ClassiSex surface. Denials are paired with a staff
// control that proves the file exists, so a pass means "access denied", not "file missing".
test.describe.configure({ mode: 'serial' })
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

let s: Scenario

test.beforeAll(async ({ request }) => {
  test.setTimeout(240_000)
  s = await buildClassisexScenario(request)
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('assinantes')
  await api.dispose()
})

const mediaUrl = (id: number, variante: string) => `/area-do-assinante/midia/${id}/${variante}`
const isBinaryType = (type: string | undefined) => /^(image|video)\//.test(type ?? '')

/** Denied: 401/403/404, or 200 with no document, and no scenario contact in the body. */
async function expectNoData(res: APIResponse | Fetched) {
  const status = typeof res.status === 'function' ? res.status() : res.status
  const body = 'text' in res && typeof res.text === 'function' ? await res.text() : (res as Fetched).body
  if (status === 200) {
    const json = JSON.parse(body) as { docs?: unknown[] }
    expect(json.docs ?? []).toHaveLength(0)
  } else {
    expect([401, 403, 404]).toContain(status)
  }
  for (const value of s.contacts) expect(body).not.toContain(value)
}

async function asSubscriber(browser: Browser, baseURL: string, acc: { email: string; password: string }) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, acc.email, acc.password)
  return { page, context }
}

const allMedia = () => [s.media.foto.id, s.media.fotoPendente.id, s.media.video.id]
const VARIANTS = ['miniatura', 'foto', 'video']

test.describe('anonymous visitor: files and API', () => {
  test('protected media route answers 403/404 and no bytes', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    for (const id of allMedia()) {
      for (const variante of VARIANTS) {
        const res = await anon.get(mediaUrl(id, variante))
        expect([403, 404], `${id}/${variante}`).toContain(res.status())
        expect(isBinaryType(res.headers()['content-type'])).toBe(false)
      }
    }
    await anon.dispose()
  })

  test('Payload file route for ad-media is closed for every stored file', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    const names = [s.files.fotoFilename, s.files.cardFilename, s.files.previaFilename, s.files.videoFilename]
    for (const name of names) {
      const res = await anon.get(`/api/ad-media/file/${encodeURIComponent(name)}`)
      expect([401, 403, 404], name).toContain(res.status())
      expect(isBinaryType(res.headers()['content-type'])).toBe(false)
    }
    await anon.dispose()
  })

  test('public file routes do not serve private files through traversal', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    // (The bare file name is not tried: the fixture name also exists in the public media folder.)
    const target = s.files.fotoFilename
    const attempts = [
      encodeURIComponent(`../private-media/${target}`),
      `..%2Fprivate-media%2F${target}`,
      `private-media/${target}`,
      `%2e%2e%2fprivate-media%2f${target}`,
    ]
    for (const prefix of ['/api/media/file/', '/api/videos/file/']) {
      for (const attempt of attempts) {
        const res = await anon.get(`${prefix}${attempt}`)
        const ok = res.status() === 200 && isBinaryType(res.headers()['content-type'])
        expect(ok, `${prefix}${attempt}`).toBe(false)
      }
    }
    await anon.dispose()
  })

  test('the image optimizer does not fetch a private URL', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    for (const variante of ['foto', 'miniatura']) {
      const url = encodeURIComponent(mediaUrl(s.media.foto.id, variante))
      const res = await anon.get(`/_next/image?url=${url}&w=640&q=75`)
      expect(res.status() === 200 && isBinaryType(res.headers()['content-type'])).toBe(false)
    }
    const apiUrl = encodeURIComponent(`/api/ad-media/file/${s.files.fotoFilename}`)
    const viaApi = await anon.get(`/_next/image?url=${apiUrl}&w=640&q=75`)
    expect(viaApi.status() === 200 && isBinaryType(viaApi.headers()['content-type'])).toBe(false)
    await anon.dispose()
  })

  test('the blurred route only answers for photos of visible ads', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.get(`/classisex/previa/${s.media.video.id}`)).status()).toBe(404)
    expect((await anon.get(`/classisex/previa/${s.media.fotoPendente.id}`)).status()).toBe(404)
    expect((await anon.get(`/classisex/previa/${s.media.fotoExpired.id}`)).status()).toBe(404)
    expect((await anon.get(`/classisex/previa/${s.media.foto.id}`)).status()).toBe(200)
    await anon.dispose()
  })

  test('collections and staff endpoints give no data and refuse writes', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    for (const path of ['/api/ads', '/api/ad-media', '/api/ad-reports', `/api/ads/${s.ads.aprovado}`, `/api/ad-reports/${s.reportId}`]) {
      await expectNoData(await anon.get(path))
    }
    expect((await anon.post('/api/ads', { data: { texto: 'x' } })).status()).toBe(403)
    expect((await anon.post('/api/ad-reports', { data: { motivo: 'outro' } })).status()).toBe(403)
    const upload = await anon.post('/api/ad-media', {
      multipart: { _payload: JSON.stringify({ ad: s.ads.aprovado }), file: { name: 'x.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('x') } },
    })
    expect(upload.status()).toBe(403)
    for (const action of ['aprovar', 'recusar', 'despublicar']) {
      expect((await anon.post(`/api/ads/${s.ads.pendente}/${action}`, { data: { motivo: 'teste' } })).status()).toBe(403)
    }
    expect((await anon.get(`/api/ads/${s.ads.aprovado}/moderacao`)).status()).toBe(403)
    expect((await anon.post(`/api/ad-reports/${s.reportId}/resolver`, { data: { acao: 'descartar' } })).status()).toBe(403)
    const cats = await anon.get('/api/ad-categories')
    expect(cats.status()).toBe(200)
    const body = await cats.text()
    for (const value of s.contacts) expect(body).not.toContain(value)
    await anon.dispose()
  })
})

test.describe('expired subscriber', () => {
  test('gets no media, no data and cannot upload', async ({ browser, baseURL, request }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, EXPIRED)
    for (const id of allMedia()) {
      for (const variante of VARIANTS) {
        const res = await fetchAs(page, 'GET', mediaUrl(id, variante))
        expect([403, 404], `${id}/${variante}`).toContain(res.status)
        expect(isBinaryType(res.headers['content-type'])).toBe(false)
      }
    }
    for (const path of ['/api/ads', '/api/ad-media', '/api/ad-reports']) await expectNoData(await fetchAs(page, 'GET', path))
    expect((await fetchAs(page, 'POST', '/api/ad-reports', { json: { motivo: 'outro' } })).status).toBe(403)
    expect((await fetchAs(page, 'POST', `/api/ad-reports/${s.reportId}/resolver`, { json: { acao: 'descartar' } })).status).toBe(403)
    expect((await fetchAs(page, 'GET', `/api/ad-media/file/${encodeURIComponent(s.files.fotoFilename)}`)).status).toBe(403)

    const api = await staffApi(request)
    const before = (await api.findAdMedia(s.ads.expiredAuthor)).length
    const up = await fetchAs(page, 'POST', `/area-do-assinante/meus-anuncios/${s.ads.expiredAuthor}/midia`, {
      fields: { tipo: 'foto' },
      file: { field: 'arquivo', name: 'x.jpg', type: 'image/jpeg', text: 'nao-e-uma-imagem' },
    })
    expect(up.url).toContain('midia=erro')
    expect(up.url).toContain('inativo')
    expect((await api.findAdMedia(s.ads.expiredAuthor)).length).toBe(before)
    await api.dispose()
    await context.close()
  })

  test('page bodies hold no one else’s contacts or ad texts', async ({ browser, baseURL }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, EXPIRED)
    for (const path of [
      '/area-do-assinante/classisex',
      `/area-do-assinante/classisex/${s.ads.aprovado}`,
      '/area-do-assinante/meus-anuncios/novo',
    ]) {
      const res = await fetchAs(page, 'GET', path)
      for (const value of [...s.contacts.filter((c) => c !== EXPIRED.email && c !== EXPIRED.name), TEXTS.aprovado, '/area-do-assinante/midia/' + s.media.foto.id]) {
        expect(res.body, `${path} contains ${value}`).not.toContain(value)
      }
    }
    await context.close()
  })
})

test.describe('active subscriber who is not the owner', () => {
  test('sees only what a viewer may, cannot write, moderate or read reports', async ({ browser, baseURL, request }) => {
    test.setTimeout(180_000)
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER)
    expect((await fetchAs(page, 'GET', mediaUrl(s.media.fotoPendente.id, 'foto'))).status).toBe(404)
    const ok = await fetchAs(page, 'GET', mediaUrl(s.media.foto.id, 'foto'))
    expect(ok.status).toBe(200)
    expect(ok.headers['content-type']).toMatch(/^image\//)
    expect((await fetchAs(page, 'GET', mediaUrl(s.media.fotoExpired.id, 'foto'))).status).toBe(404)
    expect((await fetchAs(page, 'GET', `/api/ad-media/file/${encodeURIComponent(s.files.fotoFilename)}`)).status).toBe(403)
    const optimizer = await fetchAs(page, 'GET', `/_next/image?url=${encodeURIComponent(mediaUrl(s.media.foto.id, 'foto'))}&w=640&q=75`)
    expect(optimizer.status === 200 && isBinaryType(optimizer.headers['content-type'])).toBe(false)

    for (const path of ['/api/ads', '/api/ad-media', '/api/ad-reports', `/api/ad-reports/${s.reportId}`]) {
      await expectNoData(await fetchAs(page, 'GET', path))
    }
    expect((await fetchAs(page, 'POST', '/api/ads', { json: { texto: 'x' } })).status).toBe(403)
    expect((await fetchAs(page, 'POST', '/api/ad-reports', { json: { motivo: 'outro' } })).status).toBe(403)

    const api = await staffApi(request)
    const patch = await fetchAs(page, 'PATCH', `/api/ads/${s.ads.aprovado}`, { json: { status: 'recusado' } })
    expect(patch.status).toBe(403)
    expect((await api.getAd(s.ads.aprovado)).status).toBe('aprovado')
    for (const action of ['aprovar', 'recusar', 'despublicar']) {
      expect((await fetchAs(page, 'POST', `/api/ads/${s.ads.pendente}/${action}`, { json: { motivo: 'teste' } })).status).toBe(403)
    }
    expect((await api.getAd(s.ads.pendente)).status).toBe('pendente')
    expect((await fetchAs(page, 'POST', `/api/ad-reports/${s.reportId}/resolver`, { json: { acao: 'descartar' } })).status).toBe(403)
    expect((await api.findReports()).find((r) => r.id === s.reportId)?.status).toBe('aberta')

    const before = (await api.findAdMedia(s.ads.aprovado)).length
    const up = await fetchAs(page, 'POST', `/area-do-assinante/meus-anuncios/${s.ads.aprovado}/midia`, {
      fields: { tipo: 'foto' },
      file: { field: 'arquivo', name: 'x.jpg', type: 'image/jpeg', text: 'nao-e-uma-imagem' },
    })
    expect(up.status).toBe(404)
    expect((await api.findAdMedia(s.ads.aprovado)).length).toBe(before)
    await api.dispose()
    await context.close()
  })

  test('the same session cookie from a non-browser client gets nothing', async ({ browser, baseURL }) => {
    const { context } = await asSubscriber(browser, baseURL!, VIEWER)
    const res = await context.request.get(mediaUrl(s.media.foto.id, 'foto'), { headers: { 'Sec-Fetch-Site': '' } })
    expect([403, 404]).toContain(res.status())
    expect(isBinaryType(res.headers()['content-type'])).toBe(false)
    await context.close()
  })

  test('hidden ads and other people’s editors are 404 pages', async ({ browser, baseURL }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER)
    for (const id of [s.ads.pendente, s.ads.recusado, s.ads.despublicado, s.ads.expiredAuthor]) {
      const res = await page.goto(`/area-do-assinante/classisex/${id}`)
      expect(res?.status(), `ad ${id}`).toBe(404)
    }
    const editor = await page.goto(`/area-do-assinante/meus-anuncios/${s.ads.pendente}/editar`)
    expect(editor?.status()).toBe(404)
    await context.close()
  })
})

test.describe('owner and staff', () => {
  test('the owner opens their own pending photo, not another owner’s', async ({ browser, baseURL }) => {
    const { page, context } = await asSubscriber(browser, baseURL!, OWNER)
    const own = await fetchAs(page, 'GET', mediaUrl(s.media.fotoPendente.id, 'foto'))
    expect(own.status).toBe(200)
    expect(own.headers['content-type']).toMatch(/^image\//)
    expect((await fetchAs(page, 'GET', mediaUrl(s.media.fotoViewerPendente.id, 'foto'))).status).toBe(404)
    await context.close()
  })

  test('staff control: the files exist and staff can open them', async ({ playwright, baseURL, request }) => {
    const api = await staffApi(request)
    const staff = await playwright.request.newContext({ baseURL, extraHTTPHeaders: api.headers })
    const pending = await staff.get(mediaUrl(s.media.fotoPendente.id, 'foto'))
    expect(pending.status()).toBe(200)
    expect(pending.headers()['content-type']).toMatch(/^image\//)
    const file = await staff.get(`/api/ad-media/file/${encodeURIComponent(s.files.fotoFilename)}`)
    expect(file.status()).toBe(200)
    expect(isBinaryType(file.headers()['content-type'])).toBe(true)
    await staff.dispose()
    await api.dispose()
  })
})


test.describe('pages and RSC payload', () => {
  test('/classisex shows no contact, author, hidden ad text or private URL to visitors', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    const hiddenTexts = [TEXTS.pendente, TEXTS.recusado, TEXTS.despublicado, TEXTS.expiredAuthor, TEXTS.viewerPendente]
    for (const path of ['/classisex', '/classisex?eu-sou=1&cidade=Bras%C3%ADlia&pagina=2', '/classisex?pagina=1']) {
      for (const headers of [undefined, { RSC: '1' }]) {
        const res = await anon.get(path, { headers })
        expect(res.status()).toBe(200)
        const body = await res.text()
        for (const value of [...s.contacts, ...hiddenTexts, '/area-do-assinante/midia/', '/api/ad-media']) {
          expect(body, `${path} contains ${value}`).not.toContain(value)
        }
      }
    }
    // control: the visible ad does appear, redacted
    const home = await (await anon.get('/classisex')).text()
    expect(home).toContain('zebra-azul')
    expect(home).toContain('[contato só para assinantes]')
    await anon.dispose()
  })

  test('anonymous visitors are sent to the login for the members pages', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    for (const path of ['/area-do-assinante/classisex', '/area-do-assinante/meus-anuncios', `/area-do-assinante/classisex/${s.ads.aprovado}`]) {
      const res = await anon.get(path)
      expect(res.url(), path).toContain('/entrar?next=')
      const body = await res.text()
      for (const value of [...s.contacts, TEXTS.aprovado]) expect(body).not.toContain(value)
    }
    await anon.dispose()
  })

  test('headers: private media, members pages, public preview, robots and sitemap', async ({ browser, baseURL, playwright }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER)
    for (const [id, variante] of [
      [s.media.foto.id, 'foto'],
      [s.media.foto.id, 'miniatura'],
      [s.media.video.id, 'video'],
    ] as const) {
      const res = await fetchAs(page, 'GET', mediaUrl(id, variante))
      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toContain('private')
      expect(res.headers['cache-control']).not.toContain('public')
      expect(res.headers['vary']).toContain('Cookie')
      expect(res.headers['x-robots-tag']).toContain('noindex')
      expect(res.headers['x-content-type-options']).toBe('nosniff')
    }
    for (const path of ['/area-do-assinante/classisex', `/area-do-assinante/classisex/${s.ads.aprovado}`]) {
      const res = await fetchAs(page, 'GET', path)
      expect(res.status).toBe(200)
      expect(res.headers['cache-control']).toContain('no-store')
      expect(res.headers['x-robots-tag']).toContain('noindex')
    }
    await context.close()

    const anon = await playwright.request.newContext({ baseURL })
    const previa = await anon.get(`/classisex/previa/${s.media.foto.id}`)
    expect(previa.status()).toBe(200)
    expect(previa.headers()['cache-control']).toContain('public')
    expect(previa.headers()['content-type']).toMatch(/^image\//)

    const robots = await (await anon.get('/robots.txt')).text()
    if (/^Allow: \//m.test(robots)) expect(robots).toContain('Disallow: /area-do-assinante')
    else expect(robots).toMatch(/Disallow: \/\s*$/m) // staging/development: everything blocked
    const sitemap = await (await anon.get('/sitemap.xml')).text()
    expect(sitemap).toContain('/classisex')
    expect(sitemap).not.toContain('/area-do-assinante')
    await anon.dispose()
  })

  test('an ad disappears from the open preview as soon as its author’s access ends', async ({ playwright, baseURL, request }) => {
    test.setTimeout(150_000)
    const api = await staffApi(request)
    const zeca = await api.createAssinante({ email: 'zeca.some@teste.local', password: 'senha-zeca-12345', name: 'Zeca Some' })
    await api.liberar(zeca.id, { durationDays: 30, method: 'cortesia', amount: 0 })
    const ad = await api.createAd({ author: zeca.id, texto: 'Texto temporario raposa-dourada some logo.', status: 'aprovado' })
    const photo = await api.uploadAdMedia(ad.id, 'flyer-square.jpg')
    const anon = await playwright.request.newContext({ baseURL })
    expect(await (await anon.get('/classisex')).text()).toContain('raposa-dourada')
    expect((await anon.get(`/classisex/previa/${photo.id}`)).status()).toBe(200)

    await api.encerrar(zeca.id, 'teste de vencimento')
    expect(await (await anon.get('/classisex')).text()).not.toContain('raposa-dourada')
    expect((await anon.get(`/classisex/previa/${photo.id}`)).status()).toBe(404)
    await anon.dispose()
    await api.dispose()
  })
})
