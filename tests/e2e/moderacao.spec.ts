import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// PAINEL-07 / CLAS-04 / D-03: staff approve, refuse and unpublish ads from the panel; the
// dashboard shows the queue; every action is logged (T-04-13); the panel shows the public text
// without contacts before approval (T-04-01).
test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

const CRIS = { email: 'cris@teste.local', name: 'Cris Anuncia', password: 'senha-cris-12345' }
const TEXTO_A = 'Casal procura casal, chama no 61 99988-9772'
const MOTIVO_MSG = 'Escreva o motivo (até 300 caracteres).'
let crisId = 0
let adA = 0
let adB = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  crisId = (await api.createAssinante(CRIS)).id
  await api.liberar(crisId, { durationDays: 30, method: 'cortesia', amount: 0 })
  adA = (await api.createAd({ author: crisId, apelido: 'Cris BSB', texto: TEXTO_A, contato: { whatsapp: '5561999889772', telegram: 'cris_bsb' } })).id
  adB = (await api.createAd({ author: crisId, texto: 'Solteira simpática procura casal.' })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

const fila = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'ClassiSex', exact: true }) })
const painel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Moderação', exact: true }) })

test('dashboard queue counts pending ads and links to the list', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin')
  await expect(fila(page)).toContainText('2 anúncios para aprovar')
  const link = fila(page).getByRole('link', { name: 'Ver fila' })
  const href = decodeURIComponent((await link.getAttribute('href')) ?? '')
  expect(href).toBe('/admin/collections/ads?where[status][equals]=pendente&sort=submittedAt')
  await link.click()
  await expect(page.locator('table tbody tr')).toHaveCount(2)
})

test('panel shows the public preview (apelido and tipo) without contacts; refuse needs a reason', async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000)
  await loginAsStaff(page)
  await page.goto(`/admin/collections/ads/${adA}`)
  const panel = painel(page)
  await expect(panel).toContainText('Situação: Em análise')
  const preview = panel.getByRole('region', { name: 'Como aparece na área aberta' })
  await expect(preview).toContainText('Cris BSB · Casal')
  await expect(preview).not.toContainText('Casal procura casal')
  await expect(preview).not.toContainText('99988')
  await expect(panel).toContainText('5561999889772')
  await expect(panel).toContainText('@cris_bsb')
  await expect(panel.getByRole('button', { name: 'Aprovar' })).toBeEnabled()
  await expect(panel.getByRole('button', { name: 'Recusar' })).toBeEnabled()
  await expect(panel.getByRole('button', { name: 'Despublicar' })).toBeDisabled()

  await panel.getByRole('button', { name: 'Recusar' }).click()
  await expect(panel.getByRole('alert')).toHaveText(MOTIVO_MSG)
  await panel.getByLabel('Motivo (para Recusar ou Despublicar)').fill('Telefone no texto')
  await panel.getByRole('button', { name: 'Recusar' }).click()
  await expect(panel).toContainText('Situação: Recusado — Telefone no texto')

  await page.goto('/admin')
  await expect(fila(page)).toContainText('1 anúncio para aprovar')

  const ctx = await browser.newContext({ baseURL })
  await ctx.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const owner = await ctx.newPage()
  await loginAsAssinante(owner, CRIS.email, CRIS.password)
  await owner.goto('/area-do-assinante/meus-anuncios')
  await expect(owner.locator('main')).toContainText('Recusado: Telefone no texto')
  await ctx.close()
})

test('approve, then unpublish with a reason; saving the page keeps the new situation', async ({ page, request }) => {
  test.setTimeout(150_000)
  await loginAsStaff(page)
  await page.goto(`/admin/collections/ads/${adB}`)
  const panel = painel(page)
  await panel.getByRole('button', { name: 'Aprovar' }).click()
  await expect(panel).toContainText('Situação: Publicado')
  await expect(panel.getByRole('button', { name: 'Despublicar' })).toBeEnabled()

  // A staff edit saved after the action must not bring back the old situation
  await page.locator('#field-cidade').fill('Taguatinga')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText(/sucesso/i).first()).toBeVisible()
  const api = await staffApi(request)
  const saved = (await api.get(`/api/ads/${adB}?depth=0`)) as unknown as { status: string; cidade: string }
  expect(saved.status).toBe('aprovado')
  expect(saved.cidade).toBe('Taguatinga')
  await api.dispose()

  await panel.getByLabel('Motivo (para Recusar ou Despublicar)').fill('Pedido do anunciante')
  await panel.getByRole('button', { name: 'Despublicar' }).click()
  await expect(panel).toContainText('Situação: Despublicado — Pedido do anunciante')

  await page.goto('/admin')
  await expect(fila(page)).toContainText('Nenhum anúncio para aprovar.')
})

test('the action log lists the moderation rows for Cris', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin/collections/audit-log?search=cris%40teste.local&limit=50')
  const rows = page.locator('table tbody tr').filter({ hasText: 'Cris Anuncia' })
  await expect(rows.filter({ hasText: 'Anúncio recusado' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Anúncio aprovado' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Anúncio despublicado' })).toHaveCount(1)
})
