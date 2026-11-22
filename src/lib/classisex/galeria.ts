import 'server-only'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { cached } from '../cache/cached'
import type { ModelCardDTO } from '../gallery/types'
import { authorTiersByAd } from './board'
import { relId, type AdDocLike, type AdMediaDocLike } from './dto'
import { MAX_AD_PHOTOS } from './media-messages'
import { visibleAdsWhere } from './visibility'
import { adsToGalleryCards, type GaleriaAdDoc } from './galeria-cards'

/** Bounded list: the newest approved ads that go into Galeria → Amadoras. */
const LIMITE = 200

/** Photos (kind 'foto') of all the ads in ONE query, grouped by ad, in display order. */
async function photosByAd(payload: Payload, adIds: number[]): Promise<Map<number, AdMediaDocLike[]>> {
  const out = new Map<number, AdMediaDocLike[]>()
  const { docs } = await payload.find({
    collection: 'ad-media',
    where: { and: [{ ad: { in: adIds } }, { kind: { equals: 'foto' } }] },
    select: { ad: true, kind: true, order: true, width: true, height: true, sizes: true },
    sort: ['order', 'id'],
    depth: 0,
    limit: adIds.length * MAX_AD_PHOTOS,
    pagination: false,
    overrideAccess: true,
  })
  for (const doc of docs as unknown as AdMediaDocLike[]) {
    const adId = relId(doc.ad)
    if (adId === null) continue
    out.set(adId, [...(out.get(adId) ?? []), doc])
  }
  return out
}

/**
 * Every approved ClassiSex ad with at least one photo, as a card of Galeria → Amadoras (client
 * decision 2026-11-22). Same visibility as the open board (approved only); the only image is the
 * cover served by /classisex/previa/{id}. Only id, apelido, dates and media sizes are selected:
 * contact, text, city, age and author never reach the DTO. Tag 'ads' expires it with moderation,
 * owner edits and media changes.
 */
export const getAnunciosAmadoras = cached(
  async (): Promise<ModelCardDTO[]> => {
    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'ads',
      where: visibleAdsWhere(),
      select: { apelido: true, author: true, status: true, publishedAt: true, updatedAt: true },
      sort: ['-publishedAt', '-id'],
      depth: 0,
      limit: LIMITE,
      pagination: false,
      overrideAccess: true,
    })
    const ads = docs as unknown as GaleriaAdDoc[]
    if (ads.length === 0) return []
    const now = new Date()
    const [media, tiers] = await Promise.all([
      photosByAd(payload, ads.map((a) => a.id)),
      authorTiersByAd(payload, ads as unknown as AdDocLike[], now),
    ])
    return adsToGalleryCards(ads, media, tiers)
  },
  ['classisex-galeria-amadoras'],
  () => ['ads'],
)
