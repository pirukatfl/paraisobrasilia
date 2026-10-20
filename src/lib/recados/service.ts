/**
 * Recados owner service (REC-01, D-01). Runs after the members-area DAL check in
 * src/lib/recados/actions.ts. No 'server-only': reachable from collection endpoints and tests.
 *
 * T-05-04: ownership is checked on every write; author and status never come from the form.
 */
import type { Payload, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { writeAudit, type AuditAction } from '../assinantes/audit'
import { withRequestState } from '../assinantes/context'
import { accessStatusFor } from '../assinantes/status'
import { MOTIVO_MAX, MOTIVO_MESSAGE, ServiceError } from '../classisex/service'
import { OWN_STATUS_LABELS, relId, toOwnRecadoDTO, type OwnRecadoDTO, type RecadoDocLike } from './dto'
import {
  RECADO_ACTIVE_LIMIT,
  RECADO_ACTIVE_STATUSES,
  RECADO_MESSAGES,
  validateRecadoInput,
  type RecadoInput,
  type RecadoStatus,
} from './rules'

const notFound = () => new ServiceError('nao-encontrado', 'Recado não encontrado.', 404)

async function countActive(payload: Payload, assinanteId: number): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'recados',
    where: { and: [{ author: { equals: assinanteId } }, { status: { in: RECADO_ACTIVE_STATUSES } }] },
    overrideAccess: true,
  })
  return totalDocs
}

/** New recado, status 'pendente'; saves the apelido on the account for the next ones. */
export async function createRecado(
  payload: Payload,
  { assinanteId, input, now }: { assinanteId: number; input: RecadoInput; now: Date },
): Promise<{ id: number; contatosRemovidos: number }> {
  const result = validateRecadoInput(input)
  if (!result.ok) throw new ServiceError('invalido', 'Confira os campos destacados.', 400, result.errors)
  if ((await countActive(payload, assinanteId)) >= RECADO_ACTIVE_LIMIT) {
    throw new ServiceError('limite', RECADO_MESSAGES.limite, 409)
  }
  const { apelido, texto, contatosRemovidos } = result.value
  const doc = await payload.create({
    collection: 'recados',
    data: {
      author: assinanteId,
      apelido,
      texto,
      contatosRemovidos,
      status: 'pendente',
      submittedAt: now.toISOString(),
    },
    overrideAccess: true,
    context: { ownerEdit: true },
  })
  const account = await payload.findByID({
    collection: 'assinantes',
    id: assinanteId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })
  if (account && (account as { apelido?: string | null }).apelido !== apelido) {
    await payload.update({
      collection: 'assinantes',
      id: assinanteId,
      data: { apelido },
      overrideAccess: true,
      context: { skipAudit: true },
    })
  }
  return { id: doc.id, contatosRemovidos }
}

