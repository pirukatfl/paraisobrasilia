/**
 * ClassiSex domain service. Owner operations (this plan) run after the members-area DAL check in
 * src/lib/classisex/actions.ts; staff operations are added by later plans.
 * No 'server-only' import: reachable from collection endpoints loaded by the Payload config.
 *
 * T-04-04: ownership is checked here on every write; author and status never come from the form.
 */
import { APIError, type Payload, type PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { writeAudit, type AuditAction } from '../assinantes/audit'
import { withRequestState } from '../assinantes/context'

import { accessStatusFor } from '../assinantes/status'
import { uploadCodeFor, VIDEO_MIME_TYPES } from './media-messages'
import {
  contatoOf,
  relId,
  toOwnerAdDTO,
  toOwnerMediaDTO,
  type AdContatoDTO,
  type AdDocLike,
  type AdMediaDocLike,
  type OwnerAdDTO,
  type OwnerMediaDTO,
} from './dto'
import { redactContacts } from './redact'
import {
  ACTIVE_LIMIT,
  ACTIVE_STATUSES,
  AD_MESSAGES,
  validateAdInput,
  type AdErrors,
  type AdInput,
  type AdStatus,
} from './rules'

export class ServiceError extends Error {
  code: string
  status: number
  errors?: AdErrors
  constructor(code: string, message: string, status = 400, errors?: AdErrors) {
    super(message)
    this.name = 'ServiceError'
    this.code = code
    this.status = status
    this.errors = errors
  }
}

const notFound = () => new ServiceError('nao-encontrado', 'Anúncio não encontrado.', 404)

type AdDoc = AdDocLike & { author: unknown }

async function loadOwnedAd(payload: Payload, assinanteId: number, id: number | string): Promise<AdDoc> {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) throw notFound()
  const ad = (await payload.findByID({
    collection: 'ads',
    id: numericId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as AdDoc | null
  if (!ad || relId(ad.author) !== Number(assinanteId)) throw notFound()
  return ad
}

async function countActive(payload: Payload, assinanteId: number, excludeId?: number): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'ads',
    where: {
      and: [
        { author: { equals: assinanteId } },
        { status: { in: ACTIVE_STATUSES } },
        ...(excludeId ? [{ id: { not_equals: excludeId } }] : []),
      ],
    },
    overrideAccess: true,
  })
  return totalDocs
}

function validated(input: AdInput) {
  const result = validateAdInput(input)
  if (!result.ok) throw new ServiceError('invalido', 'Confira os campos destacados.', 400, result.errors)
  return result.value
}

