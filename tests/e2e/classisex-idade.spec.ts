import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// Lote 4 K: the optional age of the ad is filtered and shown ONLY in the members area. The open
// ClassiSex keeps just "Eu sou": no age or city filter, no age in its HTML or in any anonymous API.
test.describe.configure({ mode: 'serial' })

const DAY = 86_400_000
const PASSWORD = 'senha-idade-12345'
const AUTORA = { email: 'ines.idade@teste.local', name: 'Ines Idade', password: PASSWORD }
const LEITOR = { email: 'leo.idade@teste.local', name: 'Leo Leitor', password: PASSWORD }

// apelido -> age. "Sem Idade" has none and must only show under "Todas".
const ANUNCIOS: [string, number | undefined][] = [
  ['Anuncio Vinte', 25],
  ['Anuncio Trinta', 34],
  ['Anuncio Quarenta', 45],
  ['Anuncio Cinquenta', 61],
  ['Anuncio Sem Idade', undefined],
]

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  const autoraId = (await api.createAssinante(AUTORA)).id
  await api.liberar(autoraId, { durationDays: 30, method: 'cortesia', amount: 0 })
  const leitorId = (await api.createAssinante(LEITOR)).id
  await api.liberar(leitorId, { durationDays: 30, method: 'cortesia', amount: 0 })
  for (const [i, [apelido, idade]] of ANUNCIOS.entries()) {
    await api.createAd({
      author: autoraId,
      apelido,
      idade,
      texto: `Texto do ${apelido}.`,
      status: 'aprovado',
      publishedAt: new Date(Date.now() - i * 60_000 - DAY).toISOString(),
    })
  }
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  await api.dispose()
})

async function comoAssinante(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, LEITOR.email, LEITOR.password)
  return { page, context }
}

test('members filter by age range; "Todas" lists the ad without age; the card shows the age', async ({ browser, baseURL }) => {
  const { page, context } = await comoAssinante(browser, baseURL!)
  await page.goto('/area-do-assinante/classisex')
  const main = page.locator('main')
  const cards = main.getByRole('article')
  await expect(cards).toHaveCount(5)
  await expect(cards.filter({ hasText: 'Anuncio Trinta' })).toContainText('34 anos')
  await expect(cards.filter({ hasText: 'Anuncio Sem Idade' })).not.toContainText('anos')

  const filtro = main.getByLabel('Idade', { exact: true })
  await expect(filtro.locator('option')).toHaveText(['Todas', '18 a 29 anos', '30 a 39 anos', '40 a 49 anos', '50 anos ou mais'])
  await filtro.selectOption({ label: '30 a 39 anos' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(page).toHaveURL(/idade=30-39/)
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Anuncio Trinta')

  await main.getByLabel('Idade', { exact: true }).selectOption({ label: '50 anos ou mais' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(cards).toHaveCount(1)
  await expect(cards).toContainText('Anuncio Cinquenta')

  await main.getByLabel('Idade', { exact: true }).selectOption({ label: 'Todas' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await expect(cards).toHaveCount(5)

  // A forged value is "Todas", never an error
  await page.goto('/area-do-assinante/classisex?idade=1%27%20OR%201=1')
  await expect(cards).toHaveCount(5)

  await main.getByLabel('Idade', { exact: true }).selectOption({ label: '18 a 29 anos' })
  await main.getByRole('button', { name: 'Filtrar' }).click()
  await main.getByRole('link', { name: 'Limpar filtros' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\/classisex$/)
  await expect(cards).toHaveCount(5)
  await context.close()
})

test('the ad page shows the age to the member', async ({ browser, baseURL }) => {
  const { page, context } = await comoAssinante(browser, baseURL!)
  await page.goto('/area-do-assinante/classisex')
  await page.locator('main').getByRole('article').filter({ hasText: 'Anuncio Quarenta' }).getByRole('link', { name: /Ver anúncio/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('45 anos')
  await context.close()
})

test('open ClassiSex: no age or city filter and no age anywhere in the page, even with ?idade=', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL: baseURL! })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  for (const url of ['/classisex', '/classisex?idade=30-39&cidade=Brasilia']) {
    const response = await page.goto(url)
    expect(response?.status()).toBe(200)
    const main = page.locator('main')
    // only "Eu sou" filters the open area
    await expect(main.getByLabel('Eu sou')).toBeVisible()
    await expect(main.getByLabel('Idade', { exact: true })).toHaveCount(0)
    await expect(main.getByLabel('Cidade', { exact: true })).toHaveCount(0)
    await expect(main.locator('[name="idade"], [name="cidade"], #filtro-idade, #filtro-cidade')).toHaveCount(0)
    // the filter is ignored: all five ads are there, and none shows an age
    await expect(main.getByRole('article')).toHaveCount(5)
    await expect(main).not.toContainText(/\d\s*anos/)
    const html = await page.content()
    for (const proibido of ['34 anos', '45 anos', '61 anos', '25 anos', 'filtro-idade']) {
      expect(html, proibido).not.toContain(proibido)
    }
    // the same bytes the browser got, including the flight (RSC) payload
    expect(html).not.toMatch(/"idade"\s*:\s*\d/)
    const bruto = await (await context.request.get(url)).text()
    expect(bruto).not.toMatch(/"idade"\s*:\s*\d/)
    expect(bruto).not.toContain('filtro-idade')
  }
  await context.close()
})

test('REST: anonymous cannot read ads and a member cannot read the age through the API', async ({ request, browser, baseURL }) => {
  const anon = await request.get('/api/ads?limit=50&depth=0')
  expect([401, 403]).toContain(anon.status())
  expect(await anon.text()).not.toMatch(/"idade"\s*:\s*\d/)

  const { page, context } = await comoAssinante(browser, baseURL!)
  const logado = await page.request.get('/api/ads?limit=50&depth=0')
  expect([401, 403]).toContain(logado.status())
  expect(await logado.text()).not.toMatch(/"idade"\s*:\s*\d/)
  await context.close()
})
