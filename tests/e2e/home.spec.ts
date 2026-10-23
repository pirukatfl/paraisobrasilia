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

  // the flyer is its own button (enlarges), sibling of the title/date link
  const img = page.getByRole('button', { name: 'Ampliar flyer da festa Festa de Teste' }).first().locator('img').first()
  await expect(img).toBeVisible()
  await expect(img).toHaveAttribute('alt', /.+/)
})

test('with parties the house sections follow the party grid', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximas festas', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Paraíso Brasília', level: 1 })).toHaveCount(0)
  const headings = await page.locator('main h1, main h2').allTextContents()
  const grid = headings.indexOf('Próximas festas')
  expect(grid).toBe(0)
  expect(headings.indexOf('Quem somos')).toBeGreaterThan(grid)
  expect(headings.indexOf('Como chegar')).toBeGreaterThan(headings.indexOf('Quem somos'))
})
