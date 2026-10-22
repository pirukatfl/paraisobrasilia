// No 'server-only' here: int tests pass their own payload instance.
import type { Payload } from 'payload'

import type { Dica } from '../../payload-types'

export const DICAS_PAGE_SIZE = 12

export type DicasPage = { items: Dica[]; page: number; totalPages: number; totalDocs: number }

/** Published dicas, newest first; capa populated (depth 1). Drafts are never returned (`draft: false`). */
export async function findPublishedDicas(
  payload: Payload,
  { page = 1, limit = DICAS_PAGE_SIZE }: { page?: number; limit?: number } = {},
): Promise<DicasPage> {
  const res = await payload.find({
    collection: 'dicas',
    where: { _status: { equals: 'published' } },
    draft: false,
    sort: ['-publishedAt', '-id'],
    depth: 1,
    page: Math.max(1, Math.trunc(page) || 1),
    limit,
    overrideAccess: true,
  })
  return { items: res.docs, page: res.page ?? 1, totalPages: Math.max(1, res.totalPages), totalDocs: res.totalDocs }
}

export async function findPublishedDica(payload: Payload, slug: string): Promise<Dica | null> {
  const res = await payload.find({
    collection: 'dicas',
    where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: slug } }] },
    draft: false,
    depth: 1,
    limit: 1,
    overrideAccess: true,
  })
  return res.docs[0] ?? null
}

/** The n newest published dicas (home, "Leia também"). */
export async function findLatestDicas(payload: Payload, n: number): Promise<Dica[]> {
  const res = await findPublishedDicas(payload, { page: 1, limit: n })
  return res.items
}

/** Slugs for the sitemap (published only). */
export async function findPublishedDicaSlugs(payload: Payload): Promise<{ slug: string; updatedAt: string }[]> {
  const res = await payload.find({
    collection: 'dicas',
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
