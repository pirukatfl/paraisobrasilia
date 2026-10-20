import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// REC-04: staff approve, refuse and unpublish recados from the panel; the dashboard shows the
// queue; the author sees the reason; every action is logged (T-05-06).
test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

const RITA = { email: 'rita.mod@teste.local', name: 'Rita Moderada', password: 'senha-rita-12345' }
const MOTIVO_MSG = 'Escreva o motivo (até 300 caracteres).'
let ritaId = 0
let recA = 0
let recB = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('assinantes')
  ritaId = (await api.createAssinante(RITA)).id
  await api.liberar(ritaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  recA = (await api.createRecado({ author: ritaId, apelido: 'Rita e Beto', texto: 'Casal simpático procura amigos.' })).id
  recB = (await api.createRecado({ author: ritaId, apelido: 'Rita e Beto', texto: 'Outro recado para a casa.' })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('assinantes')
  await api.dispose()
})

const painel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Moderação', exact: true }) })

test('dashboard line counts pending recados and links to the list', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin')
  const link = page.getByRole('link', { name: 'Recados: 2 para aprovar' })
  await expect(link).toBeVisible()
  await link.click()
  await expect(page.locator('table tbody tr')).toHaveCount(2)
})

test('refuse needs a reason; the author sees it in Recados', async ({ page, browser, baseURL }) => {
  test.setTimeout(150_000)
  await loginAsStaff(page)
  await page.goto(`/admin/collections/recados/${recA}`)
  const panel = painel(page)
  await expect(panel).toContainText('Situação: Em análise pela equipe')
  await expect(panel.getByRole('region', { name: 'Como aparece no mural' })).toContainText('Casal simpático')
  await expect(panel.getByRole('button', { name: 'Despublicar' })).toBeEnabled()
  await panel.getByRole('button', { name: 'Recusar' }).click()
  await expect(panel.getByRole('alert')).toHaveText(MOTIVO_MSG)
  await panel.getByLabel('Motivo (para Recusar ou Despublicar)').fill('Texto ofensivo')
  await panel.getByRole('button', { name: 'Recusar' }).click()
  await expect(panel).toContainText('Situação: Recusado — Texto ofensivo')

  const ctx = await browser.newContext({ baseURL })
  await ctx.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const owner = await ctx.newPage()
  await loginAsAssinante(owner, RITA.email, RITA.password)
  await owner.goto('/area-do-assinante/recados')
  await expect(owner.locator('main')).toContainText('Recusado: Texto ofensivo')
  await ctx.close()
})

test('approve then unpublish; saving the page keeps the new situation', async ({ page, request }) => {
  test.setTimeout(150_000)
  await loginAsStaff(page)
  await page.goto(`/admin/collections/recados/${recB}`)
  const panel = painel(page)
  await panel.getByRole('button', { name: 'Aprovar' }).click()
  await expect(panel).toContainText('Situação: Publicado')

  await page.locator('#field-apelido').fill('Rita e Beto BSB')
  await page.getByRole('button', { name: 'Salvar' }).click()
  await expect(page.getByText(/sucesso/i).first()).toBeVisible()
  const api = await staffApi(request)
  const saved = (await api.get(`/api/recados/${recB}?depth=0`)) as unknown as { status: string; apelido: string }
  expect(saved.status).toBe('aprovado')
  expect(saved.apelido).toBe('Rita e Beto BSB')
  await api.dispose()

  await panel.getByLabel('Motivo (para Recusar ou Despublicar)').fill('Pedido da pessoa')
  await panel.getByRole('button', { name: 'Despublicar' }).click()
  await expect(panel).toContainText('Situação: Despublicado pela equipe — Pedido da pessoa')

  await page.goto('/admin')
  await expect(page.getByText('Nenhum recado para aprovar.')).toBeVisible()
})

test('the action log lists the recado rows for Rita', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin/collections/audit-log?search=rita.mod%40teste.local&limit=50')
  const rows = page.locator('table tbody tr').filter({ hasText: 'Rita Moderada' })
  await expect(rows.filter({ hasText: 'Recado recusado' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Recado aprovado' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Recado despublicado' })).toHaveCount(1)
})
