/**
 * Data shapes sent to the browser for recados. Pure: no Payload/Next imports.
 * Never return Payload documents (author id and e-mail stay on the server).
 */
import { formatShortDate } from '../format/date'
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
