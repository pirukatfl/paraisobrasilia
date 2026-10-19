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
