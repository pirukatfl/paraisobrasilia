import { expect, test } from '@playwright/test'

// INST-04: 18+ self-declaration overlay; no cookie set beforehand in this file.
const DIALOG_NAME = 'Conteúdo para maiores de 18 anos'
const ENTER = 'Tenho 18 anos ou mais — Entrar'

test('first visit shows the gate over fully rendered HTML', async ({ page, request }) => {
  const res = await request.get('/', { maxRedirects: 0 })
  expect(res.status()).toBe(200) // no redirect
  const html = await res.text()
  expect(html).toContain('Próximas festas')
  expect(html).toContain('og:site_name')
  expect(html).toContain(DIALOG_NAME)

  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: DIALOG_NAME })
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('button', { name: ENTER })).toBeFocused()
})

test('confirming hides the gate and remembers the choice', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: ENTER }).click()
  await expect(page.getByRole('dialog', { name: DIALOG_NAME })).toBeHidden()

  const cookie = (await context.cookies()).find((c) => c.name === 'pb_age_ok')
  expect(cookie?.value).toBe('1')

  await page.reload()
  await expect(page.getByRole('dialog', { name: DIALOG_NAME })).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Próximas festas' })).toBeVisible()
})

test('"Sair do site" leaves the site', async ({ page }) => {
  await page.route('https://www.google.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>fora</title>' }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Sair do site' }).click()
  await page.waitForURL(/^https:\/\/www\.google\.com/)
  expect(page.url()).toMatch(/^https:\/\/www\.google\.com/)
})
