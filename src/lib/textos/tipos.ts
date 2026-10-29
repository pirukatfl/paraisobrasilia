/**
 * Editable site texts (PAINEL-10). One registry entry per area; the Payload global, the TypeScript
 * type and the fallback text all come from the same `campos` object.
 */
import type { TextoRico } from './rico'

export type CampoTexto = {
  /** Label shown in the admin. */
  rotulo: string
  /** Original site text, copied verbatim: used when the field is empty. */
  padrao: string
  /** Admin collapsible the field is grouped under. */
  secao?: string
  /**
   * Every field is a rich-text editor. `true`: full block editor (paragraphs, lists, links), for long
   * copy that renders as a block. Omitted: line editor (bold, italic, underline, strikethrough only), for
   * titles, buttons, labels and other short texts that sit inside `<a>`, `<button>`, `<h2>`.
   */
  bloco?: true
  /**
   * The destination only takes plain text (`<meta>`, `<title>`, attributes, `<option>`, e-mail, strings
   * handed to libraries). The editor is still there, the site shows `textoPuro(...)` and the admin warns
   * that formatting does not show.
   */
  soTexto?: true
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

export type TextosDaArea<A extends { campos: Record<string, CampoTexto> }> = {
  [K in keyof A['campos']]: TextoRico
}

/** Full block editor (paragraphs, lists, links) instead of the line editor. */
export function campoEhBloco(campo: CampoTexto): boolean {
  return campo.bloco === true
}

/** Notice for fields whose destination drops the formatting. */
export const AVISO_SO_TEXTO =
  'Aqui a formatação não aparece (o texto é usado pelo Google, dentro de um campo, pelo navegador ou dentro de outra frase): vale só o texto.'

/** Admin help of a field: its own help plus the plain-text notice when the destination drops formatting. */
export function ajudaDoCampo(campo: CampoTexto): string | undefined {
  const partes = [campo.ajuda, campo.soTexto ? AVISO_SO_TEXTO : undefined].filter((p): p is string => Boolean(p))
  return partes.length > 0 ? partes.join(' ') : undefined
}
