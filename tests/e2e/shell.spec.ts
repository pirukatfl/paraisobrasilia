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

// Phase 2 navigation shell (INST-03): header menu and contact footer on every page.
test('mobile menu opens, lists the sections and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile disclosure menu')
  await page.goto('/')
  const button = page.getByRole('button', { name: 'Abrir menu' })
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await button.click()
  const close = page.getByRole('button', { name: 'Fechar menu' })
  await expect(close).toHaveAttribute('aria-expanded', 'true')
  const menu = page.getByRole('navigation', { name: 'Menu' })
  await expect(menu.getByRole('link', { name: 'Festas' })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Contato' })).toBeVisible()
  await expect(menu.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await expect(menu.getByRole('link', { name: 'Área do assinante' })).toHaveAttribute('href', '/area-do-assinante')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
  await expect(menu).toBeHidden()
})

test('desktop navigation is inline and marks the current page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop inline navigation')
  await page.goto('/contato')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav.getByRole('link', { name: 'Festas' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Contato' })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await expect(nav.getByRole('link', { name: 'Área do assinante' })).toHaveAttribute('href', '/area-do-assinante')
})

test('footer shows address, WhatsApp, e-mail and the 18+ line', async ({ page }) => {
  await page.goto('/')
  const footer = page.locator('footer')
  await expect(footer).toContainText('Rua 15, Travessa 01, Chácara 02')
  await expect(footer.getByRole('link', { name: 'Chamar no WhatsApp' })).toHaveAttribute(
    'href',
    'https://wa.me/5561999889772',
  )
  await expect(footer.locator('a[href="mailto:suporte@swingbrasilia.com.br"]')).toHaveCount(1)
  await expect(footer).toContainText('Proibido para menores de 18 anos')
})
