/**
 * Marker "Assinante antigo sem data de vencimento" (M-02, client adjustment 2026-10-21): the import
 * flags old subscribers who had no expiry date; staff review them. No 'server-only' import.
 */
import type { Payload, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { writeAudit } from './audit'
import { withRequestState } from './context'
import { ServiceError } from './service'
import { SEM_DATA_CLEARED_SUMMARY, SEM_DATA_DISMISS_SUMMARY } from './site-antigo-label'

export { SEM_DATA_FILTER_QUERY, SEM_DATA_LABEL } from './site-antigo-label'

export type RevisarRow = { id: number; name: string; email: string; contaTipo: 'Assinante' | 'Gratuita' }

/** Flagged accounts, by name. Staff-only callers (dashboard panel); selects only what the panel shows. */
export async function listRevisarSiteAntigo(payload: Payload, limit = 50): Promise<{ total: number; rows: RevisarRow[] }> {
  const res = await payload.find({
    collection: 'assinantes',
    where: { revisarAssinaturaAntiga: { equals: true } },
    sort: 'name',
    limit,
    depth: 0,
    overrideAccess: true,
    select: { name: true, email: true, accessUntil: true },
  })
  const now = Date.now()
  return {
    total: res.totalDocs,
    rows: res.docs.map((d) => {
      const until = d.accessUntil ? new Date(d.accessUntil).getTime() : NaN
      return {
        id: d.id,
        name: d.name,
        email: d.email,
        contaTipo: Number.isFinite(until) && until > now ? 'Assinante' : 'Gratuita',
      }
    }),
  }
}

/** Staff dismisses the marker without granting access. Audited. */
export async function dismissSemDataAviso(req: PayloadRequest, assinanteId: number | string): Promise<void> {
  if (!isStaff({ req })) throw new ServiceError('Sem permissão.', 403)
  const doc = await withRequestState(req, () =>
    req.payload.findByID({
      collection: 'assinantes',
      id: assinanteId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      req,
    }),
  )
  if (!doc) throw new ServiceError('Assinante não encontrado.', 404)
  if (!doc.revisarAssinaturaAntiga) return
  await withRequestState(req, () =>
    req.payload.update({
      collection: 'assinantes',
      id: assinanteId,
      data: { revisarAssinaturaAntiga: false },
      overrideAccess: true,
      context: { skipAudit: true },
      req,
    }),
  )
  await writeAudit(req, { action: 'conta-editada', assinante: doc, summary: SEM_DATA_DISMISS_SUMMARY })
}

/** Used by the Subscriptions hook: a period was set by staff, so the marker is no longer needed. */
export async function clearSemDataAvisoAfterPeriod(
  req: PayloadRequest,
  assinanteId: number | string,
  audit: boolean,
): Promise<void> {
  const doc = await withRequestState(req, () =>
    req.payload.findByID({
      collection: 'assinantes',
      id: assinanteId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
      req,
    }),
  )
  if (!doc?.revisarAssinaturaAntiga) return
  await withRequestState(req, () =>
    req.payload.update({
      collection: 'assinantes',
      id: assinanteId,
      data: { revisarAssinaturaAntiga: false },
      overrideAccess: true,
      context: { skipAudit: true },
      req,
    }),
  )
  if (audit) await writeAudit(req, { action: 'conta-editada', assinante: doc, summary: SEM_DATA_CLEARED_SUMMARY })
}
