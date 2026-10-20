import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'

// PREV-02 / PREV-04 / D-05: the open /recados teaser carries no apelido, contact or id and tracks
// moderation and expiry; every preview has an "Assine Já" link (T-05-03, T-05-19, T-05-27).
test.describe.configure({ mode: 'serial' })

const RITA = { email: 'rita.previa@teste.local', name: 'Rita Recado', password: 'senha-rita-12345' }
const APELIDO = 'RitaSentinela'
const TEXTO = 'Casal tranquilo, chama no 61 98877-6655 ou @ritacasal'
let ritaId = 0
let recadoId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('contos')
  await api.deleteAll('assinantes')
  ritaId = (await api.createAssinante(RITA)).id
  await api.liberar(ritaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  recadoId = (await api.createRecado({ author: ritaId, apelido: APELIDO, texto: TEXTO, status: 'aprovado' })).id
  await api.createConto({
    title: 'Conto de Previa',
    slug: 'conto-de-previa',
    paragrafos: ['Primeiro aberto.', 'Segundo aberto.', 'Terceiro aberto.', 'Quarto fechado.'],
  })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('contos')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function visitor(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test('Recados is in the menu and /recados shows the teaser without apelido or contacts', async ({
  browser,
  baseURL,
  isMobile,
}) => {
  const { context, page } = await visitor(browser, baseURL!)
  await page.goto('/')
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu' }).click()
  const nav = page.getByRole('navigation', { name: isMobile ? 'Menu' : 'Principal' })
  const labels = await nav.getByRole('link').allTextContents()
  const order = labels.map((l) => l.trim()).filter((l) => ['ClassiSex', 'Recados', 'Contos'].includes(l))
  expect(order).toEqual(['ClassiSex', 'Recados', 'Contos'])
  await nav.getByRole('link', { name: 'Recados' }).click()
  await expect(page).toHaveURL(/\/recados$/)
  await expect(page.getByRole('heading', { name: 'Recados', level: 1 })).toBeVisible()
  const main = page.locator('main')
  await expect(main).toContainText('1 recado novo esta semana')
  const snippet = main.locator('blockquote')
  await expect(snippet).toHaveCount(1)
  await expect(snippet).toContainText('Casal tranquilo, chama no')
  await expect(snippet).not.toContainText('98877')
  await expect(snippet).not.toContainText('@')
  await expect(main).not.toContainText(APELIDO)
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  await expect(main.getByRole('link', { name: 'Já sou assinante' })).toHaveAttribute('href', '/area-do-assinante/recados')
  await context.close()
})

test('raw HTML and RSC payload of /recados carry no apelido, phone, handle or members link', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  for (const headers of [{} as Record<string, string>, { RSC: '1' }]) {
    const body = await (await page.request.get('/recados', { headers })).text()
    for (const forbidden of [APELIDO, '98877', '@ritacasal', '/area-do-assinante/mensagens']) {
      expect(body).not.toContain(forbidden)
    }
  }
  await context.close()
})

test('every public preview has an Assine Já link to /assine-ja', async ({ browser, baseURL }) => {
  const { context, page } = await visitor(browser, baseURL!)
  for (const path of ['/classisex', '/recados', '/contos', '/contos/conto-de-previa']) {
    await page.goto(path)
    await expect(page.locator('main').getByRole('link', { name: 'Assine Já' }).first(), path).toHaveAttribute('href', '/assine-ja')
  }
  await context.close()
})

test('unpublishing the recado or ending the access changes the teaser on the next load', async ({ browser, baseURL, request }) => {
  const { context, page } = await visitor(browser, baseURL!)
  const api = await staffApi(request)
  await api.despublicarRecado(recadoId, 'Teste de despublicação')
  await page.goto('/recados')
  await expect(page.locator('main')).toContainText('Novos recados toda semana.')
  await expect(page.locator('main blockquote')).toHaveCount(0)
  await expect(page.locator('main').getByRole('link', { name: 'Assine Já' }).first()).toHaveAttribute('href', '/assine-ja')

  await api.aprovarRecado(recadoId)
  await page.goto('/recados')
  await expect(page.locator('main')).toContainText('1 recado novo esta semana')

  await api.encerrar(ritaId, 'Fim do teste')
  await page.goto('/recados')
  await expect(page.locator('main')).toContainText('Novos recados toda semana.')
  await api.dispose()
  await context.close()
})
