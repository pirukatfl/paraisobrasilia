import { expect, test, type APIRequestContext, type APIResponse, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import {
  ANA,
  BETO,
  BIA,
  buildFase5Scenario,
  CAIO,
  captureReply,
  CONTO_PARAGRAFOS,
  CONTO_SLUG,
  EDU,
  loginPage,
  PHONE_DIGITS,
  SENTINELS,
  SUSI,
  type Fase5,
  type Who,
} from './helpers/fase5'

// Phase 5 leak / regression matrix (REC-01..04, PREV-02..04; T-05-01, 02, 05, 07, 09, 17, 18):
// every principal against every recados / messages / contos surface. Denials are paired with
// controls that prove the data exists, so a pass means "access denied", not "data missing".
test.describe.configure({ mode: 'serial' })
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

const M = '/area-do-assinante/mensagens'
let s: Fase5
const REPLAY = 'REPLAY-SENTINELA-5'
/** Occurrences of the marker in Ana's thread HTML after Beto's real send (the markup repeats it). */
let replayCount = 0
const MEMBERS_SENTINELS = [SENTINELS.recadoApelido, SENTINELS.recadoTexto, SENTINELS.mensagem, PHONE_DIGITS]

test.beforeAll(async ({ request, browser, baseURL }) => {
  test.setTimeout(420_000)
  s = await buildFase5Scenario(request, browser, baseURL!)
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('ads')
  await api.deleteAll('contos')
  await api.deleteAll('message-reports')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function bodyOf(res: APIResponse): Promise<string> {
  return res.text()
}

function expectNone(body: string, values: string[]) {
  for (const v of values) expect(body, `body leaks ${v}`).not.toContain(v)
}

/** Denied or empty: 401/403/404, or 200 with no docs; never a sentinel. */
async function expectNoData(res: APIResponse, values: string[] = Object.values(SENTINELS)) {
  const body = await bodyOf(res)
  if (res.status() === 200) {
    const json = JSON.parse(body) as { docs?: unknown[] }
    expect(json.docs ?? [], res.url()).toHaveLength(0)
  } else {
    expect([401, 403, 404], `${res.url()} -> ${res.status()}`).toContain(res.status())
  }
  expectNone(body, values)
}

async function asContext(browser: Browser, baseURL: string, who: Who) {
  return loginPage(browser, baseURL, who)
}

/** Messages of a conversation as the (participant) owner sees them. */
async function anaThread(browser: Browser, baseURL: string, convId: number): Promise<string> {
  const { context } = await loginPage(browser, baseURL, ANA)
  const res = await context.request.get(`${M}/${convId}`)
  const html = await res.text()
  await context.close()
  return html
}

const occurrences = (html: string, needle: string) => html.split(needle).length - 1

const CLOSED_REST = ['conversations', 'messages', 'blocks']
const STAFF_REST = ['recados', 'message-reports']

test.describe('anonymous', () => {
  test('members pages send the visitor to the login with no sentinel (HTML and RSC)', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    const paths = [
      '/area-do-assinante/recados',
      M,
      `${M}/${s.conv.beto}`,
      `${M}/nova?anuncio=${s.adId}`,
      `${M}/nova?recado=${s.recadoId}`,
    ]
    for (const path of paths) {
      for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
        const res = await anon.get(path, { headers })
        if (!headers.RSC) expect(res.url(), path).toContain('/entrar')
        expectNone(await res.text(), MEMBERS_SENTINELS)
      }
    }
    await anon.dispose()
  })

  test('REST of recados, conversations, messages, blocks and message-reports gives nothing; writes are refused', async ({
    playwright,
    baseURL,
  }) => {
    const anon = await playwright.request.newContext({ baseURL })
    for (const collection of [...CLOSED_REST, ...STAFF_REST]) {
      await expectNoData(await anon.get(`/api/${collection}?limit=50&depth=0`))
      const created = await anon.post(`/api/${collection}`, { data: { texto: 'x' } })
      expect([401, 403, 404], `POST ${collection}`).toContain(created.status())
    }
    await expectNoData(await anon.get(`/api/recados/${s.recadoId}`))
    expect((await anon.get(`${M}/nao-lidas`)).status()).toBe(401)
    await anon.dispose()
  })

  test('a server-action replay without a session creates nothing', async ({ browser, baseURL, playwright }) => {
    const beto = await asContext(browser, baseURL!, BETO)
    await beto.page.goto(`${M}/${s.conv.beto}`)
    const captured = await captureReply(beto.page, REPLAY)
    await expect(beto.page.getByRole('list', { name: 'Mensagens' })).toContainText(REPLAY)
    // positive control: Ana's thread has the real message
    replayCount = occurrences(await anaThread(browser, baseURL!, s.conv.beto), REPLAY)
    expect(replayCount).toBeGreaterThan(0)
    const anon = await playwright.request.newContext({ baseURL })
    await anon.post(captured.url, { headers: captured.headers, data: captured.body })
    await anon.dispose()
    expect(occurrences(await anaThread(browser, baseURL!, s.conv.beto), REPLAY)).toBe(replayCount)
    await beto.context.close()
    ;(globalThis as { __captured?: unknown }).__captured = captured
  })
})

test.describe('expired subscriber (Edu)', () => {
  test('sees the inactive panel and none of the data, including his old conversation', async ({ browser, baseURL }) => {
    const edu = await asContext(browser, baseURL!, EDU)
    for (const path of ['/area-do-assinante/recados', M, `${M}/${s.conv.edu}`, `${M}/nova?anuncio=${s.adId}`]) {
      for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
        const res = await edu.context.request.get(path, { headers })
        expect(res.status(), path).toBe(200)
        const body = await res.text()
        expectNone(body, [SENTINELS.recadoApelido, SENTINELS.recadoTexto, SENTINELS.mensagem, 'Conversa antiga'])
      }
    }
    await edu.page.goto(`${M}/${s.conv.edu}`)
    await expect(edu.page.getByRole('button', { name: 'Enviar' })).toHaveCount(0)
    expect(await (await edu.context.request.get(`${M}/nao-lidas`)).json()).toEqual({ count: 0 })
    await edu.context.close()
  })

  test('REST stays closed and a replayed reply action creates nothing', async ({ browser, baseURL }) => {
    const edu = await asContext(browser, baseURL!, EDU)
    for (const collection of [...CLOSED_REST, ...STAFF_REST]) {
      await expectNoData(await edu.context.request.get(`/api/${collection}?limit=50&depth=0`))
    }
    const captured = (globalThis as { __captured?: { url: string; headers: Record<string, string>; body: Buffer } }).__captured!
    await edu.context.request.post(captured.url, { headers: captured.headers, data: captured.body })
    expect(occurrences(await anaThread(browser, baseURL!, s.conv.beto), REPLAY)).toBe(replayCount)
    await edu.context.close()
  })
})

