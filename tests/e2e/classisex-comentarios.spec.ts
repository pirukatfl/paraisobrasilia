import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// Comentários nos anúncios do ClassiSex (pedido do cliente 2026-11-03): todos leem, qualquer conta logada
// comenta, e os contatos escritos nos comentários só aparecem para assinante ativo. A redação é feita no
// servidor: o HTML e o payload da página aberta nunca carregam o contato nem o autor.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-comentarios-12345'
const DONA = { email: 'dona.anuncio@teste.local', name: 'Dona Anuncio Secreta', password: PASSWORD }
const GRATIS = { email: 'gratis.comenta@teste.local', name: 'Gratis Nome Secreto', password: PASSWORD }
const PAGO = { email: 'pago.le@teste.local', name: 'Pago Nome Secreto', password: PASSWORD }
const APELIDO_ANUNCIO = 'Casal Anfitrião'
const TEXTO_ANUNCIO = 'Anúncio de conversa lima-sentinela para a próxima festa.'
const CONTATO_RAW = 'chama no zap 61 98877-6655 ou gratis.contato@exemplo.com'
const COMENTARIO = `Adorei! Se quiser, ${CONTATO_RAW}`
const RESPOSTA = 'Resposta da própria conta, tudo certo.'
const REDIGIDO = '[contato só para assinantes]'
const SECRETS = ['98877', '6655', 'gratis.contato@exemplo.com', GRATIS.email, GRATIS.name, DONA.email, PAGO.email]

let adId = 0
let pendingId = 0
let gratisId = 0

