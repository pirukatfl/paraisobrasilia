import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// ASS-05, D-02, D-03: plans with prices, PagBank links when present, WhatsApp receipt.
test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

/** Restores the four seed plans to their seeded values (global setup state). */
async function restoreSeed(request: Parameters<typeof staffApi>[0]) {
  const api = await staffApi(request)
  const seed: Record<string, { price: number }> = {
    Mensal: { price: 30 },
    Trimestral: { price: 75 },
    Semestral: { price: 135 },
    Anual: { price: 240 },
  }
  for (const plan of await api.findPlans()) {
    if (!seed[plan.name]) continue
    await api.updatePlan(plan.id, { price: seed[plan.name].price, promoPrice: null, paymentUrl: '', active: true })
  }
  await api.dispose()
}

test.afterAll(async ({ request }) => {
  await restoreSeed(request)
})

test('seed plans show in order with prices and WhatsApp instead of Pagar', async ({ page, request }) => {
  await restoreSeed(request)
  await page.goto('/assine-ja')
  await expect(page.getByRole('heading', { name: 'Assine Já', level: 1 })).toBeVisible()
  const cards = page.locator('main ul[role="list"] > li')
  await expect(cards).toHaveCount(4)
  await expect(cards.locator('h3')).toHaveText(['Mensal', 'Trimestral', 'Semestral', 'Anual'])
  await expect(cards.nth(0)).toContainText('30 dias')
  await expect(cards.nth(0)).toContainText('R$ 30')
  await expect(page.getByRole('link', { name: /^Pagar/ })).toHaveCount(0)
  for (let i = 0; i < 4; i++) {
    await expect(cards.nth(i).getByRole('link', { name: /Combinar pelo WhatsApp/ })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/5561999889772\?text=/,
    )
  }
})

test('promo price, PagBank link and inactive plans follow the panel', async ({ page, request }) => {
  const api = await staffApi(request)
  const plans = await api.findPlans()
  const tri = plans.find((p) => p.name === 'Trimestral')!
  const anual = plans.find((p) => p.name === 'Anual')!
  await api.updatePlan(tri.id, { promoPrice: 60, paymentUrl: 'https://pag.ae/teste-trimestral' })
  await api.updatePlan(anual.id, { active: false })

  await page.goto('/assine-ja')
  const cards = page.locator('main ul[role="list"] > li')
  await expect(cards).toHaveCount(3)
  await expect(cards.locator('h3')).toHaveText(['Mensal', 'Trimestral', 'Semestral'])
  const card = cards.nth(1)
  await expect(card.locator('s')).toHaveText('de R$ 75')
  await expect(card).toContainText('por R$ 60')
  const pagar = card.getByRole('link', { name: /^Pagar/ })
  await expect(pagar).toHaveAttribute('href', 'https://pag.ae/teste-trimestral')
  await expect(pagar).toHaveAttribute('target', '_blank')
  await expect(pagar).toHaveAttribute('rel', /noopener/)
  await expect(card.getByRole('link', { name: /Combinar pelo WhatsApp/ })).toHaveCount(0)
})

test('Grátis × Assinante comparison sits above the plans (G-06)', async ({ page }) => {
  await page.goto('/assine-ja')
  const quadro = page.getByTestId('comparativo-planos')
  await expect(quadro).toBeVisible()
  await expect(quadro).toContainText('Grátis')
  await expect(quadro).toContainText('Assinante')
  await expect(quadro).toContainText('Fotos por anúncio')
  const quadroY = (await quadro.boundingBox())!.y
  const planosY = (await page.locator('main ul[role="list"] > li').first().boundingBox())!.y
  expect(quadroY).toBeLessThan(planosY)
})

test('Como assinar explains the steps and links to WhatsApp and /entrar', async ({ page }) => {
  await page.goto('/assine-ja')
  const como = page.locator('section', { has: page.getByRole('heading', { name: 'Como assinar' }) })
  await expect(como.locator('ol > li')).toHaveCount(4)
  await expect(como.locator('ol > li').nth(0)).toContainText('Crie sua conta grátis')
  await expect(como.locator('ol > li').nth(3)).toContainText('libera a assinatura na sua conta')
  await expect(como.getByRole('link', { name: /Enviar comprovante pelo WhatsApp/ })).toHaveAttribute(
    'href',
    /^https:\/\/wa\.me\/5561999889772\?text=/,
  )
  await expect(como.getByRole('link', { name: 'Já é assinante? Entrar' })).toHaveAttribute('href', '/entrar')
})

test('Assine Já sits between Contato and Área do assinante in menu and footer', async ({ page, isMobile }) => {
  await page.goto('/')
  let links
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    links = page.getByRole('navigation', { name: 'Menu' }).locator(':scope > ul > li > a')
  } else {
    links = page.getByRole('navigation', { name: 'Principal' }).getByRole('link')
  }
  const labels = await links.allTextContents()
  const i = labels.indexOf('Contato')
  expect(labels.slice(i, i + 3)).toEqual(['Contato', 'Assine Já', 'Área do assinante'])
  const footer = page.getByRole('navigation', { name: 'Rodapé' })
  await expect(footer.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await expect(footer.getByRole('link', { name: 'Área do assinante' })).toHaveAttribute('href', '/area-do-assinante')
})
