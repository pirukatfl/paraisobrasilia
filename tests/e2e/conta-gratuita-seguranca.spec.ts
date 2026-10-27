import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { captureReply } from './helpers/fase5'
import { fetchAs } from './helpers/classisex'
import {
  ALL_PLANTED,
  buildTierScenario,
  CONTACTS,
  extraSecrets,
  EXPIRADO,
  GRATIS,
  LIVRE,
  mediaIdsIn,
  NAOCONF,
  PAGO,
  TEXTS,
  VIEWER,
  type TierScenario,
} from './helpers/conta-gratuita'

// Conta gratuita leak matrix (G-02..G-05, T-CG-*): free viewers read the open board (text with the
// contacts removed, sharp covers) and nothing else of others, a free (or
// expired) author exposes only the cover and no video, unconfirmed accounts cannot log in, and
// replayed requests create nothing. Denials are paired with controls that prove the data exists.
test.describe.configure({ mode: 'serial' })
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

let s: TierScenario

test.beforeAll(async ({ request }) => {
  test.setTimeout(300_000)
  s = await buildTierScenario(request)
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  await api.dispose()
})

const mediaUrl = (id: number, variante: string) => `/area-do-assinante/midia/${id}/${variante}`
const isBinaryType = (type: string | undefined) => /^(image|video)\//.test(type ?? '')
const M = '/area-do-assinante/mensagens'

async function asSubscriber(browser: Browser, baseURL: string, who: { email: string; password: string }, next?: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, who.email, who.password, next)
  return { page, context }
}

/** Everything of other people's that must never reach a free viewer. */
const othersSentinels = () => [
  ...Object.values(TEXTS).filter((t) => t !== TEXTS.livre),
  'sentinela-abacate',
  'sentinela-jabuticaba',
  'sentinela-pitanga',
  ...Object.values(CONTACTS).flatMap((c) => [c.whatsapp, c.telegram, ...extraSecrets(c)]),
  'Casal Abacate',
  'Casal Jabuticaba',
  'Casal Pitanga',
  PAGO.email,
  GRATIS.email,
  EXPIRADO.email,
  VIEWER.email,
  PAGO.name,
  GRATIS.name,
  EXPIRADO.name,
]

/** What the open board shows by design (revisão 2026-10-22): the redacted text, apelido and tipo of approved ads. */
const openBoardVisible = () => [TEXTS.pago, TEXTS.gratis, TEXTS.expirado, 'Casal Abacate', 'Casal Jabuticaba', 'Casal Pitanga']

/** Everything of other people's that must still never reach a free viewer (contacts, accounts, planted values). */
const hiddenFromFree = () => {
  const open = new Set([...openBoardVisible(), 'sentinela-abacate', 'sentinela-jabuticaba', 'sentinela-pitanga', TEXTS.pago2, TEXTS.viewer])
  return [...othersSentinels().filter((v) => !open.has(v)), ...ALL_PLANTED]
}

const allOthersMedia = () => [...s.media.pago, ...s.media.pago2, ...s.media.gratis, ...s.media.expirado, ...s.media.viewer]

