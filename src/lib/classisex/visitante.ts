/**
 * Ads sent WITHOUT an account (client decision 2026-10-23, S-01..S-09).
 *
 * Same fields and rules as a paying author's ad (validateAdInput, no legacy exemption), but at most one
 * photo and no video, always 'pendente', owned by a technical account nobody can sign in to. Nothing that
 * decides ownership, status or limits comes from the visitor. The e-mail is staff-only: it is stored in
 * `emailVisitante` (field access: only this service writes it) and never goes in a DTO, an audit row or a log.
 * No 'server-only' import: used by the route handler and int tests.
 */
import { randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { VISITANTE_LIMITS } from '../assinantes/tier'
import { allowAttempt } from '../email/rate-limit'
import { MAX_AD_PHOTO_BYTES, PHOTO_MIME_TYPES, VIDEO_MIME_TYPES } from './media-messages'
import {
  ACTIVE_LIMIT,
  ACTIVE_STATUSES,
  VISITOR_MESSAGES,
  normaliseVisitorEmail,
  validateAdInput,
  validateVisitorExtras,
  type AdInput,
} from './rules'
import { ServiceError, assertActiveCategory, attachMedia, type UploadFile } from './service'

/** Reserved non-routable domain (RFC 6761 style): no mail ever leaves for it. */
export const VISITANTES_EMAIL = 'visitantes@invalid.paraiso.local'
export const VISITANTES_NAME = 'Visitantes (sem conta)'

/** Max submissions that pass validation per IP and per e-mail in one hour (S-08). */
export const VISITOR_MAX_PER_HOUR = 5

/**
 * The single technical owner of every ad sent without an account (pattern of ensureEquipeLegadoAccount).
 * Random unknown password, e-mail never confirmed (`_verified: false`: no login, no session), no period:
 * it is never an active subscriber, so it can neither receive messages nor see contacts.
 */
export async function ensureVisitantesAccount(payload: Payload, now: Date): Promise<number> {
  const find = async () => {
    const { docs } = await payload.find({
      collection: 'assinantes',
      where: { email: { equals: VISITANTES_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { email: true } as never,
    })
    return (docs[0] as { id: number } | undefined)?.id
  }
  const existing = await find()
  if (existing) return existing
  try {
    const created = await payload.create({
      collection: 'assinantes',
      data: {
        email: VISITANTES_EMAIL,
        password: randomBytes(32).toString('base64url'),
        name: VISITANTES_NAME,
        origem: 'equipe',
        importadoEm: now.toISOString(),
        staffNotes:
          'Conta técnica: dona dos anúncios enviados sem conta pelo formulário aberto. Ninguém entra com ela.',
      } as never,
      overrideAccess: true,
      context: { trustedCreate: true, skipAudit: true },
    })
    // trusted creates are born confirmed; this one never is, so it can neither log in nor hold a session
    await payload.update({
      collection: 'assinantes',
      id: created.id,
      data: { _verified: false } as never,
      overrideAccess: true,
      context: { skipAudit: true },
    })
    return created.id
  } catch (err) {
    const raced = await find() // a parallel request created it first
    if (raced) return raced
    throw err
  }
}

export type VisitorAdInput = {
  input: AdInput
  email: string
  maior18: boolean
  termos: boolean
  /** Honeypot: real people leave it empty */
  website?: string
  files: UploadFile[]
  ip: string
  now: Date
}

/** Creates the pending ad (and its photo). Returns `{ id: null }` for a honeypot hit (nothing created). */
export async function createVisitorAd(payload: Payload, params: VisitorAdInput): Promise<{ id: number | null }> {
  const { input, maior18, termos, files, ip, now } = params
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

  // (3) the same rules as a paying author (no legacy exemption), plus e-mail, 18+ and terms
  const email = normaliseVisitorEmail(params.email)
  const checked = validateAdInput(input)
  const extras = validateVisitorExtras({ email, maior18, termos })
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
    !allowAttempt(`anuncio-visitante-email:${email}`, nowMs, VISITOR_MAX_PER_HOUR)
  ) {
    throw new ServiceError('envios', VISITOR_MESSAGES.envios, 429)
  }

  // (6) at most ACTIVE_LIMIT pending/published ads per e-mail (stored lower-case)
  const { totalDocs } = await payload.count({
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
  if (totalDocs >= ACTIVE_LIMIT) throw new ServiceError('limite', VISITOR_MESSAGES.limite, 409)

  // (7) the ad: owner, status and marker are decided here only
  const ownerId = await ensureVisitantesAccount(payload, now)
  const doc = await payload.create({
    collection: 'ads',
    data: {
      author: ownerId,
      apelido: value.apelido,
      euSou: value.euSou,
      cidade: value.cidade,
      texto: value.texto,
      contato: value.contato,
      status: 'pendente',
      submittedAt: now.toISOString(),
      consentAt: now.toISOString(),
      enviadoSemConta: true,
      emailVisitante: email,
    },
    overrideAccess: true,
    context: { ownerEdit: true },
  })

  // (8) the photo; if it fails the ad does not stay behind
  try {
    for (const file of photos) await attachMedia(payload, { assinanteId: ownerId, adId: doc.id, file, now })
  } catch (err) {
    await payload.delete({ collection: 'ads', id: doc.id, overrideAccess: true }).catch(() => undefined)
    throw err
  }
  return { id: doc.id }
}
