import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsStaff } from './helpers/staff'
import { ensureEquipeLegadoAccount } from '../../src/lib/migracao/load'
import { getTestPayload, seedAd } from '../helpers/seed'

// Anúncios list in /admin: quick "Aprovar" per row and "Aprovar selecionados" in bulk, both on the same
// server rules as the Moderação panel (contact check, state, audit); failures are listed and stay as they were.
test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

const ids: Record<'a' | 'b' | 'c' | 'equipeOk' | 'equipeSemContato' | 'publicado', number> = {
  a: 0,
  b: 0,
  c: 0,
  equipeOk: 0,
  equipeSemContato: 0,
  publicado: 0,
}

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  const member = await api.createAssinante({ email: 'lista.anuncios@teste.local', name: 'Lia Lista', password: 'senha-lista-12345' })
  await api.liberar(member.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  ids.a = (await api.createAd({ author: member.id, apelido: 'Lista A', texto: 'Texto A sem contato.' })).id
  ids.b = (await api.createAd({ author: member.id, apelido: 'Lista B', texto: 'Texto B sem contato.' })).id
  ids.c = (await api.createAd({ author: member.id, apelido: 'Lista C', texto: 'Texto C sem contato.' })).id
  ids.publicado = (await api.createAd({ author: member.id, apelido: 'Lista Publicada', texto: 'Texto já no ar.', status: 'aprovado' })).id
  await api.dispose()

  const payload = await getTestPayload()
  const equipe = await ensureEquipeLegadoAccount(payload, new Date())
  ids.equipeOk = (
    await seedAd(payload, { author: equipe, apelido: 'Equipe Com Contato', texto: 'Texto antigo da equipe.', status: 'rascunho', origemLegado: 'equipe' })
  ).id
  ids.equipeSemContato = (
    await seedAd(payload, { author: equipe, apelido: 'Equipe Sem Contato', texto: 'Outro texto antigo.', status: 'rascunho', contato: {}, origemLegado: 'equipe' })
  ).id
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

const status = async (id: number) =>
  (await (await getTestPayload()).findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })).status
const row = (page: Page, apelido: string) => page.locator('table tbody tr', { hasText: apelido })

test('the list offers Aprovar only on pending ads and team drafts', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin/collections/ads?limit=50')
  await expect(page.locator('table tbody tr')).toHaveCount(6)
  for (const apelido of ['Lista A', 'Lista B', 'Lista C', 'Equipe Com Contato', 'Equipe Sem Contato']) {
    await expect(row(page, apelido).getByRole('button', { name: /^Aprovar o anúncio/ }), apelido).toHaveCount(1)
  }
  await expect(row(page, 'Lista Publicada').getByRole('button')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aprovar selecionados (0)' })).toBeDisabled()
})

test('a foreign Origin cannot use the bulk endpoint, and no session cannot either', async ({ request, playwright, baseURL }) => {
  const api = await staffApi(request)
  const foreign = await request.post('/api/ads/aprovar-lote', {
    headers: { ...api.headers, Origin: 'https://evil.example' },
    data: { ids: [ids.c] },
  })
  expect(foreign.status()).toBe(403)
  const anon = await playwright.request.newContext({ baseURL })
  expect((await anon.post('/api/ads/aprovar-lote', { data: { ids: [ids.c] } })).status()).toBe(403)
  await anon.dispose()
  expect(await status(ids.c)).toBe('pendente')
  await api.dispose()
})

test('Aprovar on a row publishes that ad only', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin/collections/ads?limit=50')
  await row(page, 'Lista A').getByRole('button', { name: /^Aprovar o anúncio/ }).click()
  await expect.poll(() => status(ids.a)).toBe('aprovado')
  await expect(row(page, 'Lista A').getByRole('button', { name: /^Aprovar o anúncio/ })).toHaveCount(0)
  expect(await status(ids.b)).toBe('pendente')

  // a team draft without a contact is refused by the normal rules: message in the row, still a draft
  await row(page, 'Equipe Sem Contato').getByRole('button', { name: /^Aprovar o anúncio/ }).click()
  await expect(row(page, 'Equipe Sem Contato').getByRole('alert')).toContainText(/WhatsApp|Telegram|contato/i)
  expect(await status(ids.equipeSemContato)).toBe('rascunho')
})

test('Aprovar selecionados publishes the ticked ads and lists the ones that could not be', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/admin/collections/ads?limit=50')
  const bulk = page.getByRole('button', { name: /^Aprovar selecionados/ })
  // tick every row of the page (including the two already published and the draft without contact)
  await page.locator('table thead .checkbox-input__input, table thead input[type="checkbox"]').first().click({ force: true })
  await expect(bulk).toHaveText('Aprovar selecionados (6)')
  await bulk.click()
  const summary = page.getByRole('status').filter({ hasText: 'aprovados' })
  await expect(summary).toContainText('3 anúncios aprovados; 3 não foram aprovados.')
  await expect(summary.getByRole('listitem').filter({ hasText: 'Equipe Sem Contato' })).toContainText(/WhatsApp|Telegram|contato/i)
  await expect(summary.getByRole('listitem').filter({ hasText: 'Lista Publicada' })).toContainText('Este anúncio já está publicado.')

  expect(await status(ids.b)).toBe('aprovado')
  expect(await status(ids.c)).toBe('aprovado')
  expect(await status(ids.equipeOk)).toBe('aprovado')
  expect(await status(ids.equipeSemContato)).toBe('rascunho')

  // audit: one row per approved ad (3 here + the single approval of Lista A)
  const payload = await getTestPayload()
  const rows = await payload.find({ collection: 'audit-log', where: { action: { equals: 'anuncio-aprovado' } }, depth: 0, overrideAccess: true, limit: 50 })
  expect(rows.totalDocs).toBe(4)
  expect(rows.docs.filter((r) => (r.details as { lote?: boolean } | null)?.lote === true)).toHaveLength(3)
})
