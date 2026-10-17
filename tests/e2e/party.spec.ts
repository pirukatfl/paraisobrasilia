import { expect, test } from '@playwright/test'

import { brasiliaAt } from '../helpers/dates'

// FEST-02: tapping a flyer opens the complete party page (D-05), no WhatsApp/address (D-06, D-07).
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

function expectedLongDate(iso: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  )
  const weekday = String(p.weekday)
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${p.day} de ${p.month}`
}

test('flyer opens the party page with all details', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Ver detalhes da festa Festa de Teste' }).click()
  await expect(page).toHaveURL(/\/festas\/festa-de-teste$/)

  await expect(page.getByRole('heading', { name: 'Festa de Teste', level: 1 })).toBeVisible()
  await expect(page.getByText(expectedLongDate(brasiliaAt(3, 23)))).toBeVisible()
  await expect(page.getByText('A partir das 23h')).toBeVisible()

  for (const section of ['Valores', 'Dress code', 'Atrações', 'Sobre a festa']) {
    await expect(page.getByRole('heading', { name: section, level: 2 })).toBeVisible()
  }
  const prices = page.getByRole('list', { name: 'Valores' })
  for (const [label, value] of [
    ['Casal', 'R$ 150'],
    ['Mulher sozinha', 'R$ 50'],
    ['Homem sozinho', 'R$ 250'],
  ]) {
    const row = prices.getByRole('listitem').filter({ hasText: label })
    await expect(row).toContainText(value)
  }
  await expect(page.getByText('Preto e vermelho')).toBeVisible()
  const attractions = page.getByRole('list', { name: 'Atrações' })
  await expect(attractions).toContainText('DJ')
  await expect(attractions).toContainText('DJ Teste')
  await expect(page.getByText('Abertura da casa às 23h. Traje elegante.')).toBeVisible()

  // D-06 / D-07: no per-party WhatsApp CTA, no address
  await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp" i]')).toHaveCount(0)
  await expect(page.getByText('Endereço')).toHaveCount(0)
})

test('a past party stays reachable and says it already happened', async ({ page }) => {
  await page.goto('/festas/festa-passada')
  await expect(page.getByText('Esta festa já aconteceu')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver próximas festas' })).toBeVisible()
})

test('unknown party returns 404', async ({ page }) => {
  const res = await page.goto('/festas/nao-existe')
  expect(res?.status()).toBe(404)
})