async function ctx(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

const secao = (page: Page) => page.locator('#comentarios')

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('ad-comments')
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')
  const dona = await api.createAssinante(DONA)
  await api.liberar(dona.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  gratisId = (await api.createAssinante(GRATIS)).id
  const pago = await api.createAssinante(PAGO)
  await api.liberar(pago.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  adId = (await api.createAd({ author: dona.id, apelido: APELIDO_ANUNCIO, texto: TEXTO_ANUNCIO, status: 'aprovado' })).id
  pendingId = (await api.createAd({ author: dona.id, apelido: 'Pendente', texto: 'Ainda em análise', status: 'pendente' })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ad-comments')
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

test('visitante vê a conversa vazia e o convite para entrar, sem formulário; a página não é indexada', async ({ browser, baseURL }) => {
  const { context, page } = await ctx(browser, baseURL!)
  await page.goto('/classisex')
  const card = page.getByRole('article').filter({ hasText: APELIDO_ANUNCIO })
  await card.getByRole('link', { name: 'Comentar' }).click()
  await page.waitForURL(new RegExp(`/classisex/anuncio/${adId}`))
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(APELIDO_ANUNCIO)
  await expect(page.locator('main')).toContainText(TEXTO_ANUNCIO)
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
  await expect(secao(page).getByRole('heading', { name: 'Comentários' })).toBeVisible()
  await expect(secao(page)).toContainText('Ainda não há comentários. Comece a conversa.')
  await expect(secao(page)).toContainText('Entre ou crie sua conta grátis para comentar.')
  await expect(secao(page).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', `/entrar?next=%2Fclassisex%2Fanuncio%2F${adId}`)
  await expect(secao(page).getByRole('link', { name: 'Criar conta grátis' })).toHaveAttribute('href', '/cadastro')
  await expect(page.locator('textarea')).toHaveCount(0)
  await context.close()
})

test('anúncio em análise ou inexistente: 404', async ({ browser, baseURL }) => {
  const { context, page } = await ctx(browser, baseURL!)
  for (const id of [pendingId, 999999]) {
    const res = await page.goto(`/classisex/anuncio/${id}`)
    expect(res?.status()).toBe(404)
  }
  const bad = await page.goto('/classisex/anuncio/abc')
  expect(bad?.status()).toBe(404)
  await context.close()
})

test('conta gratuita volta para o anúncio depois de entrar, comenta, responde e apaga', async ({ browser, baseURL }) => {
  const { context, page } = await ctx(browser, baseURL!)
  await page.goto(`/classisex/anuncio/${adId}`)
  await secao(page).getByRole('link', { name: 'Entrar' }).click()
  await page.getByLabel('E-mail').fill(GRATIS.email)
  await page.getByLabel('Senha', { exact: true }).fill(GRATIS.password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(new RegExp(`/classisex/anuncio/${adId}$`))

  await secao(page).getByLabel('Seu apelido').fill('Gratis Lua')
  await secao(page).getByLabel('Seu comentário').fill(COMENTARIO)
  await expect(secao(page).getByText(`${COMENTARIO.length}/1000`)).toBeVisible()
  await secao(page).getByRole('button', { name: 'Comentar' }).click()

  const primeiro = secao(page).getByRole('listitem').first()
  await expect(primeiro).toContainText('Gratis Lua')
  // conta gratuita: o contato sai no servidor
  await expect(primeiro).toContainText('Adorei! Se quiser, chama no')
  await expect(primeiro).toContainText(REDIGIDO)
  for (const secret of ['98877', 'gratis.contato@exemplo.com']) await expect(primeiro).not.toContainText(secret)
  await expect(secao(page)).toContainText('Contatos escritos nos comentários aparecem só para assinantes.')
  await expect(secao(page).getByRole('link', { name: 'Assine para ver' })).toHaveAttribute('href', '/assine-ja')
  // o formulário se limpou
  await expect(secao(page).getByLabel('Seu comentário')).toHaveValue('')

  // responder
  await primeiro.getByRole('button', { name: 'Responder' }).click()
  await primeiro.getByLabel('Seu comentário').fill(RESPOSTA)
  await primeiro.getByRole('button', { name: 'Responder', exact: true }).click()
  await expect(primeiro.getByRole('listitem').filter({ hasText: RESPOSTA })).toHaveCount(1)
  await expect(secao(page).getByRole('heading', { name: /Comentários\s*\(2\)/ })).toBeVisible()

  // apagar a resposta (pede confirmação)
  const resposta = primeiro.getByRole('listitem').filter({ hasText: RESPOSTA })
  await resposta.getByText('Apagar', { exact: true }).click()
  await expect(resposta).toContainText('Apagar este comentário?')
  await resposta.getByRole('button', { name: 'Sim, apagar' }).click()
  await expect(secao(page).getByText(RESPOSTA)).toHaveCount(0)

  // apagar só aparece nos próprios comentários e o responder volta a existir
  await expect(primeiro.getByText('Apagar', { exact: true })).toBeVisible()
  await context.close()
})

test('visitante vê o comentário sem contato e sem dados da autora, no HTML e no payload', async ({ browser, baseURL, request }) => {
  const { context, page } = await ctx(browser, baseURL!)
  await page.goto(`/classisex/anuncio/${adId}`)
  const primeiro = secao(page).getByRole('listitem').first()
  await expect(primeiro).toContainText('Gratis Lua')
  await expect(primeiro).toContainText(REDIGIDO)
  await expect(primeiro.getByText('Apagar', { exact: true })).toHaveCount(0)
  await expect(page.locator('textarea')).toHaveCount(0)
  const html = await page.content()
  const raw = await (await request.get(`/classisex/anuncio/${adId}`)).text()
  for (const body of [html, raw]) for (const secret of SECRETS) expect(body, secret).not.toContain(secret)

  // o cartão do quadro mostra a contagem e aponta para a conversa
  await page.goto('/classisex')
  const link = page.getByRole('article').filter({ hasText: APELIDO_ANUNCIO }).getByRole('link', { name: 'Comentários (1)' })
  await expect(link).toHaveAttribute('href', `/classisex/anuncio/${adId}#comentarios`)
  await context.close()
})

test('assinante ativo vê o contato escrito no comentário, na área do assinante e na página aberta', async ({ browser, baseURL }) => {
  const { context, page } = await ctx(browser, baseURL!)
  await loginAsAssinante(page, PAGO.email, PAGO.password)
  await page.goto(`/area-do-assinante/classisex/${adId}`)
  await expect(secao(page)).toBeVisible()
  const primeiro = secao(page).getByRole('listitem').first()
  await expect(primeiro).toContainText(CONTATO_RAW)
  await expect(primeiro).not.toContainText(REDIGIDO)
  await expect(secao(page)).not.toContainText('Contatos escritos nos comentários aparecem só para assinantes.')
  // assinante também comenta
  await secao(page).getByLabel('Seu apelido').fill('Pago Sol')
  await secao(page).getByLabel('Seu comentário').fill('Oi! Também gostei.')
  await secao(page).getByRole('button', { name: 'Comentar' }).click()
  await expect(secao(page).getByRole('listitem').filter({ hasText: 'Oi! Também gostei.' })).toHaveCount(1)

  // cartão do quadro dos assinantes
  await page.goto('/area-do-assinante/classisex')
  await expect(page.getByRole('link', { name: 'Comentários (2)' })).toHaveAttribute('href', `/area-do-assinante/classisex/${adId}#comentarios`)

  // a página aberta: o mesmo assinante vê o contato e o link para o anúncio completo
  await page.goto(`/classisex/anuncio/${adId}`)
  await expect(secao(page).getByRole('listitem').first()).toContainText(CONTATO_RAW)
  await expect(page.getByRole('link', { name: 'Ver anúncio completo' })).toHaveAttribute('href', `/area-do-assinante/classisex/${adId}`)
  await context.close()
})

test('a equipe oculta o comentário no painel e ele some do site; reexibir traz de volta', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  const { docs } = (await api.get(`/api/ad-comments?where[ad][equals]=${adId}&where[apelido][equals]=Gratis Lua&limit=1&depth=0`)) as { docs: { id: number }[] }
  await api.dispose()
  const commentId = docs[0]!.id

  const staff = await ctx(browser, baseURL!)
  await loginAsStaff(staff.page)
  await staff.page.goto(`/admin/collections/ad-comments/${commentId}`)
  await staff.page.locator('#field-status').click()
  await staff.page.getByRole('option', { name: 'Oculto' }).click()
  await staff.page.getByRole('button', { name: 'Salvar' }).first().click()
  await expect(staff.page.getByText('atualizado com sucesso', { exact: false }).first()).toBeVisible()

  const { context, page } = await ctx(browser, baseURL!)
  await page.goto(`/classisex/anuncio/${adId}`)
  await expect(secao(page)).not.toContainText('Gratis Lua')
  await expect(secao(page)).toContainText('Pago Sol')
  await page.goto('/classisex')
  await expect(page.getByRole('article').filter({ hasText: APELIDO_ANUNCIO }).getByRole('link', { name: 'Comentários (1)' })).toBeVisible()

  await staff.page.locator('#field-status').click()
  await staff.page.getByRole('option', { name: 'Publicado' }).click()
  await staff.page.getByRole('button', { name: 'Salvar' }).first().click()
  await expect(staff.page.getByText('atualizado com sucesso', { exact: false }).first()).toBeVisible()
  await page.goto(`/classisex/anuncio/${adId}`)
  await expect(secao(page)).toContainText('Gratis Lua')
  await context.close()
  await staff.context.close()
})

test('conta bloqueada pela equipe vê o aviso e nenhum formulário', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.updateAssinante(gratisId, { comentariosBloqueados: true })
  await api.dispose()
  const { context, page } = await ctx(browser, baseURL!)
  await loginAsAssinante(page, GRATIS.email, GRATIS.password)
  await page.goto(`/classisex/anuncio/${adId}`)
  await expect(secao(page)).toContainText('Sua conta está sem permissão para comentar.')
  await expect(page.locator('textarea')).toHaveCount(0)
  await expect(secao(page).getByRole('button', { name: 'Responder' })).toHaveCount(0)
  // os comentários que ela já tinha continuam visíveis e ainda dá para apagá-los
  await expect(secao(page).getByRole('listitem').first()).toContainText('Gratis Lua')
  await context.close()
})
