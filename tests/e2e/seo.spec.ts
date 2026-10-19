import { expect, test } from '@playwright/test'

// FEST-03 share preview + INST-05 metadata and staging noindex.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test('party page exposes Open Graph tags with a reachable JPEG share image', async ({ page, playwright }) => {
  await page.goto('/festas/festa-de-teste')
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Festa de Teste/)
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Paraíso Brasília')

  const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content')
  const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000'
  expect(ogImage).toBeTruthy()
  expect(ogImage!.startsWith(serverUrl)).toBe(true)

  // Fetch like a scraper: fresh context, no cookies
  const anon = await playwright.request.newContext()
  const res = await anon.get(ogImage!)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/jpeg')
  expect((await res.body()).length).toBeLessThanOrEqual(300_000)
  await anon.dispose()
})

test('staging is not indexable', async ({ request }) => {
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(await robots.text()).toMatch(/Disallow: \/\s*$/m)

  for (const path of ['/', '/festas/festa-de-teste']) {
    const res = await request.get(path)
    expect(res.headers()['x-robots-tag']).toContain('noindex')
  }
})

test('sitemap lists upcoming parties only', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
  const xml = await res.text()
  expect(xml).toContain('/festas/festa-de-teste')
  expect(xml).not.toContain('/festas/festa-passada')
})

test('sitemap lists the published institutional pages (INST-01, INST-06)', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text()
  for (const path of [
    '/contato',
    '/quem-somos',
    '/quem-somos/normas',
    '/quem-somos/regras',
    '/quem-somos/dicas',
    '/termos-de-uso',
    '/politica-de-privacidade',
  ]) {
    expect(xml).toContain(`${path}</loc>`)
  }
})

test('open pages have unique titles, descriptions, share tags and canonical links', async ({ page, request }) => {
  const paths = [
    '/quem-somos',
    '/quem-somos/normas',
    '/quem-somos/regras',
    '/quem-somos/dicas',
    '/termos-de-uso',
    '/politica-de-privacidade',
    '/espaco',
    '/contato',
  ]
  const titles = new Set<string>()
  for (const path of paths) {
    await page.goto(path)
    const title = await page.title()
    expect(title, path).toMatch(/ · Paraíso Brasília$/)
    titles.add(title)
    await expect(page.locator('meta[name="description"]'), path).toHaveAttribute('content', /.{20,}/)
    await expect(page.locator('meta[property="og:title"]'), path).toHaveAttribute('content', /.+/)
    await expect(page.locator('meta[property="og:image"]').first(), path).toHaveAttribute('content', /og-default\.jpg/)
    await expect(page.locator('link[rel="canonical"]'), path).toHaveAttribute('href', new RegExp(`${path}$`))
    const res = await request.get(path)
    expect(res.headers()['x-robots-tag'], path).toContain('noindex')
  }
  expect(titles.size).toBe(paths.length)
})
