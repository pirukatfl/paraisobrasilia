import { expect, test } from '@playwright/test'

// INST-02, INST-03: address, map, "Como chegar" and WhatsApp on /contato (D-01..D-04).
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test('contato shows the address, directions, WhatsApp and the OpenStreetMap map', async ({ page }) => {
  await page.goto('/contato')
  await expect(page.getByRole('heading', { name: 'Contato e como chegar', level: 1 })).toBeVisible()

  const main = page.locator('main')
  await expect(main).toContainText('Rua 15, Travessa 01, Chácara 02')
  await expect(main).toContainText('Núcleo Rural Lago Oeste, Sobradinho – DF')
  await expect(main).toContainText('73100-450')

  const links = [
    { name: 'Como chegar — Google Maps', href: /^https:\/\/www\.google\.com\/maps\/dir\// },
    { name: 'Como chegar — Waze', href: /^https:\/\/waze\.com\/ul/ },
    { name: 'Chamar no WhatsApp', href: /^https:\/\/wa\.me\/5561999889772$/ },
  ]
  for (const { name, href } of links) {
    const link = main.getByRole('link', { name })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', href)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
  }

  const map = page.locator('iframe[title="Mapa com a localização do Paraíso Brasília"]')
  await expect(map).toHaveCount(1)
  const src = await map.getAttribute('src')
  expect(new URL(src!).host).toBe('www.openstreetmap.org')

  // D-04: no Facebook anywhere and no Instagram while the handle is empty
  const html = await page.content()
  expect(html).not.toContain('facebook.com')
  expect(html).not.toContain('instagram.com')
})
