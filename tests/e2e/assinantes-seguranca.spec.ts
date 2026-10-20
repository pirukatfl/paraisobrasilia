import { expect, test, type APIResponse } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// Phase 3 leak / regression matrix (T-03-05, T-03-07, T-03-16, T-03-17): anonymous visitors and
// subscribers against every subscriber-related API, GraphQL, /admin and indexing.
test.describe.configure({ mode: 'serial' })

const LIA = { email: 'lia@teste.local', name: 'Lia Teste', password: 'senha-lia-12345' }
const RUI = { email: 'rui@teste.local', name: 'Rui Teste', password: 'senha-rui-12345' }
let liaId = 0
let ruiId = 0
let hiddenPlanId = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  liaId = (await api.createAssinante(LIA)).id
  ruiId = (await api.createAssinante(RUI)).id
  await api.updateAssinante(liaId, { staffNotes: 'nota interna da equipe' })
  await api.liberar(liaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  hiddenPlanId = (await api.createPlan({ name: 'Plano Oculto Teste', durationDays: 10, price: 1, active: false })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  if (hiddenPlanId) await api.remove('plans', hiddenPlanId)
  await api.dispose()
})

/** Denied: 403/401, or 200 with no document and no subscriber e-mail in the body. */
async function expectNoData(res: APIResponse) {
  const body = await res.text()
  if (res.status() === 200) {
    const json = JSON.parse(body) as { docs?: unknown[]; totalDocs?: number }
    expect(json.docs ?? []).toHaveLength(0)
  } else {
    expect([401, 403, 404]).toContain(res.status())
  }
  expect(body).not.toContain(LIA.email)
  expect(body).not.toContain(RUI.email)
}

test.describe('anonymous visitor', () => {
  test('cannot read subscribers, periods or the action log', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    for (const path of ['/api/assinantes', '/api/subscriptions', '/api/audit-log', '/api/users', `/api/assinantes/${liaId}`]) {
      await expectNoData(await anon.get(path))
    }
    await anon.dispose()
  })

  test('cannot create accounts, mint password links or run staff actions', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    expect((await anon.post('/api/assinantes', { data: { ...LIA, email: 'intruso@teste.local' } })).status()).toBe(403)
    expect((await anon.post('/api/assinantes/forgot-password', { data: { email: LIA.email } })).status()).toBe(403)
    for (const action of ['liberar', 'encerrar', 'link-senha']) {
      expect((await anon.post(`/api/assinantes/${liaId}/${action}`, { data: { durationDays: 30, method: 'cortesia' } })).status()).toBe(403)
    }
    expect((await anon.post('/api/subscriptions', { data: { assinante: liaId, startsAt: new Date().toISOString() } })).status()).toBe(403)
    expect((await anon.get(`/api/assinantes/${liaId}/situacao`)).status()).toBe(403)
    await anon.dispose()
  })

  test('first-register is closed even when the collection is empty', async ({ playwright, baseURL, request }) => {
    const api = await staffApi(request)
    await api.deleteAll('assinantes')
    const anon = await playwright.request.newContext({ baseURL })
    const res = await anon.post('/api/assinantes/first-register', { data: { ...LIA, email: 'primeiro@teste.local' } })
    expect([403, 404, 405]).toContain(res.status())
    expect(await res.text()).not.toContain('"token"')
    await anon.dispose()
    // Restore the fixtures for the next tests
    liaId = (await api.createAssinante(LIA)).id
    ruiId = (await api.createAssinante(RUI)).id
    await api.liberar(liaId, { durationDays: 30, method: 'cortesia', amount: 0 })
    await api.dispose()
  })

  test('sees only active plans', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    const res = await anon.get('/api/plans?limit=100')
    expect(res.status()).toBe(200)
    const { docs } = (await res.json()) as { docs: { name: string; active: boolean }[] }
    expect(docs.length).toBeGreaterThan(0)
    expect(docs.every((d) => d.active)).toBe(true)
    expect(docs.map((d) => d.name)).not.toContain('Plano Oculto Teste')
    await anon.dispose()
  })

  test('GraphQL is disabled', async ({ playwright, baseURL }) => {
    const anon = await playwright.request.newContext({ baseURL })
    const res = await anon.post('/api/graphql', { data: { query: '{ Assinantes { docs { email } } }' } })
    const body = await res.text()
    expect(res.status() === 200 && body.includes('"data"')).toBe(false)
    expect(body).not.toContain(LIA.email)
    await anon.dispose()
  })
})

