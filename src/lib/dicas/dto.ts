// Public DTOs for Dicas Hot. The whole text is public (DH-01); the cover is exposed only when
// staff ticked "Capa conferida" (I-1, T-DH-03). No server-only import: unit-testable.
import { chamadaOf, type LexicalStateLike } from '../contos/excerpt'
import { formatShortDate } from '../format/date'
import type { RichTextState } from '../parties/types'

type MediaSize = { url?: string | null; width?: number | null; height?: number | null } | undefined

/** What a read needs from a dicas document (the Payload type satisfies it). */
export type DicaSource = {
  slug: string
  title: string
  publishedAt?: string | null
  updatedAt?: string | null
  resumo?: string | null
  texto?: unknown
  capa?: unknown
  capaConferida?: boolean | null
}

type MediaLike = {
  url?: string | null
  width?: number | null
  height?: number | null
  alt?: string | null
  sizes?: { card?: MediaSize; gallery?: MediaSize; og?: MediaSize }
}

export type DicaImageDTO = { url: string; width: number; height: number; alt: string }

export type DicaCardDTO = {
  slug: string
  title: string
  dateLabel: string
  resumo: string
  capa: DicaImageDTO | null
}

export type PublicDicaDTO = {
  slug: string
  title: string
  dateLabel: string
  publishedAt: string | null
  updatedAt: string | null
  texto: RichTextState
  /** At most 155 characters */
  description: string
  capa: DicaImageDTO | null
  ogImage: DicaImageDTO | null
}

export const DESCRIPTION_MAX = 155

const dateLabelOf = (publishedAt?: string | null) => (publishedAt ? formatShortDate(publishedAt) : '')

/** The populated Media of a conferida cover with a url; null for ids, missing or unconfirmed covers. */
function confirmedMedia(doc: DicaSource): MediaLike | null {
  if (doc.capaConferida !== true) return null
  const capa = doc.capa
  if (!capa || typeof capa !== 'object') return null
  const media = capa as MediaLike
  return media.url ? media : null
}

function imageOf(media: MediaLike, size: MediaSize, fallbackToOriginal: boolean): DicaImageDTO | null {
  const source = size?.url ? size : fallbackToOriginal ? media : null
  if (!source?.url) return null
  return {
    url: source.url,
    width: source.width ?? media.width ?? 0,
    height: source.height ?? media.height ?? 0,
    alt: media.alt ?? '',
  }
}

/** Word-boundary cut with '…', like chamadaOf but for a plain string. */
export function cutText(input: string, max: number): string {
  const text = input.replace(/\s+/g, ' ').trim()
  if (text.length <= max) return text
  let cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  if (space > 0 && text[max - 1] !== ' ') cut = cut.slice(0, space)
  return `${cut.trimEnd()}…`
}

/** Absolute URL (crawlers need it); same rule as the party flyer. */
function toAbsoluteUrl(url: string): string {
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return url.startsWith('http') ? url : `${base}${url}`
}

export function toDicaCardDTO(doc: DicaSource): DicaCardDTO {
  const media = confirmedMedia(doc)
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    resumo: doc.resumo?.trim() || chamadaOf(doc.texto as LexicalStateLike, 200),
    capa: media ? imageOf(media, media.sizes?.card, true) : null,
  }
}

export function toPublicDicaDTO(doc: DicaSource): PublicDicaDTO {
  const media = confirmedMedia(doc)
  const resumo = doc.resumo?.trim()
  const og = media ? imageOf(media, media.sizes?.og, false) : null
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    publishedAt: doc.publishedAt ?? null,
    updatedAt: doc.updatedAt ?? null,
    texto: doc.texto as RichTextState,
    description: resumo ? cutText(resumo, DESCRIPTION_MAX) : chamadaOf(doc.texto as LexicalStateLike, DESCRIPTION_MAX),
    capa: media ? imageOf(media, media.sizes?.gallery, true) : null,
    ogImage: og ? { url: toAbsoluteUrl(og.url), width: 1200, height: 630, alt: og.alt } : null,
  }
}
