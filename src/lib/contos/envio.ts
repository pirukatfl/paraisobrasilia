/**
 * Contos sent by anyone, without an account (client decision 2026-10-24).
 *
 * The conto is always created as a DRAFT: it reaches the site only when staff publish it. The optional
 * image is stored with `pendente: true`, which keeps its document and file unreadable for the public until
 * the conto is published (Media.access.read + afterChange of contos). The e-mail goes only to the
 * staff-only field `emailVisitante`; it is never logged or put in a DTO. No 'server-only' import: used by
 * the route handler and int tests.
 */
import { randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { MAX_AD_PHOTO_BYTES, PHOTO_MIME_TYPES } from '../classisex/media-messages'
import { ServiceError, type UploadFile } from '../classisex/service'
import { allowAttempt } from '../email/rate-limit'
import { CONTO_ENVIO_MESSAGES, textoToLexical, validateContoEnvio } from './envio-rules'
import { DEFAULT_OPEN_BLOCKS, SLUG_MAX, slugify } from './excerpt'

/** Max submissions that pass validation per IP and per e-mail in one hour. */
export const CONTO_MAX_PER_HOUR = 5

export type VisitorContoInput = {
  title: string
  assinadoComo: string
  texto: string
  email: string
  consent: boolean
  termos: boolean
  /** Honeypot: real people leave it empty */
  website?: string
  file?: UploadFile | null
  ip: string
  now: Date
}

async function uniqueSlug(payload: Payload, title: string): Promise<string> {
  const base = slugify(title) || 'conto'
  const taken = async (slug: string) =>
    (
      await payload.find({
        collection: 'contos',
        where: { slug: { equals: slug } },
        draft: true,
        limit: 1,
        depth: 0,
        pagination: false,
        select: { slug: true },
        overrideAccess: true,
      })
    ).docs.length > 0
  if (!(await taken(base))) return base
  for (let i = 0; i < 5; i += 1) {
    const candidate = `${base.slice(0, SLUG_MAX - 7).replace(/-+$/g, '')}-${randomBytes(3).toString('hex')}`
    if (!(await taken(candidate))) return candidate
  }
  throw new ServiceError('erro', 'Não foi possível enviar agora. Tente de novo em alguns minutos.', 500)
}

/** Creates the draft conto (and its pending image). Returns `{ id: null }` for a honeypot hit (nothing created). */
export async function createVisitorConto(payload: Payload, params: VisitorContoInput): Promise<{ id: number | null }> {
  const { file, ip, now } = params
  // (1) honeypot: neutral success, nothing is created
  if ((params.website ?? '').trim() !== '') return { id: null }

  // (2) image rules, before anything is read or written
  if (file) {
    if (!PHOTO_MIME_TYPES.includes(file.mimetype)) throw new ServiceError('tipo', 'Envie uma imagem JPG, PNG ou WebP.', 400)
    if (file.size > MAX_AD_PHOTO_BYTES) throw new ServiceError('grande', 'A imagem passa de 15 MB.', 400)
  }

  // (3) text rules
  const checked = validateContoEnvio(params)
  if (!checked.ok) throw new ServiceError('invalido', 'Confira os campos destacados.', 400, checked.errors as Record<string, string>)
  const value = checked.value

  // (4) rate limit: counted when validation passes, before anything is written
  const nowMs = now.getTime()
  if (
    !allowAttempt(`conto-visitante-ip:${ip}`, nowMs, CONTO_MAX_PER_HOUR) ||
    (value.email && !allowAttempt(`conto-visitante-email:${value.email}`, nowMs, CONTO_MAX_PER_HOUR))
  ) {
    throw new ServiceError('envios', CONTO_ENVIO_MESSAGES.envios, 429)
  }

  // (5) the image first (hidden), so the conto can point to it
  let mediaId: number | null = null
  if (file) {
    try {
      const media = await payload.create({
        collection: 'media',
        data: { alt: `Imagem do conto ${value.title}`.slice(0, 200), pendente: true },
        file: { data: file.data, mimetype: file.mimetype, name: file.name, size: file.size },
        overrideAccess: true,
      })
      mediaId = media.id
    } catch {
      throw new ServiceError('foto-ilegivel', 'Não conseguimos ler esta imagem. Envie JPG, PNG ou WebP.', 400)
    }
  }

  // (6) the draft: status, marker and dates are decided here only
  try {
    const doc = await payload.create({
      collection: 'contos',
      draft: true,
      data: {
        title: value.title,
        slug: await uniqueSlug(payload, value.title),
        publishedAt: now.toISOString(),
        texto: textoToLexical(value.texto),
        paragrafosAbertos: DEFAULT_OPEN_BLOCKS,
        imagem: mediaId,
        enviadoPorVisitante: true,
        assinadoComo: value.assinadoComo,
        emailVisitante: value.email,
        enviadoEm: now.toISOString(),
        _status: 'draft',
      } as never,
      overrideAccess: true,
    })
    return { id: doc.id }
  } catch (err) {
    if (mediaId) await payload.delete({ collection: 'media', id: mediaId, overrideAccess: true }).catch(() => undefined)
    throw err
  }
}
