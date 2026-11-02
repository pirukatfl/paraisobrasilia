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
  focalX?: number | null
  focalY?: number | null
  pendente?: boolean | null
  sizes?: { thumb?: MediaSize; thumb2x?: MediaSize; card?: MediaSize; gallery?: MediaSize }
}

/** focalX/focalY: focal point in percent (Media upload field), when the staff set one; the page frame crops around it */
export type ContoImageDTO = { url: string; width: number; height: number; alt: string; focalX?: number; focalY?: number }

export type ContoCardDTO = {
  slug: string
  title: string
  dateLabel: string
  chamada: string
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

type SizeName = keyof NonNullable<MediaLike['sizes']>

/**
 * Only a populated, non-pending Media with a url becomes an image (pending ones are never shown).
 * Takes the first size that exists, then the original (older images have no thumb until regenerated;
 * small originals never get the sizes bigger than themselves).
 */
function imageOf(doc: ContoSource, sizes: SizeName[]): ContoImageDTO | null {
  const media = doc.imagem
  if (!media || typeof media !== 'object') return null
  const m = media as MediaLike
  if (m.pendente === true) return null
  const sized = sizes.map((name) => m.sizes?.[name]).find((size) => size?.url)
  const source = sized?.url ? sized : m.url ? m : null
  if (!source?.url) return null
  const pct = (n?: number | null) => (typeof n === 'number' && n >= 0 && n <= 100 ? n : undefined)
  const focalX = pct(m.focalX)
  const focalY = pct(m.focalY)
  return {
    url: source.url,
    width: source.width ?? m.width ?? 0,
    height: source.height ?? m.height ?? 0,
    alt: m.alt ?? '',
    ...(focalX !== undefined && focalY !== undefined ? { focalX, focalY } : {}),
  }
}

const signedBy = (doc: ContoSource) => doc.assinadoComo?.trim() || null

export function toContoCardDTO(doc: ContoSource): ContoCardDTO {
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    chamada: chamadaOf(splitOf(doc).open, 200),
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
    imagem: imageOf(doc, ['gallery']),
    assinadoComo: signedBy(doc),
  }
}

export function toMemberContoDTO(doc: ContoSource): MemberContoDTO {
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    texto: doc.texto as RichTextState,
    imagem: imageOf(doc, ['gallery']),
    assinadoComo: signedBy(doc),
  }
}
