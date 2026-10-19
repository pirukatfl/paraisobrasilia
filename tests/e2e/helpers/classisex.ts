import type { APIRequestContext, Page } from '@playwright/test'

import { staffApi } from './api'

/**
 * Scenario for the Phase 4 leak matrix: one owner with an ad in every status, an active viewer
 * (with a pending ad of their own), an expired subscriber whose approved ad is therefore hidden,
 * photos and one video, and one report. Data goes through staff REST so the server's cache
 * hooks run exactly as in production.
 */
const DAY = 86_400_000
export const PASSWORD = 'senha-seguranca-12345'

export const OWNER = { email: 'otto.dono@teste.local', name: 'Otto Dono', password: PASSWORD }
export const VIEWER = { email: 'vera.viewer@teste.local', name: 'Vera Viewer', password: PASSWORD }
export const EXPIRED = { email: 'egon.vencido@teste.local', name: 'Egon Vencido', password: PASSWORD }

export const TEXTS = {
  aprovado: 'Texto aprovado zebra-azul procura amigos, chama no 61 98877-1122',
  pendente: 'Texto pendente girafa-verde aguardando análise',
  recusado: 'Texto recusado leao-roxo com problema',
  despublicado: 'Texto despublicado tigre-cinza fora do ar',
  expiredAuthor: 'Texto vencido panda-rosa de assinante expirado',
  viewerPendente: 'Texto pendente da viewer coruja-marrom',
}

export type MediaInfo = {
  id: number
  filename: string
  card?: string
  previa?: string
}

export type Scenario = Awaited<ReturnType<typeof buildClassisexScenario>>

export async function buildClassisexScenario(request: APIRequestContext) {
  const api = await staffApi(request)
  await api.deleteAll('ad-reports')
  await api.deleteAll('assinantes')
  await api.deleteAll('ads')

  const owner = await api.createAssinante(OWNER)
  const viewer = await api.createAssinante(VIEWER)
  const expired = await api.createAssinante(EXPIRED)
  await api.liberar(owner.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.liberar(viewer.id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.createSubscription({
    assinante: expired.id,
    startsAt: new Date(Date.now() - 31 * DAY).toISOString(),
    endsAt: new Date(Date.now() - DAY).toISOString(),
  })

  const contatoOwner = { whatsapp: '5561981112201', telegram: 'tg_otto_unico', email: 'otto.contato@exemplo.com' }
  const mk = (author: number, texto: string, status: 'pendente' | 'aprovado' | 'recusado' | 'despublicado', contato: object) =>
    api.createAd({ author, texto, cidade: 'Brasília', status, contato }).then((d) => d.id)

  const ads = {
    aprovado: await mk(owner.id, TEXTS.aprovado, 'aprovado', contatoOwner),
    pendente: await mk(owner.id, TEXTS.pendente, 'pendente', { whatsapp: '5561981112202' }),
    recusado: await mk(owner.id, TEXTS.recusado, 'recusado', { whatsapp: '5561981112203' }),
    despublicado: await mk(owner.id, TEXTS.despublicado, 'despublicado', { whatsapp: '5561981112204' }),
    expiredAuthor: await mk(expired.id, TEXTS.expiredAuthor, 'aprovado', { whatsapp: '5561981112205', telegram: 'tg_egon_unico' }),
    viewerPendente: await mk(viewer.id, TEXTS.viewerPendente, 'pendente', { whatsapp: '5561981112206' }),
  }

  const info = async (adId: number, fixture: 'flyer-square.jpg' | 'espaco.mp4'): Promise<MediaInfo> => {
    const doc = await api.uploadAdMedia(adId, fixture)
    const docs = await api.findAdMedia(adId)
    const row = docs.find((d) => d.id === doc.id)!
    return { id: row.id, filename: row.filename, card: row.sizes?.card?.filename ?? undefined, previa: row.previa ?? undefined }
  }
  const media = {
    foto: await info(ads.aprovado, 'flyer-square.jpg'),
    video: await info(ads.aprovado, 'espaco.mp4'),
    fotoPendente: await info(ads.pendente, 'flyer-square.jpg'),
    fotoExpired: await info(ads.expiredAuthor, 'flyer-square.jpg'),
    fotoViewerPendente: await info(ads.viewerPendente, 'flyer-square.jpg'),
  }
  // Uploads send an approved ad back to review only through the member flow; staff uploads keep status
  const report = await api.createReport({ ad: ads.aprovado, reporter: viewer.id, motivo: 'outro' })

  const files = {
    fotoFilename: media.foto.filename,
    cardFilename: media.foto.card ?? media.foto.filename,
    previaFilename: media.foto.previa ?? media.foto.filename,
    videoFilename: media.video.filename,
  }
  const contacts = [
    ...Object.values(contatoOwner),
    '5561981112202',
    '5561981112203',
    '5561981112204',
    '5561981112205',
    'tg_egon_unico',
    '98877-1122',
    OWNER.email,
    VIEWER.email,
    EXPIRED.email,
    OWNER.name,
    VIEWER.name,
    EXPIRED.name,
  ]
  const headers = api.headers
  await api.dispose()
  return { owner, viewer, expired, ads, media, files, contacts, reportId: report.id, staffHeaders: headers }
}

export type Fetched = {
  status: number
  headers: Record<string, string>
  body: string
  bytes: number
  url: string
}

/**
 * Same-origin fetch executed inside the logged-in page (the browser adds the session cookie and
 * Sec-Fetch-Site; Payload ignores cookies without them when csrf is set). `cache: no-store` so
 * private 200s are never answered from the browser cache.
 */
export function fetchAs(
  page: Page,
  method: string,
  path: string,
  init: { json?: unknown; file?: { field: string; name: string; type: string; text: string }; fields?: Record<string, string> } = {},
): Promise<Fetched> {
  return page.evaluate(
    async ([m, p, i]) => {
      const opts = i as typeof init
      let body: BodyInit | undefined
      const headers: Record<string, string> = {}
      if (opts.json !== undefined) {
        body = JSON.stringify(opts.json)
        headers['Content-Type'] = 'application/json'
      } else if (opts.file) {
        const form = new FormData()
        for (const [k, v] of Object.entries(opts.fields ?? {})) form.append(k, v)
        form.append(opts.file.field, new File([opts.file.text], opts.file.name, { type: opts.file.type }))
        body = form
      }
      const res = await fetch(p as string, { method: m as string, credentials: 'include', cache: 'no-store', headers, body })
      const buf = await res.arrayBuffer()
      const out: Record<string, string> = {}
      res.headers.forEach((v, k) => (out[k] = v))
      return { status: res.status, headers: out, body: new TextDecoder().decode(buf), bytes: buf.byteLength, url: res.url }
    },
    [method, path, init] as const,
  ) as Promise<Fetched>
}
