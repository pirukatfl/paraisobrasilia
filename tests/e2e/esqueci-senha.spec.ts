import { expect, test } from '@playwright/test'

// "Esqueci minha senha": no self-service reset; the visitor is sent to support (WhatsApp / e-mail).
test('/entrar links to the support page', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/entrar')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await expect(page).toHaveURL(/\/esqueci-senha$/)
  await expect(page.getByRole('heading', { name: 'Esqueci minha senha', level: 1 })).toBeVisible()
  await expect(page.locator('main form')).toHaveCount(0)
  await expect(page.locator('main a[href^="https://wa.me/"], main a[href^="mailto:"]').first()).toBeVisible()
  await context.close()
})

test('public forgot-password REST stays closed', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  expect((await anon.post('/api/assinantes/forgot-password', { data: { email: 'x@teste.local' } })).status()).toBe(403)
  await anon.dispose()
})