test.describe('active subscriber outside the conversation (Caio)', () => {
  test('gets 404 for the thread (HTML and RSC) and an empty inbox', async ({ browser, baseURL }) => {
    const caio = await asContext(browser, baseURL!, CAIO)
    for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
      const res = await caio.context.request.get(`${M}/${s.conv.beto}`, { headers })
      if (!headers.RSC) expect(res.status()).toBe(404)
      expectNone(await res.text(), [SENTINELS.mensagem, REPLAY, 'BetoDF'])
    }
    await caio.page.goto(M)
    await expect(caio.page.getByText('Nenhuma conversa ainda.')).toBeVisible()
    await expectNoData(await caio.context.request.get('/api/recados?limit=50&depth=0'))
    await caio.context.close()
  })

  test('replaying Beto\'s reply action with Caio\'s session creates no message', async ({ browser, baseURL }) => {
    const caio = await asContext(browser, baseURL!, CAIO)
    const captured = (globalThis as { __captured?: { url: string; headers: Record<string, string>; body: Buffer } }).__captured!
    await caio.context.request.post(captured.url, { headers: captured.headers, data: captured.body })
    expect(occurrences(await anaThread(browser, baseURL!, s.conv.beto), REPLAY)).toBe(replayCount)
    await caio.context.close()
  })
})

test.describe('blocked (Bia) and suspended (Susi)', () => {
  test('Bia keeps her thread but every send gets the neutral message and nothing is created', async ({ browser, baseURL }) => {
    const bia = await asContext(browser, baseURL!, BIA)
    await bia.page.goto(`${M}/${s.conv.bia}`)
    await bia.page.getByLabel('Mensagem', { exact: true }).fill('BLOQ-1-SENTINELA')
    await bia.page.getByRole('button', { name: 'Enviar' }).click()
    await expect(bia.page.getByText('Não é possível enviar mensagens para esta pessoa.')).toBeVisible()
    // a new conversation attempt from Ana's recado lands on the same blocked thread
    await bia.page.goto(`${M}/nova?recado=${s.recadoId}`)
    await expect(bia.page).toHaveURL(new RegExp(`${M}/${s.conv.bia}$`))
    await bia.page.getByLabel('Mensagem', { exact: true }).fill('BLOQ-2-SENTINELA')
    await bia.page.getByRole('button', { name: 'Enviar' }).click()
    await expect(bia.page.getByText('Não é possível enviar mensagens para esta pessoa.')).toBeVisible()
    const html = await anaThread(browser, baseURL!, s.conv.bia)
    expect(html).toContain('Oi, tudo bem?')
    expectNone(html, ['BLOQ-1-SENTINELA', 'BLOQ-2-SENTINELA'])
    await bia.context.close()
  })

  test('Susi is told her messaging was suspended and nothing is created', async ({ browser, baseURL }) => {
    const susi = await asContext(browser, baseURL!, SUSI)
    await susi.page.goto(`${M}/${s.conv.susi}`)
    await susi.page.getByLabel('Mensagem', { exact: true }).fill('SUSP-SENTINELA')
    await susi.page.getByRole('button', { name: 'Enviar' }).click()
    await expect(
      susi.page.getByText('Seu envio de mensagens foi suspenso pela equipe. Fale com a casa pelo WhatsApp.'),
    ).toBeVisible()
    expectNone(await anaThread(browser, baseURL!, s.conv.susi), ['SUSP-SENTINELA'])
    await susi.context.close()
  })
})

