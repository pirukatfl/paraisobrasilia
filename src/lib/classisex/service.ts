/**
 * ClassiSex domain service. Owner operations (this plan) run after the members-area DAL check in
 * src/lib/classisex/actions.ts; staff operations are added by later plans.
 * No 'server-only' import: reachable from collection endpoints loaded by the Payload config.
 *
 * T-04-04: ownership is checked here on every write; author and status never come from the form.
 */
import { APIError, createLocalReq, type Payload, type PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { writeAudit, type AuditAction } from '../assinantes/audit'
import { withRequestState } from '../assinantes/context'

import { spDate, spMidnight } from '../assinantes/periods'
import { accessStatusFor } from '../assinantes/status'
import { TIER_LABELS, tierOf } from '../assinantes/tier'
import { MAX_AD_PHOTOS, MAX_AD_VIDEOS, uploadCodeFor, VIDEO_MIME_TYPES } from './media-messages'
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
  DAILY_LIMIT,
  DETAILS_MAX,
  NOTE_MAX,
  REPORT_MESSAGES,
  URGENT_REASON,
  isReportReason,
  reasonLabel,
} from './report-rules'
import { visibleAdsWhere } from './visibility'
import {
  ACTIVE_LIMIT,
  ACTIVE_STATUSES,
  AD_MESSAGES,
  DRAFT_STATUS,
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

type AdDoc = AdDocLike & { author: unknown; origemLegado?: string | null }

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
      apelido: value.apelido,
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
      apelido: value.apelido,
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
// T-04-15: route handlers have no server-action origin check; src/proxy.ts rejects a state-changing
// request with a foreign Origin, and the SameSite=Lax session cookie is not sent cross-site.
// ---------------------------------------------------------------------------------------------

export type UploadFile = { data: Buffer; mimetype: string; name: string; size: number }

type MediaRow = { id: number; ad: unknown; owner: unknown; kind: 'foto' | 'video'; order?: number | null }

/**
 * D-03: a media change sends the ad back to 'pendente'. `strict` (adding media) respects the
 * 3-active-ads limit like an edit; a removal never fails on it: if the ad is off the board
 * (recusado/despublicado) and the limit is reached, it simply stays where it is.
 */
async function backToModeration(payload: Payload, assinanteId: number, ad: AdDoc, now: Date, strict: boolean) {
  // M-04: a media change never submits a draft (the author sends it through the validated form)
  if (ad.status === DRAFT_STATUS) return
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
  if (
    ad.status !== DRAFT_STATUS &&
    !ACTIVE_STATUSES.includes(ad.status) &&
    (await countActive(payload, assinanteId, ad.id)) >= ACTIVE_LIMIT
  ) {
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
  const authorTier = tierOf(access)
  const media = await mediaByAd(
    payload,
    docs.map((d) => d.id),
  )
  return (docs as unknown as AdDocLike[]).map((doc) =>
    toOwnerAdDTO(doc, { authorTier, euSouLabel: labels.get(relId(doc.euSou) ?? -1) ?? '', media: media.get(doc.id) }),
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
    limit: adIds.length * (MAX_AD_PHOTOS + MAX_AD_VIDEOS),
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
    const authorTier = tierOf(await accessStatusFor(payload, assinanteId, new Date()))
    return toOwnerMediaDTO((await mediaByAd(payload, [ad.id])).get(ad.id) ?? [], { authorTier })
  } catch (err) {
    if (err instanceof ServiceError && err.code === 'nao-encontrado') return null
    throw err
  }
}

export type OwnAdFormValues = {
  id: number
  status: AdStatus
  euSou: number | null
  apelido: string
  cidade: string
  texto: string
  whatsapp: string
  telegram: string
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
      apelido: ad.apelido ?? '',
      euSou: relId(ad.euSou),
      cidade: ad.cidade ?? '',
      texto: ad.texto,
      whatsapp: ad.contato?.whatsapp ?? '',
      telegram: ad.contato?.telegram ? `@${ad.contato.telegram}` : '',
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
  rascunho: 'Rascunho do anunciante (site antigo)',
}

const STATE_WORDS: Record<AdStatus, string> = {
  pendente: 'em análise',
  aprovado: 'publicado',
  recusado: 'recusado',
  despublicado: 'despublicado',
  rascunho: 'em rascunho (só o anunciante pode enviar)',
}

export const MOTIVO_MAX = 300
export const MOTIVO_MESSAGE = 'Escreva o motivo (até 300 caracteres).'

type Moderation = 'aprovar' | 'recusar' | 'despublicar'

// M-04: no transition starts from 'rascunho'; only the author submits it (updateAd -> 'pendente')
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
  // M-04: a draft the old site's team wrote for a client has no member to send it, so staff publish it
  const teamDraft = ad.status === DRAFT_STATUS && ad.origemLegado === 'equipe'
  if (!t.from.includes(ad.status) && !(kind === 'aprovar' && teamDraft)) {
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
        ...(teamDraft ? { submittedAt: now.toISOString() } : {}),
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

/** Most ads one bulk approval accepts (a list page holds far fewer; the cap stops runaway requests). */
export const BULK_APPROVE_MAX = 200

export type BulkApproveFailure = { id: number; resumo: string | null; motivo: string }
export type BulkApproveResult = {
  /** Ids approved now. */
  aprovados: number[]
  /** Ads that stay as they were, each with the reason (validation, state, not found). */
  falhas: BulkApproveFailure[]
}

/** Reason in Portuguese for a failed approval: service rules first, then Payload validation messages. */
function failureReason(err: unknown): string {
  if (err instanceof ServiceError) return err.message
  const data = (err as { data?: { errors?: { message?: string }[] } } | null)?.data
  const messages = (data?.errors ?? []).map((e) => e.message).filter((m): m is string => Boolean(m))
  if (messages.length) return [...new Set(messages)].join(' ')
  const message = err instanceof Error ? err.message : ''
  return message || 'Não foi possível aprovar.'
}

/**
 * Staff approve several ads at once (list view "Aprovar selecionados"). Each ad goes through the very
 * same `moderateAd(..., 'aprovar')` as the single Aprovar button: transition rules (pending, refused,
 * unpublished, or a team draft), contact / text validation of the ad collection, publishedAt, moderator
 * and one audit row per ad. A failing ad is reported with its reason and stays as it was; the others
 * are not affected.
 */
export async function approveAds(req: PayloadRequest, rawIds: unknown, now: Date = new Date()): Promise<BulkApproveResult> {
  if (!isStaff({ req })) throw new ServiceError('proibido', 'Sem permissão.', 403)
  if (!Array.isArray(rawIds) || rawIds.length === 0) {
    throw new ServiceError('ids', 'Escolha pelo menos um anúncio.', 400)
  }
  const ids = [...new Set(rawIds.map((v) => Number(v)))]
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw new ServiceError('ids', 'Lista de anúncios inválida.', 400)
  if (ids.length > BULK_APPROVE_MAX) {
    throw new ServiceError('limite', `Aprove até ${BULK_APPROVE_MAX} anúncios por vez.`, 400)
  }
  const result: BulkApproveResult = { aprovados: [], falhas: [] }
  for (const id of ids) {
    try {
      await moderateAd(req, id, 'aprovar', { now, auditDetails: { lote: true } })
      result.aprovados.push(id)
    } catch (err) {
      const resumo = await loadAdForStaff(req, id).then(
        (ad) => ad.resumo ?? null,
        () => null,
      )
      result.falhas.push({ id, resumo, motivo: failureReason(err) })
    }
  }
  return result
}

/** Dashboard queue (FilaClassisex): ads waiting for approval and open reports. */
export async function getModerationCounts(
  payload: Payload,
): Promise<{ pendentes: number; denunciasAbertas: number; urgentes: number }> {
  const [pendentes, abertas, urgentes] = await Promise.all([
    payload.count({ collection: 'ads', where: { status: { equals: 'pendente' } }, overrideAccess: true }),
    payload.count({ collection: 'ad-reports', where: { status: { equals: 'aberta' } }, overrideAccess: true }),
    payload.count({
      collection: 'ad-reports',
      where: { and: [{ status: { equals: 'aberta' } }, { urgente: { equals: true } }] },
      overrideAccess: true,
    }),
  ])
  return { pendentes: pendentes.totalDocs, denunciasAbertas: abertas.totalDocs, urgentes: urgentes.totalDocs }
}

// ---------------------------------------------------------------------------------------------
// Reports (CLAS-05, D-08). Subscribers report through reportAd (after requireActiveSubscription);
// staff resolve through resolveReport. The reporter always comes from the session (T-04-12).
// ---------------------------------------------------------------------------------------------

const SNAPSHOT_MAX = 140

export type ReportInput = {
  reporterId: number
  adId: number | string
  motivo: unknown
  detalhes?: unknown
  now: Date
}

/**
 * Orchestrator decision on top of D-08 (T-04-17): a report of a minor hides the ad at once
 * (back to 'despublicado' with a reason) and is written to the audit log as an automatic action;
 * the report itself stays open and urgent for staff to confirm or discard.
 */
async function hideForMinor(
  payload: Payload,
  ad: AdDoc & { resumo?: string | null },
  { reportId, reporterId, now }: { reportId: number; reporterId: number; now: Date },
): Promise<void> {
  const motivo = `Denúncia urgente: ${reasonLabel(URGENT_REASON).toLowerCase()}. A equipe vai analisar.`
  const req = await createLocalReq({}, payload)
  await payload.update({
    collection: 'ads',
    id: ad.id,
    data: { status: 'despublicado', motivo, moderatedAt: now.toISOString(), moderatedBy: null },
    overrideAccess: true,
    context: { moderation: 'despublicar', skipAudit: true },
    req,
  })
  const authorId = relId(ad.author)
  const author =
    authorId === null
      ? null
      : await payload.findByID({ collection: 'assinantes', id: authorId, depth: 0, overrideAccess: true, disableErrors: true, req })
  await writeAudit(req, {
    action: 'anuncio-despublicado',
    assinante: author ? { id: author.id, name: author.name, email: author.email } : null,
    summary: `Anúncio #${ad.id} (${ad.resumo ?? ''}) despublicado automaticamente: denúncia de pessoa menor de idade`,
    details: { anuncio: ad.id, motivo, denuncia: reportId, denunciante: reporterId, automatico: true },
  })
}

/** `hidden`: the ad was taken down at once (report of a minor), so the reporter's page is gone. */
export async function reportAd(payload: Payload, input: ReportInput): Promise<{ id: number; hidden: boolean }> {
  const { reporterId, now } = input
  if (!isReportReason(input.motivo)) throw new ServiceError('invalido', REPORT_MESSAGES.motivo, 400)
  const detalhes = typeof input.detalhes === 'string' ? input.detalhes.replace(/\r\n/g, '\n').trim() : ''
  if (detalhes.length > DETAILS_MAX) throw new ServiceError('invalido', REPORT_MESSAGES.detalhes, 400)
  const adId = Number(input.adId)
  if (!Number.isInteger(adId) || adId <= 0) throw notFound()

  // Same visibility as the board: a hidden ad answers 404 like any unknown id (D-05)
  const { docs } = await payload.find({
    collection: 'ads',
    where: { and: [{ id: { equals: adId } }, visibleAdsWhere(now)] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const ad = docs[0] as unknown as (AdDoc & { resumo?: string | null }) | undefined
  if (!ad) throw notFound()
  if (relId(ad.author) === Number(reporterId)) throw new ServiceError('proprio', REPORT_MESSAGES.proprio, 400)

  const open = await payload.count({
    collection: 'ad-reports',
    where: { and: [{ ad: { equals: ad.id } }, { reporter: { equals: reporterId } }, { status: { equals: 'aberta' } }] },
    overrideAccess: true,
  })
  if (open.totalDocs > 0) throw new ServiceError('duplicada', REPORT_MESSAGES.duplicada, 409)

  const today = await payload.count({
    collection: 'ad-reports',
    where: {
      and: [{ reporter: { equals: reporterId } }, { createdAt: { greater_than_equal: spMidnight(spDate(now)).toISOString() } }],
    },
    overrideAccess: true,
  })
  if (today.totalDocs >= DAILY_LIMIT) throw new ServiceError('limite', REPORT_MESSAGES.limite, 429)

  const created = await payload.create({
    collection: 'ad-reports',
    data: {
      ad: ad.id,
      adSnapshot: (ad.resumo ?? `Anúncio #${ad.id}`).slice(0, SNAPSHOT_MAX),
      reporter: reporterId,
      motivo: input.motivo,
      detalhes: detalhes || null,
      status: 'aberta',
      createdAt: now.toISOString(),
    },
    overrideAccess: true,
  })
  if (input.motivo === URGENT_REASON) {
    await hideForMinor(payload, ad, { reportId: created.id, reporterId, now })
    return { id: created.id, hidden: true }
  }
  return { id: created.id, hidden: false }
}

export type ResolveAction = 'despublicar' | 'descartar'

type ReportDoc = {
  id: number
  ad?: unknown
  adSnapshot?: string | null
  reporter?: unknown
  motivo: string
  status: 'aberta' | 'resolvida' | 'descartada'
}

/** D-08: unpublish the ad (closing every open report of it) or discard this report. Audited. */
export async function resolveReport(
  req: PayloadRequest,
  reportId: number | string,
  { acao, nota }: { acao: ResolveAction; nota?: unknown },
  now: Date = new Date(),
): Promise<{ status: 'resolvida' | 'descartada'; closed: number }> {
  if (!isStaff({ req })) throw new ServiceError('proibido', 'Sem permissão.', 403)
  if (acao !== 'despublicar' && acao !== 'descartar') throw new ServiceError('invalido', 'Escolha uma ação.', 400)
  const text = typeof nota === 'string' ? nota.replace(/\s+/g, ' ').trim() : ''
  if (text.length > NOTE_MAX) throw new ServiceError('nota', REPORT_MESSAGES.nota, 400)

  const numericId = Number(reportId)
  const report =
    Number.isInteger(numericId) && numericId > 0
      ? ((await withRequestState(req, () =>
          req.payload.findByID({ collection: 'ad-reports', id: numericId, depth: 0, overrideAccess: true, disableErrors: true, req }),
        )) as unknown as ReportDoc | null)
      : null
  if (!report) throw new ServiceError('nao-encontrado', 'Denúncia não encontrada.', 404)
  if (report.status !== 'aberta') throw new ServiceError('transicao', 'Esta denúncia já foi resolvida.', 409)

  const staffId = (req.user as { id?: number } | null)?.id ?? null
  const adId = relId(report.ad)
  const closeWith = (id: number, status: 'resolvida' | 'descartada') =>
    withRequestState(req, () =>
      req.payload.update({
        collection: 'ad-reports',
        id,
        data: { status, resolvidaPor: staffId, resolvidaEm: now.toISOString(), nota: text || null },
        overrideAccess: true,
        req,
      }),
    )

  let ids = [report.id]
  let hidden = false
  if (acao === 'despublicar' && adId !== null) {
    const ad = await withRequestState(req, () =>
      req.payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true, disableErrors: true, req }),
    )
    if (ad && (ad.status === 'aprovado' || ad.status === 'pendente')) {
      await unpublishAd(req, adId, text || `Denúncia: ${reasonLabel(report.motivo)}`, now)
      hidden = true
    }
    const { docs } = await withRequestState(req, () =>
      req.payload.find({
        collection: 'ad-reports',
        where: { and: [{ ad: { equals: adId } }, { status: { equals: 'aberta' } }] },
        depth: 0,
        limit: 200,
        pagination: false,
        overrideAccess: true,
        req,
      }),
    )
    ids = Array.from(new Set([report.id, ...docs.map((d) => d.id)]))
  }
  const finalStatus = acao === 'descartar' ? 'descartada' : 'resolvida'
  for (const id of ids) await closeWith(id, finalStatus)

  const reporterId = relId(report.reporter)
  await writeAudit(req, {
    action: 'denuncia-resolvida',
    assinante: null,
    summary: `Denúncia #${report.id} (${reasonLabel(report.motivo)}) sobre ${report.adSnapshot ?? 'anúncio'}: ${
      acao === 'descartar' ? 'descartada' : hidden ? 'anúncio despublicado' : 'resolvida (anúncio já estava fora do ar)'
    }${text ? ` — ${text}` : ''}`,
    details: { denuncia: report.id, anuncio: adId, acao, motivo: report.motivo, nota: text || null, denunciante: reporterId, fechadas: ids.length },
  })
  return { status: finalStatus, closed: ids.length }
}

export type ModerationView = {
  id: number
  status: AdStatus
  statusLabel: string
  /** Tier of the ad author right now (Conta gratuita shows only the cover on the board) */
  contaAutor: 'Conta gratuita' | 'Assinante'
  /** Old-site draft written by the team (placeholder owner): staff can approve it directly */
  rascunhoDaEquipe: boolean
  motivo: string | null
  /** Exactly what the open area shows (T-04-01): apelido, tipo, city and text, contacts removed on the server */
  publicApelido: string
  publicCidade: string | null
  publicTexto: string
  euSouLabel: string
  /** Contacts the server removed from apelido, city and text, in total */
  removed: number
  /** Contacts removed from the apelido alone (it is a title: better edited than hidden) */
  removedApelido: number
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
  const apelido = redactContacts(ad.apelido ?? '')
  const cidade = redactContacts(ad.cidade ?? '')
  const texto = redactContacts(ad.texto ?? '')
  const labels = await categoryLabels(req.payload)
  const authorId = relId(ad.author)
  const contaAutor: ModerationView['contaAutor'] =
    authorId === null ? TIER_LABELS.gratis : TIER_LABELS[tierOf(await accessStatusFor(req.payload, authorId, new Date(), req))]
  return {
    id: ad.id,
    status: ad.status,
    statusLabel: STAFF_STATUS_LABELS[ad.status],
    contaAutor,
    rascunhoDaEquipe: ad.status === DRAFT_STATUS && ad.origemLegado === 'equipe',
    motivo: ad.motivo ?? null,
    publicApelido: apelido.text,
    publicCidade: cidade.text || null,
    publicTexto: texto.text,
    euSouLabel: labels.get(relId(ad.euSou) ?? -1) ?? '',
    removed: apelido.removed + cidade.removed + texto.removed,
    removedApelido: apelido.removed,
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
