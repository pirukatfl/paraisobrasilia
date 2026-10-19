import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { cached } from '../cache/cached'
import { findPublicAds, type BoardFilters, type BoardPage } from './board'
import type { PublicAdDTO } from './dto'

/**
 * Open-area ClassiSex preview (PREV-01). Cached with tag 'ads' (600 s window): moderation, owner
 * edits, media changes, Eu sou options and subscription/accessUntil changes expire it (D-06,
 * T-04-14). An author whose access ends at midnight with no other change drops off within the
 * cache window.
 */
export const getPublicAds = cached(
  async (filters: BoardFilters): Promise<BoardPage<PublicAdDTO>> => {
    const payload = await getPayload({ config })
    return findPublicAds(payload, filters, new Date())
  },
  ['classisex-public'],
  () => ['ads'],
)

export type PublicCategory = { id: number; name: string }

/** Active Eu sou options for the public filter. */
export const getPublicAdFilters = cached(
  async (): Promise<PublicCategory[]> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'ad-categories',
      where: { active: { equals: true } },
      sort: 'order',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    })
    return docs.map((d) => ({ id: d.id, name: d.name }))
  },
  ['classisex-public-filters'],
  () => ['ads'],
)