test.describe('staff', () => {
  test('cannot read or write conversations, messages or blocks through REST; reports and recados are readable', async ({
    request,
  }) => {
    const api = await staffApi(request)
    for (const collection of CLOSED_REST) {
      await expectNoData(await request.get(`/api/${collection}?limit=50&depth=0`))
      const created = await request.post(`/api/${collection}`, { data: { texto: 'x' } })
      expect([401, 403, 404], `POST ${collection}`).toContain(created.status())
    }
    const recados = await request.get('/api/recados?limit=50&depth=0')
    expect(recados.status()).toBe(200)
    expect(((await recados.json()) as { docs: unknown[] }).docs.length).toBeGreaterThan(0)
    expect((await request.get('/api/message-reports?limit=50&depth=0')).status()).toBe(200)
    await api.dispose()
  })

  test('staff are not subscribers: the members pages and the unread route turn them away', async ({ request }) => {
    const api = await staffApi(request)
    expect((await request.get(`${M}/nao-lidas`)).status()).toBe(401)
    const page = await request.get(M)
    expect(page.url()).toContain('/entrar')
    await api.dispose()
  })
})

test.describe('cross-site requests and headers', () => {
  test('a foreign Origin is rejected on the server action and on the staff moderation endpoint', async ({
    browser,
    baseURL,
    request,
  }) => {
    const beto = await asContext(browser, baseURL!, BETO)
    const captured = (globalThis as { __captured?: { url: string; headers: Record<string, string>; body: Buffer } }).__captured!
    const evil = await beto.context.request.post(captured.url, {
      headers: { ...captured.headers, Origin: 'https://evil.example' },
      data: captured.body,
    })
    expect(evil.status()).toBe(403)
    expect(occurrences(await anaThread(browser, baseURL!, s.conv.beto), REPLAY)).toBe(replayCount)
    await beto.context.close()

    const api = await staffApi(request)
    const evilStaff = await request.post(`/api/recados/${s.recadoId}/despublicar`, {
      headers: { Origin: 'https://evil.example' },
      data: { motivo: 'Teste cross-site' },
    })
    expect(evilStaff.status()).toBe(403)
    const recado = (await api.get(`/api/recados/${s.recadoId}?depth=0`)) as unknown as { status: string }
    expect(recado.status).toBe('aprovado')
    await api.dispose()
  })

  test('members pages are private and noindex; the unread route is private, no-store', async ({ browser, baseURL }) => {
    const ana = await asContext(browser, baseURL!, ANA)
    for (const path of ['/area-do-assinante/recados', M, `${M}/${s.conv.beto}`, `/area-do-assinante/contos/${CONTO_SLUG}`]) {
      const res = await ana.context.request.get(path)
      expect(res.status(), path).toBe(200)
      expect(res.headers()['cache-control'] ?? '', path).toMatch(/no-store|private/)
      const html = await res.text()
      expect(html, path).toMatch(/<meta name="robots" content="[^"]*noindex/)
    }
    const unread = await ana.context.request.get(`${M}/nao-lidas`)
    expect(unread.status()).toBe(200)
    expect(unread.headers()['cache-control']).toContain('no-store')
    expect(unread.headers()['cache-control']).toContain('private')
    expect(unread.headers()['x-robots-tag']).toContain('noindex')
    await ana.context.close()
  })
})

