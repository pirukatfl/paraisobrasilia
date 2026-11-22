import 'server-only'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import { cached } from '../cache/cached'
import type { ModelCardDTO } from '../gallery/types'
import { authorTiersByAd } from './board'
import { relId, type AdDocLike, type AdMediaDocLike } from './dto'
import { MAX_AD_PHOTOS } from './media-messages'
import { visibleAdsWhere } from './visibility'
import { adsToAnuncios, anuncioToCard, type AnuncioAmadoraDTO, type GaleriaAdDoc } from './galeria-cards'

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
 * Every approved ClassiSex ad with at least one public photo (client decision 2026-11-22: all photos
 * open to everybody, limited to what members see: all for a paying author, the cover otherwise). Same
 * visibility as the open board (approved only); images go through /amadoras/anuncio/foto/{id}, which
 * re-checks on every request. Only id, apelido, dates and media sizes are selected: contact, text,
 * city, age and author never reach the DTO. Tag 'ads' expires it with moderation, owner edits and media changes.
 */
export const getAnunciosAmadorasLista = cached(
  async (): Promise<AnuncioAmadoraDTO[]> => {
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
    return adsToAnuncios(ads, media, tiers)
  },
  ['classisex-galeria-amadoras-v2'],
  () => ['ads'],
)

/** Cards of Galeria → Amadoras. */
export async function getAnunciosAmadoras(): Promise<ModelCardDTO[]> {
  return (await getAnunciosAmadorasLista()).map(anuncioToCard)
}

/** One approved ad with its public photos, or null (404). Looked up in the bounded cached list (newest 200). */
export async function getAnuncioAmadora(adId: number): Promise<AnuncioAmadoraDTO | null> {
  return (await getAnunciosAmadorasLista()).find((a) => a.adId === adId) ?? null
}