test.describe('free viewer (never paid)', () => {
  test('pages hold no contact, account or original media of others; the open board shows the redacted texts', async ({ browser, baseURL }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, LIVRE)
    const paths = [
      '/area-do-assinante',
      '/area-do-assinante/classisex',
      '/area-do-assinante/meus-anuncios',
      '/area-do-assinante/meus-anuncios/novo',
      `/area-do-assinante/classisex/${s.ads.pago}`,
      `/area-do-assinante/classisex/${s.ads.gratis}`,
      `/area-do-assinante/classisex/${s.ads.expirado}`,
      '/area-do-assinante/recados',
      M,
    ]
    for (const path of paths) {
      const res = await fetchAs(page, 'GET', path)
      for (const value of hiddenFromFree()) expect(res.body, `${path} contains ${value}`).not.toContain(value)
      for (const m of allOthersMedia()) expect(mediaIdsIn(res.body), `${path} points at media ${m.id}`).not.toContain(m.id)
    }
    // control: the board shows the approved ads' texts (contacts removed), apelido and the sharp covers
    const board = await fetchAs(page, 'GET', '/area-do-assinante/classisex')
    for (const visible of openBoardVisible()) expect(board.body, visible).toContain(visible)
    expect(board.body).toContain('[contato só para assinantes]')
    expect(board.body).toContain('Assine para ver o contato, todas as fotos e os vídeos')
    expect(board.body).toMatch(/\/classisex\/previa\/\d+/)
    // her own pending ad is on her own page
    const own = await fetchAs(page, 'GET', '/area-do-assinante/meus-anuncios')
    expect(own.body).toContain('Casal Goiaba')
    await context.close()
  })

  test('RSC payloads carry no sentinels either', async ({ browser, baseURL }) => {
    test.setTimeout(150_000)
    const { context } = await asSubscriber(browser, baseURL!, LIVRE)
    for (const path of ['/area-do-assinante', '/area-do-assinante/classisex', `/area-do-assinante/classisex/${s.ads.gratis}`, '/area-do-assinante/meus-anuncios']) {
      const res = await context.request.get(path, { headers: { RSC: '1' } })
      const body = await res.text()
      for (const value of hiddenFromFree()) expect(body, `RSC ${path} contains ${value}`).not.toContain(value)
      for (const m of allOthersMedia()) expect(mediaIdsIn(body), `RSC ${path} points at media ${m.id}`).not.toContain(m.id)
    }
    await context.close()
  })

  test('media route: 403 for every file of others, 200 for her own (staff control proves the files exist)', async ({ browser, baseURL, request }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, LIVRE)
    for (const m of allOthersMedia()) {
      for (const variante of m.kind === 'video' ? ['video'] : ['foto', 'miniatura']) {
        const res = await fetchAs(page, 'GET', mediaUrl(m.id, variante))
        expect([403, 404], `${m.id}/${variante}`).toContain(res.status)
        expect(isBinaryType(res.headers['content-type'])).toBe(false)
      }
    }
    const own = s.media.livre[0]!
    const ok = await fetchAs(page, 'GET', mediaUrl(own.id, 'foto'))
    expect(ok.status).toBe(200)
    expect(ok.headers['content-type']).toMatch(/^image\//)
    const staff = await staffApi(request)
    const control = await request.get(mediaUrl(s.media.pago[0]!.id, 'foto'), { headers: staff.headers })
    expect(control.status()).toBe(200)
    await staff.dispose()
    await context.close()
  })

  test('REST stays closed: no foreign data, no writes', async ({ browser, baseURL, request }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, LIVRE)
    for (const path of ['/api/ads', '/api/ad-media', '/api/assinantes', '/api/subscriptions', '/api/audit-log', '/api/ad-reports']) {
      const res = await fetchAs(page, 'GET', path)
      if (res.status === 200) {
        const docs = ((JSON.parse(res.body) as { docs?: { email?: string }[] }).docs ?? []).filter((d) => d.email !== LIVRE.email)
        expect(docs, path).toHaveLength(0)
      } else {
        expect([401, 403, 404], path).toContain(res.status)
      }
      for (const value of othersSentinels()) expect(res.body, `${path} contains ${value}`).not.toContain(value)
    }
    expect((await fetchAs(page, 'POST', '/api/ads', { json: { texto: 'x' } })).status).toBe(403)
    expect((await fetchAs(page, 'PATCH', `/api/ads/${s.ads.gratis}`, { json: { status: 'recusado' } })).status).toBe(403)
    expect((await fetchAs(page, 'POST', '/api/assinantes', { json: { email: 'x@y.z', password: 'senha-qualquer-1', name: 'x' } })).status).toBe(403)
    const evil = await fetchAs(page, 'PATCH', `/api/assinantes/${s.ids.livre}`, { json: { accessUntil: '2099-01-01T00:00:00.000Z', _verified: true } })
    expect([200, 400, 403]).toContain(evil.status)
    const api = await staffApi(request)
    const after = (await api.get(`/api/assinantes/${s.ids.livre}?depth=0`)) as { accessUntil?: string | null }
    expect(after.accessUntil ?? null).toBeNull()
    await api.dispose()
    await context.close()
  })

  test('a second photo or a video is refused and nothing is stored', async ({ browser, baseURL, request }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, LIVRE)
    const api = await staffApi(request)
    const before = (await api.findAdMedia(s.ads.livre)).length
    const photo = await fetchAs(page, 'POST', `/area-do-assinante/meus-anuncios/${s.ads.livre}/midia?tipo=foto`, {
      fields: { tipo: 'foto' },
      file: { field: 'arquivo', name: 'x.jpg', type: 'image/jpeg', text: 'nao-e-uma-imagem' },
    })
    expect(photo.url).toContain('codigo=limite-fotos-gratis')
    const video = await fetchAs(page, 'POST', `/area-do-assinante/meus-anuncios/${s.ads.livre}/midia?tipo=video`, {
      fields: { tipo: 'video' },
      file: { field: 'arquivo', name: 'x.mp4', type: 'video/mp4', text: 'nao-e-um-video' },
    })
    expect(video.url).toContain('codigo=video-gratis')
    // a client that omits the query still gets refused from the form field
    const late = await fetchAs(page, 'POST', `/area-do-assinante/meus-anuncios/${s.ads.livre}/midia`, {
      fields: { tipo: 'video' },
      file: { field: 'arquivo', name: 'x.mp4', type: 'video/mp4', text: 'nao-e-um-video' },
    })
    expect(late.url).toContain('codigo=video-gratis')
    expect((await api.findAdMedia(s.ads.livre)).length).toBe(before)

    // staff REST goes through the same collection hook: still one photo, no video
    const staff = await staffApi(request)
    const res = await request.post('/api/ad-media', {
      headers: staff.headers,
      multipart: {
        _payload: JSON.stringify({ ad: s.ads.livre, order: 1 }),
        file: { name: 'flyer-portrait.jpg', mimeType: 'image/jpeg', buffer: (await import('fs')).readFileSync('tests/fixtures/flyer-portrait.jpg') },
      },
    })
    expect(res.ok()).toBe(false)
    expect((await api.findAdMedia(s.ads.livre)).length).toBe(before)
    await api.dispose()
    await context.close()
  })
})

