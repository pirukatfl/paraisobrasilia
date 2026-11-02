/**
 * Where visitors send contos and photos/videos (novo planejamento 2026-11-01). One constant per
 * destination, used by the promotion pop-up and the home "Quem somos" opening text.
 * No Next, no Payload: pure, unit-testable.
 */
export const ENVIO_CONTOS_HREF = '/contos/enviar'
export const ENVIO_MIDIA_HREF = '/enviar-fotos-e-videos'

/** Whole words only ("contos", not "contosa"); accents are letters, so "vídeos" never matches inside a word. */
const PALAVRAS = /(?<![\p{L}\p{N}])(contos|fotos e v[ií]deos)(?![\p{L}\p{N}])/giu

export type Trecho = { texto: string; href?: string }

function destino(palavra: string): string {
  return palavra.toLowerCase() === 'contos' ? ENVIO_CONTOS_HREF : ENVIO_MIDIA_HREF
}

/** Splits a text into plain pieces and linked pieces ("contos", "fotos e vídeos" / "fotos e videos"). */
export function partirTextoComLinks(texto: string): Trecho[] {
  const out: Trecho[] = []
  let ultimo = 0
  for (const m of texto.matchAll(PALAVRAS)) {
    const i = m.index ?? 0
    if (i > ultimo) out.push({ texto: texto.slice(ultimo, i) })
    out.push({ texto: m[0], href: destino(m[0]) })
    ultimo = i + m[0].length
  }
  if (ultimo < texto.length) out.push({ texto: texto.slice(ultimo) })
  return out
}

type No = Record<string, unknown>
const ehObjeto = (valor: unknown): valor is No => typeof valor === 'object' && valor !== null

function noLink(trecho: Trecho, modelo: No): No {
  return {
    type: 'link',
    version: 3,
    direction: 'ltr',
    format: '',
    indent: 0,
    fields: { linkType: 'custom', newTab: false, url: trecho.href },
    children: [{ ...modelo, text: trecho.texto }],
  }
}

function linkarNos(nos: unknown[]): unknown[] {
  return nos.flatMap((no): unknown[] => {
    if (!ehObjeto(no)) return [no]
    // Already a link (staff put one there): leave the words and the address as they are
    if (no.type === 'link' || no.type === 'autolink') return [no]
    if (no.type === 'text' && typeof no.text === 'string') {
      const trechos = partirTextoComLinks(no.text)
      if (!trechos.some((t) => t.href)) return [no]
      return trechos.map((t) => (t.href ? noLink(t, no) : { ...no, text: t.texto }))
    }
    return Array.isArray(no.children) ? [{ ...no, children: linkarNos(no.children) }] : [no]
  })
}

/** Editor state with the same words turned into links (text already inside a link is left alone). */
export function linkarEstado<T extends { root: unknown }>(estado: T): T {
  if (!ehObjeto(estado.root)) return estado
  const root = estado.root
  return { ...estado, root: { ...root, children: Array.isArray(root.children) ? linkarNos(root.children) : [] } }
}
