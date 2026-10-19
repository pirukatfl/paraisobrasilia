import { expect, test } from '@playwright/test'
import net from 'node:net'

/**
 * Read-only smoke checks against the real staging site (plan 01-10).
 * Runs only when E2E_BASE_URL is set; never writes anything.
 *
 *   E2E_BASE_URL=https://novo.swingbrasilia.com.br pnpm exec playwright test tests/e2e/staging-smoke.spec.ts --project=mobile
 *
 * Optional: STAGING_HOST (IP or hostname for the closed-port check; default: the URL host).
 */
const BASE = process.env.E2E_BASE_URL

test.skip(!BASE, 'E2E_BASE_URL not set: staging smoke runs only against a deployed site')

const DIALOG_NAME = 'Conteúdo para maiores de 18 anos'
const ENTER = 'Tenho 18 anos ou mais — Entrar'

function tcpOpens(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    const done = (open: boolean) => {
      socket.destroy()
      resolve(open)
    }
    socket.setTimeout(timeoutMs, () => done(false))
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
  })
}

// A local dry run (E2E_BASE_URL=http://localhost:3000 against the standalone server) has no Caddy
const isLocal = !!BASE && ['localhost', '127.0.0.1'].includes(new URL(BASE).hostname)

test('home answers 200 over HTTPS and staging is not indexable', async ({ request }) => {
  const home = await request.get('/', { maxRedirects: 0 })
  expect(home.status()).toBe(200)
  expect(home.headers()['x-robots-tag']).toContain('noindex')
  if (!isLocal) {
    expect(BASE!.startsWith('https://')).toBe(true)
    expect(home.headers()['strict-transport-security']).toContain('max-age=')
  }

  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toMatch(/Disallow: \/\s*$/m)
})

test('age gate shows on a fresh visit and can be dismissed', async ({ page }) => {
  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: DIALOG_NAME })
  await expect(dialog).toBeVisible()
  await page.getByRole('button', { name: ENTER }).click()
  await expect(dialog).toBeHidden()
  // With upcoming parties the H1 is "Próximas festas"; without, "Paraíso Brasília" (plan 02-05)
  await expect(page.getByRole('heading', { name: /^(Próximas festas|Paraíso Brasília)$/, level: 1 })).toBeVisible()
})

test('party flyer, page and share image are served by the site', async ({ page, context, playwright, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await page.goto('/')

  const cards = page.getByRole('link', { name: /^Ver detalhes da festa / })
  if ((await cards.count()) === 0) {
    test.info().annotations.push({ type: 'note', description: 'no published upcoming party: flyer checks skipped' })
    return
  }

  const host = new URL(baseURL!).host
  const anon = await playwright.request.newContext()

  // Card image: the original upload under /api/media/file/ (via next/image or directly),
  // read from the `media` volume through the app
  const img = cards.first().locator('img').first()
  await expect(img).toBeVisible()
  const src = await img.evaluate((el) => (el as HTMLImageElement).currentSrc || (el as HTMLImageElement).src)
  expect(new URL(src).host).toBe(host)
  const imgRes = await anon.get(src)
  expect(imgRes.status()).toBe(200)
  expect(imgRes.headers()['content-type']).toMatch(/^image\//)

  await cards.first().click()
  await page.waitForURL(/\/festas\/[^/]+$/)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/)

  const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content')
  expect(ogImage).toBeTruthy()
  expect(new URL(ogImage!).host).toBe(host)
  const ogRes = await anon.get(ogImage!)
  expect(ogRes.status()).toBe(200)
  expect(ogRes.headers()['content-type']).toContain('image/jpeg')

  await anon.dispose()
})

// Plan 02-06: the open-area pages added in Phase 2 (seeded by the migrations on deploy)
// Institutional titles are editable in the panel: match the stable word, not the whole seed title
const PHASE2_PAGES: [string, RegExp][] = [
  ['/quem-somos', /Quem somos/i],
  ['/quem-somos/normas', /Normas/i],
  ['/quem-somos/regras', /Regras/i],
  ['/quem-somos/dicas', /Dicas/i],
  ['/termos-de-uso', /Termos de Uso/i],
  ['/politica-de-privacidade', /Política de Privacidade/i],
  ['/contato', /Contato/i],
  ['/espaco', /Conheça o Paraíso/i],
]

test('Phase 2 pages answer 200 with their heading', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  for (const [path, h1] of PHASE2_PAGES) {
    const res = await page.goto(path)
    expect(res?.status(), path).toBe(200)
    await expect(page.getByRole('heading', { level: 1 }), path).toHaveText(h1)
  }
})

