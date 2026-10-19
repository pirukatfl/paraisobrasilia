import { expect, test } from '@playwright/test'

import { renewalWindow, validUntilLabel } from '../../src/lib/assinantes/periods'
import { staffApi } from './helpers/api'
import { loginAsStaff, STAFF_EMAIL } from './helpers/staff'

// PAINEL-05 / PAINEL-08: staff release, renew and end access from the subscriber page; every
// action lands in the append-only log.
test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

let biaId = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  biaId = (await api.createAssinante({ email: 'bia@teste.local', password: 'senha-provisoria-1', name: 'Bia Teste' })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
})

test('release, renew and end access with the payment record', async ({ page }) => {
  test.setTimeout(180_000)
  await loginAsStaff(page)
  await page.goto(`/admin/collections/assinantes/${biaId}`)
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Assinatura', exact: true }) })
  await expect(panel).toContainText('Situação: Sem assinatura')

  // Liberar acesso — Mensal, Pix
  await panel.getByLabel('Plano').selectOption({ label: 'Mensal (30 dias)' })
  await expect(panel.getByLabel('Valor pago (R$)')).toHaveValue('30')
  await panel.getByLabel('Forma de pagamento').selectOption('pix')
  await panel.getByLabel('Observação', { exact: true }).fill('Comprovante no WhatsApp')
  const first = renewalWindow({ now: new Date(), currentAccessUntil: null, durationDays: 30 })
  const firstLabel = validUntilLabel(first.endsAt)
  await expect(panel).toContainText(`Acesso até ${firstLabel}`)
  await panel.getByRole('button', { name: 'Liberar acesso' }).click()
  await expect(panel.getByRole('status')).toHaveText(`Acesso liberado até ${firstLabel}.`)
  await expect(panel).toContainText(`Situação: Ativa — válida até ${firstLabel}`)

  await page.reload()
  await expect(panel).toContainText(`Situação: Ativa — válida até ${firstLabel}`)
  await expect(page.locator('#field-periodos')).toContainText('Mensal')
  await expect(page.locator('#field-historico')).toContainText('Acesso liberado')

  // Renovar — Trimestral: 90 days from the current end
  await expect(panel.getByRole('button', { name: 'Renovar' })).toBeVisible()
  await panel.getByLabel('Plano').selectOption({ label: 'Trimestral (90 dias)' })
  const second = renewalWindow({ now: new Date(), currentAccessUntil: first.endsAt, durationDays: 90 })
  const secondLabel = validUntilLabel(second.endsAt)
  await expect(panel).toContainText(`Acesso até ${secondLabel}`)
  await panel.getByRole('button', { name: 'Renovar' }).click()
  await expect(panel.getByRole('status')).toHaveText(`Acesso renovado até ${secondLabel}.`)
  await expect(panel).toContainText(`Situação: Ativa — válida até ${secondLabel}`)

  // Encerrar acesso agora — reason prompt + confirmation
  page.on('dialog', (dialog) => {
    if (dialog.type() === 'prompt') void dialog.accept('Teste')
    else void dialog.accept()
  })
  await panel.getByRole('button', { name: 'Encerrar acesso agora' }).click()
  await expect(panel).toContainText('Situação: Encerrada')
  await page.reload()
  await expect(page.locator('#field-historico')).toContainText('Acesso encerrado')
})

test('the action log lists every action and cannot be edited', async ({ page }) => {
  await loginAsStaff(page)
  // Other specs also write rows: look at Bia's only (newest first)
  await page.goto('/admin/collections/audit-log?search=bia%40teste.local&limit=50')
  const rows = page.locator('table tbody tr').filter({ hasText: 'Bia Teste' })
  await expect(rows.filter({ hasText: 'Acesso liberado' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Acesso renovado' })).toHaveCount(1)
  await expect(rows.filter({ hasText: 'Acesso encerrado' })).toHaveCount(1)
  await expect(rows.filter({ hasText: STAFF_EMAIL }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /Criar novo/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Criar novo/i })).toHaveCount(0)

  await rows.filter({ hasText: 'Acesso liberado' }).locator('a').first().click()
  await expect(page).toHaveURL(/\/admin\/collections\/audit-log\/\d+/)
  await expect(page.getByRole('button', { name: 'Salvar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Excluir/ })).toHaveCount(0)
})

test('the panel is not shown before the account exists', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin/collections/assinantes/create')
  await expect(page.locator('#field-name')).toBeVisible()
  await expect(page.getByText('Situação:')).toHaveCount(0)
})
