/**
 * Recados owner service (REC-01, D-01). Runs after the members-area DAL check in
 * src/lib/recados/actions.ts. No 'server-only': reachable from collection endpoints and tests.
 *
 * T-05-04: ownership is checked on every write; author and status never come from the form.
 */
import type { Payload } from 'payload'

import { accessStatusFor } from '../assinantes/status'
import { ServiceError } from '../classisex/service'
import { relId, toOwnRecadoDTO, type OwnRecadoDTO, type RecadoDocLike } from './dto'
import {
  RECADO_ACTIVE_LIMIT,
  RECADO_ACTIVE_STATUSES,
  RECADO_MESSAGES,
  validateRecadoInput,
  type RecadoInput,
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
