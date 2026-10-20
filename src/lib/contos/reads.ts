// No 'server-only' here: int tests pass their own payload instance (05-03).
import type { Payload } from 'payload'

import type { Conto } from '../../payload-types'

export const CONTOS_PAGE_SIZE = 20

export type ContosPage = { items: Conto[]; page: number; totalPages: number; totalDocs: number }

/** Published contos, newest first. Drafts are never returned (`draft: false`). */
export async function findPublishedContos(
  payload: Payload,
  { page = 1, limit = CONTOS_PAGE_SIZE }: { page?: number; limit?: number } = {},
): Promise<ContosPage> {
  const res = await payload.find({
    collection: 'contos',
    where: { _status: { equals: 'published' } },
    draft: false,
    sort: '-publishedAt',
    depth: 0,
    page: Math.max(1, Math.trunc(page) || 1),
    limit,
    overrideAccess: true,
  })
  return { items: res.docs, page: res.page ?? 1, totalPages: Math.max(1, res.totalPages), totalDocs: res.totalDocs }
}

export async function findPublishedConto(payload: Payload, slug: string): Promise<Conto | null> {
  const res = await payload.find({
    collection: 'contos',
    where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
    draft: false,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

/** Slugs for the sitemap (published only). */
export async function findPublishedContoSlugs(payload: Payload): Promise<{ slug: string; updatedAt: string }[]> {
  const res = await payload.find({
    collection: 'contos',
    where: { _status: { equals: 'published' } },
    draft: false,
    select: { slug: true, updatedAt: true },
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
  })
  return res.docs.map((d) => ({ slug: d.slug, updatedAt: d.updatedAt }))
}
