import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsStaff } from './helpers/staff'
import { ensureEquipeLegadoAccount } from '../../src/lib/migracao/load'
import { getTestPayload, seedAd } from '../helpers/seed'

// M-04: old ads written by the team arrive as drafts owned by a placeholder account, visible only to staff.
test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

let adId = 0
const publicSentinel = 'sentinela-equipe-banana'

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
  const payload = await getTestPayload()
  const equipe = await ensureEquipeLegadoAccount(payload, new Date())
  adId = (
    await seedAd(payload, {
      author: equipe,
      apelido: 'Casal Equipe',
      texto: `Texto antigo ${publicSentinel}.`,
      status: 'rascunho',
      contato: {},
      origemLegado: 'equipe',
      wpCommentId: 7001,
    })
  ).id
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

const fila = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'ClassiSex', exact: true }) })
const painel = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Moderação', exact: true }) })

test('the dashboard links to the team filter and the list shows the draft', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin')
  const link = fila(page).getByRole('link', { name: '1 anúncio antigo da equipe para revisar' })
  await expect(link).toBeVisible()
  await expect(fila(page)).toContainText('Nenhum anúncio para aprovar.')
  await link.click()
  await expect(page.locator('table tbody tr')).toHaveCount(1)
  await expect(page.locator('table tbody tr')).toContainText('Casal Equipe')
})

test('staff review the draft and publish it from the Moderação panel', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto(`/admin/collections/ads/${adId}`)
  const panel = painel(page)
  await expect(panel).toContainText('Situação: Rascunho')
  await expect(panel).toContainText('Rascunho do site antigo, escrito pela equipe')
  // old ads are exempt from the contact rule (2026-10-22): no contact needed to publish
  await panel.getByRole('button', { name: 'Aprovar e publicar' }).click()
  const payload = await getTestPayload()
  await expect(painel(page)).toContainText('Situação: Publicado')
  expect((await payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true })).status).toBe('aprovado')
})
