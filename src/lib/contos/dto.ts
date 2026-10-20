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
}

export type ContoCardDTO = { slug: string; title: string; dateLabel: string; chamada: string }

export type PublicContoDTO = {
  slug: string
  title: string
  dateLabel: string
  open: RichTextState
  /** At most 155 characters of the open text */
  description: string
  hasMore: boolean
}

export type MemberContoDTO = { slug: string; title: string; dateLabel: string; texto: RichTextState }

const dateLabelOf = (publishedAt?: string | null) => (publishedAt ? formatShortDate(publishedAt) : '')

const splitOf = (doc: ContoSource) =>
  splitConto(doc.texto as LexicalStateLike | null | undefined, doc.paragrafosAbertos ?? DEFAULT_OPEN_BLOCKS)

export function toContoCardDTO(doc: ContoSource): ContoCardDTO {
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    chamada: chamadaOf(splitOf(doc).open, 200),
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
  }
}

export function toMemberContoDTO(doc: ContoSource): MemberContoDTO {
  return {
    slug: doc.slug,
    title: doc.title,
    dateLabel: dateLabelOf(doc.publishedAt),
    texto: doc.texto as RichTextState,
  }
}
