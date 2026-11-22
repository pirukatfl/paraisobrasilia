/**
 * Pure mapping of approved ClassiSex ads into Galeria → Amadoras (no Payload/Next imports).
 * Client decision 2026-11-22: every photo of an approved ad is public in the amateur gallery, no login,
 * limited to what ClassiSex members can see right now (visibleMediaFor: all photos of a paying author,
 * only the cover of a free, expired or missing one). Privacy: reads only id, apelido, dates and media
 * sizes. Contact, text, city, age and author never enter the output. Images go through the open route
 * /amadoras/anuncio/foto/{id}/{variante}, which re-checks the rule on every request (canServeAdPhoto).
 */
import { visibleMediaFor, type Tier } from '../assinantes/tier'
import type { ModelCardDTO, SpaceItemDTO } from '../gallery/types'
import type { AdMediaDocLike } from './dto'
import { redactContacts } from './redact'
import { isAdVisible } from './visibility'

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

export const FOTO_ANUNCIO_URL = '/amadoras/anuncio/foto'

/** One approved ad with the photos the public may see. */
export type AnuncioAmadoraDTO = {
  adId: number
  apelido: string
  fotos: SpaceItemDTO[]
  fotoCount: number
  updatedAt: string
}

const byOrder = (a: AdMediaDocLike, b: AdMediaDocLike) => Number(a.order ?? 0) - Number(b.order ?? 0) || a.id - b.id

function fotoItem(m: AdMediaDocLike, apelido: string): SpaceItemDTO {
  const width = m.width || FALLBACK.width
  const height = m.height || FALLBACK.height
  const card = m.sizes?.card
  return {
    id: String(m.id),
    kind: 'photo',
    caption: null,
    image: {
      url: `${FOTO_ANUNCIO_URL}/${m.id}/foto`,
      width,
      height,
      alt: `Foto de ${apelido}`,
      thumbUrl: `${FOTO_ANUNCIO_URL}/${m.id}/miniatura`,
      thumbWidth: card?.width || width,
      thumbHeight: card?.height || height,
    },
    video: null,
  }
}

/** Photos of an ad the public may see, in display order. Videos never. */
export function publicPhotosOf<T extends AdMediaDocLike>(tier: Tier, media: T[]): T[] {
  const photos = media.filter((m) => m.kind === 'foto')
  return [...visibleMediaFor(tier, photos)].sort(byOrder)
}

/**
 * Decision of the public photo route, from data re-read on every request: approved ad, a photo (never a
 * video) that belongs to that ad and is among the photos visible for the author's current tier.
 */
export function canServeAdPhoto(args: {
  media: { id: number; kind: 'foto' | 'video'; ad: number | null }
  ad: { id: number; status: string } | null
  adMedia: AdMediaDocLike[]
  authorTier: Tier
}): boolean {
  const { media, ad } = args
  if (!ad || !isAdVisible(ad) || media.kind !== 'foto' || media.ad !== ad.id) return false
  return publicPhotosOf(args.authorTier, args.adMedia).some((m) => m.id === media.id)
}

export function adsToAnuncios(
  ads: GaleriaAdDoc[],
  mediaByAd: Map<number, AdMediaDocLike[]>,
  tiers: Map<number, Tier>,
): AnuncioAmadoraDTO[] {
  const out: AnuncioAmadoraDTO[] = []
  for (const ad of ads) {
    if (ad.status !== undefined && !isAdVisible({ status: ad.status })) continue
    // Ads without author or without active access are free accounts: only the cover is visible
    const visible = publicPhotosOf(tiers.get(ad.id) ?? 'gratis', mediaByAd.get(ad.id) ?? [])
    if (visible.length === 0) continue
    const apelido = redactContacts(ad.apelido ?? '').text.trim() || 'Anúncio'
    out.push({
      adId: ad.id,
      apelido,
      fotos: visible.map((m) => fotoItem(m, apelido)),
      fotoCount: visible.length,
      updatedAt: ad.publishedAt || ad.updatedAt,
    })
  }
  return out
}

export function anuncioToCard(a: AnuncioAmadoraDTO): ModelCardDTO {
  return {
    id: `anuncio-${a.adId}`,
    slug: '',
    name: a.apelido,
    categoria: 'amadora',
    description: null,
    cover: a.fotos[0].image,
    photoCount: a.fotoCount,
    videoCount: 0,
    updatedAt: a.updatedAt,
    href: `/amadoras/anuncio/${a.adId}`,
    semOtimizador: true,
  }
}

export function adsToGalleryCards(
  ads: GaleriaAdDoc[],
  mediaByAd: Map<number, AdMediaDocLike[]>,
  tiers: Map<number, Tier>,
): ModelCardDTO[] {
  return adsToAnuncios(ads, mediaByAd, tiers).map(anuncioToCard)
}
