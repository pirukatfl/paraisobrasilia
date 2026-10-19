import { expect, test } from '@playwright/test'

// INST-01: Quem somos with Normas, Regras and Dicas (seeded texts).
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test('Quem somos shows the text and the sub-tabs', async ({ page }) => {
  await page.goto('/quem-somos')
  await expect(page.getByRole('heading', { name: 'Quem somos', level: 1 })).toBeVisible()
  const tabs = page.getByRole('navigation', { name: 'Quem somos' })
  await expect(tabs.getByRole('link')).toHaveCount(4)
  await expect(tabs.getByRole('link', { name: 'Quem somos' })).toHaveAttribute('aria-current', 'page')

  await tabs.getByRole('link', { name: 'Normas' }).click()
  await expect(page).toHaveURL(/\/quem-somos\/normas$/)
  await expect(page.getByRole('heading', { name: 'Normas da casa', level: 1 })).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Quem somos' }).getByRole('link', { name: 'Normas' }),
  ).toHaveAttribute('aria-current', 'page')
})

test('Regras and Dicas render their texts', async ({ page }) => {
  await page.goto('/quem-somos/regras')
  await expect(page.getByRole('heading', { name: 'Regras e procedimentos', level: 1 })).toBeVisible()
  await expect(page.locator('main')).toContainText('Esporte fino')
  await expect(page.getByRole('link', { name: 'Próximo: Dicas →' })).toHaveAttribute('href', '/quem-somos/dicas')

  await page.goto('/quem-somos/dicas')
  await expect(page.getByRole('heading', { name: 'Perguntas frequentes', level: 2 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver próximas festas' })).toBeVisible()
})

test('unknown Quem somos section is a 404', async ({ page }) => {
  const res = await page.goto('/quem-somos/qualquer-coisa')
  expect(res?.status()).toBe(404)
})

// INST-06: legal pages reachable from every page footer
test('footer links open Termos de Uso and Política de Privacidade', async ({ page }) => {
  await page.goto('/')
  const footer = page.locator('footer')
  await footer.getByRole('link', { name: 'Termos de Uso' }).click()
  await expect(page).toHaveURL(/\/termos-de-uso$/)
  await expect(page.getByRole('heading', { name: 'Termos de Uso', level: 1 })).toBeVisible()
  await expect(page.locator('main')).toContainText('Atualizado em')

  await page.locator('footer').getByRole('link', { name: 'Política de Privacidade' }).click()
  await expect(page).toHaveURL(/\/politica-de-privacidade$/)
  const main = page.locator('main')
  await expect(main.getByRole('heading', { name: '9. Pedido de remoção de imagem' })).toBeVisible()
  await expect(main.locator('a[href="https://wa.me/5561999889772"]')).toHaveCount(1)
  await expect(main).toContainText('[VALIDAR')
})

test('mobile menu lists Quem somos with Normas, Regras and Dicas', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile menu')
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  const menu = page.getByRole('navigation', { name: 'Menu' })
  for (const name of ['Quem somos', 'Normas', 'Regras', 'Dicas']) {
    await expect(menu.getByRole('link', { name, exact: true })).toBeVisible()
  }
  await menu.getByRole('link', { name: 'Regras', exact: true }).click()
  await expect(page).toHaveURL(/\/quem-somos\/regras$/)
  await expect(menu).toBeHidden()
})

test('desktop nav marks Quem somos on its sub-pages', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop nav')
  await page.goto('/quem-somos/regras')
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Quem somos' }),
  ).toHaveAttribute('aria-current', 'page')
})

test.describe('staff edits a page (PAINEL-04)', () => {
  test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
  test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

  test('new title is live after Publicar, then reverted', async ({ page, context }) => {
    test.setTimeout(180_000)
    const { loginAsStaff } = await import('./helpers/staff')
    await loginAsStaff(page)

    await page.goto('/admin/collections/pages')
    const href = await page.getByRole('link', { name: 'Regras e procedimentos' }).first().getAttribute('href')
    await page.goto(href!)
    await expect(page.locator('#field-title')).toHaveValue('Regras e procedimentos')

    const publishTitle = async (title: string) => {
      await page.locator('#field-title').fill(title)
      await page.getByRole('button', { name: 'Publicar alterações' }).click()
      await expect(page.getByText('Status: Publicado')).toBeVisible()
    }

    await publishTitle('Regras da casa (teste)')
    const site = await context.newPage()
    await site.goto('/quem-somos/regras')
    await expect(site.getByRole('heading', { name: 'Regras da casa (teste)', level: 1 })).toBeVisible()

    await publishTitle('Regras e procedimentos')
    await site.goto('/quem-somos/regras')
    await expect(site.getByRole('heading', { name: 'Regras e procedimentos', level: 1 })).toBeVisible()
  })
})
