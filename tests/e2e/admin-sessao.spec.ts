import { expect, test } from '@playwright/test'

import { loginAsStaff, STAFF_EMAIL } from './helpers/staff'

// Regression (staging login loop): browsers that omit Sec-Fetch-* (Safari < 16.4, WebViews,
// header-stripping proxies) were bounced to /admin/login right after a successful login.
test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR' })

test('staff stays logged in when the browser sends no Sec-Fetch-* headers', async ({ page, context, baseURL }) => {
  test.setTimeout(180_000)
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await context.route(`${new URL(baseURL!).origin}/**`, async (route) => {
    const headers = { ...route.request().headers() }
    for (const name of Object.keys(headers)) if (name.toLowerCase().startsWith('sec-fetch-')) delete headers[name]
    // Chromium re-adds Sec-Fetch-* to anything it sends itself, so the request is replayed from
    // Node (route.fetch), which sends none, and the response is handed back to the page.
    const response = await route.fetch({ headers })
    await route.fulfill({ response })
  })

  await loginAsStaff(page)
  await expect(page).toHaveURL(/\/admin\/?$/)
  await expect(page).not.toHaveURL(/login/)

  for (const slug of ['parties', 'media']) {
    await page.goto(`/admin/collections/${slug}`)
    await expect(page).toHaveURL(new RegExp(`/admin/collections/${slug}`))
    await expect(page).not.toHaveURL(/login/)
  }
  await page.goto('/admin')
  await expect(page).not.toHaveURL(/login/)
  const me = await page.evaluate(async () => (await (await fetch('/api/users/me', { credentials: 'include' })).json()) as { user?: { email?: string } | null })
  expect(me.user?.email).toBe(STAFF_EMAIL)
})
