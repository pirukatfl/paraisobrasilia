/**
 * Members board reads (REC-01, D-01). Take `payload` and `now` so int tests can pin the clock;
 * src/lib/recados/queries.ts wraps them for pages. Never cached (T-05-02).
 * No 'server-only' import: also used by tests and later by the messages service (05-08).
 */
import type { Payload } from 'payload'

import { toPublicRecadoTeaser, toRecadoDTO, type PublicRecadosDTO, type RecadoDocLike, type RecadoDTO } from './dto'
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

const WEEK_MS = 7 * 86_400_000
const TEASER_COUNT = 6

/**
 * Open-area teaser: weekly count and up to 6 short snippets of visible recados.
 * D-05 / T-05-19: selects only texto and publishedAt (never apelido or author).
 */
export async function findPublicRecadosTeaser(payload: Payload, now: Date): Promise<PublicRecadosDTO> {
  const weekAgo = new Date(now.getTime() - WEEK_MS).toISOString()
  const visible = visibleRecadosWhere(now)
  const [week, latest] = await Promise.all([
    payload.count({
      collection: 'recados',
      where: { and: [visible, { publishedAt: { greater_than_equal: weekAgo } }] },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'recados',
      where: visible,
      sort: '-publishedAt',
      depth: 0,
      limit: TEASER_COUNT * 2,
      select: { texto: true, publishedAt: true },
      overrideAccess: true,
    }),
  ])
  const trechos = (latest.docs as unknown as { texto: string; publishedAt?: string | null }[])
    .map((doc) => ({
      texto: toPublicRecadoTeaser(doc.texto),
      quando: (doc.publishedAt && doc.publishedAt >= weekAgo ? 'esta semana' : 'há mais de uma semana') as
        | 'esta semana'
        | 'há mais de uma semana',
    }))
    .filter((t) => t.texto !== '')
    .slice(0, TEASER_COUNT)
    .map((t, i) => ({ key: String(i), ...t }))
  return { semana: week.totalDocs, trechos }
}
