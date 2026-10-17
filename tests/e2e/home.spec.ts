import { expect, test } from '@playwright/test'

// FEST-01 happy path: the visitor sees the upcoming party flyer linking to its page.
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test('home shows the upcoming party flyer linking to its page', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximas festas', level: 1 })).toBeVisible()

  const card = page.getByRole('link', { name: 'Ver detalhes da festa Festa de Teste' })
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('href', '/festas/festa-de-teste')

  const img = card.locator('img').first()
  await expect(img).toBeVisible()
  await expect(img).toHaveAttribute('alt', /.+/)
})
