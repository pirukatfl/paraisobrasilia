import type { APIRequestContext } from '@playwright/test'

import { staffApi } from './api'

/**
 * Scenario for the free/paying leak matrix (G-02..G-05). Principals:
 *  PAGO      paying author, approved ad with 2 photos + 1 video
 *  PAGO2     paying author who talks to VIEWER (his access ends during the replay test)
 *  GRATIS    free author (never paid), approved ad with its single photo
 *  EXPIRADO  author who uploaded 3 photos + 1 video while paying, then lost access
 *  VIEWER    paying viewer with a pending ad of his own
 *  LIVRE     free viewer (never paid) with a pending ad of her own
 *  NAOCONF   account whose e-mail is not confirmed
 * Data goes through staff REST so the cache hooks run as in production.
 */
export const PASSWORD = 'senha-gratuita-matriz-123'

const acc = (slug: string, name: string) => ({ email: `${slug}.matriz@teste.local`, name, password: PASSWORD })
export const PAGO = acc('pago', 'Paulo Pagante')
export const PAGO2 = acc('pago2', 'Pedro Segundo')
export const GRATIS = acc('gratis', 'Gabi Gratuita')
export const EXPIRADO = acc('expirado', 'Enzo Expirado')
export const VIEWER = acc('viewer', 'Vitor Viewer')
export const LIVRE = acc('livre', 'Lia Livre')
export const NAOCONF = acc('naoconf', 'Nina Naoconfirmada')

export const TEXTS = {
  pago: 'Texto pago sentinela-abacate procura amigos',
  pago2: 'Texto pago2 sentinela-framboesa procura amigos',
  gratis: 'Texto gratis sentinela-jabuticaba procura amigos',
  expirado: 'Texto expirado sentinela-pitanga procura amigos',
  viewer: 'Texto pendente do viewer sentinela-caju',
  livre: 'Texto pendente da livre sentinela-goiaba',
}

/** Contacts planted inside the ad texts: the open board shows the text, never these. */
export const PLANTED_IN_TEXT = {
  pago: { tail: ' Zap 61 98111-0001 ou pago.plantado@exemplo.com', secrets: ['98111-0001', 'pago.plantado@exemplo.com'] },
  gratis: { tail: ' Insta @gratis_plantado ou https://exemplo-gratis.com.br/x', secrets: ['@gratis_plantado', 'gratis_plantado', 'exemplo-gratis.com.br'] },
  expirado: { tail: ' Chama no 61 97531-8642', secrets: ['97531-8642'] },
}
export const ALL_PLANTED = Object.values(PLANTED_IN_TEXT).flatMap((p) => p.secrets)

export const CONTACTS = {
  pago: { whatsapp: '5561982220001', telegram: 'tg_pago_unico' },
  pago2: { whatsapp: '5561982220002', telegram: 'tg_pago2_unico' },
  gratis: { whatsapp: '5561982220003', telegram: 'tg_gratis_unico' },
  expirado: { whatsapp: '5561982220004', telegram: 'tg_expirado_unico' },
}

export type MediaRef = { id: number; kind: 'foto' | 'video' }
export type TierScenario = Awaited<ReturnType<typeof buildTierScenario>>

export async function buildTierScenario(request: APIRequestContext) {
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('recados')
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')

  const ids: Record<string, number> = {}
  for (const [key, who] of Object.entries({ pago: PAGO, pago2: PAGO2, gratis: GRATIS, expirado: EXPIRADO, viewer: VIEWER, livre: LIVRE, naoconf: NAOCONF })) {
    ids[key] = (await api.createAssinante(who)).id
  }
  for (const key of ['pago', 'pago2', 'expirado', 'viewer']) {
    await api.liberar(ids[key]!, { durationDays: 30, method: 'cortesia', amount: 0 })
  }

  const mk = (author: number, apelido: string, texto: string, status: 'aprovado' | 'pendente', contato: { whatsapp: string; telegram?: string }) =>
    api.createAd({ author, apelido, texto, cidade: 'Brasília', status, contato }).then((d) => d.id)
  const ads = {
    pago: await mk(ids.pago!, 'Casal Abacate', TEXTS.pago + PLANTED_IN_TEXT.pago.tail, 'aprovado', CONTACTS.pago),
    pago2: await mk(ids.pago2!, 'Casal Framboesa', TEXTS.pago2, 'aprovado', CONTACTS.pago2),
    gratis: await mk(ids.gratis!, 'Casal Jabuticaba', TEXTS.gratis + PLANTED_IN_TEXT.gratis.tail, 'aprovado', CONTACTS.gratis),
    expirado: await mk(ids.expirado!, 'Casal Pitanga', TEXTS.expirado + PLANTED_IN_TEXT.expirado.tail, 'aprovado', CONTACTS.expirado),
    viewer: await mk(ids.viewer!, 'Casal Caju', TEXTS.viewer, 'pendente', { whatsapp: '5561982220005' }),
    livre: await mk(ids.livre!, 'Casal Goiaba', TEXTS.livre, 'pendente', { whatsapp: '5561982220006' }),
  }

  const up = async (adId: number, fixture: 'flyer-square.jpg' | 'flyer-portrait.jpg' | 'espaco.mp4', order: number): Promise<MediaRef> => {
    const doc = await api.uploadAdMedia(adId, fixture, order)
    return { id: doc.id, kind: fixture.endsWith('.mp4') ? 'video' : 'foto' }
  }
  const media = {
    pago: [await up(ads.pago, 'flyer-square.jpg', 0), await up(ads.pago, 'flyer-portrait.jpg', 1), await up(ads.pago, 'espaco.mp4', 2)],
    pago2: [await up(ads.pago2, 'flyer-square.jpg', 0)],
    gratis: [await up(ads.gratis, 'flyer-square.jpg', 0)],
    expirado: [
      await up(ads.expirado, 'flyer-square.jpg', 0),
      await up(ads.expirado, 'flyer-portrait.jpg', 1),
      await up(ads.expirado, 'flyer-square.jpg', 2),
      await up(ads.expirado, 'espaco.mp4', 3),
    ],
    viewer: [await up(ads.viewer, 'flyer-square.jpg', 0)],
    livre: [await up(ads.livre, 'flyer-square.jpg', 0)],
  }

  // EXPIRADO lost access after uploading: the extra media are kept, only the cover is shown (G-05)
  await api.encerrar(ids.expirado!, 'Cenário da matriz de conta gratuita')
  // NAOCONF: staff marks the e-mail as not confirmed (same endpoint as the admin button)
  const off = await request.post(`/api/assinantes/${ids.naoconf}/email-confirmado`, {
    headers: api.headers,
    data: { confirmado: false },
  })
  if (!off.ok()) throw new Error(`email-confirmado failed: ${off.status()} ${await off.text()}`)

  const headers = api.headers
  await api.dispose()
  return { ids, ads, media, staffHeaders: headers }
}

/** Distinct media ids that a page or RSC payload points at (plain or url-encoded). */
export function mediaIdsIn(body: string): number[] {
  const found = new Set<number>()
  for (const m of body.matchAll(/area-do-assinante(?:\/|%2F)midia(?:\/|%2F)(\d+)(?:\/|%2F)/g)) found.add(Number(m[1]))
  return [...found].sort((a, b) => a - b)
}
