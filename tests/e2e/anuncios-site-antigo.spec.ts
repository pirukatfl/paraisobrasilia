import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'
import { getTestPayload, seedAd, seedAdMedia } from '../helpers/seed'

// M-04 (2026-10-22): old ads now arrive published; a draft an earlier import left untouched is still private to its
// author, who reviews and sends it. Old ads (wpCommentId, importer-only) are exempt from the 600 characters, the
// contact field and the 3-ad limit.
test.skip(({ isMobile }) => !isMobile, 'one project is enough for this flow')
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-rascunho-12345'
const A = { email: 'autora.antiga@teste.local', name: 'Autora Antiga', password: PASSWORD } // free account
const B = { email: 'viewer.pago@teste.local', name: 'Viewer Pago', password: PASSWORD } // paying viewer
const C = { email: 'autor.cheio@teste.local', name: 'Autor Cheio', password: PASSWORD } // paying author with 3 ads
const SENTINEL = 'sentinela-rascunho-abacaxi'
const OLD_TEXT = `Casal ${SENTINEL} procura amigos, chama no 61 98888-7777. `.repeat(14) // > 600 characters
const AVISO = 'Seus anúncios do site antigo já estão publicados. Você pode editar ou apagar cada um aqui em Meus anúncios.'
const AVISO_ANTIGO = 'Você tinha anúncios no site antigo. Eles estão guardados como rascunho'
const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'
const LIMITE = 'Você já tem 3 anúncios ativos. Apague um para publicar outro.'

let aId = 0
let draftId = 0
let cDraftId = 0
let bDraftId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  aId = (await api.createAssinante(A)).id
  const b = await api.createAssinante(B)
  const c = await api.createAssinante(C)
  await api.liberar(b.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.liberar(c.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.createAd({ author: b.id, texto: 'Anúncio aprovado do viewer pago.', status: 'aprovado' })
  for (let i = 0; i < 3; i++) await api.createAd({ author: c.id, texto: `Anúncio ativo ${i + 1} do autor cheio.`, status: i === 0 ? 'aprovado' : 'pendente' })
  await api.dispose()
  // old ads carry wpCommentId, which only the importer (Local API) can set
  const payload = await getTestPayload()
  draftId = (await seedAd(payload, { author: aId, apelido: 'Casal Antigo', texto: OLD_TEXT, status: 'rascunho', contato: {}, wpCommentId: 8901 })).id
  await seedAdMedia(payload, { ad: draftId })
  bDraftId = (await seedAd(payload, { author: b.id, apelido: 'Viewer Antigo', texto: 'Rascunho antigo do viewer.', status: 'rascunho', contato: {}, wpCommentId: 8903 })).id
  cDraftId = (await seedAd(payload, { author: c.id, apelido: 'Cheio Antigo', texto: 'Texto antigo curto.', status: 'rascunho', contato: {}, wpCommentId: 8902 })).id
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function as(browser: Browser, baseURL: string, acc: { email: string; password: string }) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, acc.email, acc.password)
  return { context, page }
}

test('the home no longer nags about drafts; Meus anúncios has the short note and the draft card', async ({ browser, baseURL }) => {
  const { context, page } = await as(browser, baseURL!, A)
  await expect(page.getByText(AVISO_ANTIGO)).toHaveCount(0)
  await expect(page.getByText(AVISO)).toHaveCount(0)
  await page.goto('/area-do-assinante/meus-anuncios')
  await expect(page.getByText(AVISO)).toHaveCount(1)
  const card = page.getByRole('article', { name: /Rascunho do site antigo/ })
  await expect(card).toContainText('Rascunho do site antigo (só você vê)')
  await expect(card).toContainText('Trazido do site antigo. Revise antes de enviar.')
  await expect(card.getByRole('link', { name: 'Revisar e enviar' })).toBeVisible()
  await context.close()
})

test('nobody else sees the draft: paying viewer, anonymous visitor', async ({ browser, baseURL }) => {
  const viewer = await as(browser, baseURL!, B)
  await viewer.page.goto('/area-do-assinante/classisex')
  await expect(viewer.page.getByText('Anúncio aprovado do viewer pago.')).toBeVisible()
  expect(await viewer.page.content()).not.toContain(SENTINEL)
  expect((await viewer.page.request.get(`/area-do-assinante/classisex/${draftId}`)).status()).toBe(404)
  await viewer.context.close()

  const anon = await browser.newContext({ baseURL })
  await anon.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await anon.newPage()
  await page.goto('/classisex')
  expect(await page.content()).not.toContain(SENTINEL)
  await anon.close()
})

test('the author sends the old draft as it is: no 600-character cap, no contact required; it enters the queue', async ({ browser, baseURL }) => {
  const { context, page } = await as(browser, baseURL!, A)
  await page.goto(`/area-do-assinante/meus-anuncios/${draftId}/editar`)
  const main = page.locator('main')
  await expect(main).toContainText('Este anúncio veio do site antigo.')
  await expect(main.getByLabel('Texto do anúncio')).toHaveValue(OLD_TEXT.trim())
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page).toHaveURL(/\/meus-anuncios\?ok=enviado/)
  await expect(page.getByRole('article', { name: /Em análise pela equipe/ })).toBeVisible()
  await context.close()
})

test('a paying author with 3 active ads can still send an old draft (old ads are outside the limit)', async ({ browser, baseURL }) => {
  const { context, page } = await as(browser, baseURL!, C)
  await page.goto(`/area-do-assinante/meus-anuncios/${cDraftId}/editar`)
  const main = page.locator('main')
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page).toHaveURL(/\/meus-anuncios\?ok=enviado/)
  await expect(page.getByText(LIMITE)).toHaveCount(0)
  await context.close()
})

test('staff: drafts have no Aprovar button and are not in the queue count', async ({ page, request }) => {
  const api = await staffApi(request)
  // B's draft is still a draft; A's and C's ads were sent and are pending
  const ads = (await api.get('/api/ads?limit=50&depth=0')) as unknown as { docs: { id: number; status: string }[] }
  await api.dispose()
  expect(ads.docs.find((a) => a.id === bDraftId)?.status).toBe('rascunho')
  const pendentes = ads.docs.filter((a) => a.status === 'pendente').length
  expect(pendentes).toBeGreaterThan(0)

  await loginAsStaff(page)
  await page.goto(`/admin/collections/ads/${bDraftId}`)
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Moderação', exact: true }) })
  await expect(panel).toContainText('Rascunho do anunciante (site antigo)')
  await expect(panel.getByRole('button', { name: 'Aprovar' })).toHaveCount(0)
  await page.goto('/admin')
  // the queue panel count follows pending ads only
  const fila = page.locator('section', { has: page.getByRole('heading', { name: /Anúncios em análise|Fila/ }) }).first()
  if (await fila.count()) await expect(fila).not.toContainText('Viewer Antigo')
})
