/**
 * Data shapes sent to the browser for ClassiSex pages. Pure: no Payload/Next imports.
 * Never return Payload documents to the browser (author, filenames and URLs stay on the server).
 */
import { formatShortDate } from '../format/date'
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

export function contatoOf(doc: Pick<AdDocLike, 'contato'>): AdContatoDTO {
  return {
    whatsapp: doc.contato?.whatsapp || null,
    telegram: doc.contato?.telegram || null,
    email: doc.contato?.email || null,
  }
}

export function toOwnerAdDTO(
  doc: AdDocLike,
  { authorActive, euSouLabel }: { authorActive: boolean; euSouLabel: string },
): OwnerAdDTO {
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
  }
}
