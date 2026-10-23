import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'
import { getTestPayload, seedAd, seedAdMedia } from '../helpers/seed'

// Client decision 2026-10-22: the old ClassiSex and Mural ads come in PUBLISHED. Visitors read the text with
// every contact removed on the server and see one sharp photo; the contact stays inside the member area.
test.skip(({ isMobile }) => isMobile, 'one project is enough for this flow')
test.describe.configure({ mode: 'serial' })

const OWNER = { email: 'dona.antiga@teste.local', name: 'Dona Antiga Secreta', password: 'senha-antiga-12345' }
const VISIVEL = 'Casal antigo do mural procura amigos'
const TEXTO = `${VISIVEL}. Chama no zap 61 97766-5544 ou antigo@exemplo.com ou @casal_antigo ou https://exemplo.com/antigo. `.repeat(8) // > 600
const SECRETS = ['97766', 'antigo@exemplo.com', '@casal_antigo', 'exemplo.com/antigo', OWNER.name, OWNER.email]

let adId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  const ownerId = (await api.createAssinante(OWNER)).id // free account: its approved ad stays up (G-05)
  const payload = await getTestPayload()
  adId = (
    await seedAd(payload, {
      author: ownerId,
      apelido: 'Casal do Mural',
      cidade: 'Gama',
      texto: TEXTO,
      status: 'aprovado',
      contato: {},
      wpCommentId: 8801,
    })
  ).id
  await seedAdMedia(payload, { ad: adId })
  // the seed ran outside the server: a no-op staff save makes the server expire its ad caches
  await api.updateAd(adId, { cidade: 'Gama' })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

test('the open board shows a published old ad with the text redacted and a sharp cover', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/classisex')
  const card = page.getByRole('main').getByRole('article').filter({ hasText: 'Casal do Mural' })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('Casal · Gama')
  await expect(card).toContainText(VISIVEL)
  await expect(card).toContainText('[contato só para assinantes]')
  await expect(card.locator('img')).toHaveCount(1)
  await expect(card.locator('img').first()).toHaveAttribute('alt', 'Foto do anúncio')
  const html = await page.content()
  const raw = await (await request.get('/classisex')).text() // includes the RSC payload
  for (const body of [html, raw]) for (const secret of SECRETS) expect(body, secret).not.toContain(secret)
  await context.close()
})

test('REST gives visitors nothing of the old ad', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL })
  for (const path of ['/api/ads?depth=2&limit=100', `/api/ads/${adId}?depth=2`, '/api/ad-media?limit=100']) {
    const res = await anon.get(path)
    const body = await res.text()
    for (const secret of SECRETS) expect(body, path).not.toContain(secret)
  }
  await anon.dispose()
})