test.describe('contos and public previews', () => {
  async function contoLeaks(ctx: APIRequestContext, label: string) {
    for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
      const res = await ctx.get(`/contos/${CONTO_SLUG}`, { headers })
      expect(res.status(), label).toBe(200)
      expectNone(await res.text(), [SENTINELS.contoRestrito, 'Quinto parágrafo'])
    }
    expectNone(await (await ctx.get('/contos')).text(), [SENTINELS.contoRestrito])
    for (const path of [
      '/api/contos?limit=50&depth=0',
      '/api/contos?draft=true&limit=50&depth=0',
      `/api/contos/${s.contoId}`,
      `/api/contos/${s.contoId}?draft=true`,
      `/api/contos/versions?limit=50`,
    ]) {
      await expectNoData(await ctx.get(path), [SENTINELS.contoRestrito])
    }
  }

  test('the restricted part never reaches anonymous, expired or even active subscribers through public surfaces and REST', async ({
    playwright,
    browser,
    baseURL,
  }) => {
    const anon = await playwright.request.newContext({ baseURL })
    await contoLeaks(anon, 'anonymous')
    const meta = await (await anon.get(`/contos/${CONTO_SLUG}`)).text()
    const description = /<meta name="description" content="([^"]*)"/.exec(meta)?.[1] ?? ''
    expect(description).not.toContain(SENTINELS.contoRestrito)
    expect(description).not.toContain('Terceiro')
    const anonMembers = await anon.get(`/area-do-assinante/contos/${CONTO_SLUG}`)
    expect(anonMembers.url()).toContain('/entrar')
    expectNone(await anonMembers.text(), [SENTINELS.contoRestrito])
    await anon.dispose()

    const edu = await asContext(browser, baseURL!, EDU)
    await contoLeaks(edu.context.request, 'expired')
    const eduMembers = await edu.context.request.get(`/area-do-assinante/contos/${CONTO_SLUG}`)
    expectNone(await eduMembers.text(), [SENTINELS.contoRestrito])
    await edu.context.close()

    const caio = await asContext(browser, baseURL!, CAIO)
    await contoLeaks(caio.context.request, 'active (public surfaces and REST)')
    // control: the same active subscriber reads everything in the members area
    const full = await caio.context.request.get(`/area-do-assinante/contos/${CONTO_SLUG}`)
    const fullHtml = await full.text()
    expect(fullHtml).toContain(SENTINELS.contoRestrito)
    expect(fullHtml).toMatch(/<meta name="robots" content="[^"]*noindex/)
    for (const p of CONTO_PARAGRAFOS) expect(fullHtml).toContain(p.replace(/&/g, '&amp;'))
    await caio.context.close()
  })

  test('public previews carry no recado apelido, text, contact or members link, and each invites to subscribe', async ({
    playwright,
    baseURL,
  }) => {
    const anon = await playwright.request.newContext({ baseURL })
    const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: {} })
    await ctx.dispose()
    for (const path of ['/recados', '/contos', `/contos/${CONTO_SLUG}`, '/classisex']) {
      for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
        const res = await anon.get(path, { headers })
        expect(res.status(), path).toBe(200)
        const body = await res.text()
        expectNone(body, [
          SENTINELS.recadoApelido,
          SENTINELS.recadoTexto,
          SENTINELS.mensagem,
          SENTINELS.contoRestrito,
          PHONE_DIGITS,
          '/area-do-assinante/mensagens',
        ])
        if (!headers.RSC) expect(body, path).toMatch(/href="\/assine-ja"[^>]*>\s*Assine Já/)
      }
    }
    // the teaser exists (control) and shows the beginning only
    const teaser = await (await anon.get('/recados')).text()
    expect(teaser).toContain('Casal tranquilo procurando amigos')
    await anon.dispose()
  })

  test('the sitemap lists the previews and no members URL', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    const xml = await (await anon.get('/sitemap.xml')).text()
    expect(xml).toContain('/recados')
    expect(xml).toContain('/contos')
    expect(xml).toContain(`/contos/${CONTO_SLUG}`)
    expect(xml).not.toContain('/area-do-assinante')
    await anon.dispose()
  })

  test('when Ana\'s access ends her teaser disappears and nobody can write to her', async ({ request, browser, baseURL, playwright }) => {
    const api = await staffApi(request)
    await api.encerrar(s.ids.ana!, 'Fim do cenário da fase 5')
    const anon = await playwright.request.newContext({ baseURL })
    const teaser = await (await anon.get('/recados')).text()
    expect(teaser).not.toContain('Casal tranquilo procurando amigos')
    await anon.dispose()

    const beto = await asContext(browser, baseURL!, BETO)
    await beto.page.goto(`${M}/${s.conv.beto}`)
    await beto.page.getByLabel('Mensagem', { exact: true }).fill('AGORA-NAO-VAI')
    await beto.page.getByRole('button', { name: 'Enviar' }).click()
    await expect(
      beto.page.getByText('Esta pessoa está sem assinatura ativa e não pode receber mensagens agora.'),
    ).toBeVisible()
    await beto.context.close()
    await api.dispose()
  })
})