test.describe('logged-in subscriber', () => {
  test('reads only itself, cannot escalate, cannot open /admin', async ({ page, baseURL }) => {
    test.setTimeout(120_000)
    await page.context().addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
    await loginAsAssinante(page, LIA.email, LIA.password)

    // Requests from the page itself (same origin, with the session cookie), as a browser sends them
    const call = (method: string, path: string, data?: unknown) =>
      page.evaluate(
        async ([m, p, d]) => {
          const res = await fetch(p as string, {
            method: m as string,
            credentials: 'include',
            headers: d ? { 'Content-Type': 'application/json' } : undefined,
            body: d ? JSON.stringify(d) : undefined,
          })
          return { status: res.status, body: await res.text() }
        },
        [method, path, data] as const,
      )
    const denied = (r: { status: number; body: string }) => {
      if (r.status === 200) expect((JSON.parse(r.body) as { docs?: unknown[] }).docs ?? []).toHaveLength(0)
      else expect([401, 403, 404]).toContain(r.status)
      expect(r.body).not.toContain(RUI.email)
    }

    const list = await call('GET', '/api/assinantes')
    expect(list.status).toBe(200)
    const { docs } = JSON.parse(list.body) as { docs: { id: number; email: string }[] }
    expect(docs.map((d) => d.email)).toEqual([LIA.email])
    expect(list.body).not.toContain('staffNotes')
    expect(list.body).not.toContain('nota interna da equipe')
    denied(await call('GET', `/api/assinantes/${ruiId}`))

    expect((await call('PATCH', `/api/assinantes/${liaId}`, { accessUntil: '2099-01-01T03:00:00.000Z' })).status).toBe(403)
    expect(
      (
        await call('POST', '/api/subscriptions', {
          assinante: liaId,
          startsAt: new Date().toISOString(),
          endsAt: '2099-01-01T03:00:00.000Z',
          status: 'ativa',
          payment: { method: 'pix' },
        })
      ).status,
    ).toBe(403)
    for (const action of ['liberar', 'encerrar', 'link-senha']) {
      expect((await call('POST', `/api/assinantes/${liaId}/${action}`, { durationDays: 365, method: 'cortesia' })).status).toBe(403)
    }
    denied(await call('GET', '/api/audit-log'))
    denied(await call('GET', '/api/users'))
    expect((await call('POST', '/api/parties', { title: 'Festa falsa' })).status).toBe(403)
    expect((await call('POST', '/api/graphql', { query: '{ Assinantes { docs { email } } }' })).body).not.toContain(RUI.email)

    // Own access did not change
    const own = JSON.parse((await call('GET', `/api/assinantes/${liaId}?depth=0`)).body) as { accessUntil: string }
    expect(own.accessUntil.startsWith('2099')).toBe(false)

    // Regression (login loop): the same cookie with neither Origin nor Sec-Fetch-Site (old Safari,
    // WebViews, header-stripping proxies) is still authenticated: Lia sees only herself
    const bare = await page.context().request.get('/api/assinantes?depth=0', { headers: { 'Sec-Fetch-Site': '' } })
    expect(bare.status()).toBe(200)
    const bareBody = await bare.text()
    expect((JSON.parse(bareBody) as { docs: { id: number }[] }).docs.map((d) => d.id)).toEqual([liaId])
    expect(bareBody).not.toContain(RUI.email)

    // T-03-12: a state-changing request from a foreign Origin is rejected
    const evil = await page.context().request.post(`/api/assinantes/${liaId}/liberar`, {
      headers: { Origin: 'https://evil.example' },
      data: { durationDays: 365, method: 'cortesia' },
    })
    expect(evil.status()).toBe(403)
    const evilUpdate = await page.context().request.patch(`/api/assinantes/${liaId}`, {
      headers: { Origin: 'https://evil.example' },
      data: { name: 'Hackeada' },
    })
    expect(evilUpdate.status()).toBe(403)

    // /admin is not available to a subscriber session
    await page.goto('/admin')
    await expect(page.getByText('Vencem nos próximos 7 dias')).toHaveCount(0)
    await expect(page).not.toHaveURL(/\/admin\/?$/)
  })

  test('members pages are noindex and not cached', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
    await loginAsAssinante(page, LIA.email, LIA.password)
    const res = await page.goto('/area-do-assinante')
    expect(res?.headers()['x-robots-tag']).toContain('noindex')
    expect(res?.headers()['cache-control']).toContain('no-store')
  })
})

test('sitemap and noindex on auth pages', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap).toContain('/assine-ja')
  for (const path of ['/area-do-assinante', '/entrar', '/nova-senha']) expect(sitemap).not.toContain(path)
  for (const path of ['/entrar', '/nova-senha']) {
    const res = await request.get(path)
    expect(res.headers()['x-robots-tag']).toContain('noindex')
  }
})
