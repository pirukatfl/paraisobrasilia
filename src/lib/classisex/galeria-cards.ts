/**
 * Pure mapping of approved ClassiSex ads into Galeria → Amadoras cards (no Payload/Next imports).
 * Privacy: reads only id, apelido, dates and media sizes. Contact, text, city, age and author
 * never enter the output. The single image is the cover, through the existing open route
 * /classisex/previa/{id}, which re-checks "approved ad + cover only" on every request.
 */
import { coverOf, visibleMediaFor, type Tier } from '../assinantes/tier'
import type { GalleryImage, ModelCardDTO } from '../gallery/types'
import { previewUrl, type AdMediaDocLike } from './dto'
import { redactContacts } from './redact'

/** The few ad fields the gallery reads. */
export type GaleriaAdDoc = {
  id: number
  apelido?: string | null
  /** Only used by the caller to derive the tier; never copied. */
  author?: unknown
  status?: string
  publishedAt?: string | null
  updatedAt: string
}

const FALLBACK = { width: 480, height: 600 }

function coverImage(cover: AdMediaDocLike, apelido: string): GalleryImage {
  const url = previewUrl(cover.id)
  const width = cover.width || FALLBACK.width
  const height = cover.height || FALLBACK.height
  return {
    url,
    thumbUrl: url,
    width: cover.sizes?.card?.width || width,
    height: cover.sizes?.card?.height || height,
    thumbWidth: cover.sizes?.card?.width || width,
    thumbHeight: cover.sizes?.card?.height || height,
    alt: `Foto de ${apelido}`,
  }
}

export function adsToGalleryCards(
  ads: GaleriaAdDoc[],
  mediaByAd: Map<number, AdMediaDocLike[]>,
  tiers: Map<number, Tier>,
): ModelCardDTO[] {
  const cards: ModelCardDTO[] = []
  for (const ad of ads) {
    if (ad.status !== undefined && ad.status !== 'aprovado') continue
    const photos = (mediaByAd.get(ad.id) ?? []).filter((m) => m.kind === 'foto')
    const cover = coverOf(photos)
    if (!cover) continue
    const apelido = redactContacts(ad.apelido ?? '').text.trim() || 'Anúncio'
    // Ads without author or without active access are free accounts: only the cover is visible
    const photoCount = visibleMediaFor(tiers.get(ad.id) ?? 'gratis', photos).length
    cards.push({
      id: `anuncio-${ad.id}`,
      slug: '',
      name: apelido,
      categoria: 'amadora',
      description: null,
      cover: coverImage(cover, apelido),
      photoCount,
      videoCount: 0,
      updatedAt: ad.publishedAt || ad.updatedAt,
      href: `/classisex/anuncio/${ad.id}`,
      semOtimizador: true,
    })
  }
  return cards
}
