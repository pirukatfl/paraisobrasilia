import type { SerializedEditorState, SerializedLexicalNode } from '@payloadcms/richtext-lexical/lexical'

import { preencher } from './preencher'

/** Lexical editor JSON of a formatted site text (see `CampoTexto.formatado`). */
export type TextoRico = SerializedEditorState

/** Loose view of a serialized node: stored JSON is untrusted, every field is narrowed before use. */
type NoSolto = { type?: unknown; text?: unknown; children?: unknown }

const ehObjeto = (valor: unknown): valor is Record<string, unknown> => typeof valor === 'object' && valor !== null

function filhosDe(no: unknown): NoSolto[] {
  return ehObjeto(no) && Array.isArray(no.children) ? no.children.filter(ehObjeto) : []
}

/** Block nodes a plain-text view separates with a blank line or a line break. */
const ehLista = (no: NoSolto) => no.type === 'list'

function noTexto(texto: string): SerializedLexicalNode {
  const no = { type: 'text', version: 1, text: texto, format: 0, detail: 0, mode: 'normal', style: '' }
  return no
}

function noParagrafo(linhas: string[]): SerializedLexicalNode {
  const children: SerializedLexicalNode[] = []
  linhas.forEach((linha, i) => {
    if (i > 0) children.push({ type: 'linebreak', version: 1 })
    if (linha !== '') children.push(noTexto(linha))
  })
  const no = { type: 'paragraph', version: 1, children, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '' }
  return no
}

/** Plain text to editor state: paragraphs at blank lines, single newlines become line breaks. */
export function textoParaRico(texto: string): TextoRico {
  const paragrafos = texto
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/^\n+|\n+$/g, ''))
    .filter((p) => p.trim() !== '')
  const children = paragrafos.map((p) => noParagrafo(p.split('\n')))
  return { root: { type: 'root', version: 1, children, direction: 'ltr', format: '', indent: 0 } }
}

function temTextoVisivel(no: NoSolto): boolean {
  if (no.type === 'text' && typeof no.text === 'string') return no.text.trim() !== ''
  return filhosDe(no).some(temTextoVisivel)
}

/** True for valid editor JSON with at least one visible character (an emptied editor keeps an empty paragraph). */
export function ricoTemTexto(valor: unknown): valor is TextoRico {
  return ehObjeto(valor) && ehObjeto(valor.root) && temTextoVisivel(valor.root)
}

function textoDoNo(no: NoSolto): string {
  if (no.type === 'text') return typeof no.text === 'string' ? no.text : ''
  if (no.type === 'linebreak') return '\n'
  return filhosDe(no).map(textoDoNo).join('')
}

/** Plain text of the state: blocks separated by a blank line, list items by a line break. */
export function ricoParaTexto(valor: TextoRico): string {
  return filhosDe(valor.root)
    .map((bloco) => (ehLista(bloco) ? filhosDe(bloco).map(textoDoNo).join('\n') : textoDoNo(bloco)))
    .filter((bloco) => bloco.trim() !== '')
    .join('\n\n')
}

function preencherNos(no: unknown, vars: Record<string, string | number>): void {
  if (!ehObjeto(no)) return
  if (no.type === 'text' && typeof no.text === 'string') no.text = preencher(no.text, vars)
  if (Array.isArray(no.children)) for (const filho of no.children) preencherNos(filho, vars)
}

/** Applies `preencher` to every text node of a copy, keeping the formatting. Placeholders split across formats stay as written. */
export function preencherRico(valor: TextoRico, vars: Record<string, string | number>): TextoRico {
  const copia = structuredClone(valor)
  preencherNos(copia.root, vars)
  return copia
}