async function loadOwned(payload: Payload, assinanteId: number, id: number | string): Promise<RecadoDocLike> {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) throw notFound()
  const doc = (await payload.findByID({
    collection: 'recados',
    id: numericId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as RecadoDocLike | null
  if (!doc || relId(doc.author) !== Number(assinanteId)) throw notFound()
  return doc
}

/** Owner deletion (also allowed after access ends: LGPD). */
export async function deleteRecado(
  payload: Payload,
  { assinanteId, id }: { assinanteId: number; id: number | string },
): Promise<void> {
  const doc = await loadOwned(payload, assinanteId, id)
  await payload.delete({ collection: 'recados', id: doc.id, overrideAccess: true, context: { ownerEdit: true } })
}

/** Owner list ("Seus recados"): newest first, at most 50. */
export async function listOwnRecados(
  payload: Payload,
  assinanteId: number,
  now: Date = new Date(),
): Promise<OwnRecadoDTO[]> {
  const [{ docs }, access] = await Promise.all([
    payload.find({
      collection: 'recados',
      where: { author: { equals: assinanteId } },
      sort: '-createdAt',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    }),
    accessStatusFor(payload, assinanteId, now),
  ])
  const authorActive = access.state === 'ativa'
  return (docs as unknown as RecadoDocLike[]).map((doc) => toOwnRecadoDTO(doc, { authorActive }))
}

// ---------------------------------------------------------------------------------------------
// Staff moderation (REC-04, same shape as moderateAd). T-05-06: audited, staff only.
// ---------------------------------------------------------------------------------------------

export type RecadoModeration = 'aprovar' | 'recusar' | 'despublicar'

const STATE_WORDS: Record<RecadoStatus, string> = {
  pendente: 'em análise',
  aprovado: 'publicado',
  recusado: 'recusado',
  despublicado: 'despublicado',
}

const TRANSITIONS: Record<
  RecadoModeration,
  { from: RecadoStatus[]; to: RecadoStatus; action: AuditAction; verb: string }
> = {
  aprovar: { from: ['pendente', 'recusado', 'despublicado'], to: 'aprovado', action: 'recado-aprovado', verb: 'aprovado' },
  recusar: { from: ['pendente'], to: 'recusado', action: 'recado-recusado', verb: 'recusado' },
  despublicar: { from: ['aprovado', 'pendente'], to: 'despublicado', action: 'recado-despublicado', verb: 'despublicado' },
}

function cleanMotivo(motivo: unknown): string {
  const text = typeof motivo === 'string' ? motivo.replace(/\s+/g, ' ').trim() : ''
  if (text.length < 3 || text.length > MOTIVO_MAX) throw new ServiceError('motivo', MOTIVO_MESSAGE, 400)
  return text
}

type StaffRecadoDoc = RecadoDocLike & { resumo?: string | null; moderatedAt?: string | null; moderatedBy?: unknown }

async function loadForStaff(req: PayloadRequest, id: number | string): Promise<StaffRecadoDoc> {
  const numericId = Number(id)
  const doc =
    Number.isInteger(numericId) && numericId > 0
      ? ((await withRequestState(req, () =>
          req.payload.findByID({ collection: 'recados', id: numericId, depth: 0, overrideAccess: true, disableErrors: true, req }),
        )) as StaffRecadoDoc | null)
      : null
  if (!doc) throw notFound()
  return doc
}

export async function moderateRecado(
  req: PayloadRequest,
  id: number | string,
  kind: RecadoModeration,
  { motivo, now }: { motivo?: unknown; now: Date },
): Promise<{ status: RecadoStatus; statusLabel: string }> {
  if (!isStaff({ req })) throw new ServiceError('proibido', 'Sem permissão.', 403)
  const t = TRANSITIONS[kind]
  const doc = await loadForStaff(req, id)
  if (!t.from.includes(doc.status)) {
    throw new ServiceError('transicao', `Este recado já está ${STATE_WORDS[doc.status]}.`, 409)
  }
  const reason = kind === 'aprovar' ? null : cleanMotivo(motivo)
  const staffId = (req.user as { id?: number } | null)?.id ?? null
  await withRequestState(req, () =>
    req.payload.update({
      collection: 'recados',
      id: doc.id,
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
  const authorId = relId(doc.author)
  const author =
    authorId === null
      ? null
      : await withRequestState(req, () =>
          req.payload.findByID({ collection: 'assinantes', id: authorId, depth: 0, overrideAccess: true, disableErrors: true, req }),
        )
  await writeAudit(req, {
    action: t.action,
    assinante: author ? { id: author.id, name: author.name, email: author.email } : null,
    summary: `Recado #${doc.id} (${doc.resumo ?? ''}) ${t.verb}${reason ? `: ${reason}` : ''}`,
    details: { recado: doc.id, motivo: reason },
  })
  return { status: t.to, statusLabel: OWN_STATUS_LABELS[t.to] }
}

export type RecadoModerationView = {
  id: number
  status: RecadoStatus
  statusLabel: string
  motivo: string | null
  apelido: string
  texto: string
  contatosRemovidos: number
  fields: Record<string, unknown>
}

/** Data for the Moderação panel (staff only): the text exactly as the board shows it. */
export async function getRecadoModerationView(req: PayloadRequest, id: number | string): Promise<RecadoModerationView> {
  if (!isStaff({ req })) throw new ServiceError('proibido', 'Sem permissão.', 403)
  const doc = await loadForStaff(req, id)
  return {
    id: doc.id,
    status: doc.status,
    statusLabel: OWN_STATUS_LABELS[doc.status],
    motivo: doc.motivo ?? null,
    apelido: doc.apelido ?? '',
    texto: doc.texto,
    contatosRemovidos: doc.contatosRemovidos ?? 0,
    fields: {
      status: doc.status,
      motivo: doc.motivo ?? null,
      publishedAt: doc.publishedAt ?? null,
      moderatedAt: doc.moderatedAt ?? null,
      moderatedBy: relId(doc.moderatedBy),
    },
  }
}

export async function countPendingRecados(payload: Payload): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'recados',
    where: { status: { equals: 'pendente' } },
    overrideAccess: true,
  })
  return totalDocs
}
