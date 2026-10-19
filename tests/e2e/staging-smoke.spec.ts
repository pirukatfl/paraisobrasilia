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

test('database port 5432 is closed to the internet', async () => {
  const host = process.env.STAGING_HOST || new URL(BASE!).hostname
  expect(await tcpOpens(host, 5432, 3_000)).toBe(false)
})
