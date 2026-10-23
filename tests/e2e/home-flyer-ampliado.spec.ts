import { expect, test } from '@playwright/test'

// Home: clicking a flyer (carousel or grid card) opens it big in the lightbox, navigable between parties.
test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

const OPEN_NAME = 'Ampliar flyer da festa Festa de Teste'

test('clicking the flyer opens it big, with a link to the party page', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: OPEN_NAME }).first()
  const alt = await page.locator('[data-slide="1"] img').getAttribute('alt')
  expect(alt).toBeTruthy()

  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Flyers das festas' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('img', { name: alt! })).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Ver detalhes da festa', exact: true })).toHaveAttribute(
    'href',
    '/festas/festa-de-teste',
  )

  // the card link keeps its own, unique name on the page
  await expect(page.getByRole('link', { name: 'Ver detalhes da festa Festa de Teste' }).first()).toBeAttached()
})

test('a small flyer is scaled up to fill the lightbox on desktop', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop viewport only')
  await page.goto('/')
  await page.getByRole('button', { name: OPEN_NAME }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Flyers das festas' })
  await expect(dialog).toBeVisible()
  const img = dialog.locator('img').first()
  await expect(img).toBeVisible()
  const box = await img.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.height >= viewport.height * 0.6 || box!.width >= viewport.width * 0.8).toBe(true)
})

test('arrow keys move between the upcoming parties', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: OPEN_NAME }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Flyers das festas' })
  await expect(dialog).toBeVisible()
  const link = dialog.getByRole('link', { name: 'Ver detalhes da festa', exact: true })
  await expect(link).toHaveAttribute('href', '/festas/festa-de-teste')
  await page.keyboard.press('ArrowRight')
  await expect(link).toHaveAttribute('href', /^\/festas\/(?!festa-de-teste$).+/)
  await page.keyboard.press('ArrowLeft')
  await expect(link).toHaveAttribute('href', '/festas/festa-de-teste')
})

test('a grid card flyer opens the lightbox on its own party', async ({ page }) => {
  await page.goto('/')
  const gridButton = page.getByRole('button', { name: /^Ampliar flyer da festa Festa Paisagem$/ }).last()
  await gridButton.scrollIntoViewIfNeeded()
  await gridButton.click()
  const dialog = page.getByRole('dialog', { name: 'Flyers das festas' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Ver detalhes da festa', exact: true })).toHaveAttribute('href', /^\/festas\/.+/)
  await expect(dialog.getByText(/^Festa Paisagem · /)).toBeVisible()
})

test('Escape closes it and returns focus to the flyer button', async ({ page }) => {
  await page.goto('/')
  const opener = page.getByRole('button', { name: OPEN_NAME }).first()
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Flyers das festas' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
})
