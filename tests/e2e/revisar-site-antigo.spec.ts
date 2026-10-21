import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// M-02 (client adjustment 2026-10-21): marker "Assinante antigo sem data de vencimento"
test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

const LABEL = 'Assinante antigo sem data de vencimento'
let aId = 0
let bId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  aId = (await api.createAssinante({ email: 'antiga.a@teste.local', name: 'Antiga Alfa', password: 'senha-antiga-a-123' })).id
  bId = (await api.createAssinante({ email: 'antiga.b@teste.local', name: 'Antiga Beta', password: 'senha-antiga-b-123' })).id
  await api.createAssinante({ email: 'normal@teste.local', name: 'Conta Normal', password: 'senha-normal-123' })
  await api.updateAssinante(aId, { revisarAssinaturaAntiga: true })
  await api.updateAssinante(bId, { revisarAssinaturaAntiga: true })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

test('list column, filter and dashboard panel show the marker', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin/collections/assinantes')
  await expect(page.locator('table tbody tr', { hasText: 'antiga.a@teste.local' })).toContainText(
    `Gratuita · ${LABEL.toLowerCase()}`,
  )
  await expect(page.locator('table tbody tr', { hasText: 'normal@teste.local' })).not.toContainText(LABEL.toLowerCase())

  await page.goto('/admin')
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Assinantes antigos sem data de vencimento' }) })
  await expect(panel).toContainText('Antiga Alfa')
  await expect(panel).toContainText('Antiga Beta')
  await expect(panel).not.toContainText('Conta Normal')
  await panel.getByRole('link', { name: 'Ver todos na lista' }).click()
  await expect(page).toHaveURL(/where.*revisarAssinaturaAntiga/)
  await expect(page.locator('table tbody tr', { hasText: 'antiga.a@teste.local' })).toBeVisible()
  await expect(page.locator('table tbody tr', { hasText: 'antiga.b@teste.local' })).toBeVisible()
  await expect(page.locator('table tbody tr', { hasText: 'normal@teste.local' })).toHaveCount(0)
})

test('dismissing the warning on the record removes it and is logged', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto(`/admin/collections/assinantes/${aId}`)
  const box = page.getByTestId('aviso-sem-data')
  await expect(box).toBeVisible()
  await expect(box).toContainText(LABEL)
  await expect(box).toBeInViewport()
  await box.getByRole('button', { name: 'Dispensar aviso' }).click()
  await expect(box).toHaveCount(0)
  await page.reload()
  await expect(page.getByTestId('aviso-sem-data')).toHaveCount(0)
  await expect(page.locator('#field-historico')).toContainText('Conta editada')
})

test('granting a subscription clears the warning and the list column', async ({ page }) => {
  test.setTimeout(120_000)
  await loginAsStaff(page)
  await page.goto(`/admin/collections/assinantes/${bId}`)
  await expect(page.getByTestId('aviso-sem-data')).toBeVisible()
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Assinatura', exact: true }) })
  await panel.getByLabel('Plano').selectOption({ label: 'Mensal (30 dias)' })
  await panel.getByLabel('Forma de pagamento').selectOption('pix')
  await panel.getByRole('button', { name: 'Liberar acesso' }).click()
  await expect(panel.getByRole('status')).toContainText('Acesso liberado até')
  await page.reload()
  await expect(page.getByTestId('aviso-sem-data')).toHaveCount(0)
  await page.goto('/admin/collections/assinantes')
  await expect(page.locator('table tbody tr', { hasText: 'antiga.b@teste.local' })).toContainText('Assinante até')
})

test('dashboard panel empty state once everyone is reviewed', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin')
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Assinantes antigos sem data de vencimento' }) })
  await expect(panel).toContainText('Nenhum assinante antigo sem data de vencimento para revisar.')
})

test('a subscriber session never sees the marker', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.updateAssinante(bId, { revisarAssinaturaAntiga: true })
  await api.dispose()
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await loginAsAssinante(page, 'antiga.b@teste.local', 'senha-antiga-b-123')
  for (const path of ['/area-do-assinante', '/area-do-assinante/senha']) {
    const res = await page.goto(path)
    expect(await res!.text()).not.toMatch(/sem data de vencimento/i)
  }
  await context.close()
})