test.describe('paying viewer', () => {
  test('on an ad whose author lost access: exactly one media URL (the cover); the rest answers 404', async ({ browser, baseURL, playwright, request }) => {
    test.setTimeout(180_000)
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER)
    const [cover, second, third, video] = s.media.expirado
    const detail = await fetchAs(page, 'GET', `/area-do-assinante/classisex/${s.ads.expirado}`)
    expect(detail.status).toBe(200)
    expect(detail.body).toContain(TEXTS.expirado)
    expect(mediaIdsIn(detail.body)).toEqual([cover!.id])
    const list = await fetchAs(page, 'GET', '/area-do-assinante/classisex')
    expect(list.body).toContain('Casal Pitanga')
    const listIds = mediaIdsIn(list.body)
    expect(listIds).toContain(cover!.id)
    for (const hidden of [second!, third!, video!]) expect(listIds).not.toContain(hidden.id)

    expect((await fetchAs(page, 'GET', mediaUrl(cover!.id, 'foto'))).status).toBe(200)
    for (const [m, variante] of [
      [second!, 'foto'],
      [second!, 'miniatura'],
      [third!, 'foto'],
      [video!, 'video'],
    ] as const) {
      expect((await fetchAs(page, 'GET', mediaUrl(m.id, variante))).status, `${m.id}/${variante}`).toBe(404)
    }
    expect((await fetchAs(page, 'GET', mediaUrl(video!.id, 'video'))).status).toBe(404)
    await context.close()

    // Range requests do not get around it (fetchAs cannot set Range: use the context request)
    const ranged = await browser.newContext({ baseURL })
    await ranged.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
    const rp = await ranged.newPage()
    await loginAsAssinante(rp, VIEWER.email, VIEWER.password)
    for (const range of ['bytes=0-', 'bytes=0-99']) {
      const res = await ranged.request.get(mediaUrl(video!.id, 'video'), { headers: { Range: range } })
      expect(res.status(), range).toBe(404)
      expect(isBinaryType(res.headers()['content-type'])).toBe(false)
    }
    await ranged.close()

    // the open cover preview: cover only
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.get(`/classisex/previa/${cover!.id}`)).status()).toBe(200)
    expect((await anon.get(`/classisex/previa/${second!.id}`)).status()).toBe(404)
    expect((await anon.get(`/classisex/previa/${third!.id}`)).status()).toBe(404)
    expect((await anon.get(`/classisex/previa/${video!.id}`)).status()).toBe(404)
    await anon.dispose()

    // control: the files are all there (staff sees them)
    const staff = await staffApi(request)
    for (const m of [second!, third!]) {
      expect((await request.get(mediaUrl(m.id, 'foto'), { headers: staff.headers })).status()).toBe(200)
    }
    expect((await request.get(mediaUrl(video!.id, 'video'), { headers: staff.headers })).status()).toBe(200)
    await staff.dispose()
  })

  test('Liberar brings the video and the other photos back', async ({ browser, baseURL, request }) => {
    test.setTimeout(150_000)
    const api = await staffApi(request)
    await api.liberar(s.ids.expirado!, { durationDays: 30, method: 'cortesia', amount: 0 })
    await api.dispose()
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER)
    const detail = await fetchAs(page, 'GET', `/area-do-assinante/classisex/${s.ads.expirado}`)
    expect(mediaIdsIn(detail.body).sort((a, b) => a - b)).toEqual(s.media.expirado.map((m) => m.id).sort((a, b) => a - b))
    for (const m of s.media.expirado) {
      expect((await fetchAs(page, 'GET', mediaUrl(m.id, m.kind === 'video' ? 'video' : 'foto'))).status, `${m.id}`).toBe(200)
    }
    await context.close()
  })

  test('on a free advertiser’s ad: one photo, the contacts, no “Enviar recado”', async ({ browser, baseURL }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER)
    const detail = await fetchAs(page, 'GET', `/area-do-assinante/classisex/${s.ads.gratis}`)
    expect(detail.status).toBe(200)
    expect(mediaIdsIn(detail.body)).toEqual([s.media.gratis[0]!.id])
    expect(detail.body).toContain(CONTACTS.gratis.whatsapp)
    expect(detail.body).toContain(CONTACTS.gratis.telegram)
    // E-mail, links and observation (2026-10-27) reach paying viewers: mailto button, one button per link, the note
    expect(detail.body).toContain(`mailto:${CONTACTS.gratis.email}`)
    expect(detail.body).toContain(CONTACTS.gratis.links[0]!.url)
    expect(detail.body).toContain(CONTACTS.gratis.observacao)
    expect(detail.body).not.toContain('Enviar recado')
    expect(detail.body).toContain('Este anúncio é de uma conta gratuita e não recebe recados. Use os contatos do anúncio.')
    // control: a paying advertiser's ad does offer the button
    const paid = await fetchAs(page, 'GET', `/area-do-assinante/classisex/${s.ads.pago}`)
    expect(paid.body).toContain('Enviar recado')
    expect(mediaIdsIn(paid.body).length).toBe(3)
    await context.close()
  })

  test('typing the compose URL for a free advertiser shows the note and no form, and creates no recado', async ({ browser, baseURL }) => {
    test.setTimeout(150_000)
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER, `${M}/nova?anuncio=${s.ads.gratis}`)
    await expect(
      page.getByText('Este anúncio é de uma conta gratuita e não recebe recados. Use os contatos do anúncio.'),
    ).toBeVisible()
    await expect(page.locator('textarea')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)
    const inbox = await fetchAs(page, 'GET', M)
    expect(inbox.body).not.toContain('Gabi')
    await context.close()
  })

  test('a replayed reply creates nothing once the other side lost access', async ({ browser, baseURL, request }) => {
    test.setTimeout(180_000)
    const { page, context } = await asSubscriber(browser, baseURL!, VIEWER, `${M}/nova?anuncio=${s.ads.pago2}`)
    await page.getByLabel('Seu apelido').fill('ViewerPapo')
    await page.getByLabel('Recado', { exact: true }).fill('PRIMEIRA-MSG-SENTINELA')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page).toHaveURL(/\/area-do-assinante\/mensagens\/\d+$/)
    const thread = page.url()
    const captured = await captureReply(page, 'REPLAY-SENTINELA-CG')
    await expect(page.getByRole('list', { name: 'Recados' })).toContainText('REPLAY-SENTINELA-CG')
    const occurrences = (text: string) => text.split('REPLAY-SENTINELA-CG').length - 1
    const before = occurrences((await fetchAs(page, 'GET', new URL(thread).pathname)).body)
    expect(before).toBeGreaterThan(0)

    const api = await staffApi(request)
    await api.encerrar(s.ids.pago2!, 'Cenário: a outra pessoa vira conta gratuita')
    await api.dispose()
    await context.request.post(captured.url, { headers: captured.headers, data: captured.body })
    expect(occurrences((await fetchAs(page, 'GET', new URL(thread).pathname)).body)).toBe(before)

    // and through the real form the person is told why
    await page.goto(thread)
    await page.getByLabel('Recado', { exact: true }).fill('DEPOIS-DE-VENCER-SENTINELA')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Esta pessoa está sem assinatura ativa e não recebe recados agora.')).toBeVisible()
    expect((await fetchAs(page, 'GET', new URL(thread).pathname)).body).not.toContain('DEPOIS-DE-VENCER-SENTINELA')
    await context.close()
  })
})

