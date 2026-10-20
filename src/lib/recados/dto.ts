/**
 * Data shapes sent to the browser for recados. Pure: no Payload/Next imports.
 * Never return Payload documents (author id and e-mail stay on the server).
 */
import { formatShortDate } from '../format/date'
import { REDACTED_LABEL, redactContacts } from '../classisex/redact'
import type { RecadoStatus } from './rules'

export type RecadoDocLike = {
  id: number
  author?: unknown
  apelido?: string | null
  texto: string
  status: RecadoStatus
  motivo?: string | null
  contatosRemovidos?: number | null
  submittedAt?: string | null
  publishedAt?: string | null
  createdAt?: string
  updatedAt: string
}

export type RecadoDTO = { id: number; apelido: string; texto: string; publishedLabel: string; isOwn: boolean }

export type OwnRecadoDTO = {
  id: number
  apelido: string
  texto: string
  status: RecadoStatus
  statusLabel: string
  motivo: string | null
  contatosRemovidos: number
  dateLabel: string
}

export const OWN_STATUS_LABELS: Record<RecadoStatus, string> = {
  pendente: 'Em análise pela equipe',
  aprovado: 'Publicado',
  recusado: 'Recusado',
  despublicado: 'Despublicado pela equipe',
}

/** An approved recado of an author without active access is off the board. */
export const OFF_BOARD_LABEL = 'Fora do ar: assinatura vencida'

export const relId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: number | string }).id
    return id === undefined ? null : Number(id)
  }
  return Number(value)
}

export function toRecadoDTO(doc: RecadoDocLike, viewerId: number): RecadoDTO {
  return {
    id: doc.id,
    apelido: doc.apelido ?? '',
    texto: doc.texto,
    publishedLabel: formatShortDate(doc.publishedAt ?? doc.updatedAt),
    isOwn: relId(doc.author) === Number(viewerId),
  }
}

export function toOwnRecadoDTO(doc: RecadoDocLike, { authorActive }: { authorActive: boolean }): OwnRecadoDTO {
  const statusLabel = doc.status === 'aprovado' && !authorActive ? OFF_BOARD_LABEL : OWN_STATUS_LABELS[doc.status]
  return {
    id: doc.id,
    apelido: doc.apelido ?? '',
    texto: doc.texto,
    status: doc.status,
    statusLabel,
    motivo: doc.status === 'recusado' || doc.status === 'despublicado' ? doc.motivo || null : null,
    contatosRemovidos: Number(doc.contatosRemovidos ?? 0),
    dateLabel: formatShortDate(doc.submittedAt ?? doc.createdAt ?? doc.updatedAt),
  }
}

// ---------------------------------------------------------------------------------------------
// Public teaser (PREV-02). D-05 / T-05-19: no apelido, no contact, no id, no exact date.
// ---------------------------------------------------------------------------------------------

export const TEASER_MAX = 80

export type PublicRecadosDTO = {
  semana: number
  trechos: { key: string; texto: string; quando: 'esta semana' | 'há mais de uma semana' }[]
}

/** Redacts again, drops placeholders and @handles, cuts at 80 characters on a word boundary. */
export function toPublicRecadoTeaser(texto: string): string {
  const clean = redactContacts(texto)
    .text.split(REDACTED_LABEL)
    .join(' ')
    .replace(/@\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (clean.length <= TEASER_MAX) return clean
  const cut = clean.slice(0, TEASER_MAX + 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = (lastSpace > 20 ? cut.slice(0, lastSpace) : clean.slice(0, TEASER_MAX)).replace(/[\s,;:.-]+$/, '')
  return `${base}…`
}
