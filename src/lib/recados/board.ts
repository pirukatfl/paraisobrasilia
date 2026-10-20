/**
 * Members board reads (REC-01, D-01). Take `payload` and `now` so int tests can pin the clock;
 * src/lib/recados/queries.ts wraps them for pages. Never cached (T-05-02).
 * No 'server-only' import: also used by tests and later by the messages service (05-08).
 */
import type { Payload } from 'payload'

import { toRecadoDTO, type RecadoDocLike, type RecadoDTO } from './dto'
import { visibleRecadosWhere } from './visibility'

export const RECADOS_PAGE_SIZE = 20
const MAX_PAGE = 1000

export type RecadosPage = { items: RecadoDTO[]; page: number; totalPages: number; total: number }

/** Defensive parse of ?pagina= (untrusted query string). */
export function parseRecadoPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(raw ?? '', 10)
  return Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1
}

/** Visible recados, newest publication first, 20 per page. */
export async function findVisibleRecados(
  payload: Payload,
  { page = 1 }: { page?: number },
  now: Date,
  viewerId: number,
): Promise<RecadosPage> {
  const result = await payload.find({
    collection: 'recados',
    where: visibleRecadosWhere(now),
    sort: '-publishedAt',
    depth: 0,
    limit: RECADOS_PAGE_SIZE,
    page,
    overrideAccess: true,
  })
  return {
    items: (result.docs as unknown as RecadoDocLike[]).map((doc) => toRecadoDTO(doc, viewerId)),
    page,
    totalPages: Math.max(1, result.totalPages),
    total: result.totalDocs,
  }
}

/** One visible recado document, or null (unknown, not approved, author without access). */
export async function findVisibleRecadoDoc(
  payload: Payload,
  id: number | string,
  now: Date,
): Promise<RecadoDocLike | null> {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) return null
  const { docs } = await payload.find({
    collection: 'recados',
    where: { and: [visibleRecadosWhere(now), { id: { equals: numericId } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return (docs[0] as unknown as RecadoDocLike | undefined) ?? null
}
