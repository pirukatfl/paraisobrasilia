import { expect, test } from '@playwright/test'

// Brand shell (D-01..D-04) and site-wide metadata (INST-05).
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test('home renders inside the branded shell with site metadata', async ({ page }) => {
  await page.goto('/')

  const logoLink = page.getByRole('link', { name: 'Paraíso Brasília — página inicial' })
  await expect(logoLink).toBeVisible()
  await expect(logoLink.locator('img')).toHaveAttribute('src', /\/brand\/logo-/)

  const footer = page.locator('footer')
  await expect(footer).toContainText('Proibido para menores de 18 anos')
  await expect(footer).toContainText(String(new Date().getFullYear()))

  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR')
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Paraíso Brasília')
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'pt_BR')
  await expect(page.locator('meta[name="rating"]').first()).toHaveAttribute('content', /.+/)
})

test('brand icon is served', async ({ request }) => {
  const res = await request.get('/icon.png')
  expect(res.status()).toBe(200)
})

test('unknown URL shows the not-found page', async ({ page }) => {
  const res = await page.goto('/pagina-que-nao-existe')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver próximas festas' })).toBeVisible()
})
