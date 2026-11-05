/**
 * Promoção (seção da página inicial, novo planejamento 2026-11-01, item G). Pure module: the DTO and the
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
  /** false: the section is informative only (no buttons) */
  participarAtivo: boolean
  botaoConto: string
  botaoMidia: string
  /** Changes whenever staff save the promotion */
  versao: string
}

export const BOTAO_CONTO_PADRAO = 'Envie seu conto'
export const BOTAO_MIDIA_PADRAO = 'Mande sua foto/vídeo'

/** What the "is it on" rule looks at (the DTO, or a global read straight from the database). */
export type PromocaoVigencia = Pick<PromocaoDTO, 'ativa' | 'titulo' | 'texto' | 'inicio' | 'fim' | 'imagem'>

/** On, inside the optional period, and with something to show. */
export function promocaoNoAr<T extends PromocaoVigencia>(p: T | null | undefined, agora: Date): p is T {
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

export const PROMOCAO_TITULO_PADRAO = 'Promoção'

/** Title stored on a submission that took part in the promotion; never comes from the browser. */
export function tituloDaParticipacao(p: PromocaoVigencia | null | undefined, agora: Date): string | null {
  if (!promocaoNoAr(p, agora)) return null
  return p.titulo.trim() || PROMOCAO_TITULO_PADRAO
}