test('contact page links to the house WhatsApp', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await page.goto('/contato')
  await expect(page.locator('main a[href^="https://wa.me/5561999889772"]').first()).toBeVisible()
})

test('drafts are never exposed to anonymous visitors', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: BASE })
  for (const path of ['/api/parties?where[_status][equals]=draft', '/api/parties?draft=true&where[_status][equals]=draft']) {
    const res = await anon.get(path)
    expect(res.status()).toBe(200)
    expect((await res.json()).totalDocs).toBe(0)
  }
  await anon.dispose()
})

// Plan 03-07: Phase 3 public surface (read-only)
test('Assine Já lists the plans', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const res = await page.goto('/assine-ja')
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Assine Já', level: 1 })).toBeVisible()
  const plans = page.locator('section[aria-labelledby="titulo-planos"] li')
  expect(await plans.count()).toBeGreaterThan(0)
})

test('subscriber login is noindex and the members area asks for it', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: BASE })
  const entrar = await anon.get('/entrar')
  expect(entrar.status()).toBe(200)
  expect(entrar.headers()['x-robots-tag']).toContain('noindex')

  const area = await anon.get('/area-do-assinante', { maxRedirects: 0 })
  expect([302, 303, 307, 308]).toContain(area.status())
  expect(area.headers()['location']).toMatch(/\/entrar(\?|$)/)
  await anon.dispose()
})

test('subscriber data is closed to anonymous visitors', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: BASE })
  for (const path of ['/api/assinantes', '/api/subscriptions', '/api/audit-log']) {
    const res = await anon.get(path)
    const body = await res.text()
    if (res.status() === 200) expect((JSON.parse(body) as { docs?: unknown[] }).docs ?? []).toHaveLength(0)
    else expect([401, 403]).toContain(res.status())
  }
  await anon.dispose()
})

test('database port 5432 is closed to the internet', async () => {
  const host = process.env.STAGING_HOST || new URL(BASE!).hostname
  expect(await tcpOpens(host, 5432, 3_000)).toBe(false)
})

// Plan 04-10: Phase 4 public and private surfaces (read-only)
test('public ClassiSex preview has no contact data', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const res = await page.goto('/classisex')
  expect(res?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'ClassiSex', level: 1 })).toBeVisible()
  for (const text of await page.locator('article').allInnerTexts()) {
    expect(text).not.toMatch(/\d{8,}/)
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/)
  }
})

test('ClassiSex members area asks for the login', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: BASE })
  const res = await anon.get('/area-do-assinante/classisex', { maxRedirects: 0 })
  expect([302, 303, 307, 308]).toContain(res.status())
  expect(res.headers()['location']).toMatch(/\/entrar(\?|$)/)
  await anon.dispose()
})

test('ClassiSex originals and collections are closed to anonymous visitors', async ({ playwright }) => {
  const anon = await playwright.request.newContext({ baseURL: BASE })
  const media = await anon.get('/area-do-assinante/midia/1/foto')
  expect([403, 404]).toContain(media.status())
  expect(media.headers()['content-type'] ?? '').not.toMatch(/^image\//)

  for (const path of ['/api/ads', '/api/ad-media', '/api/ad-reports']) {
    const res = await anon.get(path)
    const body = await res.text()
    if (res.status() === 200) expect((JSON.parse(body) as { docs?: unknown[] }).docs ?? []).toHaveLength(0)
    else expect([401, 403]).toContain(res.status())
  }
  const file = await anon.get('/api/ad-media/file/qualquer.webp')
  expect(file.status() === 200 && /^image\//.test(file.headers()['content-type'] ?? '')).toBe(false)
  await anon.dispose()
})
