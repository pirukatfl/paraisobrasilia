import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// CLAS-05 / D-08: a subscriber reports an ad, staff see the queue (urgent first), resolve by
// unpublishing or discarding; a report of a minor also hides the ad at once (T-04-17); reports
// never reach subscribers (T-04-24). Member steps run on both projects, admin steps on desktop.
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-denuncia-12345'
const PIA = { email: 'pia@teste.local', name: 'Pia Anuncia', password: PASSWORD }
const RUI = { email: 'rui@teste.local', name: 'Rui Assinante', password: PASSWORD }
const LIA = { email: 'lia@teste.local', name: 'Lia Assinante', password: PASSWORD }
const TEXTO = 'Casal simpático de Brasília procura amigos.'
const ENVIADA = 'Denúncia enviada. A equipe vai analisar.'
const DUPLICADA = 'Você já denunciou este anúncio.'

let piaId = 0
let adId = 0
let minorAdId = 0

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  piaId = (await api.createAssinante(PIA)).id
  for (const who of [RUI, LIA]) {
    const id = (await api.createAssinante(who)).id
    await api.liberar(id, { durationDays: 30, method: 'cortesia', amount: 0 })
  }
  await api.liberar(piaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  adId = (await api.createAd({ author: piaId, texto: TEXTO, cidade: 'Brasília', status: 'aprovado' })).id
  minorAdId = (await api.createAd({ author: piaId, texto: 'Outro anúncio da Pia.', cidade: 'Taguatinga', status: 'aprovado' })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function as(page: Page, who: { email: string; password: string }, baseURL: string | undefined) {
  await page.context().addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await loginAsAssinante(page, who.email, who.password)
}

test('a viewer reports an ad once; the owner does not see the block', async ({ page, browser, baseURL }) => {
  await as(page, RUI, baseURL)
  await page.goto(`/area-do-assinante/classisex/${adId}`)
  const block = page.locator('details', { has: page.getByText('Denunciar este anúncio') })
  await block.getByText('Denunciar este anúncio').click()
  const group = block.getByRole('group', { name: 'Motivo' })
  await expect(group.getByRole('radio')).toHaveCount(6)
  await expect(block.getByLabel('Detalhes (opcional)')).toBeVisible()

  await group.getByLabel('Contato falso').check()
  await block.getByRole('button', { name: 'Enviar denúncia' }).click()
  await expect(block.getByRole('status')).toHaveText(ENVIADA)

  await group.getByLabel('Contato falso').check()
  await block.getByRole('button', { name: 'Enviar denúncia' }).click()
  await expect(block.getByRole('alert')).toHaveText(DUPLICADA)

  const ctx = await browser.newContext({ baseURL })
  const owner = await ctx.newPage()
  await as(owner, PIA, baseURL)
  await owner.goto(`/area-do-assinante/classisex/${adId}`)
  await expect(owner.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(owner.getByText('Denunciar este anúncio')).toHaveCount(0)
  await ctx.close()
})

test('subscribers and visitors cannot read reports over REST', async ({ page, request, baseURL }) => {
  await as(page, RUI, baseURL)
  const anon = await request.get('/api/ad-reports')
  expect(anon.status()).toBe(403)
  const res = await page.request.get('/api/ad-reports')
  expect(res.status()).toBe(403)
  const post = await page.request.post('/api/ad-reports', { data: { motivo: 'outro' } })
  expect(post.status()).toBe(403)
})

test('staff queue shows urgent first; unpublishing closes the reports and hides the ad', async ({ page, request, browser, baseURL, isMobile }) => {
  test.skip(isMobile, 'admin flow runs on desktop only')
  test.setTimeout(180_000)

  // Lia reports the second ad as a minor: it disappears at once, before any staff action
  const ctxLia = await browser.newContext({ baseURL })
  const lia = await ctxLia.newPage()
  await as(lia, LIA, baseURL)
  await lia.goto(`/area-do-assinante/classisex/${minorAdId}`)
  const liaBlock = lia.locator('details', { has: lia.getByText('Denunciar este anúncio') })
  await liaBlock.getByText('Denunciar este anúncio').click()
  await liaBlock.getByLabel('Pessoa menor de idade').check()
  await liaBlock.getByRole('button', { name: 'Enviar denúncia' }).click()
  // The ad is gone at once, so the confirmation comes on the board
  await expect(lia.getByRole('status')).toHaveText(ENVIADA)
  await expect(lia).toHaveURL(/\/area-do-assinante\/classisex\?denuncia=enviada/)
  const gone = await lia.goto(`/area-do-assinante/classisex/${minorAdId}`)
  expect(gone?.status()).toBe(404)
  await expect(lia.locator('main')).toContainText('Página não encontrada')
  await ctxLia.close()

  await loginAsStaff(page)
  await page.goto('/admin')
  const fila = page.locator('section', { has: page.getByRole('heading', { name: 'ClassiSex', exact: true }) })
  await expect(fila).toContainText('2 denúncias abertas · 1 urgente')
  const link = fila.getByRole('link', { name: 'Ver denúncias' })
  expect(decodeURIComponent((await link.getAttribute('href')) ?? '')).toBe(
    '/admin/collections/ad-reports?where[status][equals]=aberta',
  )
  await link.click()
  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(2)
  await expect(rows.first()).toContainText('Pessoa menor de idade')

  // The first ad has Rui's open report: resolve it by unpublishing
  const api = await staffApi(request)
  const reports = await api.findReports(`where[ad][equals]=${adId}`)
  expect(reports).toHaveLength(1)
  await api.dispose()

  await page.goto(`/admin/collections/ads/${adId}`)
  await expect(page.locator('main')).toContainText('Denúncias')
  await expect(page.locator('main')).toContainText('Contato falso')
  await expect(page.locator('main')).not.toContainText('No Denúncias found')
  await page.goto(`/admin/collections/ad-reports/${reports[0].id}`)
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Denúncia', exact: true }) })
  await expect(panel).toContainText('Contato falso')
  await expect(panel.getByRole('link', { name: 'Abrir o anúncio' })).toBeVisible()
  await panel.getByRole('button', { name: 'Despublicar o anúncio' }).click()
  await expect(panel.getByRole('status')).toContainText('Anúncio despublicado')

  const api2 = await staffApi(request)
  expect((await api2.getAd(adId)).status).toBe('despublicado')
  expect((await api2.getAd(adId)).motivo).toBe('Denúncia: Contato falso')
  expect((await api2.findReports(`where[ad][equals]=${adId}`)).map((r) => r.status)).toEqual(['resolvida'])
  expect((await api2.getAd(minorAdId)).status).toBe('despublicado')
  await api2.dispose()

  // Discard the minor report: the ad stays hidden until staff approve it again
  const api3 = await staffApi(request)
  const [minor] = await api3.findReports(`where[ad][equals]=${minorAdId}`)
  await api3.dispose()
  await page.goto(`/admin/collections/ad-reports/${minor.id}`)
  await page.locator('section', { has: page.getByRole('heading', { name: 'Denúncia', exact: true }) })
    .getByRole('button', { name: 'Descartar' })
    .click()
  await expect(page.getByRole('status').filter({ hasText: 'Denúncia descartada' })).toBeVisible()
  await page.goto('/admin')
  await expect(fila).toContainText('Nenhuma denúncia aberta.')

  // Rui's board no longer lists the ads and the public page neither
  const ctxRui = await browser.newContext({ baseURL })
  const rui = await ctxRui.newPage()
  await as(rui, RUI, baseURL)
  await rui.goto('/area-do-assinante/classisex')
  await expect(rui.getByText(TEXTO)).toHaveCount(0)
  await ctxRui.close()
  await page.context().addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const pub = await page.request.get('/classisex')
  expect(await pub.text()).not.toContain('procura amigos')

  // Pia sees the reason in Meus anúncios
  const ctxPia = await browser.newContext({ baseURL })
  const pia = await ctxPia.newPage()
  await as(pia, PIA, baseURL)
  await pia.goto('/area-do-assinante/meus-anuncios')
  await expect(pia.locator('main')).toContainText('Denúncia: Contato falso')
  await ctxPia.close()
})

test('the action log lists the resolution and the automatic unpublish', async ({ page, isMobile }) => {
  test.skip(isMobile, 'admin flow runs on desktop only')
  await loginAsStaff(page)
  await page.goto('/admin/collections/audit-log?search=pia%40teste.local&limit=50')
  await expect(page.locator('table tbody tr').filter({ hasText: 'Anúncio despublicado' })).toHaveCount(2)
  await page.goto('/admin/collections/audit-log?limit=50')
  await expect(page.locator('table tbody tr').filter({ hasText: 'Denúncia resolvida' })).toHaveCount(2)
})
