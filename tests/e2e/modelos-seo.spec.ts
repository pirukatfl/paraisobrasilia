import { expect, test, type APIRequestContext } from '@playwright/test'

import { staffApi } from './helpers/api'

// MIDIA-06/07 (Phase 06.1, success criterion 4): sitemap, share tags and old links for model pages.
test.describe.configure({ mode: 'serial' })

const HEADERS = { cookie: 'pb_age_ok=1' }

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('models')
})

async function follow(request: APIRequestContext, start: string) {
  const hops: { url: string; status: number }[] = []
  let url = start
  for (let i = 0; i < 5; i++) {
    const res = await request.get(url, { maxRedirects: 0, headers: HEADERS })
    hops.push({ url, status: res.status() })
    const location = res.headers()['location']
    if (res.status() >= 300 && res.status() < 400 && location) {
      url = new URL(location, 'http://localhost').pathname
      continue
    }
    return { hops, final: url, status: res.status() }
  }
  throw new Error(`redirect demais para ${start}`)
}

test('sitemap lists published models only and hides everything when none is published', async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Aurora', photos: 1, order: 1, description: 'Ruiva, simpática e muito animada.' })
  await api.createModel({ name: 'Bella', photos: 1, order: 2, published: false })

  const xml = await (await request.get('/sitemap.xml')).text()
  expect(xml).toContain('/modelos/aurora</loc>')
  expect(xml).toContain('/modelos</loc>')
  expect(xml).not.toContain('/modelos/bella</loc>')

  await api.deleteAll('models')
  const empty = await (await request.get('/sitemap.xml')).text()
  expect(empty).not.toMatch(/\/modelos(\/[^<]*)?<\/loc>/)
})

test('model page has its own title, description, canonical and cover share image', async ({ page, playwright, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Aurora', photos: 2, order: 1, description: 'Ruiva, simpática e muito animada.' })

  await page.goto('/modelos/aurora')
  await expect(page).toHaveTitle('Aurora · Paraíso Brasília')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Ruiva, simpática e muito animada.')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Aurora')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/modelos\/aurora$/)

  const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content')
  expect(ogImage).toBeTruthy()
  expect(ogImage).not.toMatch(/og-default\.jpg/)
  const anon = await playwright.request.newContext()
  const res = await anon.get(ogImage!)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/')
  await anon.dispose()
})

test('old WordPress gallery link /galeria-hot/ still ends at /modelos with a permanent redirect', async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('models')
  await api.createModel({ name: 'Aurora', photos: 1, order: 1 })

  const first = await request.get('/galeria-hot/', { maxRedirects: 0, headers: HEADERS })
  expect([301, 308]).toContain(first.status())
  const { hops, final, status } = await follow(request, '/galeria-hot/')
  for (const h of hops.filter((x) => x.status >= 300 && x.status < 400)) expect([301, 308]).toContain(h.status)
  expect(final).toBe('/modelos')
  expect(status).toBe(200)
})
