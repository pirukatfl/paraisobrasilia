// DTOs for Dicas Hot. Same paywall as contos: the public DTO carries only the open blocks, the full
// text exists only in MemberDicaDTO (T-05-01 pattern). The cover is exposed only when staff ticked
// "Capa conferida" (I-1, T-DH-03). No server-only import: unit-testable.
import { chamadaOf, DEFAULT_OPEN_BLOCKS, splitConto, type LexicalStateLike } from '../contos/excerpt'
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
  /** Open blocks only: the rest of the text is for active subscribers */
  open: RichTextState
  hasMore: boolean
  /** At most 155 characters */
  description: string
  capa: DicaImageDTO | null
  ogImage: DicaImageDTO | null
}

export type MemberDicaDTO = {
  slug: string
  title: string
  dateLabel: string
  texto: RichTextState
  capa: DicaImageDTO | null
}

const splitOf = (doc: DicaSource) => splitConto(doc.texto as LexicalStateLike | null | undefined, DEFAULT_OPEN_BLOCKS)

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
    resumo: doc.resumo?.trim() || chamadaOf(splitOf(doc).open, 200),
    capa: media ? imageOf(media, media.sizes?.card, true) : null,
  }
}

export function toPublicDicaDTO(doc: DicaSource): PublicDicaDTO {
  const media = confirmedMedia(doc)
  const resumo = doc.resumo?.trim()
  const og = media ? imageOf(media, media.sizes?.og, false) : null
  const split = splitOf(doc)
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    publishedAt: doc.publishedAt ?? null,
    updatedAt: doc.updatedAt ?? null,
    open: split.open as unknown as RichTextState,
    hasMore: split.totalBlocks > split.openBlocks || split.totalWords > split.openWords,
    description: resumo ? cutText(resumo, DESCRIPTION_MAX) : chamadaOf(split.open, DESCRIPTION_MAX),
    capa: media ? imageOf(media, media.sizes?.gallery, true) : null,
    ogImage: og ? { url: toAbsoluteUrl(og.url), width: 1200, height: 630, alt: og.alt } : null,
  }
}

export function toMemberDicaDTO(doc: DicaSource): MemberDicaDTO {
  const media = confirmedMedia(doc)
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    texto: doc.texto as RichTextState,
    capa: media ? imageOf(media, media.sizes?.gallery, true) : null,
  }
}