async function assertActiveCategory(payload: Payload, euSou: number) {
  const category = await payload.findByID({
    collection: 'ad-categories',
    id: euSou,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (!category || category.active === false) {
    throw new ServiceError('invalido', AD_MESSAGES.euSou, 400, { euSou: AD_MESSAGES.euSou })
  }
}

const limitError = () => new ServiceError('limite', AD_MESSAGES.limite, 409)

/** D-02/D-03: new ad, status 'pendente'; at most ACTIVE_LIMIT active ads per author. */
export async function createAd(
  payload: Payload,
  { assinanteId, input, now }: { assinanteId: number; input: AdInput; now: Date },
): Promise<{ id: number }> {
  const value = validated(input)
  await assertActiveCategory(payload, value.euSou)
  if ((await countActive(payload, assinanteId)) >= ACTIVE_LIMIT) throw limitError()
  const doc = await payload.create({
    collection: 'ads',
    data: {
      author: assinanteId,
      euSou: value.euSou,
      cidade: value.cidade,
      texto: value.texto,
      contato: value.contato,
      status: 'pendente',
      submittedAt: now.toISOString(),
      consentAt: now.toISOString(),
    },
    overrideAccess: true,
    context: { ownerEdit: true },
  })
  return { id: doc.id }
}

/** D-03: any owner edit goes back to 'pendente' and clears a previous reason. */
export async function updateAd(
  payload: Payload,
  { assinanteId, id, input, now }: { assinanteId: number; id: number | string; input: AdInput; now: Date },
): Promise<void> {
  const ad = await loadOwnedAd(payload, assinanteId, id)
  const value = validated(input)
  await assertActiveCategory(payload, value.euSou)
  if (!ACTIVE_STATUSES.includes(ad.status) && (await countActive(payload, assinanteId, ad.id)) >= ACTIVE_LIMIT) {
    throw limitError()
  }
  await payload.update({
    collection: 'ads',
    id: ad.id,
    data: {
      euSou: value.euSou,
      cidade: value.cidade,
      texto: value.texto,
      contato: value.contato,
      status: 'pendente',
      submittedAt: now.toISOString(),
      consentAt: now.toISOString(),
      motivo: null,
    },
    overrideAccess: true,
    context: { ownerEdit: true },
  })
}

/** Owner deletion (also allowed after access ends: LGPD). Hard delete; cascades run in hooks. */
export async function deleteAd(
  payload: Payload,
  { assinanteId, id }: { assinanteId: number; id: number | string },
): Promise<void> {
  const ad = await loadOwnedAd(payload, assinanteId, id)
  await payload.delete({ collection: 'ads', id: ad.id, overrideAccess: true, context: { ownerEdit: true } })
}

// ---------------------------------------------------------------------------------------------
// Owner photos and video (CLAS-03, D-01, D-03). Called by the upload route handler and the
// remover/capa server actions after the session + active-access checks.
// T-04-15: route handlers have no server-action origin check; payload.auth ignores a cookie whose
// Origin is not in the csrf list, so a cross-site POST arrives here as nobody.
// ---------------------------------------------------------------------------------------------

export type UploadFile = { data: Buffer; mimetype: string; name: string; size: number }

type MediaRow = { id: number; ad: unknown; owner: unknown; kind: 'foto' | 'video'; order?: number | null }

/**
 * D-03: a media change sends the ad back to 'pendente'. `strict` (adding media) respects the
 * 3-active-ads limit like an edit; a removal never fails on it: if the ad is off the board
 * (recusado/despublicado) and the limit is reached, it simply stays where it is.
 */
async function backToModeration(payload: Payload, assinanteId: number, ad: AdDoc, now: Date, strict: boolean) {
  if (!ACTIVE_STATUSES.includes(ad.status) && (await countActive(payload, assinanteId, ad.id)) >= ACTIVE_LIMIT) {
    if (strict) throw limitError()
    return
  }
  await payload.update({
    collection: 'ads',
    id: ad.id,
    data: { status: 'pendente', submittedAt: now.toISOString(), motivo: null },
    overrideAccess: true,
    context: { ownerEdit: true },
  })
}

async function loadOwnedMedia(payload: Payload, assinanteId: number, mediaId: number | string) {
  const numericId = Number(mediaId)
  if (!Number.isInteger(numericId) || numericId <= 0) throw notFound()
  const media = (await payload.findByID({
    collection: 'ad-media',
    id: numericId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as MediaRow | null
  if (!media || relId(media.owner) !== Number(assinanteId)) throw notFound()
  const ad = await loadOwnedAd(payload, assinanteId, relId(media.ad) ?? 0)
  return { media, ad }
}

/** Adds one photo or the video at the end of the ad's list; the hooks validate and clean it. */
export async function attachMedia(
  payload: Payload,
  { assinanteId, adId, file, now }: { assinanteId: number; adId: number | string; file: UploadFile; now: Date },
): Promise<{ id: number }> {
  const ad = await loadOwnedAd(payload, assinanteId, adId)
  if (!ACTIVE_STATUSES.includes(ad.status) && (await countActive(payload, assinanteId, ad.id)) >= ACTIVE_LIMIT) {
    throw limitError()
  }
  const kind = VIDEO_MIME_TYPES.includes(file.mimetype) ? 'video' : 'foto'
  const { docs } = await payload.find({
    collection: 'ad-media',
    where: { ad: { equals: ad.id } },
    sort: '-order',
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const order = docs.length ? Number(docs[0].order ?? 0) + 1 : 0
  let created: { id: number }
  try {
    created = await payload.create({
      collection: 'ad-media',
      data: { ad: ad.id, order } as never,
      file,
      depth: 0,
      overrideAccess: true,
    })
  } catch (err) {
    if (err instanceof APIError && err.status < 600 && err.status >= 400 && err.status !== 500) {
      throw new ServiceError(uploadCodeFor(err.message, kind), err.message, err.status === 503 ? 503 : 400)
    }
    throw err
  }
  await backToModeration(payload, assinanteId, ad, now, false)
  return { id: created.id }
}

/** Removes a photo or the video (files go with it: collection hooks). */
export async function removeMedia(
  payload: Payload,
  { assinanteId, mediaId, now }: { assinanteId: number; mediaId: number | string; now: Date },
): Promise<{ adId: number }> {
  const { media, ad } = await loadOwnedMedia(payload, assinanteId, mediaId)
  await payload.delete({ collection: 'ad-media', id: media.id, overrideAccess: true })
  await backToModeration(payload, assinanteId, ad, now, false)
  return { adId: ad.id }
}

/** Puts a photo first (order 0); the other photos keep their relative order after it. */
export async function setCover(
  payload: Payload,
  { assinanteId, mediaId, now }: { assinanteId: number; mediaId: number | string; now: Date },
): Promise<{ adId: number }> {
  const { media, ad } = await loadOwnedMedia(payload, assinanteId, mediaId)
  if (media.kind !== 'foto') throw notFound()
  const { docs } = await payload.find({
    collection: 'ad-media',
    where: { and: [{ ad: { equals: ad.id } }, { kind: { equals: 'foto' } }] },
    sort: 'order',
    depth: 0,
    limit: 20,
    overrideAccess: true,
  })
  const ordered = [media.id, ...docs.map((d) => d.id).filter((id) => id !== media.id)]
  for (const [index, id] of ordered.entries()) {
    const current = docs.find((d) => d.id === id)
    if (current && Number(current.order ?? 0) === index) continue
    await payload.update({ collection: 'ad-media', id, data: { order: index }, depth: 0, overrideAccess: true })
  }
  await backToModeration(payload, assinanteId, ad, now, false)
  return { adId: ad.id }
}

/** Id → label of every Eu sou option (small list). */
export async function categoryLabels(payload: Payload): Promise<Map<number, string>> {
  const { docs } = await payload.find({
    collection: 'ad-categories',
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: true,
  })
  return new Map(docs.map((d) => [d.id, d.name]))
}

/** Owner list (Meus anúncios): newest change first, at most 50. */
export async function listOwnAds(payload: Payload, assinanteId: number, now: Date = new Date()): Promise<OwnerAdDTO[]> {
  const [{ docs }, labels, access] = await Promise.all([
    payload.find({
      collection: 'ads',
      where: { author: { equals: assinanteId } },
      sort: '-updatedAt',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    }),
    categoryLabels(payload),
    accessStatusFor(payload, assinanteId, now),
  ])
  const authorActive = access.state === 'ativa'
  const media = await mediaByAd(
    payload,
    docs.map((d) => d.id),
  )
  return (docs as unknown as AdDocLike[]).map((doc) =>
    toOwnerAdDTO(doc, { authorActive, euSouLabel: labels.get(relId(doc.euSou) ?? -1) ?? '', media: media.get(doc.id) }),
  )
}

/** Media of several ads in one query (no N+1), grouped by ad, in display order. */
export async function mediaByAd(payload: Payload, adIds: number[]): Promise<Map<number, AdMediaDocLike[]>> {
  const out = new Map<number, AdMediaDocLike[]>()
  if (adIds.length === 0) return out
  const { docs } = await payload.find({
    collection: 'ad-media',
    where: { ad: { in: adIds } },
    sort: 'order',
    depth: 0,
    limit: adIds.length * 6,
    pagination: false,
    overrideAccess: true,
  })
  for (const doc of docs as unknown as AdMediaDocLike[]) {
    const adId = relId(doc.ad)
    if (adId === null) continue
    out.set(adId, [...(out.get(adId) ?? []), doc])
  }
  return out
}

/** Photos and video of one of the owner's ads (edit page), or null when not theirs. */
export async function getOwnAdMedia(payload: Payload, assinanteId: number, id: number | string): Promise<OwnerMediaDTO | null> {
  try {
    const ad = await loadOwnedAd(payload, assinanteId, id)
    return toOwnerMediaDTO((await mediaByAd(payload, [ad.id])).get(ad.id) ?? [])
  } catch (err) {
    if (err instanceof ServiceError && err.code === 'nao-encontrado') return null
    throw err
  }
}

export type OwnAdFormValues = {
  id: number
  status: AdStatus
  euSou: number | null
  cidade: string
  texto: string
  whatsapp: string
  telegram: string
  email: string
}

/** Values for the edit form, or null when the ad is not the owner's. */
export async function getOwnAdFormValues(
  payload: Payload,
  assinanteId: number,
  id: number | string,
): Promise<OwnAdFormValues | null> {
  try {
    const ad = await loadOwnedAd(payload, assinanteId, id)
    return {
      id: ad.id,
      status: ad.status,
      euSou: relId(ad.euSou),
      cidade: ad.cidade ?? '',
      texto: ad.texto,
      whatsapp: ad.contato?.whatsapp ?? '',
      telegram: ad.contato?.telegram ? `@${ad.contato.telegram}` : '',
      email: ad.contato?.email ?? '',
    }
  } catch (err) {
    if (err instanceof ServiceError && err.code === 'nao-encontrado') return null
    throw err
  }
}

// ---------------------------------------------------------------------------------------------
// Staff moderation (PAINEL-07, D-03). Called by the staff-only endpoints (endpoints.ts).
// Dates come from the server clock; status and dates in the request body are never read.
// ---------------------------------------------------------------------------------------------

export const STAFF_STATUS_LABELS: Record<AdStatus, string> = {
  pendente: 'Em análise',
  aprovado: 'Publicado',
  recusado: 'Recusado',
  despublicado: 'Despublicado',
}

const STATE_WORDS: Record<AdStatus, string> = {
  pendente: 'em análise',
  aprovado: 'publicado',
  recusado: 'recusado',
  despublicado: 'despublicado',
}

export const MOTIVO_MAX = 300
export const MOTIVO_MESSAGE = 'Escreva o motivo (até 300 caracteres).'

type Moderation = 'aprovar' | 'recusar' | 'despublicar'

const TRANSITIONS: Record<Moderation, { from: AdStatus[]; to: AdStatus; action: AuditAction; verb: string }> = {
  aprovar: { from: ['pendente', 'recusado', 'despublicado'], to: 'aprovado', action: 'anuncio-aprovado', verb: 'aprovado' },
  recusar: { from: ['pendente'], to: 'recusado', action: 'anuncio-recusado', verb: 'recusado' },
  despublicar: { from: ['aprovado', 'pendente'], to: 'despublicado', action: 'anuncio-despublicado', verb: 'despublicado' },
}

function cleanMotivo(motivo: unknown): string {
  const text = typeof motivo === 'string' ? motivo.replace(/\s+/g, ' ').trim() : ''
  if (text.length < 3 || text.length > MOTIVO_MAX) throw new ServiceError('motivo', MOTIVO_MESSAGE, 400)
  return text
}

async function loadAdForStaff(req: PayloadRequest, id: number | string): Promise<AdDoc & { resumo?: string | null }> {
  const numericId = Number(id)
  const ad = Number.isInteger(numericId) && numericId > 0
    ? ((await withRequestState(req, () =>
        req.payload.findByID({ collection: 'ads', id: numericId, depth: 0, overrideAccess: true, disableErrors: true, req }),
      )) as (AdDoc & { resumo?: string | null }) | null)
    : null
  if (!ad) throw notFound()
  return ad
}

/** Applies one moderation transition and writes the audit row (T-04-13), in the same request. */
export async function moderateAd(
  req: PayloadRequest,
  id: number | string,
  kind: Moderation,
  { motivo, now, auditDetails }: { motivo?: unknown; now: Date; auditDetails?: Record<string, unknown> },
): Promise<{ status: AdStatus; statusLabel: string }> {
  if (!isStaff({ req })) throw new ServiceError('proibido', 'Sem permissão.', 403)
  const t = TRANSITIONS[kind]
  const ad = await loadAdForStaff(req, id)
  if (!t.from.includes(ad.status)) {
    throw new ServiceError('transicao', `Este anúncio já está ${STATE_WORDS[ad.status]}.`, 409)
  }
  const reason = kind === 'aprovar' ? null : cleanMotivo(motivo)
  const staffId = (req.user as { id?: number } | null)?.id ?? null
  await withRequestState(req, () =>
    req.payload.update({
      collection: 'ads',
      id: ad.id,
      data: {
        status: t.to,
        motivo: reason,
        moderatedAt: now.toISOString(),
        moderatedBy: staffId,
        ...(kind === 'aprovar' ? { publishedAt: now.toISOString() } : {}),
      },
      overrideAccess: true,
      context: { moderation: kind },
      req,
    }),
  )
  const authorId = relId(ad.author)
  const author =
    authorId === null
      ? null
      : await withRequestState(req, () =>
          req.payload.findByID({ collection: 'assinantes', id: authorId, depth: 0, overrideAccess: true, disableErrors: true, req }),
        )
  await writeAudit(req, {
    action: t.action,
    assinante: author ? { id: author.id, name: author.name, email: author.email } : null,
    summary: `Anúncio #${ad.id} (${ad.resumo ?? ''}) ${t.verb}${reason ? `: ${reason}` : ''}`,
    details: { anuncio: ad.id, motivo: reason, ...(auditDetails ?? {}) },
  })
  return { status: t.to, statusLabel: STAFF_STATUS_LABELS[t.to] }
}

export const approveAd = (req: PayloadRequest, id: number | string, now: Date = new Date()) =>
  moderateAd(req, id, 'aprovar', { now })

export const rejectAd = (req: PayloadRequest, id: number | string, motivo: unknown, now: Date = new Date()) =>
  moderateAd(req, id, 'recusar', { motivo, now })

export const unpublishAd = (req: PayloadRequest, id: number | string, motivo: unknown, now: Date = new Date()) =>
  moderateAd(req, id, 'despublicar', { motivo, now })

/** Dashboard queue (FilaClassisex). */
export async function getModerationCounts(payload: Payload): Promise<{ pendentes: number }> {
  const { totalDocs } = await payload.count({
    collection: 'ads',
    where: { status: { equals: 'pendente' } },
    overrideAccess: true,
  })
  return { pendentes: totalDocs }
}

export type ModerationView = {
  id: number
  status: AdStatus
  statusLabel: string
  motivo: string | null
  /** Exactly what the open area shows (T-04-01): contacts removed on the server */
  publicText: string
  publicCidade: string | null
  removed: number
  contato: AdContatoDTO
  /** Current values of the moderation fields, to refresh the admin form after an action */
  fields: {
    status: AdStatus
    motivo: string | null
    publishedAt: string | null
    moderatedAt: string | null
    moderatedBy: number | null
  }
}

/** Data for the Moderação panel (staff only). */
export async function getModerationView(req: PayloadRequest, id: number | string): Promise<ModerationView> {
  if (!isStaff({ req })) throw new ServiceError('proibido', 'Sem permissão.', 403)
  const ad = (await loadAdForStaff(req, id)) as AdDoc & {
    resumo?: string | null
    moderatedAt?: string | null
    moderatedBy?: unknown
  }
  const text = redactContacts(ad.texto ?? '')
  const cidade = ad.cidade ? redactContacts(ad.cidade).text : null
  return {
    id: ad.id,
    status: ad.status,
    statusLabel: STAFF_STATUS_LABELS[ad.status],
    motivo: ad.motivo ?? null,
    publicText: text.text,
    publicCidade: cidade,
    removed: text.removed,
    contato: contatoOf(ad),
    fields: {
      status: ad.status,
      motivo: ad.motivo ?? null,
      publishedAt: ad.publishedAt ?? null,
      moderatedAt: ad.moderatedAt ?? null,
      moderatedBy: relId(ad.moderatedBy),
    },
  }
}
