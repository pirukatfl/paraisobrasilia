import path from 'path'

import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { fetchAs } from './helpers/classisex'

// Conta gratuita (G-02..G-06): a staff-created account without periods behaves like a sign-up
// account. One serial story: create with 1 photo, panels, approval, what payers/visitors see,
// then Liberar -> more media -> subscription ends -> only the cover is shown -> renewal brings it back.
test.describe.configure({ mode: 'serial' })

const FIXTURES = path.resolve('tests/fixtures')
const photo = (n: string) => path.join(FIXTURES, n)
const PASSWORD = 'senha-gratuita-12345'
const LIVRE = { email: 'livia.livre@teste.local', name: 'Livia Livre', password: PASSWORD, whatsapp: '5561999990001' }
const PAGO = { email: 'paulo.pago@teste.local', name: 'Paulo Pago', password: PASSWORD }
const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'
const TEXTO = 'Casal gratuito dahlia-sentinela procura amizades em Brasília.'
const NOVO = '/area-do-assinante/meus-anuncios/novo'

let livreId = 0
let adId = 0

async function ctx(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  livreId = (await api.createAssinante(LIVRE)).id
  const pago = await api.createAssinante(PAGO)
  await api.liberar(pago.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

const comparison = (page: Page) => page.locator('main').getByTestId('comparativo-planos').first()

test('home says Conta gratuita; Novo anúncio has 1 photo, no video input, the note and the comparison', async ({ browser, baseURL }) => {
  const { context, page } = await ctx(browser, baseURL!)
  await loginAsAssinante(page, LIVRE.email, LIVRE.password)
  const main = page.locator('main')
  await expect(main.getByRole('heading', { name: 'Sua conta: Conta gratuita' })).toBeVisible()
  await expect(main).toContainText('Você pode publicar até 3 anúncios com 1 foto cada.')
  await expect(comparison(page)).toBeVisible()

  await page.goto(NOVO)
  await expect(main.getByText('Conta gratuita: 1 foto e nenhum vídeo. Assinantes enviam até 10 fotos e 2 vídeos.')).toBeVisible()
  await expect(main.getByLabel('Escolher fotos (0 de 1)')).toBeVisible()
  await expect(main.getByLabel(/Escolher vídeos/)).toHaveCount(0)
  await expect(page.locator('input[type=file][accept="video/*"]')).toHaveCount(0)
  await expect(comparison(page)).toBeVisible()

  // the picker refuses the 2nd photo with the 1-photo message
  await main.getByLabel('Escolher fotos (0 de 1)').setInputFiles([photo('flyer-square.jpg'), photo('flyer-portrait.jpg')])
  await expect(main.getByRole('list', { name: 'Fotos escolhidas' }).locator('img')).toHaveCount(1)
  await expect(main.getByRole('alert').filter({ hasText: 'Conta gratuita: 1 foto por anúncio' })).toBeVisible()

  await main.getByLabel('Apelido').fill('Casal Gratis')
  await main.getByRole('group', { name: 'Eu sou' }).getByRole('radio', { name: 'Casal' }).check()
  await main.getByLabel('Texto do anúncio').fill(TEXTO)
  await main.getByLabel('WhatsApp').fill('5561999990001')
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await page.waitForURL(/\/meus-anuncios\/\d+\/editar\?midia=lote/, { timeout: 60_000 })
  adId = Number(/meus-anuncios\/(\d+)\/editar/.exec(page.url())![1])
  await expect(main.getByRole('alert')).toContainText('1 arquivo enviado.')

  // Meus anúncios: label and comparison
  await page.goto('/area-do-assinante/meus-anuncios')
  await expect(main.getByRole('link', { name: 'Novo anúncio' })).toBeVisible()
  await expect(main.getByRole('article').first()).toContainText('Em análise pela equipe')
  await expect(comparison(page)).toBeVisible()
  await context.close()
})

test('edit page: one photo already, no photo form, videos only for subscribers; posting a video is refused', async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  const { context, page } = await ctx(browser, baseURL!)
  await loginAsAssinante(page, LIVRE.email, LIVRE.password)
  await page.goto(`/area-do-assinante/meus-anuncios/${adId}/editar`)
  const main = page.locator('main')
  await expect(main.getByText('Conta gratuita: 1 foto por anúncio.')).toBeVisible()
  await expect(main.getByRole('form', { name: 'Adicionar foto' })).toHaveCount(0)
  await expect(main.getByRole('form', { name: 'Adicionar vídeo' })).toHaveCount(0)
  await expect(main.getByText('Vídeos só para assinantes')).toBeVisible()
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')

  const refused = await fetchAs(page, 'POST', `/area-do-assinante/meus-anuncios/${adId}/midia?tipo=video`, {
    file: { field: 'arquivo', name: 'v.mp4', type: 'video/mp4', text: 'nao-e-video' },
    fields: { tipo: 'video' },
  })
  expect(refused.url).toContain('codigo=video-gratis')
  const second = await fetchAs(page, 'POST', `/area-do-assinante/meus-anuncios/${adId}/midia?tipo=foto`, {
    file: { field: 'arquivo', name: 'f.jpg', type: 'image/jpeg', text: 'nao-e-foto' },
    fields: { tipo: 'foto' },
  })
  expect(second.url).toContain('codigo=limite-fotos-gratis')
  await page.goto(refused.url.replace(new URL(refused.url).origin, ''))
  await expect(main.getByRole('alert')).toContainText('Conta gratuita não envia vídeos.')
  await context.close()
})

test('free account sees the Assine Já panel on board, detail, recados and mensagens, with no restricted markup', async ({ browser, baseURL }) => {
  const { context, page } = await ctx(browser, baseURL!)
  await loginAsAssinante(page, LIVRE.email, LIVRE.password)
  for (const url of [
    '/area-do-assinante/classisex',
    `/area-do-assinante/classisex/${adId}`,
    '/area-do-assinante/recados',
    '/area-do-assinante/mensagens',
  ]) {
    await page.goto(url)
    const main = page.locator('main')
    await expect(main.getByRole('heading', { name: 'Disponível para assinantes' })).toBeVisible()
    await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
    await expect(main.getByRole('link', { name: 'Meus anúncios' }).last()).toHaveAttribute('href', '/area-do-assinante/meus-anuncios')
    await expect(comparison(page)).toBeVisible()
    expect(await page.content()).not.toContain('dahlia-sentinela')
  }
  await context.close()
})

test('after approval a paying member sees the free ad with 1 photo and contacts, no Enviar mensagem; the visitor sees it blurred', async ({
  browser,
  baseURL,
  request,
}) => {
  const api = await staffApi(request)
  await api.aprovar(adId)
  await api.dispose()

  const { context, page } = await ctx(browser, baseURL!)
  await loginAsAssinante(page, PAGO.email, PAGO.password)
  await page.goto('/area-do-assinante/classisex')
  const card = page.locator('main').getByRole('article').filter({ hasText: 'dahlia-sentinela' })
  await expect(card).toHaveCount(1)
  await expect(card.locator('img')).toHaveCount(1)
  await page.goto(`/area-do-assinante/classisex/${adId}`)
  const main = page.locator('main')
  await expect(main.getByRole('list', { name: 'Fotos do anúncio' }).locator('img')).toHaveCount(1)
  await expect(main.getByRole('link', { name: /WhatsApp/ })).toBeVisible()
  await expect(main.getByRole('link', { name: 'Enviar mensagem' })).toHaveCount(0)
  await expect(main.getByText('Conta gratuita: use os contatos do anúncio.')).toBeVisible()

  const visitor = await ctx(browser, baseURL!)
  await visitor.page.goto('/classisex')
  await expect(visitor.page.locator('main').getByText('Casal Gratis')).toBeVisible()
  await expect(visitor.page.locator('main img[src^="/classisex/previa/"]')).toHaveCount(1)
  expect(await visitor.page.content()).not.toContain('dahlia-sentinela')
  await visitor.context.close()
  await context.close()
})

test('Liberar lets the owner add media; when the subscription ends only the cover is shown to others and the extras are Guardada; renewal brings them back', async ({
  browser,
  baseURL,
  request,
}) => {
  test.setTimeout(180_000)
  const api = await staffApi(request)
  await api.liberar(livreId, { durationDays: 30, method: 'cortesia', amount: 0 })

  const owner = await ctx(browser, baseURL!)
  await loginAsAssinante(owner.page, LIVRE.email, LIVRE.password)
  await owner.page.goto(`/area-do-assinante/meus-anuncios/${adId}/editar`)
  const main = owner.page.locator('main')
  await expect(main.getByRole('form', { name: 'Adicionar foto' })).toBeVisible()
  await main.getByRole('form', { name: 'Adicionar foto' }).getByLabel('Adicionar foto').setInputFiles(photo('flyer-portrait.jpg'))
  await main.getByRole('button', { name: 'Enviar foto' }).click()
  await expect(main.getByRole('alert')).toContainText('Foto enviada.')
  await main.getByRole('form', { name: 'Adicionar vídeo' }).getByLabel('Adicionar vídeo').setInputFiles(photo('espaco.mp4'))
  await main.getByRole('button', { name: 'Enviar vídeo' }).click()
  await expect(main.getByRole('alert')).toContainText('Vídeo enviado.')
  await expect(main.getByRole('list', { name: 'Fotos do anúncio' }).locator('img')).toHaveCount(2)
  await expect(main.getByText(/Guardada/)).toHaveCount(0)

  // the media change sent the ad back to review: staff approve again
  await api.aprovar(adId)

  const viewer = await ctx(browser, baseURL!)
  await loginAsAssinante(viewer.page, PAGO.email, PAGO.password)
  const viewerMain = viewer.page.locator('main')
  const seen = async () => {
    await viewer.page.goto(`/area-do-assinante/classisex/${adId}`)
    return {
      fotos: await viewerMain.getByRole('list', { name: 'Fotos do anúncio' }).locator('img').count(),
      videos: await viewerMain.locator('video').count(),
      mensagem: await viewerMain.getByRole('link', { name: 'Enviar mensagem' }).count(),
    }
  }
  expect(await seen()).toEqual({ fotos: 2, videos: 1, mensagem: 1 })

  // the period ends
  await api.encerrar(livreId, 'fim do teste')
  expect(await seen()).toEqual({ fotos: 1, videos: 0, mensagem: 0 })

  await owner.page.goto(`/area-do-assinante/meus-anuncios/${adId}/editar`)
  await expect(main.getByText('Guardada: volta a aparecer quando você assinar')).toHaveCount(2)
  await expect(main.getByRole('form', { name: 'Adicionar foto' })).toHaveCount(0)
  await owner.page.goto('/area-do-assinante/meus-anuncios')
  await expect(main.getByRole('article').first()).toContainText('Publicado como conta gratuita (só a capa aparece)')
  await expect(main).not.toContainText('Fora do ar: assinatura vencida')
  // an edit of the text does not lose the stored media
  await owner.page.goto(`/area-do-assinante/meus-anuncios/${adId}/editar`)
  await main.getByLabel('Texto do anúncio').fill(`${TEXTO} Editado.`)
  await main.getByLabel(DECLARACAO).check()
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await owner.page.waitForURL(/meus-anuncios\?ok=enviado/)
  const stored = await api.findAdMedia(adId)
  expect(stored).toHaveLength(3)
  await api.aprovar(adId)

  // renewal: everything comes back with no re-upload
  await api.liberar(livreId, { durationDays: 30, method: 'cortesia', amount: 0 })
  expect(await seen()).toEqual({ fotos: 2, videos: 1, mensagem: 1 })
  await api.dispose()
  await owner.context.close()
  await viewer.context.close()
})
