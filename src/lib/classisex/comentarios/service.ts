/**
 * Conversation under each ClassiSex ad. Writes run after the session guard (actions.ts); the
 * author always comes from the session, never from the form. No 'server-only' import: also used by
 * collection hooks and tests.
 */
import type { Payload } from 'payload'

import { spDate, spMidnight } from '../../assinantes/periods'
import { accessStatusFor } from '../../assinantes/status'
import { allowAttempt } from '../../email/rate-limit'
import { relId } from '../dto'
import { ServiceError } from '../service'
import { visibleAdsWhere } from '../visibility'
import { toComentarioDTOs, type ComentarioDocLike, type ComentarioDTO } from './dto'
import {
  COMENTARIOS_POR_ANUNCIO_MAX,
  COMENTARIO_MESSAGES,
  DIA_MS,
  HORA_MS,
  LIMITE_DIARIO,
  QUEM_COMENTA,
  VISITANTE_LIMITE_DIA,
  VISITANTE_LIMITE_HORA,
  comentarioApelidoError,
  comentarioTextoError,
  normaliseApelido,
  normaliseComentario,
} from './rules'

const positiveId = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d{1,12}$/.test(value) ? Number(value) : NaN
  return Number.isInteger(n) && n > 0 ? n : null
}

/** The ad as a commenter sees it: approved only (an invisible ad answers like an unknown id). */
async function findVisibleAd(payload: Payload, adId: number, now: Date): Promise<{ id: number; author: number | null } | null> {
  const { docs } = await payload.find({
    collection: 'ads',
    where: { and: [{ id: { equals: adId } }, visibleAdsWhere(now)] },
    select: { author: true },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  const ad = docs[0] as unknown as { id: number; author?: unknown } | undefined
  return ad ? { id: ad.id, author: relId(ad.author) } : null
}

export type CreateCommentInput = {
  /** Logged-in account (from the session). Omitted or null: a visitor, who needs `ip`. */
  assinanteId?: number | null
  adId: number | string
  parentId?: number | string | null
  apelido?: string
  texto: string
  now: Date
  /** Visitor only: client address, used for the in-memory limit and never stored. */
  ip?: string
  /** Visitor only: honeypot field, people leave it empty. */
  website?: string
}

/** Creates the comment, waiting for approval ("pendente"). `id: null` for a honeypot hit (nothing created, the caller answers like a success). */
export async function createComment(payload: Payload, input: CreateCommentInput): Promise<{ id: number | null }> {
  const { now } = input
  const assinanteId = input.assinanteId ?? null
  const visitante = assinanteId === null
  if (visitante) {
    // Without an account: the honeypot answers neutrally, and the writing rule must allow everyone
    if ((input.website ?? '').trim() !== '') return { id: null }
    if (QUEM_COMENTA !== 'todos') throw new ServiceError('entrar', COMENTARIO_MESSAGES.entrar, 401)
  }
  const adId = positiveId(input.adId)
  const ad = adId === null ? null : await findVisibleAd(payload, adId, now)
  if (!ad) throw new ServiceError('nao-encontrado', COMENTARIO_MESSAGES.anuncio, 404)

  let account: { apelido?: string | null; comentariosBloqueados?: boolean | null } | null = null
  if (assinanteId !== null) {
    account = (await payload.findByID({
      collection: 'assinantes',
      id: assinanteId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })) as { apelido?: string | null; comentariosBloqueados?: boolean | null } | null
    if (!account) throw new ServiceError('nao-encontrado', 'Conta não encontrada.', 404)
    if (account.comentariosBloqueados) throw new ServiceError('bloqueada', COMENTARIO_MESSAGES.bloqueada, 403)
    if (QUEM_COMENTA === 'assinante') {
      const access = await accessStatusFor(payload, assinanteId, now)
      if (access.state !== 'ativa') throw new ServiceError('assinatura', COMENTARIO_MESSAGES.assinatura, 403)
    }
  }

  const texto = normaliseComentario(typeof input.texto === 'string' ? input.texto : '')
  const textoProblem = comentarioTextoError(texto)
  if (textoProblem) throw new ServiceError('invalido', textoProblem, 400, { texto: textoProblem })
  const given = normaliseApelido(typeof input.apelido === 'string' ? input.apelido : '')
  const apelido = given || account?.apelido?.trim() || ''
  const apelidoProblem = comentarioApelidoError(apelido)
  if (apelidoProblem) throw new ServiceError('invalido', apelidoProblem, 400, { apelido: apelidoProblem })

  // One level only: a reply to a reply is stored as a reply to the root
  let rootId: number | null = null
  if (input.parentId !== undefined && input.parentId !== null && input.parentId !== '') {
    const parentId = positiveId(input.parentId)
    const parent = parentId
      ? ((await payload.findByID({
          collection: 'ad-comments',
          id: parentId,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
        })) as { id: number; ad?: unknown; parent?: unknown; status?: string } | null)
      : null
    if (!parent || parent.status !== 'publicado' || relId(parent.ad) !== ad.id) {
      throw new ServiceError('resposta', COMENTARIO_MESSAGES.resposta, 400)
    }
    rootId = relId(parent.parent) ?? parent.id
    const root =
      rootId === parent.id
        ? parent
        : ((await payload.findByID({
            collection: 'ad-comments',
            id: rootId,
            depth: 0,
            overrideAccess: true,
            disableErrors: true,
          })) as { status?: string } | null)
    if (!root || root.status !== 'publicado') throw new ServiceError('resposta', COMENTARIO_MESSAGES.resposta, 400)
  }

  if (assinanteId !== null) {
    const today = await payload.count({
      collection: 'ad-comments',
      where: {
        and: [{ author: { equals: assinanteId } }, { createdAt: { greater_than_equal: spMidnight(spDate(now)).toISOString() } }],
      },
      overrideAccess: true,
    })
    if (today.totalDocs >= LIMITE_DIARIO) throw new ServiceError('limite', COMENTARIO_MESSAGES.limite, 429)
  } else {
    // Per IP, in memory (no address in the database); counted once the comment is valid
    const ip = (input.ip ?? '').trim() || 'desconhecido'
    const nowMs = now.getTime()
    if (
      !allowAttempt(`comentario-visitante-ip-hora:${ip}`, nowMs, VISITANTE_LIMITE_HORA, HORA_MS) ||
      !allowAttempt(`comentario-visitante-ip-dia:${ip}`, nowMs, VISITANTE_LIMITE_DIA, DIA_MS)
    ) {
      throw new ServiceError('limite', COMENTARIO_MESSAGES.limiteVisitante, 429)
    }
  }

  const created = await payload.create({
    collection: 'ad-comments',
    data: {
      ad: ad.id,
      // A visitor has no author and never gets the advertiser badge
      author: assinanteId,
      semConta: visitante,
      parent: rootId,
      apelido,
      texto,
      doAnunciante: !visitante && ad.author !== null && ad.author === assinanteId,
      // Moderation: nothing is public until staff approve it in the admin
      status: 'pendente',
      createdAt: now.toISOString(),
    },
    overrideAccess: true,
  })
  if (assinanteId !== null && given && given !== account?.apelido) {
    await payload.update({
      collection: 'assinantes',
      id: assinanteId,
      data: { apelido: given },
      overrideAccess: true,
      context: { skipAudit: true },
    })
  }
  return { id: created.id }
}

/** Only the author deletes their own comment; its replies go with it. */
export async function deleteOwnComment(payload: Payload, assinanteId: number, id: number | string): Promise<void> {
  const commentId = positiveId(id)
  const doc = commentId
    ? ((await payload.findByID({
        collection: 'ad-comments',
        id: commentId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
      })) as { id: number; author?: unknown } | null)
    : null
  if (!doc || relId(doc.author) !== Number(assinanteId)) {
    throw new ServiceError('nao-encontrado', COMENTARIO_MESSAGES.naoEncontrado, 404)
  }
  await payload.delete({ collection: 'ad-comments', id: doc.id, overrideAccess: true, context: { skipAudit: true } })
}

/**
 * The published thread of a visible ad (null when the ad is not visible). The author is never read.
 * `verContatos`: active subscriber, sees the text as written; everyone else gets it redacted.
 */
export async function listComments(
  payload: Payload,
  adId: number | string,
  { verContatos, meId, now }: { verContatos: boolean; meId?: number | null; now: Date },
): Promise<ComentarioDTO[] | null> {
  const id = positiveId(adId)
  if (id === null || !(await findVisibleAd(payload, id, now))) return null
  const { docs } = await payload.find({
    collection: 'ad-comments',
    where: { and: [{ ad: { equals: id } }, { status: { equals: 'publicado' } }] },
    select: { apelido: true, texto: true, doAnunciante: true, semConta: true, parent: true, createdAt: true },
    sort: ['createdAt', 'id'] as unknown as string,
    depth: 0,
    limit: COMENTARIOS_POR_ANUNCIO_MAX,
    pagination: false,
    overrideAccess: true,
  })
  const meusIds = meId ? await ownCommentIds(payload, id, meId) : undefined
  return toComentarioDTOs(docs as unknown as ComentarioDocLike[], { verContatos, meusIds, now })
}

/** Ids of the published comments the account wrote in the ad (for "Apagar"). */
export async function ownCommentIds(payload: Payload, adId: number, assinanteId: number): Promise<Set<number>> {
  const { docs } = await payload.find({
    collection: 'ad-comments',
    where: { and: [{ ad: { equals: adId } }, { author: { equals: assinanteId } }, { status: { equals: 'publicado' } }] },
    select: { ad: true },
    depth: 0,
    limit: COMENTARIOS_POR_ANUNCIO_MAX,
    pagination: false,
    overrideAccess: true,
  })
  return new Set(docs.map((d) => d.id as number))
}

/** Published comments per ad for a whole page of ads (one query, no N+1). */
export async function countCommentsByAd(payload: Payload, adIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  if (adIds.length === 0) return out
  const { docs } = await payload.find({
    collection: 'ad-comments',
    where: { and: [{ ad: { in: adIds } }, { status: { equals: 'publicado' } }] },
    select: { ad: true, parent: true },
    depth: 0,
    pagination: false,
    limit: 0,
    overrideAccess: true,
  })
  const rows = docs as unknown as { id: number; ad?: unknown; parent?: unknown }[]
  const published = new Set(rows.map((r) => r.id))
  for (const row of rows) {
    const adId = relId(row.ad)
    const rootId = relId(row.parent)
    // A reply whose root is hidden is not shown, so it is not counted either
    if (adId === null || (rootId !== null && !published.has(rootId))) continue
    out.set(adId, (out.get(adId) ?? 0) + 1)
  }
  return out
}
