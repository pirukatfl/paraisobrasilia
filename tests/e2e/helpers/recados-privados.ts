import { expect, type APIRequestContext, type Browser, type Page } from '@playwright/test'

import { staffApi } from './api'
import { captureReply, loginPage, type Captured, type Who } from './fase5'

/**
 * Scenario for the private-recados privacy matrix (quick recados-privados).
 *  ANA     active, approved ad (the target of the first recado)
 *  BETO    active, approved ad; writes to Ana and then replies once more
 *  CAIO    active, no ad (the third paying member)
 *  GABI    free, approved ad with 1 photo (cannot receive recados)
 *  FELIPE  free, no ad
 * Plus a legacy mural recado by Ana (sentinel + phone) that must never be rendered anywhere.
 * Conversations are created through the real UI (REST is closed for them).
 */
export const PASSWORD = 'senha-recados-priv-123'
export const SENT = {
  conversa: 'CONVERSA-ANA-BETO-SENTINELA',
  resposta: 'RESPOSTA-ANA-SENTINELA',
  replay: 'REPLAY-BETO-SENTINELA',
  legado: 'RECADO-LEGADO-SENTINELA',
  legadoApelido: 'ApelidoLegadoSentinela',
}
export const LEGADO_FONE = '98877-1234'

const acc = (slug: string, name: string): Who => ({ email: `${slug}.priv@teste.local`, name, password: PASSWORD })
export const ANA = acc('ana', 'Ana Privada')
export const BETO = acc('beto', 'Beto Privado')
export const CAIO = acc('caio', 'Caio Privado')
export const GABI = acc('gabi', 'Gabi Gratuita')
export const FELIPE = acc('felipe', 'Felipe Livre')

export const APELIDOS = { ana: 'AnaPriv', beto: 'BetoPriv' }

export type Scenario = Awaited<ReturnType<typeof buildScenario>>

/** Real compose submit; records the server-action request so it can be replayed. */
async function captureStart(page: Page, texto: string): Promise<Captured> {
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

export async function buildScenario(request: APIRequestContext, browser: Browser, baseURL: string) {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('message-reports')
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')

  const ids: Record<string, number> = {}
  for (const [key, who] of Object.entries({ ana: ANA, beto: BETO, caio: CAIO, gabi: GABI, felipe: FELIPE })) {
    ids[key] = (await api.createAssinante(who)).id
  }
  for (const key of ['ana', 'beto', 'caio']) {
    await api.liberar(ids[key]!, { durationDays: 30, method: 'cortesia', amount: 0 })
  }
  await api.updateAssinante(ids.ana!, { apelido: APELIDOS.ana })
  await api.updateAssinante(ids.beto!, { apelido: APELIDOS.beto })
  const anaAd = (await api.createAd({ author: ids.ana!, apelido: 'AnaBSB', texto: 'Texto do anuncio da Ana sentinela-ana', status: 'aprovado' })).id
  const betoAd = (await api.createAd({ author: ids.beto!, apelido: 'BetoBSB', texto: 'Texto do anuncio do Beto sentinela-beto', status: 'aprovado' })).id
  const gabiAd = (await api.createAd({ author: ids.gabi!, apelido: 'GabiBSB', texto: 'Texto do anuncio da Gabi sentinela-gabi', status: 'aprovado' })).id
  await api.uploadAdMedia(gabiAd, 'flyer-square.jpg', 0)
  const legado = (
    await api.createRecado({
      author: ids.ana!,
      apelido: SENT.legadoApelido,
      texto: `${SENT.legado} fala comigo no 61 ${LEGADO_FONE}`,
      status: 'aprovado',
    })
  ).id

  // Beto writes to Ana from her ad, through the button
  const beto = await loginPage(browser, baseURL, BETO, `/area-do-assinante/classisex/${anaAd}`)
  await beto.page.getByRole('link', { name: 'Enviar recado' }).click()
  await expect(beto.page).toHaveURL(new RegExp(`/mensagens/nova\\?anuncio=${anaAd}$`))
  const start = await captureStart(beto.page, SENT.conversa)
  await expect(beto.page).toHaveURL(/\/area-do-assinante\/mensagens\/\d+$/)
  const conv = Number(beto.page.url().split('/').pop())

  // Ana replies
  const ana = await loginPage(browser, baseURL, ANA, `/area-do-assinante/mensagens/${conv}`)
  await ana.page.getByLabel('Recado', { exact: true }).fill(SENT.resposta)
  await ana.page.getByRole('button', { name: 'Enviar' }).click()
  await expect(ana.page.getByRole('list', { name: 'Recados' })).toContainText(SENT.resposta)
  await ana.context.close()

  // Beto answers once more (this action is the one replayed by other principals)
  await beto.page.goto(`/area-do-assinante/mensagens/${conv}`)
  const reply = await captureReply(beto.page, SENT.replay)
  await expect(beto.page.getByRole('list', { name: 'Recados' })).toContainText(SENT.replay)
  await beto.context.close()

  await api.dispose()
  return { ids, anaAd, betoAd, gabiAd, legado, conv, start, reply }
}

/** Number of conversation links in an inbox page. */
export const inboxLinks = (html: string): number =>
  new Set(html.match(/href="\/area-do-assinante\/mensagens\/\d+"/g) ?? []).size

/** Same server-action body, other target ad (the form field is the only thing a caller controls). */
export function withTarget(captured: Captured, adId: number): Buffer {
  const text = captured.body.toString('latin1')
  const next = text.replace(/(name="[^"]*alvo"\r\n\r\n)\d+/, `$1${adId}`)
  expect(next, 'alvo field found in the captured action').not.toBe(text)
  return Buffer.from(next, 'latin1')
}
