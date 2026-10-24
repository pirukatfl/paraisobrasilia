/**
 * Ads sent WITHOUT an account (client decision 2026-10-23, S-01..S-09).
 *
 * Same fields and rules as a paying author's ad (validateAdInput, no legacy exemption), but at most one
 * photo and no video, always 'pendente', with NO author (`author` stays empty; staff may fill it later). Nothing that
 * decides ownership, status or limits comes from the visitor. The e-mail is staff-only: it is stored in
 * `emailVisitante` (field access: only this service writes it) and never goes in a DTO, an audit row or a log.
 * No 'server-only' import: used by the route handler and int tests.
 */
import { APIError, type Payload } from 'payload'

import { VISITANTE_LIMITS } from '../assinantes/tier'
import { allowAttempt } from '../email/rate-limit'
import { MAX_AD_PHOTO_BYTES, PHOTO_MIME_TYPES, VIDEO_MIME_TYPES, uploadCodeFor } from './media-messages'
import {
  ACTIVE_LIMIT,
  ACTIVE_STATUSES,
  VISITOR_MESSAGES,
  normaliseVisitorEmail,
  validateAdInput,
  validateVisitorExtras,
  type AdInput,
} from './rules'
import { ServiceError, assertActiveCategory, type UploadFile } from './service'

/** Max submissions that pass validation per IP and per e-mail in one hour (S-08). */
export const VISITOR_MAX_PER_HOUR = 5

export type VisitorAdInput = {
  input: AdInput
  email: string
  termos: boolean
  /** Honeypot: real people leave it empty */
  website?: string
  files: UploadFile[]
  ip: string
  now: Date
}

/** Creates the pending ad (and its photo). Returns `{ id: null }` for a honeypot hit (nothing created). */
export async function createVisitorAd(payload: Payload, params: VisitorAdInput): Promise<{ id: number | null }> {
  const { input, termos, files, ip, now } = params
  // (1) honeypot: neutral success, nothing is created
  if ((params.website ?? '').trim() !== '') return { id: null }

  // (2) media rules, before anything is read or written
  const photos = files.filter((f) => !VIDEO_MIME_TYPES.includes(f.mimetype))
  if (files.some((f) => VIDEO_MIME_TYPES.includes(f.mimetype))) {
    throw new ServiceError('video-sem-conta', 'Anúncio sem conta: 1 foto, sem vídeo.', 400)
  }
  if (photos.length > VISITANTE_LIMITS.fotos) {
    throw new ServiceError('fotos-sem-conta', 'Anúncio sem conta: 1 foto, sem vídeo.', 400)
  }
  for (const f of photos) {
    if (!PHOTO_MIME_TYPES.includes(f.mimetype)) throw new ServiceError('tipo', 'Envie uma foto JPG, PNG ou WebP.', 400)
    if (f.size > MAX_AD_PHOTO_BYTES) throw new ServiceError('grande', 'A foto passa de 15 MB.', 400)
  }

  // (3) the same rules as a paying author (no legacy exemption), plus e-mail and terms (18+ is the `consent` declaration of validateAdInput)
  const email = normaliseVisitorEmail(params.email)
  const checked = validateAdInput(input)
  const extras = validateVisitorExtras({ email, termos })
  if (!checked.ok || Object.keys(extras).length > 0) {
    throw new ServiceError('invalido', 'Confira os campos destacados.', 400, {
      ...(checked.ok ? {} : (checked.errors as Record<string, string>)),
      ...extras,
    })
  }
  const value = checked.value

  // (4) category
  await assertActiveCategory(payload, value.euSou)

  // (5) rate limit: counted when validation passes, before anything is written (S-08)
  const nowMs = now.getTime()
  if (
    !allowAttempt(`anuncio-visitante-ip:${ip}`, nowMs, VISITOR_MAX_PER_HOUR) ||
    (email && !allowAttempt(`anuncio-visitante-email:${email}`, nowMs, VISITOR_MAX_PER_HOUR))
  ) {
    throw new ServiceError('envios', VISITOR_MESSAGES.envios, 429)
  }

  // (6) at most ACTIVE_LIMIT pending/published ads per e-mail (stored lower-case)
  // The e-mail is optional: without it only the IP limit above applies
  const { totalDocs } = email
    ? await payload.count({
        collection: 'ads',
        where: {
          and: [
            { enviadoSemConta: { equals: true } },
            { emailVisitante: { equals: email } },
            { status: { in: ACTIVE_STATUSES } },
          ],
        },
        overrideAccess: true,
      })
    : { totalDocs: 0 }
  if (totalDocs >= ACTIVE_LIMIT) throw new ServiceError('limite', VISITOR_MESSAGES.limite, 409)

  // (7) the ad: no author; status and marker are decided here only
  const doc = await payload.create({
    collection: 'ads',
    data: {
      author: null,
      apelido: value.apelido,
      euSou: value.euSou,
      cidade: value.cidade,
      texto: value.texto,
      contato: value.contato,
      status: 'pendente',
      submittedAt: now.toISOString(),
      consentAt: now.toISOString(),
      enviadoSemConta: true,
      emailVisitante: email || null,
    },
    overrideAccess: true,
    context: { ownerEdit: true },
  })

  // (8) the photo; if it fails the ad does not stay behind
  try {
    // the ad is already 'pendente' and has no owner: create the media directly (hooks set owner null, tier 'gratis', 1 photo)
    let order = 0
    for (const file of photos) {
      await attachVisitorPhoto(payload, doc.id, file, order++)
    }
  } catch (err) {
    await payload.delete({ collection: 'ads', id: doc.id, overrideAccess: true }).catch(() => undefined)
    throw err
  }
  return { id: doc.id }
}

async function attachVisitorPhoto(payload: Payload, adId: number, file: UploadFile, order: number): Promise<void> {
  try {
    await payload.create({
      collection: 'ad-media',
      data: { ad: adId, order } as never,
      file,
      depth: 0,
      overrideAccess: true,
    })
  } catch (err) {
    if (err instanceof APIError && err.status < 600 && err.status >= 400 && err.status !== 500) {
      throw new ServiceError(uploadCodeFor(err.message, 'foto'), err.message, err.status === 503 ? 503 : 400)
    }
    throw err
  }
}
