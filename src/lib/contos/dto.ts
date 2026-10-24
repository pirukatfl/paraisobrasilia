// T-05-01: the public DTO carries only the open blocks; the full text exists only in MemberContoDTO.
import { formatShortDate } from '../format/date'
import type { RichTextState } from '../parties/types'
import { chamadaOf, DEFAULT_OPEN_BLOCKS, splitConto, type LexicalStateLike } from './excerpt'

/** What a read needs from a contos document (the Payload type satisfies it). */
export type ContoSource = {
  slug: string
  title: string
  publishedAt?: string | null
  texto?: unknown
  paragrafosAbertos?: number | null
  /** Populated Media (depth 1); an id or a missing value gives no image */
  imagem?: unknown
  assinadoComo?: string | null
}

type MediaSize = { url?: string | null; width?: number | null; height?: number | null } | undefined
type MediaLike = {
  url?: string | null
  width?: number | null
  height?: number | null
  alt?: string | null
  pendente?: boolean | null
  sizes?: { card?: MediaSize; gallery?: MediaSize }
}

export type ContoImageDTO = { url: string; width: number; height: number; alt: string }

export type ContoCardDTO = {
  slug: string
  title: string
  dateLabel: string
  chamada: string
  imagem: ContoImageDTO | null
  assinadoComo: string | null
}

export type PublicContoDTO = {
  slug: string
  title: string
  dateLabel: string
  open: RichTextState
  /** At most 155 characters of the open text */
  description: string
  hasMore: boolean
  imagem: ContoImageDTO | null
  assinadoComo: string | null
}

export type MemberContoDTO = {
  slug: string
  title: string
  dateLabel: string
  texto: RichTextState
  imagem: ContoImageDTO | null
  assinadoComo: string | null
}

const dateLabelOf = (publishedAt?: string | null) => (publishedAt ? formatShortDate(publishedAt) : '')

const splitOf = (doc: ContoSource) =>
  splitConto(doc.texto as LexicalStateLike | null | undefined, doc.paragrafosAbertos ?? DEFAULT_OPEN_BLOCKS)

/** Only a populated, non-pending Media with a url becomes an image (pending ones are never shown). */
function imageOf(doc: ContoSource, size: 'card' | 'gallery'): ContoImageDTO | null {
  const media = doc.imagem
  if (!media || typeof media !== 'object') return null
  const m = media as MediaLike
  if (m.pendente === true) return null
  const sized = m.sizes?.[size]
  const source = sized?.url ? sized : m.url ? m : null
  if (!source?.url) return null
  return { url: source.url, width: source.width ?? m.width ?? 0, height: source.height ?? m.height ?? 0, alt: m.alt ?? '' }
}

const signedBy = (doc: ContoSource) => doc.assinadoComo?.trim() || null

export function toContoCardDTO(doc: ContoSource): ContoCardDTO {
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    chamada: chamadaOf(splitOf(doc).open, 200),
    imagem: imageOf(doc, 'card'),
    assinadoComo: signedBy(doc),
  }
}

export function toPublicContoDTO(doc: ContoSource): PublicContoDTO {
  const split = splitOf(doc)
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    open: split.open as unknown as RichTextState,
    description: chamadaOf(split.open, 155),
    hasMore: split.totalBlocks > split.openBlocks || split.totalWords > split.openWords,
    imagem: imageOf(doc, 'gallery'),
    assinadoComo: signedBy(doc),
  }
}

export function toMemberContoDTO(doc: ContoSource): MemberContoDTO {
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    texto: doc.texto as RichTextState,
    imagem: imageOf(doc, 'gallery'),
    assinadoComo: signedBy(doc),
  }
}
