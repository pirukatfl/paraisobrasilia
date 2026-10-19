/**
 * Members board reads (CLAS-01, CLAS-02, D-07). Take `payload` and `now` so int tests can pin
 * the clock; src/lib/classisex/queries.ts wraps them for pages. Never cached (T-04-05).
 * No 'server-only' import: also used by route handlers and tests.
 */
import type { Payload, Where } from 'payload'

import {
  relId,
  toMemberAdDTO,
  toPublicAdDTO,
  type AdDocLike,
  type AdMediaDocLike,
  type MemberAdDTO,
  type PublicAdDTO,
} from './dto'
import { CIDADE_MAX, normaliseCidade } from './rules'
import { categoryLabels, mediaByAd } from './service'
import { visibleAdsWhere } from './visibility'

export const PAGE_SIZE = 20
const MAX_PAGE = 1000

export type BoardFilters = { euSou?: number; cidade?: string; page?: number }

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/** Defensive parse of ?eu-sou=&cidade=&pagina= (untrusted query string). */
export function parseBoardFilters(params: Record<string, string | string[] | undefined>): BoardFilters {
  const out: BoardFilters = {}
  const euSou = Number.parseInt(first(params['eu-sou']) ?? '', 10)
  if (Number.isInteger(euSou) && euSou > 0) out.euSou = euSou
  const cidade = (first(params.cidade) ?? '').trim().slice(0, CIDADE_MAX)
  if (cidade) out.cidade = cidade
  const page = Number.parseInt(first(params.pagina) ?? '', 10)
  out.page = Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1
  return out
}

export function boardWhere(filters: BoardFilters, now: Date): Where {
  const and: Where[] = [visibleAdsWhere(now)]
  if (filters.euSou) and.push({ euSou: { equals: filters.euSou } })
  const cidade = filters.cidade ? normaliseCidade(filters.cidade) : ''
  if (cidade) and.push({ cidadeBusca: { like: cidade } })
  return { and }
}

export type BoardPage<T> = { items: T[]; page: number; totalPages: number; total: number }

/** Visible ads, newest publication first, 20 per page. */
export async function findVisibleAdDocs(
  payload: Payload,
  filters: BoardFilters,
  now: Date,
): Promise<BoardPage<AdDocLike> & { labels: Map<number, string> }> {
  const page = filters.page ?? 1
  const [result, labels] = await Promise.all([
    payload.find({
      collection: 'ads',
      where: boardWhere(filters, now),
      sort: '-publishedAt',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
    }),
    categoryLabels(payload),
  ])
  return {
    items: result.docs as unknown as AdDocLike[],
    page,
    totalPages: result.totalPages,
    total: result.totalDocs,
    labels,
  }
}

export async function findMemberAds(payload: Payload, filters: BoardFilters, now: Date): Promise<BoardPage<MemberAdDTO>> {
  const { items, labels, ...rest } = await findVisibleAdDocs(payload, filters, now)
  // One query for the media of the whole page (no N+1)
  const media = await mediaByAd(
    payload,
    items.map((d) => d.id),
  )
  return {
    ...rest,
    items: items.map((doc) =>
      toMemberAdDTO(doc, { euSouLabel: labels.get(relId(doc.euSou) ?? -1) ?? '', media: media.get(doc.id) }),
    ),
  }
}

/** One visible ad, or null (unknown, not approved, author without access). */
export async function findVisibleAdDoc(payload: Payload, id: number | string, now: Date): Promise<AdDocLike | null> {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId <= 0) return null
  const { docs } = await payload.find({
    collection: 'ads',
    where: { and: [visibleAdsWhere(now), { id: { equals: numericId } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return (docs[0] as unknown as AdDocLike | undefined) ?? null
}

export async function findMemberAd(payload: Payload, id: number | string, now: Date): Promise<MemberAdDTO | null> {
  const doc = await findVisibleAdDoc(payload, id, now)
  if (!doc) return null
  const [labels, media] = await Promise.all([categoryLabels(payload), mediaByAd(payload, [doc.id])])
  return toMemberAdDTO(doc, { euSouLabel: labels.get(relId(doc.euSou) ?? -1) ?? '', media: media.get(doc.id) })
}

/**
 * Open-area preview (PREV-01, D-04, D-07): same visibility, order, filters and page size as the
 * members board, but only the public DTO leaves this function. Media: only id/kind/order/previa
 * are read (never filenames).
 */
export async function findPublicAds(payload: Payload, filters: BoardFilters, now: Date): Promise<BoardPage<PublicAdDTO>> {
  const { items, labels, ...rest } = await findVisibleAdDocs(payload, filters, now)
  const ids = items.map((d) => d.id)
  const byAd = new Map<number, AdMediaDocLike[]>()
  if (ids.length) {
    const { docs } = await payload.find({
      collection: 'ad-media',
      where: { ad: { in: ids } },
      select: { ad: true, kind: true, order: true, previa: true },
      sort: 'order',
      depth: 0,
      limit: ids.length * 6,
      pagination: false,
      overrideAccess: true,
    })
    for (const doc of docs as unknown as AdMediaDocLike[]) {
      const adId = relId(doc.ad)
      if (adId !== null) byAd.set(adId, [...(byAd.get(adId) ?? []), doc])
    }
  }
  return {
    ...rest,
    items: items.map((doc) =>
      toPublicAdDTO(doc, { euSouLabel: labels.get(relId(doc.euSou) ?? -1) ?? '', media: byAd.get(doc.id) }),
    ),
  }
}
