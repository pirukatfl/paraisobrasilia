/**
 * Editable site texts (PAINEL-10). One registry entry per area; the Payload global, the TypeScript
 * type and the fallback text all come from the same `campos` object.
 */
export type CampoTexto = {
  /** Label shown in the admin. */
  rotulo: string
  /** Original site text, copied verbatim: used when the field is empty. */
  padrao: string
  /** Admin collapsible the field is grouped under. */
  secao?: string
  /** Force textarea (true) or single line (false). Omitted: textarea when long or multi-line. */
  longo?: boolean
  /** Help text under the field; must mention every {variable} of `padrao`. */
  ajuda?: string
}

export type AreaTextos = {
  slug: string
  rotulo: string
  descricao: string
  /** Hidden from the admin menu; the site keeps reading the stored or original texts. */
  ocultaNoPainel?: boolean
  campos: Record<string, CampoTexto>
}

/** Identity helper that keeps the literal field names for `TextosDaArea`. */
export function definirArea<const C extends Record<string, CampoTexto>>(area: {
  slug: string
  rotulo: string
  descricao: string
  ocultaNoPainel?: boolean
  campos: C
}) {
  return area
}

export type TextosDaArea<A extends { campos: Record<string, CampoTexto> }> = { [K in keyof A['campos']]: string }

/** Textarea for long or multi-line defaults unless the field says otherwise. */
export function campoEhLongo(campo: CampoTexto): boolean {
  return campo.longo ?? (campo.padrao.length > 90 || campo.padrao.includes('\n'))
}
