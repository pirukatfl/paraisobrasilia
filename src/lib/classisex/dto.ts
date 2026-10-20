/**
 * Data shapes sent to the browser for ClassiSex pages. Pure: no Payload/Next imports.
 * Never return Payload documents to the browser (author, filenames and URLs stay on the server).
 */
import { coverOf, visibleMediaFor, type Tier } from '../assinantes/tier'
import { formatShortDate } from '../format/date'
import { whatsappUrl } from '../site/contact'
import { redactContacts } from './redact'
import type { AdStatus } from './rules'

export type AdContatoDTO = { whatsapp: string | null; telegram: string | null }

/** Structural shape of an `ads` document as read with depth 0 (euSou resolved by the caller). */
export type AdDocLike = {
  id: number
  apelido?: string | null
  euSou?: unknown
  cidade?: string | null
  texto: string
  contato?: { whatsapp?: string | null; telegram?: string | null } | null
  status: AdStatus
  motivo?: string | null
  updatedAt: string
  publishedAt?: string | null
}

export type OwnerAdDTO = {
  id: number
  apelido: string
  euSou: string
  cidade: string | null
  texto: string
  contato: AdContatoDTO
  status: AdStatus
  statusLabel: string
  motivo: string | null
  updatedLabel: string
  fotos: number
  videos: number
  capa: ThumbDTO | null
}

export const OWNER_STATUS_LABELS: Record<AdStatus, string> = {
  pendente: 'Em análise pela equipe',
  aprovado: 'Publicado',
  recusado: 'Recusado',
  despublicado: 'Despublicado pela equipe',
}

/** G-05: an approved ad of a free (or expired) author stays up showing only its cover. */
export const FREE_PUBLISHED_LABEL = 'Publicado como conta gratuita (só a capa aparece)'

export const relId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: number | string }).id
    return id === undefined ? null : Number(id)
  }
  return Number(value)
}

// ---------------------------------------------------------------------------------------------
// Media (04-06). URLs always point at the protected route (CLAS-06): never a Payload file URL,
// a filename or next/image (T-04-07).
// ---------------------------------------------------------------------------------------------

export type MediaVariante = 'miniatura' | 'foto' | 'video'

export const mediaUrl = (id: number, variante: MediaVariante): string => `/area-do-assinante/midia/${id}/${variante}`

/** Structural shape of an `ad-media` document read with depth 0. */
export type AdMediaDocLike = {
  id: number
  ad?: unknown
  kind: 'foto' | 'video'
  order?: number | null
  durationSeconds?: number | null
  previa?: string | null
  width?: number | null
  height?: number | null
  sizes?: { card?: { width?: number | null; height?: number | null } | null } | null
}

export function durationLabel(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(seconds ?? 0)))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

const byOrder = (a: AdMediaDocLike, b: AdMediaDocLike) => Number(a.order ?? 0) - Number(b.order ?? 0) || a.id - b.id

export type ThumbDTO = { url: string; width: number | null; height: number | null }

const thumbOf = (m: AdMediaDocLike): ThumbDTO => ({
  url: mediaUrl(m.id, 'miniatura'),
  width: m.sizes?.card?.width ?? null,
  height: m.sizes?.card?.height ?? null,
})

export type OwnerMediaDTO = {
  /** `guardada`: kept on file but hidden from others by the author's current tier (I-1). */
  fotos: { id: number; thumb: ThumbDTO; capa: boolean; guardada: boolean }[]
  videos: { id: number; src: string; durationLabel: string; guardada: boolean }[]
}

const videoOf = (m: AdMediaDocLike) => ({
  id: m.id,
  src: mediaUrl(m.id, 'video'),
  durationLabel: durationLabel(m.durationSeconds),
})

export function toOwnerMediaDTO(media: AdMediaDocLike[], { authorTier }: { authorTier: Tier }): OwnerMediaDTO {
  const fotos = media.filter((m) => m.kind === 'foto').sort(byOrder)
  const shown = new Set(visibleMediaFor(authorTier, media).map((m) => m.id))
  return {
    fotos: fotos.map((m, i) => ({ id: m.id, thumb: thumbOf(m), capa: i === 0, guardada: !shown.has(m.id) })),
    videos: media
      .filter((m) => m.kind === 'video')
      .sort(byOrder)
      .map((m) => ({ ...videoOf(m), guardada: !shown.has(m.id) })),
  }
}

export function contatoOf(doc: Pick<AdDocLike, 'contato'>): AdContatoDTO {
  return {
    whatsapp: doc.contato?.whatsapp || null,
    telegram: doc.contato?.telegram || null,
  }
}

