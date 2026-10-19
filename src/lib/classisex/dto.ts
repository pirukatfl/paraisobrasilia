/**
 * Data shapes sent to the browser for ClassiSex pages. Pure: no Payload/Next imports.
 * Never return Payload documents to the browser (author, filenames and URLs stay on the server).
 */
import { formatShortDate } from '../format/date'
import { whatsappUrl } from '../site/contact'
import { redactContacts } from './redact'
import type { AdStatus } from './rules'

export type AdContatoDTO = { whatsapp: string | null; telegram: string | null; email: string | null }

/** Structural shape of an `ads` document as read with depth 0 (euSou resolved by the caller). */
export type AdDocLike = {
  id: number
  euSou?: unknown
  cidade?: string | null
  texto: string
  contato?: { whatsapp?: string | null; telegram?: string | null; email?: string | null } | null
  status: AdStatus
  motivo?: string | null
  updatedAt: string
  publishedAt?: string | null
}

export type OwnerAdDTO = {
  id: number
  euSou: string
  cidade: string | null
  texto: string
  contato: AdContatoDTO
  status: AdStatus
  statusLabel: string
  motivo: string | null
  updatedLabel: string
  fotos: number
  video: boolean
  capa: ThumbDTO | null
}

export const OWNER_STATUS_LABELS: Record<AdStatus, string> = {
  pendente: 'Em análise pela equipe',
  aprovado: 'Publicado',
  recusado: 'Recusado',
  despublicado: 'Despublicado pela equipe',
}

/** D-06: an approved ad of an author without active access is off the board. */
export const OFF_BOARD_LABEL = 'Fora do ar: assinatura vencida'

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
  fotos: { id: number; thumb: ThumbDTO; capa: boolean }[]
  video: { id: number; src: string; durationLabel: string } | null
}

export function toOwnerMediaDTO(media: AdMediaDocLike[]): OwnerMediaDTO {
  const fotos = media.filter((m) => m.kind === 'foto').sort(byOrder)
  const video = media.find((m) => m.kind === 'video')
  return {
    fotos: fotos.map((m, i) => ({ id: m.id, thumb: thumbOf(m), capa: i === 0 })),
    video: video ? { id: video.id, src: mediaUrl(video.id, 'video'), durationLabel: durationLabel(video.durationSeconds) } : null,
  }
}

export function contatoOf(doc: Pick<AdDocLike, 'contato'>): AdContatoDTO {
  return {
    whatsapp: doc.contato?.whatsapp || null,
    telegram: doc.contato?.telegram || null,
    email: doc.contato?.email || null,
  }
}

export function toOwnerAdDTO(
  doc: AdDocLike,
  { authorActive, euSouLabel, media = [] }: { authorActive: boolean; euSouLabel: string; media?: AdMediaDocLike[] },
): OwnerAdDTO {
  const fotos = media.filter((m) => m.kind === 'foto').sort(byOrder)
  const statusLabel = doc.status === 'aprovado' && !authorActive ? OFF_BOARD_LABEL : OWNER_STATUS_LABELS[doc.status]
  return {
    id: doc.id,
    euSou: euSouLabel,
    cidade: doc.cidade || null,
    texto: doc.texto,
    contato: contatoOf(doc),
    status: doc.status,
    statusLabel,
    motivo: doc.status === 'recusado' || doc.status === 'despublicado' ? doc.motivo || null : null,
    updatedLabel: formatShortDate(doc.updatedAt),
    fotos: fotos.length,
    video: media.some((m) => m.kind === 'video'),
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
  euSou: string
  cidade: string | null
  texto: string
  publishedLabel: string
  contato: { whatsapp: ContactLinkDTO | null; telegram: ContactLinkDTO | null; email: ContactLinkDTO | null }
  fotos: MemberPhotoDTO[]
  video: MemberVideoDTO | null
}

export const WHATSAPP_GREETING = 'Olá! Vi seu anúncio no ClassiSex do Paraíso.'

export function toMemberAdDTO(
  doc: AdDocLike,
  { euSouLabel, media = [] }: { euSouLabel: string; media?: AdMediaDocLike[] },
): MemberAdDTO {
  const c = contatoOf(doc)
  const fotos: MemberPhotoDTO[] = media
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
  const v = media.find((m) => m.kind === 'video')
  const video: MemberVideoDTO | null = v ? { id: v.id, src: mediaUrl(v.id, 'video'), durationLabel: durationLabel(v.durationSeconds) } : null
  return {
    id: doc.id,
    euSou: euSouLabel,
    cidade: doc.cidade || null,
    texto: doc.texto,
    publishedLabel: doc.publishedAt ? formatShortDate(doc.publishedAt) : '',
    contato: {
      whatsapp: c.whatsapp ? { label: c.whatsapp, href: whatsappUrl(c.whatsapp, WHATSAPP_GREETING) } : null,
      telegram: c.telegram ? { label: `@${c.telegram}`, href: `https://t.me/${encodeURIComponent(c.telegram)}` } : null,
      email: c.email ? { label: c.email, href: `mailto:${c.email}` } : null,
    },
    fotos,
    video,
  }
}

// ---------------------------------------------------------------------------------------------
// Open-area preview (PREV-01, D-04). T-04-01: contacts and the author never leave the server for
// the public area — this DTO is built from the redacted text only, and photos are the blurred
// derivatives served by /classisex/previa/{id} (never the originals).
// ---------------------------------------------------------------------------------------------

export type PublicAdDTO = {
  id: number
  euSou: string
  cidade: string | null
  texto: string
  publishedLabel: string
  fotos: { previewUrl: string }[]
  hasVideo: boolean
}

export const previewUrl = (mediaId: number) => `/classisex/previa/${mediaId}`

export function toPublicAdDTO(
  doc: AdDocLike,
  { euSouLabel, media = [] }: { euSouLabel: string; media?: AdMediaDocLike[] },
): PublicAdDTO {
  const cidade = doc.cidade ? redactContacts(doc.cidade).text.trim() : ''
  return {
    id: doc.id,
    euSou: euSouLabel,
    cidade: cidade || null,
    texto: redactContacts(doc.texto).text,
    publishedLabel: doc.publishedAt ? formatShortDate(doc.publishedAt) : '',
    fotos: media
      .filter((m) => m.kind === 'foto' && m.previa)
      .sort(byOrder)
      .map((m) => ({ previewUrl: previewUrl(m.id) })),
    hasVideo: media.some((m) => m.kind === 'video'),
  }
}
