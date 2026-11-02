/**
 * Promoção (pop-up da página inicial, novo planejamento 2026-11-01, item G). Pure module: the DTO and the
 * "is it on right now" rule, testable without a database.
 */
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import type { GalleryImage } from '../gallery/types'

export type PromocaoDTO = {
  ativa: boolean
  titulo: string
  texto: SerializedEditorState | null
  /** ISO instants; either may be missing (no start / no end) */
  inicio: string | null
  fim: string | null
  imagem: GalleryImage | null
  /** false: the pop-up is informative only (just "Fechar") */
  participarAtivo: boolean
  botaoParticipar: string
  /** Changes whenever staff save the promotion: a new edit shows the pop-up again in a session */
  versao: string
}

export const BOTAO_PARTICIPAR_PADRAO = 'Participar'

/** On, inside the optional period, and with something to show. */
export function promocaoNoAr(p: PromocaoDTO | null | undefined, agora: Date): p is PromocaoDTO {
  if (!p || !p.ativa) return false
  if (!p.titulo.trim() && !p.texto && !p.imagem) return false
  const t = agora.getTime()
  if (p.inicio) {
    const i = Date.parse(p.inicio)
    if (Number.isFinite(i) && t < i) return false
  }
  if (p.fim) {
    const f = Date.parse(p.fim)
    if (Number.isFinite(f) && t > f) return false
  }
  return true
}