export function toOwnerAdDTO(
  doc: AdDocLike,
  { authorTier, euSouLabel, media = [] }: { authorTier: Tier; euSouLabel: string; media?: AdMediaDocLike[] },
): OwnerAdDTO {
  const fotos = media.filter((m) => m.kind === 'foto').sort(byOrder)
  const statusLabel =
    doc.status === 'aprovado' && authorTier === 'gratis' ? FREE_PUBLISHED_LABEL : OWNER_STATUS_LABELS[doc.status]
  return {
    id: doc.id,
    apelido: doc.apelido ?? '',
    euSou: euSouLabel,
    cidade: doc.cidade || null,
    texto: doc.texto,
    contato: contatoOf(doc),
    status: doc.status,
    statusLabel,
    motivo: doc.status === 'recusado' || doc.status === 'despublicado' ? doc.motivo || null : null,
    updatedLabel: formatShortDate(doc.updatedAt),
    fotos: fotos.length,
    videos: media.filter((m) => m.kind === 'video').length,
    capa: fotos[0] ? thumbOf(fotos[0]) : null,
  }
}

// ---------------------------------------------------------------------------------------------
// Members board (CLAS-01, CLAS-02, D-05): full ad with contact links. Media URLs always point at
// the protected route /area-do-assinante/midia/… (04-05/04-06), never at Payload.
// ---------------------------------------------------------------------------------------------

export type ContactLinkDTO = { label: string; href: string }

export type MemberPhotoDTO = {
  id: number
  miniatura: string
  foto: string
  width: number | null
  height: number | null
  thumbWidth: number | null
  thumbHeight: number | null
}
export type MemberVideoDTO = { id: number; src: string; durationLabel: string }

export type MemberAdDTO = {
  id: number
  apelido: string
  euSou: string
  cidade: string | null
  texto: string
  publishedLabel: string
  contato: { whatsapp: ContactLinkDTO | null; telegram: ContactLinkDTO | null }
  fotos: MemberPhotoDTO[]
  videos: MemberVideoDTO[]
  /** Author is a free account: no "Enviar recado" (G-02). No author identity here. */
  autorGratuito: boolean
}

export const WHATSAPP_GREETING = 'Olá! Vi seu anúncio no ClassiSex do Paraíso.'

export function toMemberAdDTO(
  doc: AdDocLike,
  { euSouLabel, media = [], authorTier }: { euSouLabel: string; media?: AdMediaDocLike[]; authorTier: Tier },
): MemberAdDTO {
  const c = contatoOf(doc)
  const shown = visibleMediaFor(authorTier, media)
  const fotos: MemberPhotoDTO[] = shown
    .filter((m) => m.kind === 'foto')
    .sort(byOrder)
    .map((m) => ({
      id: m.id,
      miniatura: mediaUrl(m.id, 'miniatura'),
      foto: mediaUrl(m.id, 'foto'),
      width: m.width ?? null,
      height: m.height ?? null,
      thumbWidth: m.sizes?.card?.width ?? null,
      thumbHeight: m.sizes?.card?.height ?? null,
    }))
  const videos: MemberVideoDTO[] = shown.filter((m) => m.kind === 'video').sort(byOrder).map(videoOf)
  return {
    id: doc.id,
    apelido: doc.apelido ?? '',
    euSou: euSouLabel,
    cidade: doc.cidade || null,
    texto: doc.texto,
    publishedLabel: doc.publishedAt ? formatShortDate(doc.publishedAt) : '',
    contato: {
      whatsapp: c.whatsapp ? { label: c.whatsapp, href: whatsappUrl(c.whatsapp, WHATSAPP_GREETING) } : null,
      telegram: c.telegram ? { label: `@${c.telegram}`, href: `https://t.me/${encodeURIComponent(c.telegram)}` } : null,
    },
    fotos,
    videos,
    autorGratuito: authorTier === 'gratis',
  }
}

// ---------------------------------------------------------------------------------------------
// Open-area preview (PREV-01, D-04). T-04-01: contacts and the author never leave the server for
// the public area — this DTO is built from the redacted text only, and photos are the blurred
// derivatives served by /classisex/previa/{id} (never the originals).
// ---------------------------------------------------------------------------------------------

export type PublicAdDTO = {
  id: number
  apelido: string
  euSou: string
  /** One blurred photo (the cover) or null; the open area shows no text, city, contact or video. */
  foto: { previewUrl: string } | null
}

export const previewUrl = (mediaId: number) => `/classisex/previa/${mediaId}`

/**
 * Revisão 2026-10-20: the open preview carries only apelido, tipo and the blurred cover. The ad
 * text and city stay in the members area. The apelido is validated like the text on save, and
 * redacted again here as a safety net (staff edits in the admin, old data).
 */
export function toPublicAdDTO(
  doc: AdDocLike,
  { euSouLabel, media = [] }: { euSouLabel: string; media?: AdMediaDocLike[] },
): PublicAdDTO {
  // The same file as the members board and the media route (coverOf); it needs its blurred twin
  const found = coverOf(media)
  const cover = found && found.previa ? found : null
  return {
    id: doc.id,
    apelido: redactContacts(doc.apelido ?? '').text,
    euSou: euSouLabel,
    foto: cover ? { previewUrl: previewUrl(cover.id) } : null,
  }
}