test.describe('unconfirmed account and anonymous sign-up surface', () => {
  test('an unconfirmed account is refused at login with the confirmation message', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL })
    await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
    const page = await context.newPage()
    await page.goto('/entrar')
    await page.getByLabel('E-mail').fill(NAOCONF.email)
    await page.getByLabel('Senha', { exact: true }).fill(NAOCONF.password)
    await page.getByRole('button', { name: 'Entrar' }).click()
    await expect(page.getByText('Confirme seu e-mail antes de entrar.')).toBeVisible()
    expect(page.url()).not.toContain('/area-do-assinante')
    // no session was created
    const res = await context.request.get('/area-do-assinante', { maxRedirects: 0 })
    expect([302, 303, 307, 308]).toContain(res.status())
    await context.close()
  })

  test('the unconfirmed account is in no public listing and REST create is closed', async ({ playwright, baseURL, request }) => {
    const anon = await playwright.request.newContext({ baseURL })
    for (const path of ['/classisex', '/modelos', '/assine-ja', '/cadastro', '/entrar', '/sitemap.xml']) {
      const body = await (await anon.get(path)).text()
      expect(body, path).not.toContain(NAOCONF.email)
      expect(body, path).not.toContain('Nina Naoconfirmada')
    }
    const list = await anon.get('/api/assinantes?limit=50')
    const text = await list.text()
    expect(text).not.toContain(NAOCONF.email)
    if (list.status() === 200) expect((JSON.parse(text) as { docs?: unknown[] }).docs ?? []).toHaveLength(0)
    const create = await anon.post('/api/assinantes', { data: { email: 'intruso@teste.local', password: 'senha-intruso-123', name: 'Intruso' } })
    expect([401, 403]).toContain(create.status())
    const first = await anon.post('/api/assinantes/first-register', { data: { email: 'intruso2@teste.local', password: 'senha-intruso-123', name: 'Intruso' } })
    expect([401, 403, 404]).toContain(first.status())
    const api = await staffApi(request)
    const created = (await api.get(`/api/assinantes?where[email][like]=intruso&depth=0`)) as { docs: unknown[] }
    expect(created.docs).toHaveLength(0)
    await api.dispose()
    await anon.dispose()
  })

  test('staff confirming the e-mail lets the account in', async ({ browser, baseURL, request }) => {
    test.setTimeout(120_000)
    const res = await request.post(`/api/assinantes/${s.ids.naoconf}/email-confirmado`, { headers: (await staffApi(request)).headers, data: { confirmado: true } })
    expect(res.status()).toBe(200)
    const { page, context } = await asSubscriber(browser, baseURL!, NAOCONF)
    await expect(page.getByRole('heading', { name: 'Sua conta: Conta gratuita' })).toBeVisible()
    await context.close()
  })
})
