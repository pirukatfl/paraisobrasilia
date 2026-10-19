import { expect, test } from '@playwright/test'

import { addDaysToDate, spDate, spMidnight } from '../../src/lib/assinantes/periods'
import { formatShortDate } from '../../src/lib/format/date'
import { staffApi } from './helpers/api'
import { loginAsStaff } from './helpers/staff'

// PAINEL-06: "Vencem nos próximos 7 dias" on the admin dashboard.
test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

const today = () => spDate(new Date())
/** A period whose last valid day is today + (days - 1), i.e. "N dias" left. */
const periodEnding = (days: number) => ({
  startsAt: spMidnight(addDaysToDate(today(), days - 30)).toISOString(),
  endsAt: spMidnight(addDaysToDate(today(), days)).toISOString(),
})

let dudaId = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
})

test('empty state when nobody expires', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin')
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Vencem nos próximos 7 dias' }) })
  await expect(panel).toContainText('Nenhuma assinatura vence nos próximos 7 dias.')
  await expect(panel.getByRole('link', { name: 'Ver todos por vencimento' })).toHaveAttribute(
    'href',
    '/admin/collections/assinantes?sort=accessUntil',
  )
})

test('lists who expires within 7 days with WhatsApp and Abrir; renewal removes the row', async ({ page, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  const duda = await api.createAssinante({
    email: 'duda@teste.local',
    name: 'Duda Teste',
    password: 'senha-duda-1234',
    whatsapp: '5561988887777',
  })
  dudaId = duda.id
  await api.createSubscription({ assinante: duda.id, ...periodEnding(3) })
  const longe = await api.createAssinante({ email: 'longe@teste.local', name: 'Longe Teste', password: 'senha-longe-1234' })
  await api.createSubscription({ assinante: longe.id, ...periodEnding(20) })

  await loginAsStaff(page)
  await page.goto('/admin')
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Vencem nos próximos 7 dias' }) })
  const row = panel.locator('tr', { hasText: 'Duda Teste' })
  const day = formatShortDate(spMidnight(addDaysToDate(today(), 2)).toISOString()).slice(0, 5)
  await expect(row).toContainText(`vence em ${day} (3 dias)`)
  await expect(row.getByRole('link', { name: 'Abrir' })).toHaveAttribute('href', `/admin/collections/assinantes/${dudaId}`)
  const wa = row.getByRole('link', { name: 'WhatsApp para Duda Teste' })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/5561988887777\?text=/)
  expect(decodeURIComponent((await wa.getAttribute('href'))!)).toContain(`vence em ${day}`)
  await expect(panel).not.toContainText('Longe Teste')

  // Renewed → no longer listed
  const [plan] = await api.findPlans()
  await api.liberar(dudaId, { planId: plan.id })
  await api.dispose()
  await page.reload()
  await expect(panel).not.toContainText('Duda Teste')
  await expect(panel).toContainText('Nenhuma assinatura vence nos próximos 7 dias.')
})
