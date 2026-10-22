import { expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

import { staffApi } from './api'
import { loginAsAssinante } from './assinante'

/**
 * Scenario for the Phase 5 leak matrix (05-11). Principals: ANA (active, ad + approved recado,
 * owner of every conversation), BETO (active, in a conversation with Ana), CAIO (active, not in
 * any), EDU (expired after talking to Ana), BIA (active, blocked by Ana), SUSI (suspended).
 * Conversations are created through the real UI (the collections are closed to REST).
 */
export const PASSWORD = 'senha-fase5-12345'
export const SENTINELS = {
  contoRestrito: 'SENTINELA-CONTO-RESTRITO-5',
  recadoApelido: 'ApelidoSentinela5',
  recadoTexto: 'RECADO-SENTINELA-5',
  mensagem: 'MENSAGEM-SENTINELA-5',
  telefone: '61 97766-5544',
}
export const PHONE_DIGITS = '97766-5544'

/** Ana's approved ad: readable text (shown to visitors and free accounts) with contacts planted in it and in the fields. */
export const AD_PLANT = {
  apelido: 'AnaBSB',
  visible: 'Casal da Ana aberto ao diálogo',
  texto:
    'Casal da Ana aberto ao diálogo. Zap 61 95544-3322, ana.plantada@exemplo.com, insta @ana_plantada, ' +
    'https://wa.me/5561955443322 e www.ana-plantada.com.br',
  contato: { whatsapp: '5561955443322', telegram: 'ana_tg_plantado' },
  /** None of these may reach a visitor or a free account, in HTML, RSC or REST. */
  secrets: ['95544-3322', '5561955443322', 'ana.plantada@exemplo.com', '@ana_plantada', 'ana_plantada', 'ana-plantada.com', 'ana_tg_plantado'],
}

export const ANA = { email: 'ana.fase5@teste.local', name: 'Ana Fase5', password: PASSWORD }
export const BETO = { email: 'beto.fase5@teste.local', name: 'Beto Fase5', password: PASSWORD }
export const CAIO = { email: 'caio.fase5@teste.local', name: 'Caio Fase5', password: PASSWORD }
export const EDU = { email: 'edu.fase5@teste.local', name: 'Edu Fase5', password: PASSWORD }
export const BIA = { email: 'bia.fase5@teste.local', name: 'Bia Fase5', password: PASSWORD }
export const SUSI = { email: 'susi.fase5@teste.local', name: 'Susi Fase5', password: PASSWORD }

export const CONTO_SLUG = 'conto-fase5'
export const CONTO_PARAGRAFOS = [
  'Primeiro parágrafo aberto do conto da fase cinco.',
  'Segundo parágrafo aberto do conto da fase cinco.',
  'Terceiro parágrafo reservado aos assinantes.',
  `Quarto parágrafo reservado com ${SENTINELS.contoRestrito} dentro.`,
  'Quinto parágrafo reservado aos assinantes.',
]
const RECADO_TEXTO =
  'Casal tranquilo procurando amigos para conversar, passear e participar das festas da casa com muito respeito e discrição. ' +
  `${SENTINELS.recadoTexto} fala comigo no ${SENTINELS.telefone}`

export type Who = typeof ANA
export type Fase5 = Awaited<ReturnType<typeof buildFase5Scenario>>

export async function loginPage(browser: Browser, baseURL: string, who: Who, next?: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, who.email, who.password, next)
  return { context, page }
}

/** Starts a conversation with Ana through the real compose page; returns the conversation id. */
async function startViaUi(browser: Browser, baseURL: string, who: Who, adId: number, apelido: string, texto: string) {
  const { context, page } = await loginPage(browser, baseURL, who, `/area-do-assinante/mensagens/nova?anuncio=${adId}`)
  await page.getByLabel('Seu apelido').fill(apelido)
  await page.getByLabel('Recado', { exact: true }).fill(texto)
  await page.getByRole('button', { name: 'Enviar' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\/mensagens\/\d+$/)
  const id = Number(page.url().split('/').pop())
  await context.close()
  return id
}

export async function buildFase5Scenario(request: APIRequestContext, browser: Browser, baseURL: string) {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('ads')
  await api.deleteAll('contos')
  await api.deleteAll('message-reports')
  await api.deleteAll('assinantes')

  const ids: Record<string, number> = {}
  for (const [key, who] of Object.entries({ ana: ANA, beto: BETO, caio: CAIO, edu: EDU, bia: BIA, susi: SUSI })) {
    ids[key] = (await api.createAssinante(who)).id
    await api.liberar(ids[key]!, { durationDays: 30, method: 'cortesia', amount: 0 })
  }
  const adId = (await api.createAd({ author: ids.ana!, apelido: AD_PLANT.apelido, texto: AD_PLANT.texto, contato: AD_PLANT.contato, status: 'aprovado' })).id
  const recadoId = (
    await api.createRecado({ author: ids.ana!, apelido: SENTINELS.recadoApelido, texto: RECADO_TEXTO, status: 'aprovado' })
  ).id
  const conto = await api.createConto({
    title: 'Conto Fase Cinco',
    slug: CONTO_SLUG,
    paragrafos: CONTO_PARAGRAFOS,
    paragrafosAbertos: 2,
  })

  const conv = {
    beto: await startViaUi(browser, baseURL, BETO, adId, 'BetoDF', SENTINELS.mensagem),
    edu: await startViaUi(browser, baseURL, EDU, adId, 'EduDF', `Conversa antiga ${SENTINELS.mensagem}`),
    bia: await startViaUi(browser, baseURL, BIA, adId, 'BiaDF', 'Oi, tudo bem?'),
    susi: await startViaUi(browser, baseURL, SUSI, adId, 'SusiDF', 'Oi, aqui é a Susi'),
  }

  // Edu's access ends; Susi is suspended by staff; Ana blocks Bia from the thread
  await api.encerrar(ids.edu!, 'Cenário da fase 5')
  await api.updateAssinante(ids.susi!, { mensagensSuspensas: true })
  const ana = await loginPage(browser, baseURL, ANA, `/area-do-assinante/mensagens/${conv.bia}`)
  await ana.page.getByText('Bloquear', { exact: true }).click()
  await ana.page.getByRole('button', { name: 'Sim, bloquear' }).click()
  await expect(ana.page.getByText('Você bloqueou esta pessoa.', { exact: true })).toBeVisible()
  await ana.context.close()

  await api.dispose()
  return { ids, adId, recadoId, contoId: conto.id as number, conv }
}

export type Captured = { url: string; headers: Record<string, string>; body: Buffer }

/** Sends a reply through the real form and records the server-action request for replay. */
export async function captureReply(page: Page, texto: string): Promise<Captured> {
  await page.getByLabel('Recado', { exact: true }).fill(texto)
  const [request] = await Promise.all([
    page.waitForRequest((r) => r.method() === 'POST' && 'next-action' in r.headers()),
    page.getByRole('button', { name: 'Enviar' }).click(),
  ])
  const headers = await request.allHeaders()
  const keep: Record<string, string> = {}
  for (const name of ['next-action', 'content-type', 'next-router-state-tree', 'accept']) {
    if (headers[name]) keep[name] = headers[name]
  }
  return { url: request.url(), headers: keep, body: request.postDataBuffer()! }
}
