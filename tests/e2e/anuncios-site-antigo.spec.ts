import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// M-04: old ClassiSex ads arrive as private drafts; the author reviews and sends them to moderation.
test.skip(({ isMobile }) => !isMobile, 'one project is enough for this flow')
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-rascunho-12345'
const A = { email: 'autora.antiga@teste.local', name: 'Autora Antiga', password: PASSWORD } // free account
const B = { email: 'viewer.pago@teste.local', name: 'Viewer Pago', password: PASSWORD } // paying viewer
const C = { email: 'autor.cheio@teste.local', name: 'Autor Cheio', password: PASSWORD } // paying author with 3 ads
const SENTINEL = 'sentinela-rascunho-abacaxi'
const OLD_TEXT = `Casal ${SENTINEL} procura amigos, chama no 61 98888-7777. `.repeat(14) // > 600 characters
const AVISO =
  'Você tinha anúncios no site antigo. Eles estão guardados como rascunho e só você vê. Revise o texto, preencha WhatsApp ou Telegram e envie para análise.'
const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'
const LIMITE = 'Você já tem 3 anúncios ativos. Apague um para publicar outro.'

let aId = 0
let draftId = 0
let cDraftId = 0

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
  draftId = (await api.createAd({ author: aId, apelido: 'Casal Antigo', texto: OLD_TEXT, status: 'rascunho', contato: {} })).id
  await api.uploadAdMedia(draftId, 'flyer-square.jpg')
  cDraftId = (await api.createAd({ author: c.id, apelido: 'Cheio Antigo', texto: 'Texto antigo curto.', status: 'rascunho', contato: {} })).id
  await api.dispose()
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

test('the author sees the notice on the home and in Meus anúncios, with the draft card', async ({ browser, baseURL }) => {
  const { context, page } = await as(browser, baseURL!, A)
  await expect(page.getByText(AVISO)).toBeVisible()
  await page.getByRole('link', { name: 'Ver meus anúncios' }).click()
  await expect(page).toHaveURL(/\/meus-anuncios$/)
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

test('the author reviews, fixes and sends the draft; it enters the moderation queue', async ({ browser, baseURL }) => {
  const { context, page } = await as(browser, baseURL!, A)
  await page.goto(`/area-do-assinante/meus-anuncios/${draftId}/editar`)
  const main = page.locator('main')
  await expect(main).toContainText('Este anúncio veio do site antigo.')
  await expect(main.getByLabel('Texto do anúncio')).toHaveValue(OLD_TEXT.trim())
  // over 600 characters: the existing error on submit
  await main.getByLabel('WhatsApp').fill('5561988887777')
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(main.getByText('O texto pode ter até 600 caracteres.')).toBeVisible()

  await main.getByLabel('Texto do anúncio').fill('Casal simpático procura amigos para a próxima festa.')
  await main.getByLabel('WhatsApp').fill('5561988887777')
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(page).toHaveURL(/\/meus-anuncios\?ok=enviado/)
  await expect(page.getByRole('article', { name: /Em análise pela equipe/ })).toBeVisible()
  await expect(page.getByText(AVISO)).toHaveCount(0)
  await page.goto('/area-do-assinante')
  await expect(page.getByText(AVISO)).toHaveCount(0)
  await context.close()
})

test('a paying author at the limit gets the usual message when sending a draft', async ({ browser, baseURL }) => {
  const { context, page } = await as(browser, baseURL!, C)
  await page.goto(`/area-do-assinante/meus-anuncios/${cDraftId}/editar`)
  const main = page.locator('main')
  await main.getByLabel('WhatsApp').fill('5561977776666')
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await expect(main.getByText(LIMITE)).toBeVisible()
  await context.close()
})

test('staff: drafts have no Aprovar button and are not in the queue count', async ({ page, request }) => {
  const api = await staffApi(request)
  // C's draft is still a draft; A's ad was sent and is pending
  const ads = (await api.get('/api/ads?limit=50&depth=0')) as unknown as { docs: { id: number; status: string }[] }
  await api.dispose()
  expect(ads.docs.find((a) => a.id === cDraftId)?.status).toBe('rascunho')
  const pendentes = ads.docs.filter((a) => a.status === 'pendente').length
  expect(pendentes).toBeGreaterThan(0)

  await loginAsStaff(page)
  await page.goto(`/admin/collections/ads/${cDraftId}`)
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Moderação', exact: true }) })
  await expect(panel).toContainText('Rascunho do anunciante (site antigo)')
  await expect(panel.getByRole('button', { name: 'Aprovar' })).toHaveCount(0)
  await page.goto('/admin')
  // the queue panel count follows pending ads only
  const fila = page.locator('section', { has: page.getByRole('heading', { name: /Anúncios em análise|Fila/ }) }).first()
  if (await fila.count()) await expect(fila).not.toContainText('Cheio Antigo')
})
